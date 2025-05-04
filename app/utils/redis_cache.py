"""
Redis-based cache utilities for SQLGenAI application.
This module provides Redis-based caching mechanisms to reduce API calls to AI models.
"""
import json
import hashlib
import logging
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
from functools import wraps
from flask import current_app
import redis

logger = logging.getLogger(__name__)

class RedisCache:
    """Redis-based cache for AI-generated SQL queries and explain plans"""
    
    _redis_client = None
    _initialized = False
    
    @classmethod
    def initialize(cls):
        """Initialize the Redis connection"""
        if cls._initialized:
            return
            
        try:
            redis_url = current_app.config.get('REDIS_URL', 'redis://localhost:6379/0')
            cls._redis_client = redis.from_url(redis_url)
            cls._initialized = True
            logger.info(f"Redis cache initialized successfully with URL: {redis_url}")
        except Exception as e:
            logger.error(f"Error initializing Redis cache: {str(e)}")
            cls._initialized = False
    
    @classmethod
    def get_cached_result(cls, key_prefix: str, key_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Get cached result if available"""
        if not cls._initialized:
            cls.initialize()
            
        if not cls._initialized or not cls._redis_client:
            logger.warning("Redis cache not initialized, cannot get cached result")
            return None
            
        # Generate cache key
        cache_key = cls._generate_cache_key(key_prefix, key_data)
        
        try:
            # Get data from Redis
            cached_data = cls._redis_client.get(cache_key)
            if cached_data:
                result = json.loads(cached_data)
                logger.info(f"Cache hit for key: {cache_key[:8]}...")
                return result
        except Exception as e:
            logger.error(f"Error retrieving data from Redis cache: {str(e)}")
            
        logger.info(f"Cache miss for key: {cache_key[:8]}...")
        return None
    
    @classmethod
    def cache_result(cls, key_prefix: str, key_data: Dict[str, Any], 
                   result: Dict[str, Any], ttl_seconds: int = 2592000) -> None:
        """Cache the result with TTL (default 30 days)"""
        if not cls._initialized:
            cls.initialize()
            
        if not cls._initialized or not cls._redis_client:
            logger.warning("Redis cache not initialized, cannot cache result")
            return
            
        # Generate cache key
        cache_key = cls._generate_cache_key(key_prefix, key_data)
        
        try:
            # Store in Redis with TTL
            cls._redis_client.setex(
                cache_key,
                ttl_seconds,
                json.dumps(result)
            )
            logger.info(f"Cached result for key: {cache_key[:8]}...")
        except Exception as e:
            logger.error(f"Error storing data in Redis cache: {str(e)}")
    
    @staticmethod
    def _generate_cache_key(key_prefix: str, key_data: Dict[str, Any]) -> str:
        """Generate a unique cache key based on input parameters"""
        # Create a stable string representation of the data and hash it
        data_str = json.dumps(key_data, sort_keys=True)
        hash_key = hashlib.sha256(data_str.encode()).hexdigest()
        return f"{key_prefix}:{hash_key}"
    
    @classmethod
    def flush_cache(cls) -> bool:
        """Flush the entire cache"""
        if not cls._initialized:
            cls.initialize()
            
        if not cls._initialized or not cls._redis_client:
            logger.warning("Redis cache not initialized, cannot flush cache")
            return False
            
        try:
            cls._redis_client.flushdb()
            logger.info("Redis cache flushed successfully")
            return True
        except Exception as e:
            logger.error(f"Error flushing Redis cache: {str(e)}")
            return False
            
    @classmethod
    def get_stats(cls) -> Dict[str, Any]:
        """Get cache statistics"""
        if not cls._initialized:
            cls.initialize()
            
        if not cls._initialized or not cls._redis_client:
            logger.warning("Redis cache not initialized, cannot get stats")
            return {"error": "Redis cache not initialized"}
            
        try:
            # Get basic Redis info
            info = cls._redis_client.info()
            
            # Get cache keys count
            sql_query_keys = len(cls._redis_client.keys('sql_query:*'))
            explain_plan_keys = len(cls._redis_client.keys('explain_plan:*'))
            
            return {
                "total_keys": sql_query_keys + explain_plan_keys,
                "sql_query_keys": sql_query_keys,
                "explain_plan_keys": explain_plan_keys,
                "memory_used": info.get('used_memory_human', 'N/A'),
                "uptime": info.get('uptime_in_seconds', 0),
                "connected_clients": info.get('connected_clients', 0)
            }
        except Exception as e:
            logger.error(f"Error getting Redis cache stats: {str(e)}")
            return {"error": str(e)}


def with_redis_query_cache(ttl_days=30):
    """Decorator for caching AI query generation results in Redis"""
    def decorator(func):
        @wraps(func)
        def wrapper(self, prompt, schema_data, db_type, db_config=None):
            # Check if caching is enabled
            if not current_app.config.get('ENABLE_AI_CACHE', True):
                return func(self, prompt, schema_data, db_type, db_config)
            
            # Get model type from the model instance
            model_type = getattr(self, 'model_type', self.__class__.__name__)
            
            # Prepare cache key data
            key_data = {
                'model_type': model_type,
                'prompt': prompt,
                'schema_hash': hashlib.sha256(json.dumps(schema_data, sort_keys=True).encode()).hexdigest(),
                'db_type': db_type,
                'db_config_hash': hashlib.sha256(json.dumps(db_config or {}, sort_keys=True).encode()).hexdigest()
            }
            
            # Check cache first
            cached_result = RedisCache.get_cached_result('sql_query', key_data)
            
            if cached_result:
                print(f"[REDIS CACHE HIT] SQL generation for model_type={model_type}")
                # Add a flag to indicate this result is from cache
                cached_result['from_cache'] = True
                return cached_result
            
            print(f"[REDIS CACHE MISS] SQL generation for model_type={model_type}")
            
            # If not in cache, call the original function
            result = func(self, prompt, schema_data, db_type, db_config)
            
            # Cache the result if successful
            if result.get('success', False):
                RedisCache.cache_result(
                    'sql_query', 
                    key_data, 
                    result, 
                    ttl_seconds=ttl_days * 86400  # Convert days to seconds
                )
                print(f"[REDIS CACHE STORE] SQL generation result for model_type={model_type}")
            
            return result
        return wrapper
    return decorator


def with_redis_explain_cache(ttl_days=30):
    """Decorator for caching AI explain plan analysis results in Redis"""
    def decorator(func):
        @wraps(func)
        def wrapper(self, explain_data, db_type, sql_query):
            # Check if caching is enabled
            if not current_app.config.get('ENABLE_AI_CACHE', True):
                return func(self, explain_data, db_type, sql_query)
            
            # Get model type from the model instance
            model_type = getattr(self, 'model_type', self.__class__.__name__)
            
            # Prepare cache key data
            key_data = {
                'model_type': model_type,
                'explain_hash': hashlib.sha256(json.dumps(explain_data, sort_keys=True).encode()).hexdigest(),
                'db_type': db_type,
                'sql_query': sql_query
            }
            
            # Check cache first
            cached_result = RedisCache.get_cached_result('explain_plan', key_data)
            
            if cached_result:
                print(f"[REDIS CACHE HIT] Explain plan analysis for model_type={model_type}")
                # Add a flag to indicate this result is from cache
                cached_result['from_cache'] = True
                return cached_result
            
            print(f"[REDIS CACHE MISS] Explain plan analysis for model_type={model_type}")
            
            # If not in cache, call the original function
            result = func(self, explain_data, db_type, sql_query)
            
            # Cache the result if successful
            if isinstance(result, dict) and not result.get('error'):
                RedisCache.cache_result(
                    'explain_plan', 
                    key_data, 
                    result, 
                    ttl_seconds=ttl_days * 86400  # Convert days to seconds
                )
                print(f"[REDIS CACHE STORE] Explain plan analysis result for model_type={model_type}")
            
            return result
        return wrapper
    return decorator
