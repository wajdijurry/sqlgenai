import api from '../utils/api';
import axios from 'axios';
import { DATABASE_API_URL } from '../config/api';
import { withCache, CACHE_KEYS, clearCacheByPrefix } from '../utils/apiCache';

// Define the API_URL variable
const API_URL = DATABASE_API_URL;

/**
 * Get a specific database connection by ID (original function without caching)
 * @param {string} connectionId - The ID of the connection to fetch
 * @returns {Promise} - Promise with the connection data
 */
const fetchConnectionById = async (connectionId) => {
    try {
        // Get token from localStorage
        const token = localStorage.getItem('token');
        
        if (!token) {
            console.error('No authentication token available');
            throw { message: 'Authentication required' };
        }
        
        // Use axios for API calls
        const response = await axios.get(`${API_URL}/connections/${connectionId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            withCredentials: true
        });
        
        return response.data.connection || {};
    } catch (error) {
        console.error(`Error getting connection ${connectionId}:`, error);
        console.error('Error response:', error.response?.data);
        
        // If authentication error, redirect to login
        if (error.response?.status === 401) {
            console.log('Authentication error, redirecting to login');
            // Clear token and redirect to login
            localStorage.removeItem('token');
            window.location.href = '/login';
        }
        
        throw error.response?.data || { message: 'Failed to get connection details' };
    }
};

// Cached version of getConnectionById
export const getConnectionById = withCache(fetchConnectionById, {
    key: (connectionId) => `${CACHE_KEYS.CONNECTIONS}_${connectionId}`,
    ttl: 5 * 60 * 1000 // 5 minutes
});

// Original function without caching
const fetchConnections = async (forceRefresh = false) => {
    try {
        // Get token from localStorage
        const token = localStorage.getItem('token');
        
        if (!token) {
            console.error('No authentication token available');
            throw { message: 'Authentication required' };
        }
        
        console.log('Fetching connections from server');
        
        // Use axios for API calls
        const response = await axios.get(`${API_URL}/connections`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            withCredentials: true
        });
        
        return response.data.connections || [];
    } catch (error) {
        console.error('Error getting connections:', error);
        console.error('Error response:', error.response?.data);
        
        // If authentication error, redirect to login
        if (error.response?.status === 401) {
            console.log('Authentication error, redirecting to login');
            // Clear token and redirect to login
            localStorage.removeItem('token');
            window.location.href = '/login';
        }
        
        throw error.response?.data || { message: 'Failed to get connections' };
    }
};

// Cached version of getConnections
export const getConnections = withCache(fetchConnections, {
    key: CACHE_KEYS.CONNECTIONS,
    ttl: 5 * 60 * 1000, // 5 minutes
    bypassCache: (forceRefresh) => forceRefresh === true
});

/**
 * Clear the connections cache
 * This should be called after actions that would change the connections list
 * such as adding, updating, or deleting a connection
 */
export const clearConnectionsCache = () => {
    clearCacheByPrefix(CACHE_KEYS.CONNECTIONS);
    console.log('Connections cache cleared');
};
/**
 * Create a new database connection
 * @param {Object} connectionData - The connection data to create
 * @returns {Promise} - Promise with the created connection data
 */
export const createConnection = async (connectionData) => {
    try {
        // Get token from localStorage
        const token = localStorage.getItem('token');
        
        if (!token) {
            console.error('No authentication token available');
            throw { message: 'Authentication required' };
        }
        
        const response = await axios.post(`${API_URL}/connections`, connectionData, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            withCredentials: true
        });
        
        // Clear connections cache to force refresh
        clearCacheByPrefix(CACHE_KEYS.CONNECTIONS);
        
        return response.data;
    } catch (error) {
        console.error('Error creating connection:', error);
        console.error('Error response:', error.response?.data);
        
        // If authentication error, redirect to login
        if (error.response?.status === 401) {
            console.log('Authentication error, redirecting to login');
            localStorage.removeItem('token');
            window.location.href = '/login';
        }
        
        throw error.response?.data || { message: 'Failed to create connection' };
    }
};

/**
 * Update an existing database connection
 * @param {string} connectionId - The ID of the connection to update
 * @param {Object} connectionData - The updated connection data
 * @returns {Promise} - Promise with the updated connection data
 */
export const updateConnection = async (connectionId, connectionData) => {
  try {
    const token = localStorage.getItem('token');

    if (!token) {
      console.error('No authentication token available');
      throw { message: 'Authentication required' };
    }
    const response = await api.put(`${API_URL}/connections/${connectionId}`, connectionData, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      withCredentials: true
    });
    
    // Clear the connections cache since we've updated a connection
    clearConnectionsCache();
    
    // Also clear the schema cache for this connection since connection details may affect schema
    if (typeof clearSchemaCache === 'function') {
      clearSchemaCache(connectionId);
    }
    
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to update connection' };
  }
};

/**
 * Delete a database connection
 * @param {number} connectionId - The ID of the connection to delete
 * @returns {Promise} - Promise with the result of the deletion
 */
export const deleteConnection = async (connectionId) => {
  try {
    // Get token from localStorage
    const token = localStorage.getItem('token');

    if (!token) {
      console.error('No authentication token available');
      throw { message: 'Authentication required' };
    }
    const response = await api.delete(`${API_URL}/connections/${connectionId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      withCredentials: true
    });
    
    // Clear the connections cache since we've deleted a connection
    clearConnectionsCache();
    
    // Also clear the schema cache for this connection
    if (typeof clearSchemaCache === 'function') {
      clearSchemaCache(connectionId);
    }
    
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to delete connection' };
  }
};

/**
 * Test a database connection
 * @param {number} connectionId - The ID of the connection to test
 * @returns {Promise} - Promise with the test result
 */
export const testConnection = async (connectionId) => {
  try {
      // Get token from localStorage
      const token = localStorage.getItem('token');
  
      if (!token) {
        console.error('No authentication token available');
        throw { message: 'Authentication required' };
      }
    const response = await api.post(`${API_URL}/connections/${connectionId}/test`, {}, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      withCredentials: true
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to test connection' };
  }
};

// Cache for schema data to prevent redundant API calls
const schemaCache = new Map();
const SCHEMA_CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

/**
 * Clear the schema cache for a specific connection
 * @param {number} connectionId - The ID of the connection to clear schema cache for
 * If no connectionId is provided, clear all schema caches
 */
export const clearSchemaCache = (connectionId = null) => {
    if (connectionId) {
        // Clear cache for specific connection
        if (schemaCache.has(connectionId)) {
            schemaCache.delete(connectionId);
            console.log(`Schema cache cleared for connection ${connectionId}`);
        }
    } else {
        // Clear all schema caches
        schemaCache.clear();
        console.log('All schema caches cleared');
    }
};

/**
 * Get the schema for a database connection
 * @param {number} connectionId - The ID of the connection
 * @param {boolean} forceRefresh - Whether to force a refresh from the server
 * @returns {Promise} - Promise with the schema data
 */
export const getSchema = async (connectionId, forceRefresh = false) => {
  try {
    // Check if we have a valid cached schema
    const cachedData = schemaCache.get(connectionId);
    const now = Date.now();
    
    if (!forceRefresh && cachedData && (now - cachedData.timestamp < SCHEMA_CACHE_TTL)) {
      console.log(`Using cached schema for connection ID ${connectionId}`);
      return cachedData.data;
    }
    
    // Get token from localStorage
    const token = localStorage.getItem('token');
    
    if (!token) {
      console.error('No authentication token available');
      throw { message: 'Authentication required' };
    }
    
    console.log(`Fetching schema for connection ID ${connectionId}`);
    const response = await api.get(`${API_URL}/connections/${connectionId}/schema`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      withCredentials: true
    });
    
    // Cache the result
    schemaCache.set(connectionId, {
      data: response.data,
      timestamp: now
    });
    
    return response.data;
  } catch (error) {
    console.error('Error getting schema:', error);
    
    // If authentication error, redirect to login
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    
    throw error.response?.data || { message: 'Failed to get schema' };
  }
};

/**
 * Test a new connection before saving
 * @param {Object} connectionData - The connection data to test
 * @returns {Promise} - Promise with the test result
 */
export const testNewConnection = async (connectionData) => {
  try {
    // Get token from localStorage
    const token = localStorage.getItem('token');
    
    if (!token) {
      console.error('No authentication token available');
      throw { message: 'Authentication required' };
    }
    
    const response = await api.post(`${API_URL}/connections/test`, connectionData, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      withCredentials: true
    });
    return response.data;
  } catch (error) {
    console.error('Error testing connection:', error);
    
    // If authentication error, redirect to login
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    
    throw error.response?.data || { message: 'Failed to test new connection' };
  }
};
