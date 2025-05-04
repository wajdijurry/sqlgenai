from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate

# Initialize SQLAlchemy
db = SQLAlchemy()
migrate = Migrate()

def init_db(app):
    """Initialize the database with the Flask app"""
    db.init_app(app)
    migrate.init_app(app, db)
    
    # Initialize models
    from app.auth.models import User, Subscription, PaymentHistory, SubscriptionPlan, QueryUsage
    from app.database.models import DatabaseConnection, DatabaseSchema, QueryHistory
    
    # Initialize soft delete functionality
    from app.utils.soft_delete import initialize_soft_delete
    initialize_soft_delete(db)
    
    return db
