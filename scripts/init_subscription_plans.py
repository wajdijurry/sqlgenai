"""
Initialize subscription plans in the database.
This script should be run once to set up the initial subscription plans.
"""
import os
import sys
from datetime import datetime

# Add the parent directory to the path so we can import from the app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app, db
from app.auth.models import SubscriptionPlan

def init_subscription_plans():
    """Initialize subscription plans in the database"""
    # Create Flask app with application context
    app = create_app()
    
    with app.app_context():
        # Check if plans already exist
        existing_plans = SubscriptionPlan.query.all()
        if existing_plans:
            print(f"Found {len(existing_plans)} existing plans. Skipping initialization.")
            for plan in existing_plans:
                print(f"- {plan.name} ({plan.plan_id}): ${plan.monthly_price}/month, ${plan.annual_price}/year")
            return
        
        # Define the subscription plans
        plans = [
            {
                'plan_id': 'basic',
                'name': 'Basic',
                'description': 'Basic plan for individual users',
                'monthly_price': 9.99,
                'annual_price': 99.99,
                'features': {
                    'query_limit': 100,
                    'connection_limit': 3,
                    'openai_models': True,
                    'deepseek_models': False,
                    'claude_models': False,
                    'query_history_days': 30,
                    'support_level': 'basic'
                },
                'is_active': True
            },
            {
                'plan_id': 'professional',
                'name': 'Professional',
                'description': 'Professional plan for power users',
                'monthly_price': 29.99,
                'annual_price': 299.99,
                'features': {
                    'query_limit': 500,
                    'connection_limit': 10,
                    'openai_models': True,
                    'deepseek_models': True,
                    'claude_models': False,
                    'query_history_days': 90,
                    'support_level': 'priority',
                    'advanced_schema_analysis': True,
                    'query_optimization': True
                },
                'is_active': True
            },
            {
                'plan_id': 'enterprise',
                'name': 'Enterprise',
                'description': 'Enterprise plan for organizations',
                'monthly_price': 99.99,
                'annual_price': 999.99,
                'features': {
                    'query_limit': -1,  # Unlimited
                    'connection_limit': -1,  # Unlimited
                    'openai_models': True,
                    'deepseek_models': True,
                    'claude_models': True,  # Only Enterprise has access to Claude 3
                    'query_history_days': -1,  # Unlimited
                    'support_level': 'dedicated',
                    'advanced_schema_analysis': True,
                    'query_optimization': True,
                    'batch_processing': True,
                    'custom_ai_training': True
                },
                'is_active': True
            }
        ]
        
        # Create the plans in the database
        for plan_data in plans:
            plan = SubscriptionPlan(
                plan_id=plan_data['plan_id'],
                name=plan_data['name'],
                description=plan_data['description'],
                monthly_price=plan_data['monthly_price'],
                annual_price=plan_data['annual_price'],
                features=plan_data['features'],
                is_active=plan_data['is_active'],
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            db.session.add(plan)
        
        # Commit the changes
        db.session.commit()
        
        print(f"Successfully created {len(plans)} subscription plans:")
        for plan in plans:
            print(f"- {plan['name']} ({plan['plan_id']}): ${plan['monthly_price']}/month, ${plan['annual_price']}/year")

if __name__ == '__main__':
    init_subscription_plans()
