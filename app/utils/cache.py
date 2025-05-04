"""
Cache utilities for SQLGenAI application.
This module provides caching mechanisms to reduce API calls to AI models.
"""
import json
import hashlib
import logging
import time
import os
import threading
from typing import Dict, Any, Optional, List
from functools import wraps
from flask import current_app
from datetime import datetime, timedelta

# Custom JSON encoder to handle datetime objects
class DateTimeEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)

logger = logging.getLogger(__name__)

# Thread lock for cache operations
_cache_lock = threading.RLock()

class AIQueryCache:
    """In-memory cache for AI-generated SQL queries with optional file persistence"""
    
    # Class-level cache storage
    _cache: Dict[str, Dict[str, Any]] = {}
    _cache_file = None
    _initialized = False
    
    @classmethod
    def initialize(cls):
        """Initialize the cache from file if available"""
        if cls._initialized:
            return
            
        with _cache_lock:
            if cls._initialized:
                return
                
            # Set cache file path
            cache_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'cache')
            os.makedirs(cache_dir, exist_ok=True)
            cls._cache_file = os.path.join(cache_dir, 'ai_query_cache.json')
            
            # Load cache from file if it exists
            if os.path.exists(cls._cache_file):
                try:
                    with open(cls._cache_file, 'r') as f:
                        loaded_cache = json.load(f)
                        # Convert string timestamps back to datetime objects
                        for key, item in loaded_cache.items():
                            if 'expires_at' in item and item['expires_at']:
                                item['expires_at'] = datetime.fromisoformat(item['expires_at'])
                        cls._cache = loaded_cache
                        logger.info(f"Loaded {len(cls._cache)} items from query cache file")
                except Exception as e:
                    logger.error(f"Error loading query cache from file: {str(e)}")
                    cls._cache = {}
            
            cls._initialized = True
            
            # Clean expired entries
            cls._clean_expired_entries()
    
    @classmethod
    def get_cached_result(cls, model_type: str, prompt: str, schema_data: Dict[str, Any], 
                        db_type: str, db_config: Optional[Dict[str, Any]] = None) -> Optional[Dict[str, Any]]:
        """Get cached result if available"""
        # Initialize cache if needed
        if not cls._initialized:
            cls.initialize()
            
        cache_key = cls.generate_cache_key(model_type, prompt, schema_data, db_type, db_config)
        
        with _cache_lock:
            if cache_key in cls._cache:
                cache_item = cls._cache[cache_key]
                
                # Check if entry has expired
                if 'expires_at' in cache_item and cache_item['expires_at']:
                    if isinstance(cache_item['expires_at'], str):
                        expires_at = datetime.fromisoformat(cache_item['expires_at'])
                    else:
                        expires_at = cache_item['expires_at']
                        
                    if expires_at < datetime.now():
                        # Entry has expired, remove it
                        del cls._cache[cache_key]
                        # Don't save to file immediately for better performance
                        cls._cache_modified = True
                        return None
                
                return cache_item['result']
        
        logger.info(f"Cache miss for query: {prompt[:50]}...")
        return None
    
    @classmethod
    def cache_result(cls, model_type: str, prompt: str, schema_data: Dict[str, Any], 
                   db_type: str, result: Dict[str, Any], 
                   db_config: Optional[Dict[str, Any]] = None, 
                   ttl_days: int = 30) -> None:
        """Cache the result of an AI query"""
        # Initialize cache if needed
        if not cls._initialized:
            cls.initialize()
            
        cache_key = cls.generate_cache_key(model_type, prompt, schema_data, db_type, db_config)
        schema_hash = cls._hash_dict(schema_data)
        db_config_hash = cls._hash_dict(db_config) if db_config else None
        
        # Calculate expiration time
        expires_at = datetime.now() + timedelta(days=ttl_days)
        
        with _cache_lock:
            # Store in memory cache
            cls._cache[cache_key] = {
                'model_type': model_type,
                'prompt': prompt[:200],  # Store truncated prompt to save space
                'schema_hash': schema_hash,
                'db_type': db_type,
                'db_config_hash': db_config_hash,
                'result': result,
                'created_at': datetime.now().isoformat(),
                'expires_at': expires_at.isoformat()
            }
            
            # Mark cache as modified but don't save immediately
            cls._cache_modified = True
            # Only save to file periodically
            cls._save_cache_to_file()
    
    @staticmethod
    def generate_cache_key(model_type: str, prompt: str, schema_data: Dict[str, Any], 
                         db_type: str, db_config: Optional[Dict[str, Any]] = None) -> str:
        """Generate a unique cache key based on input parameters"""
        # Normalize prompt by removing extra whitespace
        normalized_prompt = ' '.join(prompt.split()).lower()
        
        # Create a string representation of the schema structure (not all data)
        # Use a faster hash method for schema data
        schema_hash = AIQueryCache._hash_dict(schema_data)
        
        # Create a string representation of db_config if available
        db_config_hash = "none"
        if db_config:
            # Only include relevant connection fields that affect query results
            relevant_config = {}
            if isinstance(db_config, dict):
                for key in ['host', 'port', 'database', 'db_name']:
                    if key in db_config:
                        relevant_config[key] = db_config[key]
            db_config_hash = AIQueryCache._hash_dict(relevant_config)
        
        # Combine all factors that affect the query result
        key_components = f"{model_type}:{normalized_prompt}:{schema_hash}:{db_type}:{db_config_hash}"
        
        # Create a hash of the combined string
        return hashlib.sha256(key_components.encode()).hexdigest()
    
    @staticmethod
    def _hash_dict(data: Dict[str, Any]) -> str:
        """Create a hash of a dictionary"""
        if not data:
            return "empty"
        
        # Convert dict to a stable string representation and hash it
        return hashlib.sha256(json.dumps(data, sort_keys=True).encode()).hexdigest()


    # Track if cache has been modified
    _cache_modified = False
    _last_save_time = datetime.now()
    
    @classmethod
    def _save_cache_to_file(cls, force=False):
        """Save the cache to a file if modified or forced"""
        if not cls._cache_file:
            return
            
        # Only save if cache has been modified or force is True
        current_time = datetime.now()
        time_since_last_save = (current_time - cls._last_save_time).total_seconds()
        
        if (cls._cache_modified or force) and time_since_last_save > 10:  # Only save every 10 seconds at most
            try:
                with open(cls._cache_file, 'w') as f:
                    json.dump(cls._cache, f, cls=DateTimeEncoder)
                cls._cache_modified = False
                cls._last_save_time = current_time
            except Exception as e:
                print(f"Error saving query cache to file: {str(e)}")
    
    @classmethod
    def _clean_expired_entries(cls):
        """Remove expired entries from the cache"""
        with _cache_lock:
            now = datetime.now()
            expired_keys = []
            
            for key, item in cls._cache.items():
                if 'expires_at' in item and item['expires_at']:
                    if isinstance(item['expires_at'], str):
                        expires_at = datetime.fromisoformat(item['expires_at'])
                    else:
                        expires_at = item['expires_at']
                        
                    if expires_at < now:
                        expired_keys.append(key)
            
            for key in expired_keys:
                del cls._cache[key]
                
            if expired_keys:
                logger.info(f"Removed {len(expired_keys)} expired entries from query cache")
                cls._save_cache_to_file()
                
    @classmethod
    def flush_cache(cls):
        """Flush the entire cache (clear all entries)"""
        with _cache_lock:
            cls._cache.clear()
            print(f"Flushed AI query cache")
            # Save empty cache to file
            cls._save_cache_to_file(force=True)
            return True

class AIExplainCache:
    """In-memory cache for AI-analyzed explain plans with optional file persistence"""
    
    # Class-level cache storage
    _cache: Dict[str, Dict[str, Any]] = {}
    _cache_file = None
    _initialized = False
    
    @classmethod
    def initialize(cls):
        """Initialize the cache from file if available"""
        if cls._initialized:
            return
            
        with _cache_lock:
            if cls._initialized:
                return
                
            # Set cache file path
            cache_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'cache')
            os.makedirs(cache_dir, exist_ok=True)
            cls._cache_file = os.path.join(cache_dir, 'ai_explain_cache.json')
            
            # Load cache from file if it exists
            if os.path.exists(cls._cache_file):
                try:
                    with open(cls._cache_file, 'r') as f:
                        loaded_cache = json.load(f)
                        # Convert string timestamps back to datetime objects
                        for key, item in loaded_cache.items():
                            if 'expires_at' in item and item['expires_at']:
                                item['expires_at'] = datetime.fromisoformat(item['expires_at'])
                        cls._cache = loaded_cache
                        logger.info(f"Loaded {len(cls._cache)} items from explain cache file")
                except Exception as e:
                    logger.error(f"Error loading explain cache from file: {str(e)}")
                    cls._cache = {}
            
            cls._initialized = True
            
    @classmethod
    def get_cached_analysis(cls, model_type: str, explain_data: Dict[str, Any], 
                           db_type: str, sql_query: str) -> Optional[Dict[str, Any]]:
        """Get cached analysis if available"""
        # Initialize cache if needed
        if not cls._initialized:
            cls.initialize()
            
        cache_key = cls.generate_cache_key(model_type, explain_data, db_type, sql_query)
        
        with _cache_lock:
            if cache_key in cls._cache:
                cache_item = cls._cache[cache_key]
                
                # Check if entry has expired
                if 'expires_at' in cache_item and cache_item['expires_at']:
                    if isinstance(cache_item['expires_at'], str):
                        expires_at = datetime.fromisoformat(cache_item['expires_at'])
                    else:
                        expires_at = cache_item['expires_at']
                        
                    if expires_at < datetime.now():
                        # Entry has expired, remove it
                        del cls._cache[cache_key]
                        # Don't save to file immediately for better performance
                        cls._cache_modified = True
                        return None
                
                logger.info(f"Cache hit for explain plan analysis: {sql_query[:50]}...")
                return cache_item['result']
        
        logger.info(f"Cache miss for explain plan analysis: {sql_query[:50]}...")
        return None
    
    @classmethod
    def cache_analysis(cls, model_type: str, explain_data: Dict[str, Any], 
                      db_type: str, sql_query: str, result: Dict[str, Any],
                      ttl_days: int = 30) -> None:
        """Cache the result of an explain plan analysis"""
        # Initialize cache if needed
        if not cls._initialized:
            cls.initialize()
            
        cache_key = cls.generate_cache_key(model_type, explain_data, db_type, sql_query)
        explain_hash = cls._hash_dict(explain_data)
        
        # Calculate expiration time
        expires_at = datetime.now() + timedelta(days=ttl_days)
        
        with _cache_lock:
            # Store in memory cache
            cls._cache[cache_key] = {
                'model_type': model_type,
                'explain_hash': explain_hash,
                'db_type': db_type,
                'sql_query': sql_query[:200],  # Store truncated query to save space
                'result': result,
                'created_at': datetime.now().isoformat(),
                'expires_at': expires_at.isoformat()
            }
            
            # Mark cache as modified but don't save immediately
            cls._cache_modified = True
            # Only save to file periodically
            cls._save_cache_to_file()
            
        logger.info(f"Cached explain plan analysis for query: {sql_query[:50]}...")
    
    # Track if cache has been modified
    _cache_modified = False
    _last_save_time = datetime.now()
    
    @classmethod
    def _save_cache_to_file(cls, force=False):
        """Save the cache to a file if modified or forced"""
        if not cls._cache_file:
            return
            
        # Only save if cache has been modified or force is True
        current_time = datetime.now()
        time_since_last_save = (current_time - cls._last_save_time).total_seconds()
        
        if (cls._cache_modified or force) and time_since_last_save > 10:  # Only save every 10 seconds at most
            try:
                with open(cls._cache_file, 'w') as f:
                    json.dump(cls._cache, f, cls=DateTimeEncoder)
                cls._cache_modified = False
                cls._last_save_time = current_time
            except Exception as e:
                print(f"Error saving explain cache to file: {str(e)}")
    
    @classmethod
    def _clean_expired_entries(cls):
        """Remove expired entries from the cache"""
        with _cache_lock:
            now = datetime.now()
            expired_keys = []
            
            for key, item in cls._cache.items():
                if 'expires_at' in item and item['expires_at']:
                    if isinstance(item['expires_at'], str):
                        expires_at = datetime.fromisoformat(item['expires_at'])
                    else:
                        expires_at = item['expires_at']
                        
                    if expires_at < now:
                        expired_keys.append(key)
            
            for key in expired_keys:
                del cls._cache[key]
                
            if expired_keys:
                logger.info(f"Removed {len(expired_keys)} expired entries from explain cache")
                cls._save_cache_to_file()
                
    @classmethod
    def flush_cache(cls):
        """Flush the entire cache (clear all entries)"""
        with _cache_lock:
            cls._cache.clear()
            print(f"Flushed AI explain plan cache")
            # Save empty cache to file
            cls._save_cache_to_file(force=True)
            return True
                
    @staticmethod
    def generate_cache_key(model_type: str, explain_data: Dict[str, Any], 
                         db_type: str, sql_query: str) -> str:
        """Generate a unique cache key based on input parameters"""
        # Normalize SQL query by removing extra whitespace
        normalized_query = ' '.join(sql_query.split()).lower()
        
        # Create a hash of the explain data
        explain_hash = AIExplainCache._hash_dict(explain_data)
        
        # Combine all factors that affect the analysis result
        key_components = f"{model_type}:{explain_hash}:{db_type}:{normalized_query}"
        
        # Create a hash of the combined string
        return hashlib.sha256(key_components.encode()).hexdigest()
    
    @staticmethod
    def _hash_dict(data: Dict[str, Any]) -> str:
        """Create a hash of a dictionary"""
        if not data:
            return "empty"
        
        # Convert dict to a stable string representation and hash it
        return hashlib.sha256(json.dumps(data, sort_keys=True).encode()).hexdigest()


def with_ai_query_cache(ttl_days=30):
    """Decorator for caching AI query generation results"""
    def decorator(func):
        @wraps(func)
        def wrapper(self, prompt, schema_data, db_type, db_config=None):
            # Check if caching is enabled
            if not current_app.config.get('ENABLE_AI_CACHE', True):
                return func(self, prompt, schema_data, db_type, db_config)
            
            # Get model type from the model instance
            model_type = getattr(self, 'model_type', self.__class__.__name__)
            
            # Check cache first
            cache_key = AIQueryCache.generate_cache_key(model_type, prompt, schema_data, db_type, db_config)
            cached_result = AIQueryCache.get_cached_result(
                model_type, prompt, schema_data, db_type, db_config
            )
            
            if cached_result:
                print(f"[CACHE HIT] SQL generation for model_type={model_type}, cache_key={cache_key[:8]}...")
                # Add a flag to indicate this result is from cache
                cached_result['from_cache'] = True
                return cached_result
            
            print(f"[CACHE MISS] SQL generation for model_type={model_type}, cache_key={cache_key[:8]}...")
            
            # If not in cache, call the original function
            result = func(self, prompt, schema_data, db_type, db_config)
            
            # Cache the result if successful
            if result.get('success', False):
                cache_key = AIQueryCache.generate_cache_key(model_type, prompt, schema_data, db_type, db_config)
                AIQueryCache.cache_result(
                    model_type, prompt, schema_data, db_type, result, db_config, ttl_days
                )
                print(f"[CACHE STORE] SQL generation result for model_type={model_type}, cache_key={cache_key[:8]}...")
            
            return result
        return wrapper
    return decorator


def with_ai_explain_cache(ttl_days=30):
    """Decorator for caching AI explain plan analysis results"""
    def decorator(func):
        @wraps(func)
        def wrapper(self, explain_data, db_type, sql_query):
            # Check if caching is enabled
            if not current_app.config.get('ENABLE_AI_CACHE', True):
                return func(self, explain_data, db_type, sql_query)
            
            # Get model type from the model instance
            model_type = getattr(self, 'model_type', self.__class__.__name__)
            
            # Check cache first
            cache_key = AIExplainCache.generate_cache_key(model_type, explain_data, db_type, sql_query)
            cached_result = AIExplainCache.get_cached_analysis(
                model_type, explain_data, db_type, sql_query
            )
            
            if cached_result:
                print(f"[CACHE HIT] Explain plan analysis for model_type={model_type}, cache_key={cache_key[:8]}...")
                return cached_result
            
            print(f"[CACHE MISS] Explain plan analysis for model_type={model_type}, cache_key={cache_key[:8]}...")
            
            # If not in cache, call the original function
            result = func(self, explain_data, db_type, sql_query)
            
            # Cache the result if successful
            if isinstance(result, dict) and not result.get('error'):
                cache_key = AIExplainCache.generate_cache_key(model_type, explain_data, db_type, sql_query)
                AIExplainCache.cache_analysis(
                    model_type, explain_data, db_type, sql_query, result, ttl_days
                )
                print(f"[CACHE STORE] Explain plan analysis result for model_type={model_type}, cache_key={cache_key[:8]}...")
            
            return result
        return wrapper
    return decorator
