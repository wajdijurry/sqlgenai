from functools import wraps
from flask import request, jsonify, current_app, g
from flask_login import current_user, AnonymousUserMixin, login_user
from app.auth.models import User

def token_required(f):
    """
    Decorator for routes that require token authentication
    This works alongside Flask-Login to support both session and token authentication
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        # Skip authentication for OPTIONS requests (CORS preflight)
        if request.method == 'OPTIONS':
            return f(*args, **kwargs)
            
        # If user is already authenticated via Flask-Login, allow access
        if current_user.is_authenticated and not isinstance(current_user, AnonymousUserMixin):
            # Set request.current_user to ensure consistent access in route handlers
            request.current_user = current_user
            return f(*args, **kwargs)
        
        # Check for token in Authorization header
        auth_header = request.headers.get('Authorization')
        origin = request.headers.get('Origin', 'http://localhost:3001')
        
        if not auth_header or not auth_header.startswith('Bearer '):
            response = jsonify({
                'success': False,
                'message': 'Missing or invalid authorization header'
            }), 401
            
            # Add CORS headers to error response
            if isinstance(response, tuple):
                response[0].headers.add('Access-Control-Allow-Origin', origin)
                response[0].headers.add('Access-Control-Allow-Credentials', 'true')
            else:
                response.headers.add('Access-Control-Allow-Origin', origin)
                response.headers.add('Access-Control-Allow-Credentials', 'true')
                
            return response
        
        # Extract token from header
        token = auth_header.split(' ')[1]
        
        # Find user by token
        user = User.query.filter_by(auth_token=token).first()
        if not user:
            response = jsonify({
                'success': False,
                'message': 'Invalid or expired token'
            }), 401
            
            # Add CORS headers to error response
            if isinstance(response, tuple):
                response[0].headers.add('Access-Control-Allow-Origin', origin)
                response[0].headers.add('Access-Control-Allow-Credentials', 'true')
            else:
                response.headers.add('Access-Control-Allow-Origin', origin)
                response.headers.add('Access-Control-Allow-Credentials', 'true')
                
            return response
        
        # Check if user is active
        if not user.is_active:
            response = jsonify({
                'success': False,
                'message': 'Your account is inactive. Please contact support.'
            }), 401
            
            # Add CORS headers to error response
            if isinstance(response, tuple):
                response[0].headers.add('Access-Control-Allow-Origin', origin)
                response[0].headers.add('Access-Control-Allow-Credentials', 'true')
            else:
                response.headers.add('Access-Control-Allow-Origin', origin)
                response.headers.add('Access-Control-Allow-Credentials', 'true')
                
            return response
        
        # Set the current user for this request
        # This allows the view function to access current_user
        request.current_user = user
        
        # Store original current_user to restore later
        original_current_user = current_user._get_current_object()
        
        # Login the user with Flask-Login to ensure current_user is set properly
        # This is crucial for functions that use current_user.id
        login_user(user, remember=False)
        
        # Create a context where the current_user is set to our authenticated user
        # This ensures that current_user.id will work in the view function
        g._login_user = user
        
        try:
            return f(*args, **kwargs)
        finally:
            # Clean up after ourselves
            if hasattr(g, '_login_user'):
                delattr(g, '_login_user')
    
    return decorated
