from flask import jsonify, request, current_app
from flask_login import login_user, logout_user, login_required, current_user
from app.utils.db_init import db
from app.auth import auth_bp
from app.auth.models import User, Subscription, PaymentHistory
from datetime import datetime, timedelta
import stripe
import uuid

# Note: All web view routes have been removed
# Most authentication is now handled through the API routes in api/routes.py

from app.utils.auth import token_required
# CORS is now handled by Apache

@auth_bp.route('/profile', methods=['PUT', 'OPTIONS'])
@token_required
def update_profile():
    """Update user profile"""
    # OPTIONS requests are handled by Apache
    if request.method == 'OPTIONS':
        return '', 200
        
    # Get the current user from the request object if using token auth
    user = getattr(request, 'current_user', current_user)
    
    # Check if we have a valid user
    if not user or not hasattr(user, 'id'):
        response = jsonify({
            'success': False,
            'message': 'Authentication required'
        }), 401
        return add_cors_headers(response[0]), response[1]
    
    # Get profile data from request
    print("Request headers:", dict(request.headers))
    print("Request method:", request.method)
    print("Request content type:", request.content_type)
    print("Request data:", request.data)
    
    try:
        data = request.get_json()
        print("Parsed JSON data:", data)
    except Exception as e:
        print(f"Error parsing JSON: {str(e)}")
        data = None
    
    if not data:
        print("No data provided or invalid JSON")
        response = jsonify({
            'success': False,
            'message': 'No data provided or invalid JSON'
        }), 400
        return add_cors_headers(response[0]), response[1]
    
    # Log the user and data for debugging
    print(f"Updating profile for user ID: {user.id}, email: {user.email}")
    print(f"Current user data: first_name='{user.first_name}', last_name='{user.last_name}', company='{user.company}', job_title='{user.job_title}'")
    print(f"Update data received: {data}")
    
    # Update basic profile information
    print("Before update - User data in database:")
    print(f"  ID: {user.id}")
    print(f"  First name: '{user.first_name}'")
    print(f"  Last name: '{user.last_name}'")
    print(f"  Company: '{user.company}'")
    print(f"  Job title: '{user.job_title}'")
    
    if 'name' in data:
        # Split name into first_name and last_name if provided
        name_parts = data['name'].split(' ', 1)
        user.first_name = name_parts[0] if name_parts else ''
        user.last_name = name_parts[1] if len(name_parts) > 1 else ''
        print(f"Updated name to: first_name='{user.first_name}', last_name='{user.last_name}'")
    
    if 'company' in data:
        user.company = data['company']
        print(f"Updated company to: '{user.company}'")
        
    if 'job_title' in data:
        user.job_title = data['job_title']
        print(f"Updated job_title to: '{user.job_title}'")
        
    print("After update - User data to be saved:")
    print(f"  ID: {user.id}")
    print(f"  First name: '{user.first_name}'")
    print(f"  Last name: '{user.last_name}'")
    print(f"  Company: '{user.company}'")
    print(f"  Job title: '{user.job_title}'")
    
    # Handle password change if provided
    if 'currentPassword' in data and 'newPassword' in data:
        # Verify current password
        if not user.check_password(data['currentPassword']):
            response = jsonify({
                'success': False,
                'message': 'Current password is incorrect'
            }), 400
            return add_cors_headers(response[0]), response[1]
        
        # Set new password
        user.set_password(data['newPassword'])
    
    # Save changes to database
    try:
        # Get a direct connection to the database to execute SQL directly
        from flask import current_app
        from sqlalchemy import text
        
        # First try the normal SQLAlchemy way
        print("Marking user object as modified")
        db.session.add(user)
        
        # Force SQLAlchemy to mark the object as modified
        from sqlalchemy.orm.attributes import flag_modified
        flag_modified(user, 'first_name')
        flag_modified(user, 'last_name')
        flag_modified(user, 'company')
        flag_modified(user, 'job_title')
        
        print("Committing changes to database")
        db.session.commit()
        print("Database commit successful")
        
        # Now let's also try a direct SQL update as a fallback
        print("Executing direct SQL update as a fallback")
        engine = db.engine
        
        # In SQLAlchemy 1.4+, we need to use a transaction for commits
        with engine.begin() as connection:
            # Get the current auth_token to preserve it
            print(f"Current auth_token: {user.auth_token}")
            
            # Create an SQL UPDATE statement that preserves the auth_token
            sql = text(
                "UPDATE user SET first_name = :first_name, last_name = :last_name, "
                "company = :company, job_title = :job_title, auth_token = :auth_token "
                "WHERE id = :user_id"
            )
            
            # Execute the SQL with parameters, including the auth_token
            result = connection.execute(
                sql, 
                {
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'company': user.company,
                    'job_title': user.job_title,
                    'auth_token': user.auth_token,  # Preserve the auth_token
                    'user_id': user.id
                }
            )
            # No need to call commit() - engine.begin() handles the transaction
            
            print(f"Direct SQL update affected {result.rowcount} rows")
        
        # Verify changes were saved by reloading the user from the database
        print("Expiring all objects in session")
        db.session.expire_all()
        
        # Reload the user from the database
        print(f"Reloading user with ID: {user.id}")
        fresh_user = User.query.get(user.id)
        if fresh_user:
            print(f"After commit (fresh user): first_name='{fresh_user.first_name}', last_name='{fresh_user.last_name}', company='{fresh_user.company}', job_title='{fresh_user.job_title}'")
        else:
            print("ERROR: Could not reload user from database!")
        
        # Update our user reference to the fresh copy
        user = fresh_user
    except Exception as e:
        print(f"Error committing changes to database: {str(e)}")
        db.session.rollback()
        response = jsonify({
            'success': False,
            'message': f'Database error: {str(e)}'
        }), 500
        return add_cors_headers(response[0]), response[1]
    
    # Return updated user data
    response = jsonify({
        'success': True,
        'message': 'Profile updated successfully',
        'user': {
            'id': user.id,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'email': user.email,
            'username': user.email,  # Using email as username as shown in the status API
            'company': user.company,
            'job_title': user.job_title,
            'is_admin': user.is_admin,
            'subscription': {
                'plan_id': None,
                'status': None,
                'is_annual': None
            }
        }
    })
    
    # Response is returned directly (CORS handled by Apache)
    return response

@auth_bp.route('/api/subscription/checkout/<plan_id>/<billing_cycle>', methods=['GET'])
@login_required
def subscription_checkout_api(plan_id, billing_cycle):
    """API endpoint for subscription checkout information"""
    # Validate plan and billing cycle
    plans = current_app.config['SUBSCRIPTION_PLANS']
    
    if plan_id not in plans:
        return jsonify({
            'success': False,
            'message': 'Invalid subscription plan'
        }), 400
    
    if billing_cycle not in ['monthly', 'yearly']:
        return jsonify({
            'success': False,
            'message': 'Invalid billing cycle'
        }), 400
    
    plan = plans[plan_id]
    price = plan['price_yearly'] if billing_cycle == 'yearly' else plan['price_monthly']
    
    # Initialize Stripe
    stripe.api_key = current_app.config['STRIPE_SECRET_KEY']
    
    # Return checkout information as JSON
    return jsonify({
        'success': True,
        'plan': plan,
        'plan_id': plan_id,
        'billing_cycle': billing_cycle,
        'price': price,
        'stripe_publishable_key': current_app.config['STRIPE_PUBLISHABLE_KEY']
    })

@auth_bp.route('/api/subscription/process', methods=['POST'])
@login_required
def process_subscription_api():
    """API endpoint to process subscription payment"""
    data = request.get_json()
    plan_id = data.get('plan_id')
    billing_cycle = data.get('billing_cycle')
    
    # Validate plan and billing cycle
    plans = current_app.config['SUBSCRIPTION_PLANS']
    
    if plan_id not in plans:
        return jsonify({'success': False, 'message': 'Invalid subscription plan'})
    
    if billing_cycle not in ['monthly', 'yearly']:
        return jsonify({'success': False, 'message': 'Invalid billing cycle'})
    
    # Get plan details
    plan = plans[plan_id]
    price = plan['price_yearly'] if billing_cycle == 'yearly' else plan['price_monthly']
    is_annual = billing_cycle == 'yearly'
    
    # Calculate subscription end date
    start_date = datetime.utcnow()
    end_date = start_date + timedelta(days=365 if is_annual else 30)
    
    # Check if user already has a subscription
    existing_subscription = Subscription.query.filter_by(user_id=current_user.id).first()
    
    if existing_subscription:
        # Update existing subscription
        existing_subscription.plan_id = plan_id
        existing_subscription.status = 'active'
        existing_subscription.start_date = start_date
        existing_subscription.end_date = end_date
        existing_subscription.is_annual = is_annual
        subscription = existing_subscription
    else:
        # Create new subscription
        subscription = Subscription(
            user_id=current_user.id,
            plan_id=plan_id,
            status='active',
            start_date=start_date,
            end_date=end_date,
            is_annual=is_annual,
            subscription_id=str(uuid.uuid4())
        )
        db.session.add(subscription)
    
    # Create payment record
    payment = PaymentHistory(
        user_id=current_user.id,
        subscription_id=subscription.id,
        amount=price,
        payment_date=start_date,
        payment_method='credit_card',  # Simulated
        status='success',  # Simulated
        transaction_id=str(uuid.uuid4())
    )
    
    db.session.add(payment)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': 'Subscription processed successfully',
        'subscription': {
            'id': subscription.id,
            'plan_id': subscription.plan_id,
            'status': subscription.status,
            'start_date': subscription.start_date.isoformat(),
            'end_date': subscription.end_date.isoformat(),
            'is_annual': subscription.is_annual
        }
    })

@auth_bp.route('/api/subscription/cancel', methods=['POST'])
@login_required
def cancel_subscription_api():
    """Cancel subscription"""
    subscription = Subscription.query.filter_by(user_id=current_user.id).first()
    
    if not subscription:
        return jsonify({'success': False, 'message': 'No active subscription found'})
    
    subscription.status = 'canceled'
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': 'Subscription canceled successfully'
    })

@auth_bp.route('/status', methods=['GET'])
def auth_status():
    """Check authentication status"""
    # Check for token authentication
    auth_header = request.headers.get('Authorization')
    print("Auth header:", auth_header)
    
    if auth_header and auth_header.startswith('Bearer '):
        token = auth_header.split(' ')[1]
        print("Token from request:", token)
        
        # Debug: Check all users and their tokens
        all_users = User.query.all()
        for u in all_users:
            print(f"User {u.id} ({u.username}) - auth_token: {u.auth_token}")
        
        # Try to find user by token - first try exact match
        user = User.query.filter_by(auth_token=token).first()
        
        # If not found, try case-insensitive comparison
        if not user:
            print("No exact match found, trying case-insensitive comparison")
            # Use a direct SQL query for case-insensitive comparison
            from sqlalchemy import text
            result = db.session.execute(text("SELECT id FROM user WHERE LOWER(auth_token) = LOWER(:token)"), {"token": token})
            user_id = result.scalar()
            if user_id:
                user = User.query.get(user_id)
                print(f"Found user by case-insensitive token: {user.username} (ID: {user.id})")
            else:
                print("No user found even with case-insensitive comparison")
        
        print("User found by token:", user.username if user else "None")
        
        if user:
            print(f"Found user by token: {user.username} (ID: {user.id})")
            # Return user data if authenticated via token
            subscription = Subscription.query.filter_by(user_id=user.id).first()
            
            return jsonify({
                'authenticated': True,
                'user': {
                    'id': user.id,
                    'email': user.email,
                    'username': user.username,
                    'first_name': user.first_name or '',
                    'last_name': user.last_name or '',
                    'company': user.company or '',
                    'job_title': user.job_title or '',
                    'is_admin': user.is_admin,
                    'subscription': {
                        'plan_id': subscription.plan_id if subscription else None,
                        'status': subscription.status if subscription else None,
                        'is_annual': subscription.is_annual if subscription else None
                    }
                }
            })
        else:
            # Return unauthenticated status
            return jsonify({
                'authenticated': False
            })
    elif current_user.is_authenticated:
        # Also check for session authentication as a fallback
        subscription = Subscription.query.filter_by(user_id=current_user.id).first()
        
        return jsonify({
            'authenticated': True,
            'user': {
                'id': current_user.id,
                'email': current_user.email,
                'username': current_user.username,
                'first_name': current_user.first_name or '',
                'last_name': current_user.last_name or '',
                'company': current_user.company or '',
                'job_title': current_user.job_title or '',
                'is_admin': current_user.is_admin,
                'subscription': {
                    'plan_id': subscription.plan_id if subscription else None,
                    'status': subscription.status if subscription else None,
                    'is_annual': subscription.is_annual if subscription else None
                }
            }
        })
    else:
        # Return unauthenticated status
        return jsonify({
            'authenticated': False
        })
