import stripe
import os
from datetime import datetime, timedelta
from flask import current_app, url_for

# Initialize Stripe with the secret key from environment variables
stripe.api_key = os.environ.get('STRIPE_SECRET_KEY')

def create_checkout_session(user_id, plan_id, billing_cycle):
    """
    Create a Stripe checkout session for subscription
    
    Args:
        user_id (int): User ID
        plan_id (str): Plan ID (basic, professional, enterprise)
        billing_cycle (str): Billing cycle (monthly or yearly)
        
    Returns:
        dict: Checkout session data
    """
    from app.auth.models import SubscriptionPlan
    
    # Get plan details from database
    plan = SubscriptionPlan.query.filter_by(plan_id=plan_id).first()
    if not plan:
        raise ValueError(f"Invalid plan ID: {plan_id}")
    
    # Determine price based on billing cycle
    price_amount = plan.annual_price if billing_cycle in ['yearly', 'annual'] else plan.monthly_price
    
    # Create a product in Stripe if it doesn't exist
    product_id = f"sqlgenai-{plan_id}"
    try:
        product = stripe.Product.retrieve(product_id)
    except stripe.error.InvalidRequestError:
        product = stripe.Product.create(
            name=f"SQLGenAI {plan.name}",
            description=plan.description,
            metadata={
                "plan_id": plan_id
            }
        )
    
    # Create or retrieve price objects
    price_lookup_id = f"sqlgenai-{plan_id}-{billing_cycle}"
    
    # Try to find existing price by metadata lookup
    existing_prices = stripe.Price.list(product=product.id, active=True)
    price = None
    
    # Look for a matching price with the right metadata
    for p in existing_prices.data:
        if (p.metadata.get('plan_id') == plan_id and 
            p.metadata.get('billing_cycle') == billing_cycle):
            price = p
            break
    
    # If no matching price found, create a new one
    if not price:
        price = stripe.Price.create(
            product=product.id,
            unit_amount=int(price_amount * 100),  # Convert to cents
            currency="usd",
            recurring={
                "interval": "year" if billing_cycle in ['yearly', 'annual'] else "month",
                "interval_count": 1
            },
            metadata={
                "plan_id": plan_id,
                "billing_cycle": billing_cycle,
                "price_lookup_id": price_lookup_id
            }
        )
    
    # Create checkout session
    success_url = f"{current_app.config['FRONTEND_URL']}/subscription/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{current_app.config['FRONTEND_URL']}/subscription/cancel"
    
    checkout_session = stripe.checkout.Session.create(
        success_url=success_url,
        cancel_url=cancel_url,
        payment_method_types=["card"],
        mode="subscription",
        client_reference_id=str(user_id),
        line_items=[
            {
                "price": price.id,
                "quantity": 1
            }
        ],
        metadata={
            "user_id": user_id,
            "plan_id": plan_id,
            "billing_cycle": billing_cycle
        }
    )
    
    return {
        "checkout_url": checkout_session.url,
        "checkout_id": checkout_session.id
    }

def handle_subscription_event(event):
    """
    Handle Stripe subscription events
    
    Args:
        event: Stripe event object
        
    Returns:
        bool: True if event was handled successfully
    """
    from app.utils.db_init import db
    from app.auth.models import Subscription, PaymentHistory, User
    
    event_type = event['type']
    data_object = event['data']['object']
    
    if event_type == 'checkout.session.completed':
        # Get user ID from metadata
        user_id = int(data_object.get('metadata', {}).get('user_id'))
        plan_id = data_object.get('metadata', {}).get('plan_id')
        billing_cycle = data_object.get('metadata', {}).get('billing_cycle')
        
        if not user_id or not plan_id or not billing_cycle:
            current_app.logger.error(f"Missing metadata in checkout session: {data_object.id}")
            return False
        
        # Get subscription ID from the checkout session
        subscription_id = data_object.get('subscription')
        if not subscription_id:
            current_app.logger.error(f"No subscription ID in checkout session: {data_object.id}")
            return False
        
        # Get subscription details from Stripe
        stripe_subscription = stripe.Subscription.retrieve(subscription_id)
        
        # Variable to hold the subscription object we'll use for payment history
        subscription_obj = None
        
        # Check if user already has a subscription
        existing_subscription = Subscription.query.filter_by(user_id=user_id).first()
        
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
                user_id=user_id,
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
            user_id=user_id,
            subscription_id=subscription_obj.id,  # This is now guaranteed to be a valid ID
            amount=data_object.get('amount_total', 0) / 100,  # Convert from cents
            currency=data_object.get('currency', 'usd').upper(),
            payment_date=datetime.fromtimestamp(data_object.get('created')),
            payment_method='credit_card',
            transaction_id=data_object.get('payment_intent'),
            status='success'
        )
        db.session.add(payment)
        
        # Commit changes
        db.session.commit()
        
        return True
    
    elif event_type == 'customer.subscription.updated':
        subscription_id = data_object.get('id')
        if not subscription_id:
            return False
        
        # Find subscription in database
        subscription = Subscription.query.filter_by(subscription_id=subscription_id).first()
        if not subscription:
            return False
        
        # Update subscription status
        subscription.status = data_object.get('status', 'active')
        subscription.start_date = datetime.fromtimestamp(data_object.get('current_period_start'))
        subscription.end_date = datetime.fromtimestamp(data_object.get('current_period_end'))
        
        db.session.commit()
        return True
    
    elif event_type == 'customer.subscription.deleted':
        subscription_id = data_object.get('id')
        if not subscription_id:
            return False
        
        # Find subscription in database
        subscription = Subscription.query.filter_by(subscription_id=subscription_id).first()
        if not subscription:
            return False
        
        # Update subscription status
        subscription.status = 'cancelled'
        
        db.session.commit()
        return True
    
    return False

def cancel_stripe_subscription(subscription_id):
    """
    Cancel a Stripe subscription
    
    Args:
        subscription_id (str): Stripe subscription ID
        
    Returns:
        bool: True if subscription was cancelled successfully
    """
    try:
        stripe.Subscription.delete(subscription_id)
        return True
    except stripe.error.StripeError as e:
        current_app.logger.error(f"Error cancelling Stripe subscription: {e}")
        return False

def get_subscription_data(subscription_id):
    """
    Get subscription data from Stripe
    
    Args:
        subscription_id (str): Stripe subscription ID
        
    Returns:
        dict: Subscription data
    """
    try:
        subscription = stripe.Subscription.retrieve(subscription_id)
        return subscription
    except stripe.error.StripeError as e:
        current_app.logger.error(f"Error retrieving Stripe subscription: {e}")
        return None
