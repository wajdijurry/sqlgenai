import os
import logging
from logging.handlers import TimedRotatingFileHandler
import pathlib
from datetime import timedelta
from flask import Flask, jsonify
from flask_login import LoginManager
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from dotenv import load_dotenv

# Load environment variables at the module level
# This ensures they're available before any other imports
load_dotenv()

# Import database and login manager from extensions module
from app.extensions import db, migrate, login_manager

# Configure logging function

def configure_logging(app):
    """Configure logging to stderr for production use"""
    # Set up a simple stderr handler
    handler = logging.StreamHandler()
    
    # Set formatter
    formatter = logging.Formatter(
        '[%(asctime)s] %(levelname)s in %(module)s: %(message)s'
    )
    handler.setFormatter(formatter)
    
    # Set log level based on app debug setting
    if app.debug:
        handler.setLevel(logging.DEBUG)
        app.logger.setLevel(logging.DEBUG)
    else:
        handler.setLevel(logging.INFO)
        app.logger.setLevel(logging.INFO)
    
    # Remove default handlers if present
    if app.logger.hasHandlers():
        app.logger.handlers.clear()
    
    # Add our handler
    app.logger.addHandler(handler)
    
    # Log startup message
    app.logger.info('Logging configured to stderr')

def create_app(config_name=None):
    """Application factory pattern for Flask app"""
    app = Flask(__name__)
    # This prevents duplicate headers and simplifies the application
    
    # Configure logging
    configure_logging(app)
    
    # Log application startup
    app.logger.info("Starting application initialization")
    
    # Load configuration
    if config_name is None:
        config_name = os.environ.get('FLASK_ENV', 'development')

    # Debug configuration
    app.config['DEBUG'] = os.environ.get('FLASK_DEBUG', 'false').lower() == 'true'
    app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=1)

    # App configuration
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY') 
    app.config['FRONTEND_URL'] = os.environ.get('FRONTEND_URL', 'http://localhost:3001')  
    
    # Database configuration - get from environment with fallback
    database_url = os.environ.get('DATABASE_URL')
    if not database_url:
        app.logger.error("DATABASE_URL environment variable is not set. Check your .env file and server configuration.")
        app.logger.error(f"Current environment variables: {[k for k in os.environ.keys() if k not in ['SECRET_KEY', 'STRIPE_SECRET_KEY', 'OPENAI_API_KEY', 'GOOGLE_CLIENT_SECRET']]}")
        app.logger.error(f"Current working directory: {os.getcwd()}")
        raise ValueError("DATABASE_URL environment variable is not set. See logs for details.")
    
    app.config['SQLALCHEMY_DATABASE_URI'] = database_url
    
    # Log the database URL (securely)
    masked_url = database_url.split('@')[0].split('://')[0] + '://*****@' + (database_url.split('@')[1] if '@' in database_url else 'localhost/db')
    app.logger.info(f"Database URL set to: {masked_url}")
    
    # Other database settings
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    # Session security settings
    app.config['SESSION_COOKIE_SECURE'] = True
    app.config['REMEMBER_COOKIE_SECURE'] = True
    app.config['SESSION_COOKIE_HTTPONLY'] = True
    app.config['REMEMBER_COOKIE_HTTPONLY'] = True
    
    # Set Stripe configuration
    app.config['STRIPE_SECRET_KEY'] = os.environ.get('STRIPE_SECRET_KEY')
    app.config['STRIPE_PUBLISHABLE_KEY'] = os.environ.get('STRIPE_PUBLISHABLE_KEY')
    app.config['STRIPE_WEBHOOK_SECRET'] = os.environ.get('STRIPE_WEBHOOK_SECRET', '')
    
    # Set AI model configuration
    app.config['OPENAI_API_KEY'] = os.environ.get('OPENAI_API_KEY')
    app.config['OPENAI_MODEL'] = os.environ.get('OPENAI_MODEL', 'gpt-4o')
    app.config['DEEPSEEK_API_KEY'] = os.environ.get('DEEPSEEK_API_KEY')
    app.config['DEEPSEEK_MODEL'] = os.environ.get('DEEPSEEK_MODEL', 'deepseek-chat')
    app.config['CLAUDE_3_OPUS_API_KEY'] = os.environ.get('CLAUDE_3_OPUS_API_KEY')
    app.config['CLAUDE_3_OPUS_MODEL'] = os.environ.get('CLAUDE_3_OPUS_MODEL', 'claude-3-opus-20240229')
    
    # Redis configuration
    app.config['REDIS_URL'] = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')
    app.config['REDIS_CACHE_ENABLED'] = os.environ.get('REDIS_CACHE_ENABLED', 'true').lower() == 'true'
    
    # Set Google OAuth configuration
    app.config['GOOGLE_CLIENT_ID'] = os.environ.get('GOOGLE_CLIENT_ID')
    app.config['GOOGLE_CLIENT_SECRET'] = os.environ.get('GOOGLE_CLIENT_SECRET')
    app.config['GOOGLE_DISCOVERY_URL'] = 'https://accounts.google.com/.well-known/openid-configuration'
    app.config['GOOGLE_REDIRECT_URI'] = os.environ.get('GOOGLE_REDIRECT_URI')
    
    # Log application configuration
    app.logger.info("Application configuration:")
    # Log non-sensitive configuration values
    safe_config = {
        'DEBUG': app.config['DEBUG'],
        'PERMANENT_SESSION_LIFETIME': app.config['PERMANENT_SESSION_LIFETIME'],
        'FRONTEND_URL': app.config['FRONTEND_URL'],
        'SESSION_COOKIE_SECURE': app.config['SESSION_COOKIE_SECURE'],
        'REMEMBER_COOKIE_SECURE': app.config['REMEMBER_COOKIE_SECURE'],
        'SESSION_COOKIE_HTTPONLY': app.config['SESSION_COOKIE_HTTPONLY'],
        'REMEMBER_COOKIE_HTTPONLY': app.config['REMEMBER_COOKIE_HTTPONLY'],
        'SQLALCHEMY_TRACK_MODIFICATIONS': app.config['SQLALCHEMY_TRACK_MODIFICATIONS'],
        'REDIS_CACHE_ENABLED': app.config['REDIS_CACHE_ENABLED'],
        'OPENAI_MODEL': app.config['OPENAI_MODEL'],
        'DEEPSEEK_MODEL': app.config['DEEPSEEK_MODEL'],
        'CLAUDE_3_OPUS_MODEL': app.config['CLAUDE_3_OPUS_MODEL'],
        'GOOGLE_DISCOVERY_URL': app.config['GOOGLE_DISCOVERY_URL']
    }
    
    # Log each configuration item
    for key, value in safe_config.items():
        app.logger.info(f"Config: {key} = {value}")
    
    # Log which sensitive keys are set (without values)
    sensitive_keys = [
        'SECRET_KEY', 'SQLALCHEMY_DATABASE_URI', 'STRIPE_SECRET_KEY',
        'STRIPE_PUBLISHABLE_KEY', 'STRIPE_WEBHOOK_SECRET', 'OPENAI_API_KEY',
        'DEEPSEEK_API_KEY', 'CLAUDE_3_OPUS_API_KEY', 'REDIS_URL',
        'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REDIRECT_URI'
    ]
    
    for key in sensitive_keys:
        app.logger.info(f"Sensitive config: {key} is {'set' if app.config.get(key) else 'not set'}")
    
    # Initialize extensions with the app
    # This must be done BEFORE registering blueprints
    from app.extensions import db, migrate, login_manager, init_app
    
    # Initialize all extensions
    init_app(app)
    app.logger.info("Extensions initialized successfully")
    
    # Create an application context for database operations
    with app.app_context():
        # Import models to ensure they're registered with SQLAlchemy
        from app.auth.models import User, Subscription, PaymentHistory, SubscriptionPlan, QueryUsage
        from app.database.models import DatabaseConnection, DatabaseSchema, QueryHistory
        
        # Initialize soft delete functionality
        from app.utils.soft_delete import initialize_soft_delete
        initialize_soft_delete(db)
        
        app.logger.info("Database models registered and initialized successfully")
        
    # Initialize Redis cache if enabled
    if app.config.get('REDIS_CACHE_ENABLED', True):
        try:
            from app.utils.redis_cache import RedisCache
            with app.app_context():
                RedisCache.initialize()
                app.logger.info("Redis cache initialized successfully")
        except Exception as e:
            app.logger.warning(f"Error initializing Redis cache: {str(e)}. Falling back to file-based cache.")
    
    # Import models to ensure they're registered with SQLAlchemy
    from app.auth.models import User, Subscription, PaymentHistory, SubscriptionPlan
    from app.database.models import DatabaseConnection, DatabaseSchema, QueryHistory
    
    # Set up login view for API
    login_manager.login_view = 'auth.login'
    login_manager.login_message_category = 'info'
    
    # Configure login manager to handle API authentication
    @login_manager.unauthorized_handler
    def unauthorized():
        return jsonify({
            'success': False,
            'message': 'Authentication required',
            'authenticated': False
        }), 401
    
    # Register blueprints - do this AFTER database initialization
    app.logger.info("Registering blueprints...")
    
    # Auth blueprints
    from app.auth import auth_bp
    app.register_blueprint(auth_bp, url_prefix='/auth')
    app.logger.info("Registered auth blueprint")
    
    # Google auth blueprint
    from app.auth.google_routes import google_bp
    app.register_blueprint(google_bp)
    app.logger.info("Registered Google auth blueprint")
    
    # API blueprint
    from app.api import api_bp
    app.register_blueprint(api_bp)
    app.logger.info("Registered API blueprint")
    
    # Webhooks blueprint
    from app.api.webhooks import webhook_bp
    app.register_blueprint(webhook_bp, url_prefix='/webhooks')
    app.logger.info("Registered webhooks blueprint")
    
    # Database blueprint
    from app.database import database_bp
    app.register_blueprint(database_bp, url_prefix='/database')
    app.logger.info("Registered database blueprint")
    
    # Register main routes
    from app.routes import init_app
    init_app(app)
    
    return app
