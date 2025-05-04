import os
from flask import Flask, jsonify
from flask_login import LoginManager
from flask_cors import CORS
from app.utils.cors import cors_after_request

# Initialize extensions
login_manager = LoginManager()

def create_app(config_name=None):
    """Application factory pattern for Flask app"""
    app = Flask(__name__)
    # Configure CORS with specific origins
    CORS(app, 
        resources={r"/*": {
            "origins": [
                "http://localhost:3001", 
                "http://host.docker.internal:3001",
                "http://127.0.0.1:3001",
                "http://frontend:3001",
                "http://sqlgenai.com",
                "http://www.sqlgenai.com",
                "http://api.sqlgenai.com",
            ],
            "allow_headers": ["Content-Type", "Authorization", "X-Requested-With"],
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "supports_credentials": True,
            "expose_headers": ["Content-Type", "Authorization"]
        }},
        supports_credentials=True
    )
    
    # Register after_request handler for CORS
    app.after_request(cors_after_request)
    
    # Load configuration
    if config_name is None:
        config_name = os.environ.get('FLASK_CONFIG', 'development')
    
    app.config.from_object(f'config.{config_name.capitalize()}Config')
    
    # Configure session to work across domains
    app.config['SESSION_COOKIE_SECURE'] = False
    app.config['SESSION_COOKIE_HTTPONLY'] = True
    app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
    
    # Set Stripe configuration
    app.config['STRIPE_SECRET_KEY'] = os.environ.get('STRIPE_SECRET_KEY')
    app.config['STRIPE_PUBLISHABLE_KEY'] = os.environ.get('STRIPE_PUBLISHABLE_KEY')
    app.config['STRIPE_WEBHOOK_SECRET'] = os.environ.get('STRIPE_WEBHOOK_SECRET', '')
    app.config['FRONTEND_URL'] = os.environ.get('FRONTEND_URL', 'http://localhost:3001')
    
    # Set AI model configuration
    app.config['OPENAI_API_KEY'] = os.environ.get('OPENAI_API_KEY')
    app.config['OPENAI_MODEL'] = os.environ.get('OPENAI_MODEL', 'gpt-4o')
    app.config['DEEPSEEK_API_KEY'] = os.environ.get('DEEPSEEK_API_KEY')
    app.config['DEEPSEEK_MODEL'] = os.environ.get('DEEPSEEK_MODEL', 'deepseek-chat')
    app.config['CLAUDE_3_OPUS_API_KEY'] = os.environ.get('CLAUDE_3_OPUS_API_KEY')
    app.config['CLAUDE_3_OPUS_MODEL'] = os.environ.get('CLAUDE_3_OPUS_MODEL', 'claude-3-opus-20240229')
    app.config['ENABLE_AI_CACHE'] = os.environ.get('ENABLE_AI_CACHE', 'true').lower() == 'true'
    
    # Redis configuration
    app.config['REDIS_URL'] = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')
    app.config['REDIS_CACHE_ENABLED'] = os.environ.get('REDIS_CACHE_ENABLED', 'true').lower() == 'true'
    
    # Set Google OAuth configuration
    app.config['GOOGLE_CLIENT_ID'] = os.environ.get('GOOGLE_CLIENT_ID')
    app.config['GOOGLE_CLIENT_SECRET'] = os.environ.get('GOOGLE_CLIENT_SECRET')
    app.config['GOOGLE_DISCOVERY_URL'] = 'https://accounts.google.com/.well-known/openid-configuration'
    app.config['GOOGLE_REDIRECT_URI'] = os.environ.get('GOOGLE_REDIRECT_URI')
    
    # Initialize extensions with app
    login_manager.init_app(app)
    
    # Initialize database with soft delete functionality
    from app.utils.db_init import init_db
    with app.app_context():
        init_db(app)
        
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
    
    # Register blueprints
    from app.auth import auth_bp
    app.register_blueprint(auth_bp, url_prefix='/auth')
    
    # Register Google auth blueprint
    from app.auth.google_routes import google_bp
    app.register_blueprint(google_bp)
    
    from app.api import api_bp
    app.register_blueprint(api_bp)
    
    from app.api.webhooks import webhook_bp
    app.register_blueprint(webhook_bp, url_prefix='/webhooks')
    
    from app.database import database_bp
    app.register_blueprint(database_bp, url_prefix='/database')
    
    # Register main routes
    from app.routes import init_app
    init_app(app)
    
    return app
