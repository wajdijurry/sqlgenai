/**
 * API Cache Utility
 * 
 * This utility provides caching for API requests to prevent redundant calls.
 * It implements:
 * 1. In-memory caching with configurable TTL (time-to-live)
 * 2. Request deduplication to prevent parallel identical requests
 * 3. Cache invalidation methods
 */

// Cache storage - using a Map that doesn't persist between page refreshes
const cache = new Map();

// In-flight requests tracking (to prevent duplicate parallel requests)
export const pendingRequests = {};

// Flag to track if this is the first load after a page refresh
let isFirstLoad = true;

// Reset the first load flag when the window is refreshed
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    console.log('[API Cache] Page loaded, resetting cache state');
    isFirstLoad = true;
    cache.clear();
  });
}

// Default cache time (5 minutes)
const DEFAULT_CACHE_TIME = 5 * 60 * 1000;

/**
 * Wraps an API call with caching functionality
 * @param {Function} apiCall - The original API function to call
 * @param {Object} options - Cache options
 * @param {string} options.key - Cache key or function to generate key
 * @param {number} options.ttl - Time to live in milliseconds
 * @param {boolean} options.bypassCache - Whether to bypass cache for this call
 * @returns {Promise<any>} - The API response
 */
export const withCache = (apiCall, options = {}) => {
  return async (...args) => {
    // Generate cache key
    const cacheKey = typeof options.key === 'function' 
      ? options.key(...args) 
      : options.key || apiCall.name;
    
    // Cache time to live
    const ttl = options.ttl || DEFAULT_CACHE_TIME;
    
    // Check if we should bypass cache
    // If options.bypassCache is a function, call it with the arguments
    // Otherwise, use the value directly or default to false
    const shouldBypassCache = typeof options.bypassCache === 'function'
      ? options.bypassCache(...args)
      : options.bypassCache || false;
    
    // If shouldBypassCache is true, skip cache and make the request
    if (shouldBypassCache) {
      console.log(`[API Cache] Bypassing cache for: ${cacheKey}`);

      const result = await apiCall(...args);
      // Update cache with new result
      setCache(cacheKey, result, ttl);
      return result;
    }
    
    // Check if we have a valid cached response
    const cachedResponse = getCache(cacheKey);
    
    // If this is the first load after a page refresh, don't use cache for main resources
    if (isFirstLoad && (cacheKey.includes(CACHE_KEYS.CONNECTIONS) || 
                       cacheKey.includes(CACHE_KEYS.SUBSCRIPTION) || 
                       cacheKey.includes(CACHE_KEYS.HISTORY))) {
      console.log(`[API Cache] First load, bypassing cache for: ${cacheKey}`);
      isFirstLoad = false;
    } else if (cachedResponse) {
      console.log(`[API Cache] Using cached response for: ${cacheKey}`);
      return cachedResponse;
    }
    
    // Check if there's already a pending request for this key
    if (pendingRequests[cacheKey]) {
      console.log(`[API Cache] Reusing in-flight request for: ${cacheKey}`);
      return pendingRequests[cacheKey];
    }
    
    // Make the API call and cache the promise
    const requestPromise = apiCall(...args)
      .then(result => {
        // Cache the result
        setCache(cacheKey, result, ttl);
        // Remove from pending requests
        delete pendingRequests[cacheKey];
        return result;
      })
      .catch(error => {
        // Remove from pending requests on error
        delete pendingRequests[cacheKey];
        throw error;
      });
    
    // Store the pending request
    pendingRequests[cacheKey] = requestPromise;
    
    return requestPromise;
  };
};

/**
 * Get an item from cache
 * @param {string} key - Cache key
 * @returns {any|null} - Cached value or null if not found/expired
 */
export const getCache = (key) => {
  if (!cache.has(key)) return null;
  
  const { value, expiry } = cache.get(key);
  const now = Date.now();
  
  // Check if cache entry has expired
  if (now > expiry) {
    cache.delete(key);
    return null;
  }
  
  return value;
};

/**
 * Set an item in cache
 * @param {string} key - Cache key
 * @param {any} value - Value to cache
 * @param {number} ttl - Time to live in milliseconds
 */
export const setCache = (key, value, ttl = DEFAULT_CACHE_TIME) => {
  const expiry = Date.now() + ttl;
  cache.set(key, { value, expiry });
};

/**
 * Clear a specific cache entry
 * @param {string} key - Cache key to clear
 */
export const clearCache = (key) => {
  cache.delete(key);
};

/**
 * Clear all cache entries
 */
export const clearAllCache = () => {
  cache.clear();
};

/**
 * Clear cache entries by prefix
 * @param {string} prefix - Prefix to match against cache keys
 */
export const clearCacheByPrefix = (prefix) => {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
};

/**
 * Cache keys for common API endpoints
 */
export const CACHE_KEYS = {
  CONNECTIONS: 'connections',
  HISTORY: 'history',
  SUBSCRIPTION: 'subscription',
  USER: 'user',
  SCHEMAS: 'schemas',
  AVAILABLE_MODELS: 'available_models',
};
