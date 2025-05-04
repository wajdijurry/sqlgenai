from flask import request, jsonify, current_app
from flask_login import login_required, current_user, login_user, logout_user
import json
import time
import logging
from datetime import datetime
# CORS is now handled by Apache

from app.utils.db_init import db
from app.api import api_bp
from app.database.models import DatabaseConnection, DatabaseSchema, QueryHistory
from app.auth.models import Subscription, User, SubscriptionPlan, QueryUsage
from app.models import AIModelFactory
from app.utils.encryption import encrypt_password, decrypt_password
from app.utils.auth import token_required

# Set up logging
logger = logging.getLogger(__name__)

# Import our database connector
from app.database.db_connector import DatabaseConnector

# Initialize connector
connector = DatabaseConnector()
logger.info("Database connector initialized successfully in API routes")

@api_bp.route('/models/available', methods=['GET'])
@token_required
def get_available_models():
    """Get available AI models based on user's subscription plan"""
    # Get current user from request object (set by token_required decorator)
    current_user = request.current_user
    
    # Default available models (free tier)
    available_models = [
        {
            "id": "deepseek",
            "name": "DeepSeek R1",
            "description": "DeepSeek SQL model for general SQL generation"
        }
    ]
    
    # Get user's subscription
    subscription = Subscription.query.filter_by(user_id=current_user.id).first()
    
    if not subscription:
        return jsonify({
            'success': True,
            'models': available_models
        })
    
    # Get subscription plan
    plan = SubscriptionPlan.query.filter_by(plan_id=subscription.plan_id).first()
    
    if not plan or not plan.features:
        return jsonify({
            'success': True,
            'models': available_models
        })
    
    # Check features for model access
    features = plan.features
    
    # Add OpenAI models if available in the plan
    if features.get('openai_models') == "Yes":
        available_models.append({
            "id": "openai",
            "name": "OpenAI GPT-4",
            "description": "OpenAI's GPT-4 model for advanced SQL generation"
        })
    
    # Add Claude models if available in the plan
    if features.get('claude_models') == "Yes":
        available_models.append({
            "id": "claude",
            "name": "Claude 3",
            "description": "Anthropic's Claude 3 model for advanced SQL generation"
        })
    
    return jsonify({
        'success': True,
        'models': available_models
    })


def error_response(message: str, status_code: int = 400, **kwargs) -> tuple:
    """Helper function to create standardized error responses
    
    Args:
        message: Error message
        status_code: HTTP status code
        **kwargs: Additional key-value pairs to include in the response
        
    Returns:
        Tuple with JSON response and status code
    """
    response = {
        'success': False,
        'message': message
    }
    
    # Add any additional key-value pairs
    response.update(kwargs)
    
    return jsonify(response), status_code

# Status endpoint moved to auth blueprint
# The route /api/auth/status is now handled by auth_bp.route('/status')

@api_bp.route('/auth/logout', methods=['POST'])
def api_logout():
    """API endpoint for user logout"""
    # Check if user is authenticated via token
    auth_header = request.headers.get('Authorization')
    if auth_header and auth_header.startswith('Bearer '):
        token = auth_header.split(' ')[1]
        user = User.query.filter_by(auth_token=token).first()
        
        if user:
            # Clear the user's token
            user.auth_token = None
            db.session.commit()
    
    # Also handle session logout
    if current_user.is_authenticated:
        logout_user()
    
    return jsonify({
        'success': True,
        'message': 'Logged out successfully'
    })

@api_bp.route('/auth/register', methods=['POST'])
def auth_register():
    """Register a new user"""
    from app.auth.models import User
    
    data = request.get_json()
    
    if not data:
        return error_response('No data provided')
    
    # Validate required fields
    required_fields = ['email', 'username', 'password']
    for field in required_fields:
        if field not in data:
            return jsonify({
                'success': False,
                'message': f'Missing required field: {field}'
            }), 400
    
    # Check if email or username already exists
    if User.query.filter_by(email=data['email']).first():
        return jsonify({
            'success': False,
            'message': 'Email already registered'
        }), 400
    
    if User.query.filter_by(username=data['username']).first():
        return jsonify({
            'success': False,
            'message': 'Username already taken'
        }), 400
    
    # Create new user
    user = User(
        email=data['email'],
        username=data['username'],
        first_name=data.get('first_name', ''),
        last_name=data.get('last_name', ''),
        company=data.get('company', ''),
        job_title=data.get('job_title', '')
    )
    user.set_password(data['password'])
    
    db.session.add(user)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': 'Registration successful'
    })

@api_bp.route('/auth/login', methods=['POST', 'OPTIONS'])
def auth_login():
    """Login a user"""
    # Handle OPTIONS request for CORS preflight
    if request.method == 'OPTIONS':
        return cors_preflight_response()
        
    from app.auth.models import User
    import secrets
    
    data = request.get_json()
    
    if not data:
        return error_response('No data provided')
    
    # Validate required fields
    required_fields = ['email', 'password']
    for field in required_fields:
        if field not in data:
            return jsonify({
                'success': False,
                'message': f'Missing required field: {field}'
            }), 400
    
    # Find user by email
    user = User.query.filter_by(email=data['email']).first()
    
    # Check if user exists and password is correct
    if not user or not user.check_password(data['password']):
        return jsonify({
            'success': False,
            'message': 'Invalid email or password'
        }), 401
    
    # Check if user is active
    if not user.is_active:
        return jsonify({
            'success': False,
            'message': 'Your account is inactive. Please contact support.'
        }), 401
    
    # Generate token (simple implementation)
    token = secrets.token_hex(32)
    user.auth_token = token
    
    # Set last login time
    user.last_login = datetime.utcnow()
    db.session.commit()
    
    # Login the user - this sets up the Flask-Login session
    login_user(user, remember=data.get('remember', False))
    
    # Log the authentication status
    logger.info(f"User {user.id} ({user.email}) logged in successfully. Auth status: {current_user.is_authenticated}")
    
    # Get subscription information
    from app.auth.models import Subscription
    subscription = Subscription.query.filter_by(user_id=user.id).first()
    
    response = jsonify({
        'success': True,
        'message': 'Login successful',
        'token': token,
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
    
    # Add CORS headers to the response
    response = add_cors_headers(response)
    
    return response

@api_bp.route('/auth/logout', methods=['POST'])
@token_required
def auth_logout():
    """Logout the current user"""
    from app.auth.models import User
    
    # Clear token
    if current_user.is_authenticated:
        current_user.auth_token = None
        db.session.commit()
    
    # Logout the user
    logout_user()
    
    return jsonify({
        'success': True,
        'message': 'Logout successful'
    })

@api_bp.route('/auth/profile', methods=['PUT'])
@token_required
def update_profile():
    """Update user profile"""
    data = request.get_json()
    
    if not data:
        return error_response('No data provided')
    
    # Update user fields
    if 'first_name' in data:
        current_user.first_name = data['first_name']
    if 'last_name' in data:
        current_user.last_name = data['last_name']
    if 'company' in data:
        current_user.company = data['company']
    if 'job_title' in data:
        current_user.job_title = data['job_title']
    
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': 'Profile updated successfully',
        'user': {
            'id': current_user.id,
            'email': current_user.email,
            'username': current_user.username,
            'first_name': current_user.first_name or '',
            'last_name': current_user.last_name or '',
            'company': current_user.company or '',
            'job_title': current_user.job_title or '',
            'is_admin': current_user.is_admin
        }
    })

@api_bp.route('/auth/password', methods=['PUT'])
@token_required
def change_password():
    """Change user password"""
    data = request.get_json()
    
    if not data:
        return error_response('No data provided')
    
    # Validate required fields
    required_fields = ['current_password', 'new_password', 'confirm_password']
    for field in required_fields:
        if field not in data:
            return jsonify({
                'success': False,
                'message': f'Missing required field: {field}'
            }), 400
    
    # Verify current password
    if not current_user.check_password(data['current_password']):
        return jsonify({
            'success': False,
            'message': 'Current password is incorrect'
        }), 400
    
    # Verify new passwords match
    if data['new_password'] != data['confirm_password']:
        return jsonify({
            'success': False,
            'message': 'New passwords do not match'
        }), 400
    
    # Update password
    current_user.set_password(data['new_password'])
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': 'Password changed successfully'
    })



@api_bp.route('/history/count', methods=['GET'])
@token_required
def get_query_count():
    """Get total count of queries for the current user"""
    # Get the current user from the request object
    user = getattr(request, 'current_user', current_user)
    
    # Count queries for the user
    count = QueryHistory.query.filter_by(user_id=user.id).count()
    
    return jsonify({
        'success': True,
        'count': count
    })

@api_bp.route('/history', methods=['GET', 'OPTIONS'])
@token_required
def get_query_history():
    """Get query history for current user"""
    # Handle OPTIONS request for CORS preflight
    if request.method == 'OPTIONS':
        return cors_preflight_response()
        
    # Get the current user from the request object if using token auth
    user = getattr(request, 'current_user', current_user)
    
    # Check if we have a valid user
    if not user or not hasattr(user, 'id'):
        response = jsonify({
            'success': False,
            'message': 'Authentication required'
        }), 401
        return add_cors_headers(response[0]), response[1]
    
    # Get pagination parameters
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    
    # Get filter parameters
    connection_id = request.args.get('connection_id', type=int)
    is_favorite = request.args.get('is_favorite', type=bool)
    search = request.args.get('search', '')
    
    # Build query
    query = QueryHistory.query.filter_by(user_id=user.id)
    
    if connection_id:
        query = query.filter_by(connection_id=connection_id)
    
    if is_favorite is not None:
        query = query.filter_by(is_favorite=is_favorite)
        
    # Add search functionality
    if search:
        # Search in natural language query and generated SQL
        search_term = f"%{search}%"
        query = query.filter(
            db.or_(
                QueryHistory.natural_language_query.ilike(search_term),
                QueryHistory.generated_sql.ilike(search_term)
            )
        )
    
    # Order by creation date (newest first)
    query = query.order_by(QueryHistory.created_at.desc())
    
    # Get total count before pagination
    total_count = query.count()
    
    # Check if page is out of range
    total_pages = (total_count + per_page - 1) // per_page if total_count > 0 else 1
    
    # If page is out of range and not the first page, return empty results instead of 404
    if page > total_pages:
        # Return empty result set with pagination info
        response = jsonify({
            'success': True,
            'history': [],
            'total_count': total_count,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': total_count,
                'pages': total_pages
            }
        })
        return add_cors_headers(response)
    
    # Paginate results
    try:
        pagination = query.paginate(page=page, per_page=per_page)
    except Exception as e:
        # Handle any pagination errors
        logger.error(f"Pagination error: {str(e)}")
        # Return empty result set
        response = jsonify({
            'success': True,
            'history': [],
            'total_count': total_count,
            'pagination': {
                'page': 1,
                'per_page': per_page,
                'total': total_count,
                'pages': total_pages
            }
        })
        return add_cors_headers(response)
    
    # Format results
    history = []
    for item in pagination.items:
        history.append({
            'id': item.id,
            'connection_id': item.connection_id,
            'natural_language_query': item.natural_language_query,
            'generated_sql': item.generated_sql,
            'execution_time': item.execution_time,
            'is_successful': item.is_successful,
            'error_message': item.error_message,
            'is_favorite': item.is_favorite,
            'model_type': item.model_type,
            'credit_consumed': item.credit_consumed,
            'created_at': item.created_at.isoformat()
        })
    
    response = jsonify({
        'success': True,
        'history': history,
        'total_count': pagination.total,
        'pagination': {
            'page': pagination.page,
            'per_page': pagination.per_page,
            'total': pagination.total,
            'pages': pagination.pages
        }
    })
    
    # Add CORS headers to the response
    return add_cors_headers(response)

@api_bp.route('/profile', methods=['PUT', 'OPTIONS'])
@token_required
def update_user_profile():
    """Update user profile"""
    # Handle OPTIONS request for CORS preflight
    if request.method == 'OPTIONS':
        return cors_preflight_response()
        
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
        with engine.connect() as connection:
            # Create an SQL UPDATE statement
            sql = text(
                "UPDATE user SET first_name = :first_name, last_name = :last_name, "
                "company = :company, job_title = :job_title WHERE id = :user_id"
            )
            
            # Execute the SQL with parameters
            result = connection.execute(
                sql, 
                {
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'company': user.company,
                    'job_title': user.job_title,
                    'user_id': user.id
                }
            )
            connection.commit()
            
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
    
    # Add CORS headers to the response
    return add_cors_headers(response)

@api_bp.route('/history/<int:query_id>', methods=['GET', 'OPTIONS'])
@token_required
def get_query_by_id(query_id):
    """Get a specific query by ID"""
    # Handle OPTIONS request for CORS preflight
    if request.method == 'OPTIONS':
        return cors_preflight_response()
        
    # Get the current user from the request object if using token auth
    user = getattr(request, 'current_user', current_user)
    
    # Check if we have a valid user
    if not user or not hasattr(user, 'id'):
        response = jsonify({
            'success': False,
            'message': 'Authentication required'
        }), 401
        return add_cors_headers(response[0]), response[1]
    
    # Find query in database
    query = QueryHistory.query.filter_by(id=query_id, user_id=user.id).first()
    
    if not query:
        return jsonify({
            'success': False,
            'message': 'Query not found'
        }), 404
    
    response = jsonify({
        'success': True,
        'query': {
            'id': query.id,
            'connection_id': query.connection_id,
            'natural_language_query': query.natural_language_query,
            'generated_sql': query.generated_sql,
            'execution_time': query.execution_time,
            'is_successful': query.is_successful,
            'error_message': query.error_message,
            'is_favorite': query.is_favorite,
            'created_at': query.created_at.isoformat()
        }
    })
    
    # Add CORS headers to the response
    return add_cors_headers(response)

@api_bp.route('/history/<int:query_id>/delete', methods=['POST', 'DELETE', 'OPTIONS'])
@token_required
def delete_query_by_id(query_id):
    """Delete a query history item by ID"""
    # Handle OPTIONS request for CORS preflight
    if request.method == 'OPTIONS':
        return cors_preflight_response()
        
    # Get the current user from the request object if using token auth
    user = getattr(request, 'current_user', current_user)
    
    # Check if we have a valid user
    if not user or not hasattr(user, 'id'):
        response = jsonify({
            'success': False,
            'message': 'Authentication required'
        }), 401
        return add_cors_headers(response[0]), response[1]
    
    # Find the query
    query = QueryHistory.query.filter_by(id=query_id, user_id=user.id).first()
    
    if not query:
        response = jsonify({
            'success': False,
            'message': 'Query not found'
        }), 404
        return add_cors_headers(response[0]), response[1]
    
    try:
        # Delete the query
        db.session.delete(query)
        db.session.commit()
        
        response = jsonify({
            'success': True,
            'message': 'Query deleted successfully'
        })
        return add_cors_headers(response)
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting query: {str(e)}")
        response = jsonify({
            'success': False,
            'message': f'Failed to delete query: {str(e)}'
        }), 500
        return add_cors_headers(response[0]), response[1]

@api_bp.route('/history/<int:query_id>/favorite', methods=['POST', 'OPTIONS'])
@token_required
def toggle_favorite(query_id):
    """Toggle favorite status for a query"""
    # Handle OPTIONS request for CORS preflight
    if request.method == 'OPTIONS':
        return cors_preflight_response()
        
    # Get the current user from the request object if using token auth
    user = getattr(request, 'current_user', current_user)
    
    # Check if we have a valid user
    if not user or not hasattr(user, 'id'):
        response = jsonify({
            'success': False,
            'message': 'Authentication required'
        }), 401
        return add_cors_headers(response[0]), response[1]
    
    # Find query in database
    query = QueryHistory.query.filter_by(
        id=query_id, user_id=user.id
    ).first()
    
    if not query:
        return jsonify({
            'success': False,
            'message': 'Query not found'
        }), 404
    
    # Toggle favorite status
    query.is_favorite = not query.is_favorite
    db.session.commit()
    
    response = jsonify({
        'success': True,
        'is_favorite': query.is_favorite
    })
    
    # Add CORS headers to the response
    return add_cors_headers(response)

@api_bp.route('/explain', methods=['POST'])
@token_required
def explain_query():
    """Get the explain plan for a SQL query without executing it"""
    data = request.get_json()
    
    if not data:
        return error_response('No data provided')
    
    # Get required parameters
    connection_id = data.get('connection_id')
    sql_query = data.get('sql_query')
    
    # Handle both model_type and model parameters (frontend sends 'model')
    model_type = data.get('model', 'openai') # Default to OpenAI
    print(f"[API] Getting explain plan with model_type={model_type}")
    
    if not all([connection_id, sql_query]):
        return error_response('Missing required parameters')
    
    # Get database connection
    connection = DatabaseConnection.query.filter_by(
        id=connection_id, user_id=current_user.id
    ).first()
    
    if not connection:
        return error_response('Database connection not found', 404)
    
    # Decrypt password
    password = decrypt_password(connection.password)
    
    # Create connection config
    connection_config = {
        'username': connection.username,
        'password': password,
        'hostPort': f"{connection.host}:{connection.port}",
        'databaseName': connection.database_name
    }
    
    # Add service_name for Oracle connections if available
    if connection.db_type.lower() == 'oracle' and hasattr(connection, 'service_name') and connection.service_name:
        connection_config['serviceName'] = connection.service_name
        print(f"\n[API ROUTES] Adding Oracle service_name: {connection.service_name} for explain query\n")
    
    # Store the connection config in the app config for later use
    current_app.config['LAST_CONNECTION_CONFIG'] = connection_config
    
    # Check if this is a cached explain query
    from app.auth.models import QueryUsage, Subscription, SubscriptionPlan
    from datetime import datetime, timedelta
    
    # Look for a recent identical explain query in the last hour
    one_hour_ago = datetime.utcnow() - timedelta(hours=1)
    cached_query = QueryUsage.query.filter(
        QueryUsage.user_id == current_user.id,
        QueryUsage.query_text == sql_query,
        QueryUsage.query_type == 'explain',
        QueryUsage.execution_time >= one_hour_ago
    ).first()
    
    # If this is not a cached query, check subscription limits before proceeding
    if not cached_query:
        # Get user's subscription
        subscription = Subscription.query.filter_by(user_id=current_user.id, status='active').first()
        
        # Get current month's start date
        today = datetime.utcnow()
        month_start = datetime(today.year, today.month, 1)
        
        # Count queries executed this month
        query_count = QueryUsage.query.filter(
            QueryUsage.user_id == current_user.id,
            QueryUsage.execution_time >= month_start
        ).count()
        
        # Set default query limit
        query_limit = 10  # Free tier default
        
        if subscription:
            # Get plan details
            plan = SubscriptionPlan.query.filter_by(plan_id=subscription.plan_id).first()
            if plan:
                # Get query limit from plan features
                plan_features = plan.features
                if isinstance(plan_features, dict) and 'query_limit' in plan_features:
                    query_limit = plan_features['query_limit']
                else:
                    # Default limits based on plan if not specified in features
                    if plan.plan_id == 'basic':
                        query_limit = 100
                    elif plan.plan_id == 'professional':
                        query_limit = 500
                    elif plan.plan_id == 'enterprise':
                        query_limit = -1  # -1 represents unlimited queries for enterprise
        
        # Check if user has reached their query limit
        # Special case for Enterprise plan: query_limit of -1 means unlimited queries
        if query_limit != -1 and query_count >= query_limit:
            return jsonify({
                'success': False,
                'message': f"You have reached your monthly query limit of {query_limit}. Please upgrade your plan to execute more queries."
            }), 403
    
    # Only get the explain plan without executing the query
    try:
        explain_result = connector.explain_query(
            db_type=connection.db_type,
            connection_config=connection_config,
            sql_query=sql_query,
            model_type=model_type
        )
        
        # Track query usage for subscription plan enforcement if AI model was used
        # Only count it if it's not a cached query
        if not cached_query and 'performance_analysis' in explain_result and explain_result['performance_analysis']:
            # Create query usage record for explain query
            query_usage = QueryUsage(
                user_id=current_user.id,
                execution_time=datetime.utcnow(),
                query_text=sql_query[:500],  # Store first 500 chars of query
                connection_id=connection_id,
                query_type='explain',
                is_cached=False
            )
            db.session.add(query_usage)
            db.session.commit()
        elif cached_query:
            # Update the timestamp on the cached query
            cached_query.execution_time = datetime.utcnow()
            db.session.commit()
        
        return jsonify(explain_result)
    except Exception as e:
        logger.error(f"Error getting explain plan: {str(e)}")
        return jsonify({
            'success': False,
            'error': f"Error getting explain plan: {str(e)}"
        }), 500

@api_bp.route('/execute', methods=['POST'])
@token_required
def execute_query():
    """Execute a SQL query on the database"""
    data = request.get_json()
    
    if not data:
        return error_response('No data provided')
    
    # Get required parameters
    connection_id = data.get('connection_id')
    sql_query = data.get('sql_query')
    analyze_performance = data.get('analyze_performance', False)
    
    # No subscription plan limits for direct SQL execution
    # We only track usage for analytics but don't limit users
    from app.auth.models import QueryUsage
    from datetime import datetime
    
    # Get pagination parameters with robust type handling
    try:
        page = data.get('page', 1)
        page_size = data.get('page_size', 100)
        
        # Convert to int, handling various input types
        if isinstance(page, dict) and 'page' in page:
            page = page.get('page', 1)
        page = int(page) if page is not None else 1
        
        if isinstance(page_size, dict) and 'page_size' in page_size:
            page_size = page_size.get('page_size', 100)
        page_size = int(page_size) if page_size is not None else 100
    except (ValueError, TypeError):
        # Default values if conversion fails
        page = 1
        page_size = 100
    
    # Validate pagination parameters
    if page < 1:
        page = 1
    if page_size < 1 or page_size > 1000:
        page_size = 100
        
    # Calculate offset
    offset = (page - 1) * page_size
    
    if not all([connection_id, sql_query]):
        return error_response('Missing required parameters')
    
    # Get database connection
    connection = DatabaseConnection.query.filter_by(
        id=connection_id, user_id=current_user.id
    ).first()
    
    if not connection:
        return error_response('Database connection not found', 404)
    
    # Decrypt password
    password = decrypt_password(connection.password)
    
    # Create connection config
    connection_config = {
        'username': connection.username,
        'password': password,
        'hostPort': f"{connection.host}:{connection.port}",
        'databaseName': connection.database_name
    }
    
    # Add service_name for Oracle connections if available
    if connection.db_type.lower() == 'oracle' and hasattr(connection, 'service_name') and connection.service_name:
        connection_config['serviceName'] = connection.service_name
        print(f"\n[API ROUTES] Adding Oracle service_name: {connection.service_name} for execute query\n")
    
    # Start timer
    start_time = time.time()
    
    # Get database configuration for logging purposes
    db_config_result = connector.get_db_config(connection.db_type, connection_config)
    
    # Log database configuration if available
    if db_config_result.get('success', False):
        db_config = db_config_result.get('config', {})
        if 'sql_mode' in db_config:
            logger.info(f"Database SQL Mode: {db_config.get('sql_mode', '')}")
    
    # Execute query with pagination
    result = connector.execute_query(
        db_type=connection.db_type,
        connection_config=connection_config,
        sql_query=sql_query,  # Use the original SQL query since AI model handles compatibility
        limit=page_size,
        offset=offset
    )
    
    # End timer
    end_time = time.time()
    execution_time = end_time - start_time
    
    # Create query history
    query_history = QueryHistory(
        user_id=current_user.id,
        connection_id=connection_id,
        natural_language_query='',  # This is a direct SQL query, not NL
        generated_sql=sql_query,
        execution_time=execution_time,
        is_successful=result['success'],
        error_message=result.get('error', '') if not result['success'] else ''
    )
    
    db.session.add(query_history)
    
    # Track query usage for analytics purposes only (not for limiting)
    if result['success']:
        try:
            # Create query usage record
            query_usage = QueryUsage(
                user_id=current_user.id,
                execution_time=datetime.utcnow(),
                query_text=sql_query[:500],  # Store first 500 chars of query
                connection_id=connection_id,
                query_type='execute',
                is_cached=False
            )
            db.session.add(query_usage)
        except Exception as e:
            logger.error(f"Error tracking query usage: {str(e)}")
            # Continue even if tracking fails
    
    db.session.commit()
    
    # Add execution time to the result
    result['execution_time'] = execution_time
    
    return jsonify(result)
