from app.extensions import db
from app.extensions import login_manager
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
import uuid
from app.utils.soft_delete import SoftDeleteMixin

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

class User(UserMixin, SoftDeleteMixin, db.Model):
    """User model for authentication and profile information"""
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(128))
    first_name = db.Column(db.String(50))
    last_name = db.Column(db.String(50))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)
    is_admin = db.Column(db.Boolean, default=False)
    
    # Profile information
    company = db.Column(db.String(100))
    job_title = db.Column(db.String(100))
    
    # Authentication token for API access
    auth_token = db.Column(db.String(128), unique=True, nullable=True)
    
    def __repr__(self):
        return f'<User {self.username}>'
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)


class Subscription(SoftDeleteMixin, db.Model):
    """Subscription model for user subscription plans"""
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    plan_id = db.Column(db.String(50), nullable=False)  # basic, professional, enterprise
    status = db.Column(db.String(20), nullable=False)  # active, canceled, expired
    start_date = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    end_date = db.Column(db.DateTime, nullable=False)
    is_annual = db.Column(db.Boolean, default=False)
    subscription_id = db.Column(db.String(100), unique=True)  # External subscription ID (e.g., Stripe)
    
    # Relationship
    user = db.relationship('User', backref=db.backref('subscription', uselist=False))
    
    def __init__(self, *args, **kwargs):
        super(Subscription, self).__init__(*args, **kwargs)
        if not self.subscription_id:
            self.subscription_id = str(uuid.uuid4())
    
    def __repr__(self):
        return f'<Subscription {self.plan_id} for User {self.user_id}>'
    
    def is_active(self):
        """Check if subscription is active"""
        return self.status == 'active' and self.end_date > datetime.utcnow()


class PaymentHistory(SoftDeleteMixin, db.Model):
    """Payment history model for tracking subscription payments"""
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    subscription_id = db.Column(db.Integer, db.ForeignKey('subscription.id'), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    currency = db.Column(db.String(3), nullable=False, default='USD')
    payment_date = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    payment_method = db.Column(db.String(50))  # credit_card, paypal, etc.
    transaction_id = db.Column(db.String(100), unique=True)
    status = db.Column(db.String(20), nullable=False)  # success, failed, refunded
    
    # Relationships
    user = db.relationship('User', backref=db.backref('payments', lazy=True))
    subscription = db.relationship('Subscription', backref=db.backref('payments', lazy=True))
    
    def __init__(self, *args, **kwargs):
        super(PaymentHistory, self).__init__(*args, **kwargs)
        if not self.transaction_id:
            self.transaction_id = str(uuid.uuid4())
    
    def __repr__(self):
        return f'<PaymentHistory {self.transaction_id}>'


class SubscriptionPlan(SoftDeleteMixin, db.Model):
    """Subscription plan model for defining available subscription plans"""
    id = db.Column(db.Integer, primary_key=True)
    plan_id = db.Column(db.String(50), unique=True, nullable=False)  # basic, professional, enterprise
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    monthly_price = db.Column(db.Float, nullable=False)
    annual_price = db.Column(db.Float, nullable=False)
    features = db.Column(db.JSON, nullable=False, default={})
    limitations = db.Column(db.JSON, nullable=False, default={})
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<SubscriptionPlan {self.name}>'


class QueryUsage(SoftDeleteMixin, db.Model):
    """Query usage model for tracking SQL query execution for subscription plan enforcement"""
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    execution_time = db.Column(db.DateTime, default=datetime.utcnow)
    query_text = db.Column(db.Text)  # Store the SQL query for auditing
    connection_id = db.Column(db.Integer, db.ForeignKey('database_connection.id'))
    query_type = db.Column(db.String(20), default='execute')  # 'execute', 'explain', etc.
    is_cached = db.Column(db.Boolean, default=False)  # Whether this was a cached result
    
    # Relationships
    user = db.relationship('User', backref=db.backref('query_usage', lazy=True))
    
    def __repr__(self):
        return f'<QueryUsage {self.id} - User {self.user_id} - {self.query_type}>'
