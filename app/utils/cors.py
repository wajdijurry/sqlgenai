"""
CORS utilities for the SQLGenAI application
This module centralizes CORS configuration for all API endpoints
"""

from flask import request, Response, jsonify

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
    origin = request.headers.get('Origin', 'http://localhost:3001')
    
    # Add CORS headers
    response.headers.add('Access-Control-Allow-Origin', origin)
    
    if allow_credentials:
        response.headers.add('Access-Control-Allow-Credentials', 'true')
    
    # Add other CORS headers
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
    response.headers.add('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    
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
