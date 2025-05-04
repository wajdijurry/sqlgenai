from flask import Blueprint, request, jsonify, current_app
import stripe
import json
import logging

from app.utils.stripe_utils import handle_subscription_event

# Create webhook blueprint
webhook_bp = Blueprint('webhook', __name__)

# Set up logging
logger = logging.getLogger(__name__)

@webhook_bp.route('/stripe', methods=['POST'])
def stripe_webhook():
    """
    Stripe webhook endpoint to handle events from Stripe
    """
    # Get the webhook payload and signature header
    payload = request.data
    sig_header = request.headers.get('Stripe-Signature')
    
    # Get webhook secret from config
    webhook_secret = current_app.config.get('STRIPE_WEBHOOK_SECRET')
    
    if not webhook_secret:
        logger.error("Stripe webhook secret not configured")
        return jsonify({'success': False, 'message': 'Webhook secret not configured'}), 500
    
    try:
        # Verify the event came from Stripe
        event = stripe.Webhook.construct_event(
            payload, sig_header, webhook_secret
        )
    except ValueError as e:
        # Invalid payload
        logger.error(f"Invalid Stripe webhook payload: {str(e)}")
        return jsonify({'success': False, 'message': 'Invalid payload'}), 400
    except stripe.error.SignatureVerificationError as e:
        # Invalid signature
        logger.error(f"Invalid Stripe webhook signature: {str(e)}")
        return jsonify({'success': False, 'message': 'Invalid signature'}), 400
    
    # Handle the event
    event_type = event['type']
    logger.info(f"Received Stripe webhook event: {event_type}")
    
    # Handle checkout session completed event
    if event_type == 'checkout.session.completed':
        logger.info(f"Processing checkout.session.completed event: {event['id']}")
        handle_subscription_event(event)
    
    # Handle subscription updated event
    elif event_type == 'customer.subscription.updated':
        logger.info(f"Processing customer.subscription.updated event: {event['id']}")
        handle_subscription_event(event)
    
    # Handle subscription deleted event
    elif event_type == 'customer.subscription.deleted':
        logger.info(f"Processing customer.subscription.deleted event: {event['id']}")
        handle_subscription_event(event)
    
    # Return a 200 response to acknowledge receipt of the event
    return jsonify({'success': True, 'message': 'Webhook received'}), 200
