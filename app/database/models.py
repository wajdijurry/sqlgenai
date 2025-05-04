from app.extensions import db
from datetime import datetime
from flask_login import UserMixin
from app.utils.soft_delete import SoftDeleteMixin
from app.extensions import db

class DatabaseConnection(SoftDeleteMixin, db.Model):
    """Model for storing database connection information"""
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.String(255))
    db_type = db.Column(db.String(50), nullable=False)  # mysql, postgresql, sqlserver, etc.
    host = db.Column(db.String(255), nullable=False)
    port = db.Column(db.Integer, nullable=False)
    database_name = db.Column(db.String(100), nullable=False)  # SID for Oracle
    service_name = db.Column(db.String(100))  # Service name for Oracle connections
    schema_name = db.Column(db.String(100))  # Schema name for PostgreSQL connections
    username = db.Column(db.String(100), nullable=False)
    password = db.Column(db.String(255), nullable=False)  # Will be encrypted
    has_empty_password = db.Column(db.Boolean, default=False)  # Flag for connections with intentionally empty passwords
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    
    # Relationship
    user = db.relationship('User', backref=db.backref('database_connections', lazy=True))
    
    def __repr__(self):
        return f"<DatabaseConnection {self.name}>"


class DatabaseSchema(SoftDeleteMixin, db.Model):
    """Model for caching database schema information"""
    id = db.Column(db.Integer, primary_key=True)
    connection_id = db.Column(db.Integer, db.ForeignKey('database_connection.id'), nullable=False, unique=True)
    schema_name = db.Column(db.String(100), nullable=False)
    schema_data = db.Column(db.Text(length=16777215), nullable=False)  # JSON data of schema (using MEDIUMTEXT)
    last_updated = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship
    connection = db.relationship('DatabaseConnection', backref=db.backref('schemas', lazy=True))
    
    def __repr__(self):
        return f"<DatabaseSchema {self.schema_name}>"


class QueryHistory(SoftDeleteMixin, db.Model):
    """Model for storing query history"""
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    connection_id = db.Column(db.Integer, db.ForeignKey('database_connection.id'), nullable=False)
    natural_language_query = db.Column(db.Text, nullable=False)
    generated_sql = db.Column(db.Text, nullable=False)
    execution_time = db.Column(db.Float)  # in seconds
    is_successful = db.Column(db.Boolean, default=True)
    error_message = db.Column(db.Text)
    is_favorite = db.Column(db.Boolean, default=False)
    model_type = db.Column(db.String(50), nullable=True)  # Store which AI model was used
    credit_consumed = db.Column(db.Boolean, default=False)  # Track if a credit was consumed for this query
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User', backref=db.backref('query_history', lazy=True))
    connection = db.relationship('DatabaseConnection', backref=db.backref('queries', lazy=True))
    
    def __repr__(self):
        return f"<QueryHistory {self.id}>"
