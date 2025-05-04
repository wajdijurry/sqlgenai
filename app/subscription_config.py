"""
Subscription plans and pricing configuration.
This file contains all subscription plan details including pricing, features, and limits.
Centralizing this configuration makes it easier to update pricing and plan details.
"""

# Subscription plans configuration
SUBSCRIPTION_PLANS = {
    'free': {
        'name': 'Free',
        'description': 'Free tier to try the service',
        'monthly_price': 0,
        'annual_price': 0,
        'features': {
            'query_limit': 10,
            'connection_limit': 1,
            'openai_models': False,
            'deepseek_models': True,
            'claude_models': False,
            'query_history_days': 7,
            'support_level': 'basic',
            'explain_limit': 10
        }
    },
    'basic': {
        'name': 'Basic',
        'description': 'Basic plan for individual users',
        'monthly_price': 9.99,
        'annual_price': 99.99,
        'features': {
            'query_limit': 100,
            'connection_limit': 3,
            'openai_models': False,
            'deepseek_models': True,
            'claude_models': False,
            'query_history_days': 30,
            'support_level': 'basic',
            'explain_limit': 50
        }
    },
    'professional': {
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
            'query_optimization': True,
            'explain_limit': 250
        }
    },
    'enterprise': {
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
            'custom_ai_training': True,
            'explain_limit': -1  # Unlimited
        }
    }
}

# Feature display names for frontend
FEATURE_DISPLAY_NAMES = {
    'query_limit': 'SQL queries per month',
    'connection_limit': 'database connections',
    'openai_models': 'OpenAI GPT model access',
    'deepseek_models': 'DeepSeek R1 model access',
    'claude_models': 'Claude 3 Opus model access',
    'query_history_days': 'Query history retention',
    'support_level': 'Support level',
    'advanced_schema_analysis': 'Advanced schema analysis',
    'query_optimization': 'Query optimization',
    'batch_processing': 'Batch processing',
    'custom_ai_training': 'Custom AI model training',
    'explain_limit': 'Explain plan analyses per month'
}

# Support level descriptions
SUPPORT_LEVELS = {
    'basic': 'Basic support',
    'priority': 'Priority support',
    'dedicated': 'Dedicated support'
}

# Upcoming features (marked with "soon" tag)
UPCOMING_FEATURES = [
    'batch_processing'
]
