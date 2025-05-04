#!/usr/bin/env python
"""
Flush Redis cache script for SQLGenAI

This script flushes the Redis cache for SQL queries and explain plans.
It can be run directly from the command line or within a Docker container.

Usage:
    python flush_cache.py [--verbose]

Options:
    --verbose   Show more detailed output
"""

import os
import sys
import json
import argparse
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Add the parent directory to the path so we can import the app
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Import the Redis cache
from app.utils.redis_cache import RedisCache

def flush_cache(verbose=False):
    """Flush the Redis cache"""
    print("Flushing Redis cache...")
    
    try:
        # Initialize the Redis cache first
        RedisCache.initialize()
        result = RedisCache.flush_cache()
        
        if result:
            print("✓ Redis cache successfully flushed")
            if verbose:
                # Get cache stats after flush
                stats = RedisCache.get_stats()
                print(f"Cache statistics after flush: {json.dumps(stats, indent=2)}")
            return True
        else:
            print("✗ Failed to flush Redis cache")
            return False
    except Exception as e:
        print(f"Error flushing Redis cache: {str(e)}")
        return False

def main():
    """Main function to parse arguments and flush cache"""
    parser = argparse.ArgumentParser(description='Flush Redis cache for SQLGenAI')
    parser.add_argument('--verbose', '-v', action='store_true', help='Show more detailed output')
    
    args = parser.parse_args()
    
    # Flush the Redis cache
    success = flush_cache(verbose=args.verbose)
    
    if success:
        print("\n🎉 Redis cache has been flushed successfully")
        return 0
    else:
        print("\n⚠️ There were issues flushing the Redis cache")
        return 1

if __name__ == "__main__":
    sys.exit(main())