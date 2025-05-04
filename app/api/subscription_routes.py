"""
Subscription routes for the SQLGenAI API.
These routes handle subscription management using Stripe.
"""
from flask import request, jsonify, current_app
from flask_login import current_user
import stripe
import secrets
from datetime import datetime, timedelta
import logging

from app.utils.db_init import db
from app.api import api_bp
from app.auth.models import Subscription, SubscriptionPlan, PaymentHistory, QueryUsage
from app.utils.auth import token_required
from app.subscription_config import SUBSCRIPTION_PLANS, FEATURE_DISPLAY_NAMES, SUPPORT_LEVELS, UPCOMING_FEATURES

# Set up logging
logger = logging.getLogger(__name__)

@api_bp.route('/subscription/plans/config', methods=['GET'])
def get_subscription_plans_config():
    """Get all available subscription plans with pricing and features"""
    formatted_plans = []
    
    for plan_id, plan_data in SUBSCRIPTION_PLANS.items():
        # Format features for frontend display
        features = []
        limitations = []
        
        for feature_key, feature_value in plan_data['features'].items():
            # Handle special cases like query_limit and connection_limit
            if feature_key == 'query_limit':
                if feature_value == -1:
                    features.append({'text': 'Unlimited SQL queries', 'value': feature_value})
                else:
                    features.append({'text': f'Up to {feature_value} SQL queries per month', 'value': feature_value})
            elif feature_key == 'explain_limit':
                if feature_value == -1:
                    features.append({'text': 'Unlimited explain plan analyses', 'value': feature_value})
                else:
                    features.append({'text': f'Up to {feature_value} explain plan analyses per month', 'value': feature_value})
            elif feature_key == 'connection_limit':
                if feature_value == -1:
                    features.append({'text': 'Unlimited database connections', 'value': feature_value})
                else:
                    features.append({'text': f'Up to {feature_value} database connections', 'value': feature_value})
            elif feature_key == 'query_history_days':
                if feature_value == -1:
                    features.append({'text': 'Query history (unlimited)', 'value': feature_value})
                else:
                    features.append({'text': f'Query history ({feature_value} days)', 'value': feature_value})
            elif feature_key == 'support_level':
                features.append({'text': SUPPORT_LEVELS.get(feature_value, 'Support'), 'value': feature_value})
            # Handle boolean features
            elif isinstance(feature_value, bool):
                display_name = FEATURE_DISPLAY_NAMES.get(feature_key, feature_key.replace('_', ' ').title())
                
                # Check if this is an upcoming feature
                is_upcoming = feature_key in UPCOMING_FEATURES
                
                if feature_value:
                    if is_upcoming:
                        features.append({'text': display_name, 'value': feature_value, 'tag': 'soon'})
                    else:
                        features.append({'text': display_name, 'value': feature_value})
                else:
                    # Add to limitations if the feature is not available
                    if is_upcoming:
                        limitations.append({'text': f'No {display_name}', 'value': feature_value, 'tag': 'soon'})
                    else:
                        limitations.append({'text': f'No {display_name}', 'value': feature_value})
        
        # Extract text from feature objects to avoid React rendering issues
        simplified_features = []
        for feature in features:
            if isinstance(feature, dict) and 'text' in feature:
                # If it has a 'tag' property, keep the object structure but ensure it's React-friendly
                if 'tag' in feature:
                    simplified_features.append({
                        'text': feature['text'],
                        'tag': feature['tag']
                    })
                else:
                    # Otherwise just use the text string
                    simplified_features.append(feature['text'])
            else:
                simplified_features.append(feature)
        
        # Do the same for limitations
        simplified_limitations = []
        for limitation in limitations:
            if isinstance(limitation, dict) and 'text' in limitation:
                # If it has a 'tag' property, keep the object structure but ensure it's React-friendly
                if 'tag' in limitation:
                    simplified_limitations.append({
                        'text': limitation['text'],
                        'tag': limitation['tag']
                    })
                else:
                    # Otherwise just use the text string
                    simplified_limitations.append(limitation['text'])
            else:
                simplified_limitations.append(limitation)
        
        # Create formatted plan object
        formatted_plan = {
            'id': plan_id,
            'name': plan_data['name'],
            'description': plan_data['description'],
            'monthlyPrice': plan_data['monthly_price'],
            'annualPrice': plan_data['annual_price'],
            'features': simplified_features,
            'limitations': simplified_limitations
        }
        
        formatted_plans.append(formatted_plan)
    
    return jsonify({
        'success': True,
        'plans': formatted_plans
    })

@api_bp.route('/subscription', methods=['GET'])
@token_required
def get_subscription():
    """Get current user's subscription with query usage information"""
    # Get current user from request object (set by token_required decorator)
    current_user = request.current_user
    subscription = Subscription.query.filter_by(user_id=current_user.id).first()
    
    if not subscription:
        return jsonify({
            'success': False,
            'message': 'No subscription found'
        }), 404
    
    # Get plan details - using filter_by instead of get to query by plan_id column
    plan = SubscriptionPlan.query.filter_by(plan_id=subscription.plan_id).first()
    
    # Get query usage for the current month
    today = datetime.utcnow()
    month_start = datetime(today.year, today.month, 1)
    
    # Count total queries executed this month
    query_count = QueryUsage.query.filter(
        QueryUsage.user_id == current_user.id,
        QueryUsage.execution_time >= month_start
    ).count()
    
    # Count generate queries
    generate_count = QueryUsage.query.filter(
        QueryUsage.user_id == current_user.id,
        QueryUsage.execution_time >= month_start,
        QueryUsage.query_type == 'generate'
    ).count()
    
    # Count explain queries
    explain_count = QueryUsage.query.filter(
        QueryUsage.user_id == current_user.id,
        QueryUsage.execution_time >= month_start,
        QueryUsage.query_type == 'explain'
    ).count()
    
    # Count execute queries
    execute_count = QueryUsage.query.filter(
        QueryUsage.user_id == current_user.id,
        QueryUsage.execution_time >= month_start,
        QueryUsage.query_type == 'execute'
    ).count()
    
    # AI credits are the sum of generate and explain queries
    ai_credits_count = generate_count + explain_count
    
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
                query_limit = 9999999  # Effectively unlimited for enterprise
    
    return jsonify({
        'success': True,
        'subscription': {
            'id': subscription.id,
            'plan_id': subscription.plan_id,
            'plan_name': plan.name if plan else 'Unknown',
            'status': subscription.status,
            'is_annual': subscription.is_annual,
            'start_date': subscription.start_date.isoformat() if subscription.start_date else None,
            'end_date': subscription.end_date.isoformat() if subscription.end_date else None,
            'features': plan.features if plan else {},
            'query_usage': {
                'monthly_count': query_count,
                'limit': query_limit,
                'ai_credits_count': ai_credits_count,
                'generate_count': generate_count,
                'explain_count': explain_count,
                'execute_count': execute_count
            }
        }
    })

@api_bp.route('/subscription/plans', methods=['GET'])
@token_required
def get_subscription_plans():
    """Get available subscription plans with can_select flag based on user's current subscription"""
    plans = SubscriptionPlan.query.all()
    
    # Get current user from request object (set by token_required decorator)
    current_user = request.current_user
    
    # Check user's subscription
    current_subscription = None
    current_plan = None
    
    current_subscription = Subscription.query.filter_by(user_id=current_user.id).first()
    if current_subscription:
        current_plan = SubscriptionPlan.query.filter_by(plan_id=current_subscription.plan_id).first()
        print(f"Found current plan: {current_plan.plan_id} with price {current_plan.monthly_price}")
    
    plan_list = []
    for plan in plans:
        # Determine if the plan can be selected based on current subscription
        can_select = True
        
        # If user has a subscription and the plan is lower tier (lower monthly price),
        # mark it as not selectable (can't downgrade)
        if current_plan and plan.monthly_price < current_plan.monthly_price:
            can_select = False
            
        plan_data = {
            'id': plan.id,
            'plan_id': plan.plan_id,
            'name': plan.name,
            'description': plan.description,
            'monthly_price': plan.monthly_price,
            'annual_price': plan.annual_price,
            'features': plan.features,
            'limitations': plan.limitations,
            'can_select': can_select
        }
        plan_list.append(plan_data)
    
    return jsonify({
        'success': True,
        'plans': plan_list
    })

@api_bp.route('/subscription/checkout', methods=['POST'])
@token_required
def create_checkout_session():
    """Create a Stripe checkout session for subscription"""
    # Get current user from request object (set by token_required decorator)
    current_user = request.current_user
    data = request.get_json()
    
    if not data:
        return jsonify({
            'success': False,
            'message': 'No data provided'
        }), 400
    
    # Validate required fields
    required_fields = ['plan_id', 'billing_cycle']
    for field in required_fields:
        if field not in data:
            return jsonify({
                'success': False,
                'message': f'Missing required field: {field}'
            }), 400
    
    # Check if plan exists - using filter_by instead of get to query by plan_id column
    plan = SubscriptionPlan.query.filter_by(plan_id=data['plan_id']).first()
    if not plan:
        return jsonify({
            'success': False,
            'message': 'Invalid plan ID'
        }), 400
    
    try:
        # Import stripe utils
        from app.utils.stripe_utils import create_checkout_session as create_stripe_checkout
        
        # Create checkout session
        checkout_data = create_stripe_checkout(
            user_id=current_user.id,
            plan_id=data['plan_id'],
            billing_cycle=data['billing_cycle']
        )
        
        return jsonify({
            'success': True,
            'checkout_url': checkout_data['checkout_url'],
            'checkout_id': checkout_data['checkout_id']
        })
    except Exception as e:
        logger.error(f"Error creating checkout session: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Failed to create checkout session: {str(e)}'
        }), 500

@api_bp.route('/subscription/process', methods=['POST'])
@token_required
def process_subscription_payment():
    """Process subscription payment with Stripe"""
    # Get current user from request object (set by token_required decorator)
    current_user = request.current_user
    data = request.get_json()
    
    if not data:
        return jsonify({
            'success': False,
            'message': 'No data provided'
        }), 400
    
    # Validate required fields
    required_fields = ['session_id']
    for field in required_fields:
        if field not in data:
            return jsonify({
                'success': False,
                'message': f'Missing required field: {field}'
            }), 400
    
    try:
        # Import stripe
        import stripe
        stripe.api_key = current_app.config['STRIPE_SECRET_KEY']
        
        # Retrieve the checkout session
        session = stripe.checkout.Session.retrieve(data['session_id'])
        
        # Verify that the session was successful
        if session.payment_status != 'paid':
            return jsonify({
                'success': False,
                'message': 'Payment not completed'
            }), 400
        
        # Get user ID from session metadata
        user_id = int(session.metadata.get('user_id'))
        
        # Verify that the user ID matches the current user
        if user_id != current_user.id:
            return jsonify({
                'success': False,
                'message': 'User ID mismatch'
            }), 403
        
        # Get subscription ID from session
        subscription_id = session.subscription
        
        # Get subscription details from Stripe
        stripe_subscription = stripe.Subscription.retrieve(subscription_id)
        
        # Get plan ID and billing cycle from session metadata
        plan_id = session.metadata.get('plan_id')
        billing_cycle = session.metadata.get('billing_cycle')
        
        # Check if plan exists
        plan = SubscriptionPlan.query.filter_by(plan_id=plan_id).first()
        if not plan:
            return jsonify({
                'success': False,
                'message': 'Invalid plan ID'
            }), 400
        
        # Check if user already has a subscription
        existing_subscription = Subscription.query.filter_by(user_id=current_user.id).first()
        
        # Variable to hold the subscription object we'll use for payment history
        subscription_obj = None
        
        if existing_subscription:
            # Update existing subscription
            existing_subscription.plan_id = plan_id
            existing_subscription.is_annual = billing_cycle in ['yearly', 'annual']
            existing_subscription.status = 'active'
            existing_subscription.subscription_id = subscription_id
            existing_subscription.start_date = datetime.fromtimestamp(stripe_subscription.current_period_start)
            existing_subscription.end_date = datetime.fromtimestamp(stripe_subscription.current_period_end)
            subscription_obj = existing_subscription
            # Commit to get the ID before creating payment history
            db.session.commit()
        else:
            # Create new subscription
            new_subscription = Subscription(
                user_id=current_user.id,
                plan_id=plan_id,
                is_annual=billing_cycle in ['yearly', 'annual'],
                status='active',
                subscription_id=subscription_id,
                start_date=datetime.fromtimestamp(stripe_subscription.current_period_start),
                end_date=datetime.fromtimestamp(stripe_subscription.current_period_end)
            )
            db.session.add(new_subscription)
            # Commit to get the ID before creating payment history
            db.session.commit()
            # Refresh to get the ID
            db.session.refresh(new_subscription)
            subscription_obj = new_subscription
        
        # Create payment history record with the valid subscription ID
        payment = PaymentHistory(
            user_id=current_user.id,
            subscription_id=subscription_obj.id,  # This is now guaranteed to be a valid ID
            amount=session.amount_total / 100,  # Convert from cents
            currency=session.currency.upper(),
            payment_date=datetime.utcnow(),
            payment_method='credit_card',
            transaction_id=session.payment_intent,
            status='success'
        )
        db.session.add(payment)
        db.session.commit()
        
        # Get the plan features and limitations for the response
        plan_features = plan.features
        plan_limitations = plan.limitations
        
        return jsonify({
            'success': True,
            'message': 'Payment processed successfully',
            'subscription': {
                'plan_id': plan_id,
                'plan_name': plan.name,
                'features': plan_features,
                'limitations': plan_limitations,
                'is_annual': billing_cycle == 'yearly',
                'start_date': subscription_obj.start_date.isoformat(),
                'end_date': subscription_obj.end_date.isoformat()
            }
        })
    except Exception as e:
        logger.error(f"Error processing payment: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Failed to process payment: {str(e)}'
        }), 500

@api_bp.route('/subscription/cancel', methods=['POST'])
@token_required
def cancel_subscription():
    """Cancel current subscription in Stripe"""
    # Get current user from request object (set by token_required decorator)
    current_user = request.current_user
    subscription = Subscription.query.filter_by(user_id=current_user.id).first()
    
    if not subscription:
        return jsonify({
            'success': False,
            'message': 'No active subscription found'
        }), 404
    
    if not subscription.subscription_id:
        return jsonify({
            'success': False,
            'message': 'No Stripe subscription ID found'
        }), 400
    
    try:
        # Import stripe utils
        from app.utils.stripe_utils import cancel_stripe_subscription
        
        # Cancel subscription in Stripe
        success = cancel_stripe_subscription(subscription.subscription_id)
        
        if success:
            # Update subscription status
            subscription.status = 'cancelled'
            db.session.commit()
            
            return jsonify({
                'success': True,
                'message': 'Subscription cancelled successfully'
            })
        else:
            return jsonify({
                'success': False,
                'message': 'Failed to cancel subscription in Stripe'
            }), 500
    except Exception as e:
        logger.error(f"Error cancelling subscription: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Failed to cancel subscription: {str(e)}'
        }), 500

@api_bp.route('/subscription/update', methods=['PUT'])
@token_required
def update_subscription():
    """Update current subscription using Stripe"""
    # Get current user from request object (set by token_required decorator)
    current_user = request.current_user
    data = request.get_json()
    
    if not data:
        return jsonify({
            'success': False,
            'message': 'No data provided'
        }), 400
    
    # Validate required fields
    required_fields = ['plan_id', 'billing_cycle']
    for field in required_fields:
        if field not in data:
            return jsonify({
                'success': False,
                'message': f'Missing required field: {field}'
            }), 400
    
    # Check if plan exists
    plan = SubscriptionPlan.query.filter_by(plan_id=data['plan_id']).first()
    if not plan:
        return jsonify({
            'success': False,
            'message': 'Invalid plan ID'
        }), 400
    
    # Check if user has a subscription
    subscription = Subscription.query.filter_by(user_id=current_user.id).first()
    
    if not subscription:
        return jsonify({
            'success': False,
            'message': 'No subscription found'
        }), 404
    
    if not subscription.subscription_id:
        return jsonify({
            'success': False,
            'message': 'No Stripe subscription ID found'
        }), 400
    
    try:
        # Import stripe
        import stripe
        stripe.api_key = current_app.config['STRIPE_SECRET_KEY']
        
        # Get price ID based on plan and billing cycle
        price_id = f"sqlgenai-{data['plan_id']}-{data['billing_cycle']}"
        
        # Update subscription in Stripe
        stripe_subscription = stripe.Subscription.retrieve(subscription.subscription_id)
        
        # Update the subscription items
        stripe.Subscription.modify(
            subscription.subscription_id,
            items=[{
                'id': stripe_subscription['items']['data'][0].id,
                'price': price_id,
            }],
            proration_behavior='create_prorations'
        )
        
        # Get updated subscription from Stripe
        updated_stripe_sub = stripe.Subscription.retrieve(subscription.subscription_id)
        
        # Update subscription in database
        subscription.plan_id = data['plan_id']
        subscription.is_annual = data['billing_cycle'] == 'yearly'
        subscription.start_date = datetime.fromtimestamp(updated_stripe_sub.current_period_start)
        subscription.end_date = datetime.fromtimestamp(updated_stripe_sub.current_period_end)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Subscription updated successfully',
            'subscription': {
                'id': subscription.id,
                'plan_id': subscription.plan_id,
                'plan_name': plan.name,
                'status': subscription.status,
                'is_annual': subscription.is_annual,
                'start_date': subscription.start_date.isoformat() if subscription.start_date else None,
                'end_date': subscription.end_date.isoformat() if subscription.end_date else None,
                'features': plan.features
            }
        })
    except Exception as e:
        logger.error(f"Error updating subscription: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Failed to update subscription: {str(e)}'
        }), 500

@api_bp.route('/subscription/payments', methods=['GET'])
@token_required
def get_payment_history():
    """Get payment history"""
    # Get current user from request object (set by token_required decorator)
    current_user = request.current_user
    
    try:
        # Get real payment history from database
        payments = PaymentHistory.query.filter_by(user_id=current_user.id).order_by(PaymentHistory.payment_date.desc()).all()
        
        payment_list = []
        for payment in payments:
            # Get subscription details
            subscription = Subscription.query.get(payment.subscription_id) if payment.subscription_id else None
            
            # Get plan details if subscription exists
            plan_name = 'Unknown'
            if subscription:
                plan = SubscriptionPlan.query.filter_by(plan_id=subscription.plan_id).first()
                if plan:
                    plan_name = plan.name
            
            payment_list.append({
                'id': payment.id,
                'date': payment.payment_date.isoformat(),
                'amount': payment.amount,
                'currency': payment.currency,
                'status': payment.status,
                'description': f"{plan_name} - {'Annual' if subscription and subscription.is_annual else 'Monthly'} Subscription" if subscription else 'Payment',
                'transaction_id': payment.transaction_id
            })
        
        return jsonify({
            'success': True,
            'payments': payment_list
        })
    except Exception as e:
        logger.error(f"Error getting payment history: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Failed to get payment history: {str(e)}'
        }), 500
