import api from '../utils/api';
import axios from 'axios';
import { QUERY_API_URL } from '../config/api';
import { withCache, CACHE_KEYS, clearCacheByPrefix } from '../utils/apiCache';

/**
 * Fetch available AI models based on user's subscription
 * @returns {Promise} - Promise with available models
 */
export const fetchAvailableModels = async () => {
  try {
    const response = await api.get(`${API_URL}/models/available`);
    return response.data.models || [];
  } catch (error) {
    console.error('Error fetching available models:', error);
    // Return default model if API call fails
    return [{
      id: 'deepseek',
      name: 'DeepSeek R1',
      description: 'DeepSeek SQL model for general SQL generation'
    }];
  }
};

/**
 * Get available AI models with caching
 * @returns {Promise} - Promise with available models
 */
export const getAvailableModels = withCache(fetchAvailableModels, {
  key: () => CACHE_KEYS.AVAILABLE_MODELS,
  ttl: 5 * 60 * 1000 // 5 minutes
});

const API_URL = QUERY_API_URL;

/**
 * Generate SQL query from natural language
 * @param {Object} queryData - Data for generating SQL query
 * @param {number} queryData.connection_id - Database connection ID
 * @param {string} queryData.prompt - Natural language query
 * @param {string} queryData.model_type - AI model to use (openai or deepseek)
 * @returns {Promise} - Promise with generated SQL query
 */
export const generateQuery = async (queryData) => {
  try {
    const response = await api.post(`${API_URL}/generate`, queryData);
    return response.data;
  } catch (error) {
    console.error('Error generating query:', error);
    throw error.response?.data || { message: 'Failed to generate SQL query' };
  }
};

/**
 * Execute a SQL query
 * @param {Object} executionData - Data for executing SQL query
 * @param {number} executionData.connection_id - Database connection ID
 * @param {string} executionData.sql_query - SQL query to execute
 * @param {number} executionData.page_size - Number of results per page (default: 25)
 * @param {number} executionData.page - Page number for pagination (default: 1)
 * @param {number} executionData.page_size - Number of results per page (default: 100)
 * @returns {Promise} - Promise with query results
 */
export const executeQuery = async (executionData) => {
  try {
    // Log the incoming page_size to debug
    console.log('Page size before processing:', executionData.page_size);
    
    // Ensure required parameters are included in the request and properly formatted
    const requestData = {
      connection_id: executionData.connection_id,
      sql_query: executionData.sql_query,
      // Ensure pagination parameters are numbers, not objects
      page: Number(executionData.page) || 1,
      page_size: Number(executionData.page_size) || 25
    };
    
    // Log the final page_size to verify it's correct
    console.log('Page size in request:', requestData.page_size);
    
    const response = await api.post(`${API_URL}/execute`, requestData);
    return response.data;
  } catch (error) {
    console.error('Error executing query:', error);
    throw error.response?.data || { message: 'Failed to execute SQL query' };
  }
};

/**
 * Get explain plan for a SQL query without executing it
 * @param {Object} explainData - Data for getting explain plan
 * @param {number} explainData.connection_id - Database connection ID
 * @param {string} explainData.sql_query - SQL query to analyze
 * @param {string} explainData.model - AI model to use (openai or deepseek)
 * @returns {Promise} - Promise with explain plan results
 */
export const explainQuery = async (explainData) => {
  try {
    // Make sure model is included in the request
    // If not provided, it will use the default (openai)
    const requestData = {
      ...explainData,
      model: explainData.model || 'openai'
    };
    
    const response = await api.post(`${API_URL}/explain`, requestData);
    return response.data;
  } catch (error) {
    console.error('Error getting explain plan:', error);
    throw error.response?.data || { message: 'Failed to get explain plan for SQL query' };
  }
};

/**
 * Get total query count for the current user
 * @returns {Promise} - Promise with total query count
 */
export const getTotalQueryCount = async () => {
  try {
    // Get token from localStorage
    const token = localStorage.getItem('token');
    
    if (!token) {
      console.error('No authentication token available');
      throw { message: 'Authentication required' };
    }
    
    const response = await api.get(`${API_URL}/history/count`, { 
      headers: {
        'Authorization': `Bearer ${token}`
      },
      withCredentials: true
    });
    
    return response.data.count || 0;
  } catch (error) {
    console.error('Error getting query count:', error);
    return 0; // Return 0 if there's an error
  }
};

/**
 * Get query usage for subscription plan enforcement
 * @returns {Promise} - Promise with query usage data for the current billing period
 */
export const getQueryUsage = async () => {
  try {
    // Get token from localStorage
    const token = localStorage.getItem('token');
    
    if (!token) {
      console.error('No authentication token available');
      throw { message: 'Authentication required' };
    }
    
    const response = await api.get(`${API_URL}/usage`, { 
      headers: {
        'Authorization': `Bearer ${token}`
      },
      withCredentials: true
    });
    
    return response.data;
  } catch (error) {
    console.error('Error getting query usage:', error);
    return { monthly_count: 0 }; // Return default if there's an error
  }
};

/**
 * Get query history for the current user (original function without caching)
 * @param {Object} params - Query parameters
 * @param {number} params.page - Page number
 * @param {number} params.per_page - Items per page
 * @param {number} params.connection_id - Filter by connection ID (optional)
 * @param {boolean} params.is_favorite - Filter by favorite status (optional)
 * @returns {Promise} - Promise with query history
 */
const fetchQueryHistory = async (params = {}) => {
  try {
    // Get token from localStorage
    const token = localStorage.getItem('token');
    
    if (!token) {
      console.error('No authentication token available');
      throw { message: 'Authentication required' };
    }
    
    console.log('Fetching query history from server');
    
    const response = await axios.get(`${API_URL}/history`, { 
      params,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      withCredentials: true
    });
    
    return response.data;
  } catch (error) {
    console.error('Error getting query history:', error);
    console.error('Error response:', error.response?.data);
    
    // If authentication error, redirect to login
    if (error.response?.status === 401) {
      console.log('Authentication error, redirecting to login');
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    
    throw error.response?.data || { message: 'Failed to get query history' };
  }
};

// Cached version of getQueryHistory
export const getQueryHistory = withCache(fetchQueryHistory, {
  key: (params = {}) => {
    // Create a unique cache key based on the parameters
    const page = params.page || 1;
    const perPage = params.per_page || 10;
    const connectionId = params.connection_id || 'all';
    const isFavorite = params.is_favorite || false;
    
    return `${CACHE_KEYS.HISTORY}_p${page}_pp${perPage}_c${connectionId}_f${isFavorite}`;
  },
  ttl: 5 * 60 * 1000, // 5 minutes
  bypassCache: (params = {}) => params.forceRefresh === true
});

/**
 * Get a specific query by ID
 * @param {number} queryId - The ID of the query to retrieve
 * @returns {Promise} - Promise with query details
 */
export const getQueryById = async (queryId) => {
  try {
    // Get token from localStorage
    const token = localStorage.getItem('token');
    
    if (!token) {
      console.error('No authentication token available');
      throw { message: 'Authentication required' };
    }
    
    console.log('Getting query by ID:', queryId);
    
    const response = await api.get(`${API_URL}/history/${queryId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      withCredentials: true
    });
    
    console.log('Query details response:', response.data);
    return response.data;
  } catch (error) {
    console.error(`Error getting query with ID ${queryId}:`, error);
    console.error('Error response:', error.response?.data);
    
    // If authentication error, redirect to login
    if (error.response?.status === 401) {
      console.log('Authentication error, redirecting to login');
      // Clear token and redirect to login
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    
    throw error.response?.data || { message: `Failed to get query with ID ${queryId}` };
  }
};

/**
 * Get a specific query by ID
 * @param {number} queryId - The ID of the query to retrieve
 * @returns {Promise} - Promise with query data
 */
export const getQuery = async (queryId) => {
  try {
    const response = await api.get(`${API_URL}/history/${queryId}`);
    return response.data.query;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to get query' };
  }
};

/**
 * Toggle favorite status for a query
 * @param {number} queryId - The ID of the query to toggle favorite status
 * @returns {Promise} - Promise with updated favorite status
 */
export const toggleFavorite = async (queryId) => {
  try {
    const response = await api.post(`${API_URL}/history/${queryId}/favorite`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to toggle favorite status' };
  }
};

/**
 * Delete a query from history
 * @param {number} queryId - The ID of the query to delete
 * @returns {Promise} - Promise with deletion status
 */
export const deleteQuery = async (queryId) => {
  try {
    const response = await api.post(`${API_URL}/history/${queryId}/delete`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to delete query' };
  }
};
