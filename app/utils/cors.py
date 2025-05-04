"""
CORS utilities for the SQLGenAI application
This module centralizes CORS configuration for all API endpoints
"""

from flask import request, jsonify, current_app

def add_cors_headers(response, allow_credentials=True):
    """
    Add CORS headers to a response
    
    Args:
        response: Flask response object
        allow_credentials: Whether to allow credentials
        
    Returns:
        Response with CORS headers
    """
    # Get the origin from the request
    origin = request.headers.get('Origin')
    
    # If no origin in request, use a default that won't cause issues
    if not origin:
        # In production, default to the frontend domain
        if 'FRONTEND_URL' in current_app.config:
            origin = current_app.config['FRONTEND_URL']
        else:
            origin = 'http://localhost:3001'
    
    # Add CORS headers - must be exact match for credentials to work
    response.headers.set('Access-Control-Allow-Origin', origin)
    
    if allow_credentials:
        response.headers.set('Access-Control-Allow-Credentials', 'true')
    
    # Add other CORS headers
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    
    return response

def cors_preflight_response():
    """
    Create a response for CORS preflight requests
    
    Returns:
        Response for OPTIONS requests
    """
    response = jsonify({'status': 'ok'})
    return add_cors_headers(response)

def cors_after_request(response):
    """
    Add CORS headers to all responses
    Can be registered with Flask's after_request decorator
    
    Args:
        response: Flask response object
        
    Returns:
        Response with CORS headers
    """
    # Skip if the response already has CORS headers
    if response.headers.get('Access-Control-Allow-Origin'):
        return response
    
    return add_cors_headers(response)
