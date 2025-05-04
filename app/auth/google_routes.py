"""
Google OAuth routes for SQLGenAI
"""
from flask import Blueprint, request, redirect, url_for, jsonify, session, current_app
from app.auth.google_auth import get_google_auth_url, handle_google_callback

# Create a blueprint for Google auth routes
google_bp = Blueprint('google_auth', __name__)

@google_bp.route('/auth/google/login', methods=['GET', 'OPTIONS'])
def google_login():
    """Initiate Google OAuth login flow"""
    # OPTIONS requests are handled by Apache
    if request.method == 'OPTIONS':
        return '', 200
    
    # Get the Google authorization URL
    auth_data = get_google_auth_url()
    
    # Return the URL to the frontend
    return jsonify({
        'success': True,
        'auth_url': auth_data['url'],
        'state': auth_data['state']
    })

@google_bp.route('/auth/google/callback', methods=['GET'])
def google_callback():
    """Handle Google OAuth callback"""
    # Get the authorization code and state from the request
    code = request.args.get('code')
    state = request.args.get('state')
    
    if not code or not state:
        # Redirect to frontend login page with error
        frontend_url = current_app.config['FRONTEND_URL']
        return redirect(f"{frontend_url}/login?error=Missing+authorization+code+or+state")
    
    # Process the callback
    result = handle_google_callback(code, state)
    
    if not isinstance(result, dict) or not result.get('success'):
        # Handle the case where result is a tuple (error response)
        error_message = result[0]['message'] if isinstance(result, tuple) else result.get('message', 'Authentication failed')
        frontend_url = current_app.config['FRONTEND_URL']
        return redirect(f"{frontend_url}/login?error={error_message}")
    
    # Redirect to frontend auth-callback with token
    token = result['token']
    frontend_url = current_app.config['FRONTEND_URL']
    return redirect(f"{frontend_url}/auth-callback?token={token}")

@google_bp.route('/auth/google/token', methods=['POST', 'OPTIONS'])
def google_token():
    """Exchange authorization code for token"""
    # OPTIONS requests are handled by Apache
    if request.method == 'OPTIONS':
        return '', 200
    
    # Get the data from the request
    data = request.get_json()
    
    if not data or 'code' not in data or 'state' not in data:
        return jsonify({
            'success': False,
            'message': 'Missing code or state'
        }), 400
    
    # Process the callback
    result = handle_google_callback(data['code'], data['state'])
    
    if isinstance(result, tuple):
        response, status_code = result
        return jsonify(response), status_code
    
    # Return the result
    return jsonify(result)
