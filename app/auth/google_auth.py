"""
Google OAuth authentication for SQLGenAI
"""
import os
from flask import request, redirect, url_for, current_app, session, jsonify
from flask_login import login_user
import requests
import json
import secrets
from datetime import datetime, timedelta
from app.extensions import db
from app.auth.models import User, Subscription
from app.subscription_config import SUBSCRIPTION_PLANS

# In-memory state storage with expiration (for Docker environments where session might not work well)
_oauth_states = {}

def store_oauth_state(state):
    """Store OAuth state with 10-minute expiration"""
    expiration = datetime.utcnow() + timedelta(minutes=10)
    _oauth_states[state] = expiration
    # Clean up expired states
    expired_states = [s for s, exp in _oauth_states.items() if exp < datetime.utcnow()]
    for s in expired_states:
        _oauth_states.pop(s, None)
    return state

def verify_oauth_state(state):
    """Verify OAuth state and remove it if valid"""
    if not state:
        return False
    expiration = _oauth_states.get(state)
    if not expiration or expiration < datetime.utcnow():
        return False
    # Remove the state after verification
    _oauth_states.pop(state, None)
    return True

def get_google_provider_cfg():
    """Get Google's OAuth 2.0 provider configuration"""
    return requests.get(current_app.config['GOOGLE_DISCOVERY_URL']).json()

def get_google_auth_url():
    """Generate the Google authorization URL"""
    # Get Google provider configuration
    google_provider_cfg = get_google_provider_cfg()
    authorization_endpoint = google_provider_cfg["authorization_endpoint"]

    # Generate a random state for CSRF protection
    state = secrets.token_hex(16)
    
    # Store state in our custom state manager
    store_oauth_state(state)
    
    # Also store in session as a backup
    session["google_oauth_state"] = state
    session.modified = True
    
    # Log state for debugging
    current_app.logger.info(f"Generated OAuth state: {state}")

    # Construct the authorization URL
    # Use configured redirect URI if available, otherwise generate from url_for
    redirect_uri = current_app.config.get('GOOGLE_REDIRECT_URI') or url_for("google_auth.google_callback", _external=True)
    
    return {
        "url": f"{authorization_endpoint}?response_type=code&client_id={current_app.config['GOOGLE_CLIENT_ID']}&redirect_uri={redirect_uri}&scope=email%20profile&state={state}&prompt=consent",
        "state": state
    }

def handle_google_callback(code, state):
    """Handle the Google OAuth callback"""
    # Log received state for debugging
    current_app.logger.info(f"Received state: {state}")
    
    # Verify state using our custom state manager
    is_valid_state = verify_oauth_state(state)
    
    # If not valid in our custom manager, try the session as backup
    if not is_valid_state:
        stored_state = session.get("google_oauth_state")
        current_app.logger.info(f"Stored session state: {stored_state}")
        
        if stored_state and state == stored_state:
            is_valid_state = True
            # Clear from session
            session.pop("google_oauth_state", None)
            session.modified = True
    
    if not is_valid_state:
        return {"success": False, "message": "Invalid state parameter"}, 401

    # Get Google provider configuration
    google_provider_cfg = get_google_provider_cfg()
    token_endpoint = google_provider_cfg["token_endpoint"]

    # Prepare and send the token request
    # Use configured redirect URI if available, otherwise generate from url_for
    redirect_url = current_app.config.get('GOOGLE_REDIRECT_URI') or url_for("google_auth.google_callback", _external=True)
    
    token_url, headers, body = prepare_token_request(
        token_endpoint,
        authorization_response=request.url,
        redirect_url=redirect_url,
        code=code
    )
    
    token_response = requests.post(
        token_url,
        headers=headers,
        data=body,
        auth=(current_app.config['GOOGLE_CLIENT_ID'], current_app.config['GOOGLE_CLIENT_SECRET'])
    )

    # Parse the token response
    token_data = token_response.json()
    
    if "error" in token_data:
        return {"success": False, "message": f"Token error: {token_data['error']}"}, 401

    # Get user info from Google
    userinfo_endpoint = google_provider_cfg["userinfo_endpoint"]
    userinfo_response = requests.get(
        userinfo_endpoint,
        headers={"Authorization": f"Bearer {token_data['access_token']}"}
    )
    
    # Parse the user info response
    userinfo = userinfo_response.json()
    
    # Check if all required info is present
    if not userinfo.get("email_verified"):
        return {"success": False, "message": "User email not verified with Google"}, 401
    
    # Get user info
    email = userinfo["email"]
    name_parts = userinfo.get("name", "").split(" ", 1)
    first_name = name_parts[0] if len(name_parts) > 0 else ""
    last_name = name_parts[1] if len(name_parts) > 1 else ""
    picture = userinfo.get("picture", "")
    
    # Find or create user
    user = User.query.filter_by(email=email).first()
    
    if not user:
        # Create a new user
        username = email.split("@")[0]
        base_username = username
        counter = 1
        
        # Ensure username is unique
        while User.query.filter_by(username=username).first():
            username = f"{base_username}{counter}"
            counter += 1
        
        # Create user with a random password (not used for Google login)
        user = User(
            email=email,
            username=username,
            first_name=first_name,
            last_name=last_name,
            is_active=True
        )
        
        # Set a random password (not used for Google login)
        user.set_password(secrets.token_hex(16))
        
        # Generate auth token
        user.auth_token = secrets.token_hex(32)
        
        # Save the user
        db.session.add(user)
        db.session.commit()
        
        # Create a free subscription for new users
        create_free_subscription(user)
    else:
        # Update existing user's token
        user.auth_token = secrets.token_hex(32)
        user.last_login = datetime.utcnow()
        db.session.commit()
    
    # Login the user
    login_user(user)
    
    # Get subscription information
    subscription = Subscription.query.filter_by(user_id=user.id).first()
    
    # Return user data
    return {
        "success": True,
        "message": "Login successful",
        "token": user.auth_token,
        "user": {
            "id": user.id,
            "email": user.email,
            "username": user.username,
            "first_name": user.first_name or "",
            "last_name": user.last_name or "",
            "company": user.company or "",
            "job_title": user.job_title or "",
            "is_admin": user.is_admin,
            "subscription": {
                "plan_id": subscription.plan_id if subscription else None,
                "status": subscription.status if subscription else None,
                "is_annual": subscription.is_annual if subscription else None
            }
        }
    }

def prepare_token_request(token_endpoint, authorization_response, redirect_url, code):
    """Prepare the token request parameters"""
    return (
        token_endpoint,
        {
            "Content-Type": "application/x-www-form-urlencoded"
        },
        {
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": redirect_url,
            "client_id": current_app.config['GOOGLE_CLIENT_ID'],
            "client_secret": current_app.config['GOOGLE_CLIENT_SECRET']
        }
    )

def create_free_subscription(user):
    """Create a free subscription for a new user"""
    from datetime import datetime, timedelta
    from app.auth.models import SubscriptionPlan
    
    # Get the free plan configuration from subscription config
    free_plan_config = SUBSCRIPTION_PLANS.get('free', {})
    free_plan_features = free_plan_config.get('features', {})
    
    # Ensure query_limit is set properly (default to 10 if not specified)
    query_limit = free_plan_features.get('query_limit', 10)
    
    # Check if the free plan exists in the database, create it if not
    free_plan = SubscriptionPlan.query.filter_by(plan_id='free').first()

    # Ensure the free plan has the correct features
    if not free_plan.features or 'query_limit' not in free_plan.features:
        free_plan.features = free_plan_features
        db.session.commit()
        print(f"Updated free plan features with query_limit: {query_limit}")
    
    # Create a free subscription
    subscription = Subscription(
        user_id=user.id,
        plan_id="free",
        status="active",
        start_date=datetime.utcnow(),
        end_date=datetime.utcnow() + timedelta(days=365),  # 1 year free trial
        is_annual=False,
        subscription_id=f"free_{secrets.token_hex(8)}"
    )
    
    db.session.add(subscription)
    db.session.commit()
    
    return subscription
