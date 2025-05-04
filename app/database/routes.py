from flask import render_template, redirect, url_for, flash, request, jsonify, current_app
from flask_login import login_required, current_user
import json
import time
import logging
from datetime import datetime, timedelta
# CORS is now handled by Apache

from app.extensions import db
from app.database import database_bp
from app.api import api_bp
from app.database.models import DatabaseConnection, DatabaseSchema, QueryHistory
from app.utils.encryption import encrypt_password, decrypt_password
from app.utils.auth import token_required
from app.auth.models import Subscription, User, SubscriptionPlan, QueryUsage
from app.models import AIModelFactory

# Set up logging
logger = logging.getLogger(__name__)

# Import our database connector
from app.database.db_connector import DatabaseConnector

# Initialize connector
connector = DatabaseConnector()
logger.info("Database connector initialized successfully")

@database_bp.route('/connections')
@login_required
def connections():
    """List all database connections for the current user"""
    connections = DatabaseConnection.query.filter_by(user_id=current_user.id).all()
    return render_template('database/connections.html', connections=connections)

# ============================================================================
# DATABASE CONNECTION ROUTES
# ============================================================================

@api_bp.route('/database/connections', methods=['GET', 'OPTIONS'])
@token_required
def get_connections():
    """API endpoint to get all database connections for the current user"""
    # OPTIONS requests are handled by Apache
    if request.method == 'OPTIONS':
        return '', 200
        
    try:
        # Get user from token
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({
                'success': False,
                'message': 'Authorization header is missing'
            }), 401
        
        token = auth_header.split(" ")[1] if len(auth_header.split(" ")) > 1 else auth_header
        
        # Get user from token
        user = User.query.filter_by(auth_token=token).first()
        if not user:
            return jsonify({
                'success': False,
                'message': 'Invalid token'
            }), 401
        
        # Get all active connections for the user (soft-deleted records are automatically filtered)
        connections = DatabaseConnection.query.filter_by(user_id=user.id).all()
        
        response = jsonify({
            'success': True,
            'connections': [
                {
                    'id': conn.id,
                    'name': conn.name,
                    'description': conn.description,
                    'db_type': conn.db_type,
                    'host': conn.host,
                    'port': conn.port,
                    'database_name': conn.database_name,
                    'service_name': conn.service_name,  # For Oracle connections
                    'username': conn.username,
                    'created_at': conn.created_at.isoformat() if conn.created_at else None,
                    'updated_at': conn.updated_at.isoformat() if conn.updated_at else None
                }
                for conn in connections
            ]
        })
        
        # Response is returned directly (CORS handled by Apache)
        return response
    except Exception as e:
        logger.error(f"Error fetching connections: {str(e)}")
        return jsonify({
            'success': False,
            'message': f"Failed to get connections: {str(e)}"
        }), 500

@api_bp.route('/database/connections', methods=['POST'])
@token_required
def create_connection():
    """API endpoint to create a new database connection"""
    try:
        data = request.json
        
        # Validate required fields
        required_fields = ['name', 'db_type']
        
        # Add database-specific required fields
        if data.get('db_type') != 'sqlite':
            required_fields.extend(['host', 'port', 'username', 'password'])
        
        # Database name is required for all types
        required_fields.append('database_name')
            
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'success': False,
                    'message': f"Missing required field: {field}"
                }), 400
        
        # Check subscription plan limits
        from app.auth.models import Subscription, SubscriptionPlan
        
        # Get user's subscription
        subscription = Subscription.query.filter_by(user_id=current_user.id, status='active').first()
        
        # Count existing connections
        existing_connections_count = DatabaseConnection.query.filter_by(user_id=current_user.id).count()
        
        # Set default connection limit
        connection_limit = 1  # Free tier default
        
        if subscription:
            # Get plan details
            plan = SubscriptionPlan.query.filter_by(plan_id=subscription.plan_id).first()
            if plan:
                # Get connection limit from plan features
                plan_features = plan.features
                if isinstance(plan_features, dict) and 'connection_limit' in plan_features:
                    connection_limit = plan_features['connection_limit']
                else:
                    # Default limits based on plan if not specified in features
                    if plan.plan_id == 'basic':
                        connection_limit = 3
                    elif plan.plan_id == 'professional':
                        connection_limit = 10
                    elif plan.plan_id == 'enterprise':
                        connection_limit = -1  # Unlimited connections for enterprise
        
        # Check if user has reached their connection limit
        # Special case: connection_limit of -1 means unlimited connections
        if connection_limit != -1 and existing_connections_count >= connection_limit:
            return jsonify({
                'success': False,
                'message': f"You have reached your connection limit of {connection_limit}. Please upgrade your plan to add more connections."
            }), 403
        
        # Encrypt password
        encrypted_password = encrypt_password(data['password'])
        
        # Create new connection
        connection = DatabaseConnection(
            name=data['name'],
            description=data.get('description', ''),
            db_type=data['db_type'],
            host=data.get('host', ''),
            port=data.get('port', 0),
            database_name=data['database_name'],
            service_name=data.get('service_name', ''),  # Added for Oracle connections
            username=data.get('username', ''),
            password=encrypted_password,
            user_id=current_user.id
        )
        
        db.session.add(connection)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'connection': {
                'id': connection.id,
                'name': connection.name,
                'description': connection.description,
                'db_type': connection.db_type,
                'host': connection.host,
                'port': connection.port,
                'database_name': connection.database_name,
                'service_name': connection.service_name,
                'username': connection.username,
                'has_empty_password': getattr(connection, 'has_empty_password', False),
                'created_at': connection.created_at.isoformat() if connection.created_at else None,
                'updated_at': connection.updated_at.isoformat() if connection.updated_at else None
            }
        }), 201
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error creating connection: {str(e)}")
        return jsonify({
            'success': False,
            'message': f"Failed to create connection: {str(e)}"
        }), 500

@api_bp.route('/database/connections/<int:connection_id>', methods=['GET'])
@token_required
def get_connection(connection_id):
    """API endpoint to get a specific database connection"""
    try:
        connection = DatabaseConnection.query.filter_by(id=connection_id, user_id=current_user.id).first()
        
        if not connection:
            return jsonify({
                'success': False,
                'message': 'Connection not found'
            }), 404
        
        return jsonify({
            'success': True,
            'connection': {
                'id': connection.id,
                'name': connection.name,
                'description': connection.description,
                'db_type': connection.db_type,
                'host': connection.host,
                'port': connection.port,
                'database_name': connection.database_name,
                'service_name': connection.service_name,
                'username': connection.username,
                'has_empty_password': getattr(connection, 'has_empty_password', False),
                'created_at': connection.created_at.isoformat() if connection.created_at else None,
                'updated_at': connection.updated_at.isoformat() if connection.updated_at else None
            }
        }), 200
    except Exception as e:
        logger.error(f"Error fetching connection: {str(e)}")
        return jsonify({
            'success': False,
            'message': f"Failed to get connection: {str(e)}"
        }), 500

@api_bp.route('/database/connections/<int:connection_id>', methods=['PUT'])
@token_required
def update_connection(connection_id):
    """API endpoint to update a database connection"""
    try:
        connection = DatabaseConnection.query.filter_by(id=connection_id, user_id=current_user.id).first()
        
        if not connection:
            return jsonify({
                'success': False,
                'message': 'Connection not found'
            }), 404
        
        data = request.json
        
        # Update fields
        if 'name' in data:
            connection.name = data['name']
        if 'description' in data:
            connection.description = data['description']
        if 'db_type' in data:
            connection.db_type = data['db_type']
        if 'host' in data:
            connection.host = data['host']
        if 'port' in data:
            connection.port = data['port']
        if 'database_name' in data:
            connection.database_name = data['database_name']
        if 'username' in data:
            connection.username = data['username']
        if 'password' in data:
            # Check if this is an explicit empty password (empty string)
            if data['password'] == '':
                # Store a special flag to indicate this connection has an empty password
                connection.has_empty_password = True
                connection.password = ''
            else:
                # Normal password case
                connection.has_empty_password = False
                connection.password = encrypt_password(data['password'])
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'connection': {
                'id': connection.id,
                'name': connection.name,
                'description': connection.description,
                'db_type': connection.db_type,
                'host': connection.host,
                'port': connection.port,
                'database_name': connection.database_name,
                'service_name': connection.service_name,
                'username': connection.username,
                'has_empty_password': getattr(connection, 'has_empty_password', False),
                'created_at': connection.created_at.isoformat() if connection.created_at else None,
                'updated_at': connection.updated_at.isoformat() if connection.updated_at else None
            }
        }), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error updating connection: {str(e)}")
        return jsonify({
            'success': False,
            'message': f"Failed to update connection: {str(e)}"
        }), 500

@api_bp.route('/database/connections/<int:connection_id>', methods=['DELETE'])
@token_required
def delete_connection(connection_id):
    """API endpoint to delete a database connection"""
    try:
        # Only get non-deleted connections
        connection = DatabaseConnection.query.filter_by(id=connection_id, user_id=current_user.id, is_deleted=False).first()
        
        if not connection:
            return jsonify({
                'success': False,
                'message': 'Connection not found'
            }), 404
        
        # First soft delete any associated schema records
        schemas = DatabaseSchema.query.filter_by(connection_id=connection_id, is_deleted=False).all()
        for schema in schemas:
            schema.soft_delete()
        
        # Then soft delete the connection
        connection.soft_delete()
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Connection deleted successfully'
        }), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting connection: {str(e)}")
        return jsonify({
            'success': False,
            'message': f"Failed to delete connection: {str(e)}"
        }), 500

@api_bp.route('/database/connections/<int:connection_id>/test', methods=['POST'])
@token_required
def test_connection(connection_id):
    # Get current user from request object (set by token_required decorator)
    current_user = request.current_user
    
    """API endpoint to test an existing database connection"""
    try:
        connection = DatabaseConnection.query.filter_by(id=connection_id, user_id=current_user.id).first()
        
        if not connection:
            return jsonify({
                'success': False,
                'message': 'Connection not found'
            }), 404
        
        # Decrypt password
        password = decrypt_password(connection.password)
        
        # Create connection config dictionary
        connection_config = {
            'username': connection.username,
            'password': password,
            'hostPort': f"{connection.host}:{connection.port}",
            'databaseName': connection.database_name
        }

        # Add service_name for Oracle connections if available
        if connection.db_type.lower() == 'oracle' and connection.service_name:
            connection_config['serviceName'] = connection.service_name
            print(f"Adding Oracle service_name: {connection.service_name}")
        
        # Test connection
        result = connector.test_connection(
            db_type=connection.db_type,
            connection_config=connection_config
        )
        
        if result['success']:
            return jsonify({
                'success': True,
                'message': 'Connection successful'
            }), 200
        else:
            return jsonify({
                'success': False,
                'message': result['message']
            }), 400
    except Exception as e:
        logger.error(f"Error testing connection: {str(e)}")
        return jsonify({
            'success': False,
            'message': f"Failed to test connection: {str(e)}"
        }), 500

@api_bp.route('/database/connections/test', methods=['POST'])
@token_required
def test_new_connection():
    # Get current user from request object (set by token_required decorator)
    current_user = request.current_user
    
    """API endpoint to test a new database connection before saving"""
    try:
        # Get connection data from request
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'message': 'No data provided'
            }), 400
        
        # Validate required fields
        required_fields = ['db_type', 'host', 'port', 'database_name', 'username', 'password']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'success': False,
                    'message': f'Missing required field: {field}'
                }), 400
        
        # Prepare connection config for testing
        connection_config = {
            'username': data['username'],
            'password': data['password'],
            'hostPort': f"{data['host']}:{data['port']}",
            'databaseName': data['database_name']
        }
        
        # Add service_name for Oracle connections
        if data['db_type'].lower() == 'oracle' and 'service_name' in data and data['service_name']:
            connection_config['serviceName'] = data['service_name']
        
        # Test connection
        result = connector.test_connection(
            db_type=data['db_type'],
            connection_config=connection_config
        )
        
        if result['success']:
            return jsonify({
                'success': True,
                'message': 'Connection successful'
            }), 200
        else:
            return jsonify({
                'success': False,
                'message': result['message']
            }), 400
    except Exception as e:
        logger.error(f"Error testing new connection: {str(e)}")
        return jsonify({
            'success': False,
            'message': f"Failed to test connection: {str(e)}"
        }), 500

@api_bp.route('/database/connections/<int:connection_id>/schema', methods=['GET'])
@token_required
def get_schema(connection_id):
    """API endpoint to get the schema for a database connection"""
    try:
        # If we got here, schema retrieval was successful
        # Check if a schema record already exists for this connection
        existing_schema = DatabaseSchema.query.filter_by(connection_id=connection_id).first()
        
        if existing_schema:
            # Update the existing schema record
            print(f"\n[DATABASE ROUTES] Getting stored schema from database, for connection ID {connection_id}\n")
            schema = existing_schema
            schema_data = json.loads(existing_schema.schema_data)
        else:
            # No cached schema, fetch it from the database
            print(f"\n[DATABASE ROUTES] Fetching stored schema from source, for connection ID {connection_id}\n")

            password = decrypt_password(connection.password)
            
            # Create connection config dictionary
            connection_config = {
                'username': connection.username,
                'password': password,
                'hostPort': f"{connection.host}:{connection.port}",
                'databaseName': connection.database_name
            }

            # Add service_name for Oracle connections if available
            if connection.db_type.lower() == 'oracle' and hasattr(connection, 'service_name') and connection.service_name:
                connection_config['serviceName'] = connection.service_name
                print(f"\n[DATABASE ROUTES] Adding Oracle service_name: {connection.service_name}\n")

            print("Connection config:", connection_config)
            
            # Use the existing get_database_schema method
            schema_data = connector.get_database_schema(
                db_type=connection.db_type,
                connection_config=connection_config
            )
            
            # Check if there's an error in the response
            if 'error' in schema_data:
                logger.error(f"Error fetching schema: {schema_data['error']}")
                return jsonify({
                    'success': False,
                    'message': f"Failed to fetch schema: {schema_data['error']}"
                }), 500
            # Create a new schema record
            print(f"\n[DATABASE ROUTES] Creating new schema for connection ID {connection_id}\n")
            schema = DatabaseSchema(
                connection_id=connection_id,
                schema_name=connection.database_name,
                schema_data=json.dumps(schema_data)
            )
            db.session.add(schema)
            db.session.commit()
            
        
        return jsonify({
            'success': True,
            'schema': schema_data,
            'last_updated': schema.last_updated.isoformat() if schema.last_updated else None
        }), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error fetching schema: {str(e)}")
        return jsonify({
            'success': False,
            'message': f"Failed to fetch schema: {str(e)}"
        }), 500

# Helper function for error responses
def error_response(message, status_code=400, **kwargs):
    """Helper function to return error responses"""
    response_data = {'success': False, 'message': message}
    response_data.update(kwargs)
    return jsonify(response_data), status_code

@api_bp.route('/generate', methods=['POST'])
@token_required
def generate_query():
    """Generate SQL query from natural language"""
    data = request.get_json()
    
    if not data:
        return error_response('No data provided')
    
    # Get required parameters
    connection_id = data.get('connection_id')
    prompt = data.get('prompt')
    
    # Handle both model_type and model parameters (frontend sends 'model')
    model_type = data.get('model_type') or data.get('model', 'openai')  # Default to OpenAI
    print(f"[API] Getting explain plan with model_type={model_type}")
    
    if not all([connection_id, prompt]):
        return error_response('Missing required parameters')
    
    # Check subscription query limit
    current_user_id = request.current_user.id
    
    # Get user's subscription
    subscription = Subscription.query.filter_by(user_id=current_user_id).first()
    
    if subscription:
        # Get plan details
        plan = SubscriptionPlan.query.filter_by(plan_id=subscription.plan_id).first()
        
        # Get query usage for the current month
        today = datetime.utcnow()
        month_start = datetime(today.year, today.month, 1)
        
        # Count queries executed this month
        query_count = QueryUsage.query.filter(
            QueryUsage.user_id == current_user_id,
            QueryUsage.execution_time >= month_start
        ).count()
        
        # Get query limit from plan features
        query_limit = 10  # Default for free tier
        if plan and plan.features:
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
        # Special case: -1 means unlimited queries (for Enterprise plan)
        if query_limit != -1 and query_count >= query_limit:
            return error_response(
                'You have reached your monthly query limit. Please upgrade your plan to continue.',
                403,
                query_limit=query_limit,
                query_count=query_count
            )
    
    # Get database connection
    connection = DatabaseConnection.query.filter_by(
        id=connection_id, user_id=current_user.id
    ).first()
    
    if not connection:
        return error_response('Database connection not found', 404)
    
    # Decrypt password and create connection config (needed for both cached and non-cached paths)
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
        print(f"\n[DATABASE ROUTES] Adding Oracle service_name: {connection.service_name}\n")
    
    # Store the connection config in the app config for later use
    current_app.config['LAST_CONNECTION_CONFIG'] = connection_config
    
    # Get database schema
    schema = DatabaseSchema.query.filter_by(connection_id=connection_id).first()
    
    # Always fetch fresh schema from the database to ensure we have the most up-to-date information
    print(f"\n[DATABASE ROUTES] Fetching schema for {connection.db_type} connection ID {connection_id}\n")
    
    if not schema:
        print("Schema not found in DB, creating new schema record\n")

        # Get schema directly using our connector
        schema_data = connector.get_database_schema(connection.db_type, connection_config)
        
        if 'error' in schema_data:
            return error_response(f'Failed to get schema: {schema_data["error"]}', 500)
        
        # Create new schema record
        new_schema = DatabaseSchema(
            connection_id=connection_id,
            schema_name=connection.database_name,
            schema_data=json.dumps(schema_data)
        )
        
        db.session.add(new_schema)
        db.session.commit()
    else:
        print("Updating existing schema record\n")
        schema_data = json.loads(schema.schema_data)
    
    
    schema_data_obj = schema_data
    
    # Check if this is a cached query generation request
    # Note: We already imported QueryUsage, datetime, and timedelta at the top of the file
    
    # Look for a recent identical query generation in the last hour
    one_hour_ago = datetime.utcnow() - timedelta(hours=1)
    cached_query = QueryUsage.query.filter(
        QueryUsage.user_id == current_user_id,
        QueryUsage.query_text == prompt,  # Use the natural language prompt as the query text
        QueryUsage.query_type == 'generate',
        QueryUsage.execution_time >= one_hour_ago
    ).first()
    
    # Generate SQL query using AI model
    try:
        # Check model access based on subscription
        has_model_access = True  # Default to true for deepseek
        
        # Check subscription for premium models (openai and claude)
        if model_type.lower() in ['openai', 'claude']:
            # Get user's subscription plan
            if subscription and plan and plan.features:
                plan_features = plan.features
                if isinstance(plan_features, dict):
                    # Check for OpenAI access
                    if model_type.lower() == 'openai' and not plan_features.get('openai_models', False):
                        has_model_access = False
                    # Check for Claude access - only available on enterprise plan
                    elif model_type.lower() == 'claude' and not plan_features.get('claude_models', False):
                        has_model_access = False
                else:
                    # If features not properly defined, restrict access based on plan
                    if model_type.lower() == 'openai' and plan.plan_id not in ['professional', 'enterprise']:
                        has_model_access = False
                    elif model_type.lower() == 'claude' and plan.plan_id != 'enterprise':
                        has_model_access = False
            else:
                # No subscription or plan, restrict access to premium models
                has_model_access = False
        
        # If no access to requested model, fall back to deepseek
        if not has_model_access:
            print(f"[API] User does not have access to {model_type} model, falling back to deepseek")
            model_type = 'deepseek'
        
        # Get AI model
        model = AIModelFactory.get_model(model_type)
        
        # Get database configuration including flags and SQL modes
        db_config_result = connector.get_db_config(connection.db_type, connection_config)
        
        # Store the connection config in the app config for later use
        current_app.config['LAST_CONNECTION_CONFIG'] = connection_config
        
        # Start timer
        start_time = time.time()
        
        # Generate SQL query with database configuration information
        result = model.generate_sql(prompt, schema_data_obj, connection.db_type, db_config_result.get('config', {}))

        print("Result of AI model processing:", result)
        
        # Check if the HTTP request to the AI model was successful
        # Only count successful HTTP requests (200) against the user's quota
        http_success = result.get('http_success', True)  # Default to True for backward compatibility
        
        # Check if the response contains additional information besides the SQL query
        # This could be explanations, warnings, or other context from the AI model
        additional_info = None
        if 'additional_info' in result:
            additional_info = result['additional_info']
        
        # End timer
        end_time = time.time()
        execution_time = end_time - start_time
        
        if not result['success']:
            # Create query history with error
            # Set credit_consumed based on http_success flag - if the HTTP request was successful, a credit was consumed
            query_history = QueryHistory(
                user_id=current_user.id,
                connection_id=connection_id,
                natural_language_query=prompt,
                generated_sql='',
                execution_time=execution_time,
                is_successful=False,
                model_type=model_type,  # Store the model type even for failed queries
                credit_consumed=http_success and not cached_query,  # Credit consumed if HTTP request was successful and not cached
                error_message=result.get('error', 'We could not generate the SQL query for you. We are investigating the issue.')
            )
            
            db.session.add(query_history)
            db.session.commit()
            
            # Return 400 Bad Request instead of 500 Internal Server Error with credit consumption info
            return error_response(
                f'Failed to generate SQL query: {result.get("error", "Unknown error")}', 
                400, 
                credit_consumed=(http_success and not cached_query)  # Include credit consumption info in response
            )
        
        # Create query history for successful generation
        query_history = QueryHistory(
            user_id=current_user.id,
            connection_id=connection_id,
            natural_language_query=prompt,
            generated_sql=result['sql_query'],
            execution_time=execution_time,
            is_successful=True,
            model_type=model_type,  # Store the actual model used
            credit_consumed=http_success and not cached_query  # Credit consumed if HTTP request was successful and not cached
        )
        
        # Track query usage for subscription plan enforcement ONLY for successful HTTP requests
        # and only if it's not a cached query
        if not cached_query and http_success:
            # Create new query usage record
            query_usage = QueryUsage(
                user_id=current_user.id,
                execution_time=datetime.utcnow(),
                query_text=prompt,  # Store the natural language prompt
                connection_id=connection_id,
                query_type='generate',
                is_cached=False
            )
            
            # Add both records to the database
            db.session.add(query_history)
            db.session.add(query_usage)  # Only added for non-cached successful generations
            db.session.commit()
        else:
            # Update the timestamp on the cached query
            cached_query.execution_time = datetime.utcnow()
            
            # Add only the query history record
            db.session.add(query_history)
            db.session.commit()
        
        response_data = {
            'success': True,
            'query': result['sql_query'],
            'model': result['model'],
            'execution_time': execution_time,
            'query_id': query_history.id,
            'credit_consumed': http_success and not cached_query,  # Include credit consumption info in response
            'from_cache': result.get('from_cache', False)  # Include from_cache flag from the AI model result
        }
        
        # Include additional information if available
        if additional_info:
            response_data['additional_info'] = additional_info
            
        return jsonify(response_data)
    
    except Exception as e:
        return error_response(f'Error generating SQL query: {str(e)}', 500)