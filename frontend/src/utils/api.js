import axios from 'axios';
import { BASE_API_URL } from '../config/api';
import { pendingRequests } from './apiCache';

// Function to handle circular references in JSON.stringify
const circularReplacer = () => {
  const seen = new WeakSet();
  return (key, value) => {
    // If value is an object and not null
    if (typeof value === 'object' && value !== null) {
      // If we've seen this object before, return a placeholder
      if (seen.has(value)) {
        return '[Circular Reference]';
      }
      // Add the value to our set of seen objects
      seen.add(value);
    }
    return value;
  };
};

// Create a custom axios instance with default configuration
const api = axios.create({
  baseURL: BASE_API_URL,
  withCredentials: true, // Important for sending cookies with cross-origin requests
  headers: {
    'Content-Type': 'application/json'
  },
  // Override the default JSON.stringify with our custom replacer
  transformRequest: [(data, headers) => {
    if (data && headers['Content-Type'] === 'application/json') {
      return JSON.stringify(data, circularReplacer());
    }
    return data;
  }, ...axios.defaults.transformRequest]
});

// Initialize with token if it exists
const token = localStorage.getItem('token');
if (token) {
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

// Add request interceptor to handle authentication and caching
api.interceptors.request.use(
  (config) => {
    // Get token from localStorage
    const token = localStorage.getItem('token');
    
    // If token exists, add it to the request headers
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add a unique request ID to help with deduplication
    const requestId = generateRequestId(config);
    config.requestId = requestId;
    
    // Check if there's a pending request with the same ID
    if (pendingRequests[requestId]) {
      // If there is, create a new cancel token for this request
      const source = axios.CancelToken.source();
      config.cancelToken = source.token;
      return config;
    }
    
    // If not, add the request to the pending requests cache
    const source = axios.CancelToken.source();
    pendingRequests[requestId] = {
      cancelToken: source,
      response: null
    };
    config.cancelToken = source.token;
    
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor to handle errors and caching
api.interceptors.response.use(
  (response) => {
    // Log successful responses for debugging
    console.log('API Response:', {
      url: response.config.url,
      status: response.status,
      data: response.data
    });
    return response;
  },
  (error) => {
    // Log error responses for debugging
    console.error('API Error:', {
      url: error.config?.url,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    
    // Handle 401 Unauthorized errors
    if (error.response && error.response.status === 401) {
      // Clear token and redirect to login
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);

/**
 * Generate a unique request ID based on the request configuration
 * This helps with deduplicating requests
 * @param {Object} config - The axios request config
 * @returns {string} - A unique identifier for this request
 */
function generateRequestId(config) {
  const { method, url, params, data } = config;
  return `${method || 'get'}:${url}:${JSON.stringify(params || {})}:${JSON.stringify(data || {})}`;
}

export default api;
