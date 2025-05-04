import os
from datetime import timedelta

class Config:
    """Base configuration class"""
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-key-please-change-in-production')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Session configuration
    PERMANENT_SESSION_LIFETIME = timedelta(days=1)
    
    # AI Model configuration
    OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY', '')
    OPENAI_MODEL = os.environ.get('OPENAI_MODEL', 'gpt-4')
    DEEPSEEK_API_KEY = os.environ.get('DEEPSEEK_API_KEY', '')
    DEEPSEEK_MODEL = os.environ.get('DEEPSEEK_MODEL', 'deepseek-coder-r1')
    
    # AI Caching configuration
    ENABLE_AI_CACHE = os.environ.get('ENABLE_AI_CACHE', 'true').lower() == 'true'
    AI_CACHE_TTL_DAYS = int(os.environ.get('AI_CACHE_TTL_DAYS', '30'))
    
    # Redis configuration
    REDIS_URL = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')
    REDIS_CACHE_ENABLED = os.environ.get('REDIS_CACHE_ENABLED', 'true').lower() == 'true'
    
    # Stripe configuration (for payment simulation)
    STRIPE_SECRET_KEY = os.environ.get('STRIPE_SECRET_KEY', '')
    STRIPE_PUBLISHABLE_KEY = os.environ.get('STRIPE_PUBLISHABLE_KEY', '')
    
    # Subscription plans
    SUBSCRIPTION_PLANS = {
        'basic': {
            'name': 'Basic',
            'price_monthly': 9.99,
            'price_yearly': 99.99,
            'features': [
                'Connect up to 3 databases',
                'Generate up to 100 queries per month',
                'Basic AI model access'
            ]
        },
        'professional': {
            'name': 'Professional',
            'price_monthly': 19.99,
            'price_yearly': 199.99,
            'features': [
                'Connect up to 10 databases',
                'Generate up to 500 queries per month',
                'Advanced AI model access',
                'Query history and favorites'
            ]
        },
        'enterprise': {
            'name': 'Enterprise',
            'price_monthly': 49.99,
            'price_yearly': 499.99,
            'features': [
                'Unlimited database connections',
                'Unlimited query generation',
                'Premium AI model access',
                'Priority support',
                'Team collaboration features'
            ]
        }
    }


class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL', 'mysql+pymysql://sqlgenai:sqlgenai_password@mysql/sqlgenai')


class TestingConfig(Config):
    """Testing configuration"""
    TESTING = True
    SQLALCHEMY_DATABASE_URI = os.environ.get('TEST_DATABASE_URL', 'sqlite:///test.db')
    WTF_CSRF_ENABLED = False


class ProductionConfig(Config):
    """Production configuration"""
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL')
    
    # Security settings for production
    SESSION_COOKIE_SECURE = True
    REMEMBER_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    REMEMBER_COOKIE_HTTPONLY = True
