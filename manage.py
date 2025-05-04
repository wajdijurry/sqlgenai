#!/usr/bin/env python
import os
from flask_migrate import Migrate, MigrateCommand
from flask.cli import FlaskGroup

from app import create_app
from app import db
from app.auth.models import User, Subscription, PaymentHistory
from app.database.models import DatabaseConnection, DatabaseSchema, QueryHistory

app = create_app()
cli = FlaskGroup(app)

@cli.command("create_tables")
def create_tables():
    """Create all database tables."""
    db.create_all()
    print("Tables created successfully.")

@cli.command("drop_tables")
def drop_tables():
    """Drop all database tables."""
    if input("Are you sure you want to drop all tables? (y/n): ").lower() == 'y':
        db.drop_all()
        print("Tables dropped successfully.")
    else:
        print("Operation cancelled.")

@cli.command("init_db")
def init_db():
    """Initialize the database with required data."""
    # Check if admin user exists
    admin = User.query.filter_by(email='admin@sqlgenai.com').first()
    if not admin:
        # Create admin user
        admin = User(
            email='admin@sqlgenai.com',
            username='admin',
            is_admin=True,
            is_active=True,
            first_name='Admin',
            last_name='User'
        )
        admin.set_password('admin123')  # Change this in production
        db.session.add(admin)
        db.session.commit()
        print("Admin user created.")
    else:
        print("Admin user already exists.")

if __name__ == '__main__':
    cli()
