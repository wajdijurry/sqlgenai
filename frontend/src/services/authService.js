import api from '../utils/api';
import axios from 'axios';
import { AUTH_API_URL } from '../config/api';

// Use the full AUTH_API_URL for authentication requests
const API_URL = AUTH_API_URL;

/**
 * Register a new user
 * @param {Object} userData - User registration data
 * @returns {Promise} - Promise with user data
 */
export const register = async (userData) => {
  try {
    const response = await api.post(`${API_URL}/register`, userData);
    return response.data;
  } catch (error) {
    console.error('Registration error:', error);
    throw error.response?.data || { message: 'Registration failed' };
  }
};

/**
 * Login a user
 * @param {Object} credentials - User login credentials
 * @returns {Promise} - Promise with user data and token
 */
export const login = async (credentials) => {
  try {
    console.log('Attempting login with credentials:', { email: credentials.email, passwordLength: credentials.password?.length });
    console.log('API path:', API_URL);
    
    // Use axios directly for login to avoid any interceptor issues
    const response = await axios.post(`${API_URL}/login`, credentials, {
      headers: {
        'Content-Type': 'application/json'
      },
      withCredentials: true // Important for session cookies
    });
    
    console.log('Login response:', response.data);
    
    if (response.data.token) {
      // Store token in localStorage
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      // Set token for future requests
      api.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
      
      // Immediately make a test request to verify authentication
      try {
        const testResponse = await api.get(`${AUTH_API_URL}/status`);
        console.log('Authentication test response:', testResponse.data);
      } catch (testError) {
        console.warn('Authentication test failed:', testError);
      }
    } else {
      console.error('No token received in login response');
    }
    
    return response.data.user;
  } catch (error) {
    console.error('Login error:', error);
    console.error('Error response:', error.response?.data);
    throw error.response?.data || { message: 'Login failed' };
  }
};

/**
 * Logout the current user
 * @returns {Promise} - Promise with logout status
 */
export const logout = async () => {
  try {
    // Get token from localStorage
    const token = localStorage.getItem('token');
    
    if (token) {
      // Call the API logout endpoint with the token
      await axios.post(`${API_URL}/logout`, {}, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        withCredentials: true
      });
    }
    
    // Clear local storage and headers regardless of API call result
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete api.defaults.headers.common['Authorization'];
    delete axios.defaults.headers.common['Authorization'];
    
    return { success: true };
  } catch (error) {
    console.error('Logout error:', error);
    
    // Still clear local storage and headers even if API call fails
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete api.defaults.headers.common['Authorization'];
    delete axios.defaults.headers.common['Authorization'];
    
    // Return success even if API call fails, as we've cleared local state
    return { success: true };
  }
};

/**
 * Update user profile
 * @param {Object} profileData - User profile data to update
 * @returns {Promise} - Promise with updated user data
 */
export const updateProfile = async (profileData) => {
  try {
    // Get token from localStorage
    const token = localStorage.getItem('token');
    
    if (!token) {
      console.error('No authentication token available');
      throw { message: 'Authentication required' };
    }
    
    console.log('Updating profile with data:', profileData);
    console.log('Using API URL:', `${API_URL}/profile`);
    console.log('Using token:', token.substring(0, 10) + '...');
    
    // Make a direct axios call instead of using the api utility
    const response = await axios.put(`${API_URL}/profile`, profileData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      withCredentials: true
    });
    
    console.log('Profile update response:', response.data);
    
    // Update user data in localStorage if it was returned
    if (response.data.user) {
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    
    return response.data;
  } catch (error) {
    console.error('Profile update error:', error);
    console.error('Error response:', error.response?.data);
    throw error.response?.data || { message: 'Failed to update profile' };
  }
};

// Cache for auth status to prevent duplicate API calls
let authStatusCache = {
  timestamp: 0,
  promise: null,
  cacheTimeMs: 10000 // Cache auth status for 10 seconds
};

/**
 * Check if user is authenticated
 * @param {boolean} forceRefresh - Force a refresh of the auth status
 * @returns {Promise} - Promise with user data if authenticated
 */
export const checkAuthStatus = async (forceRefresh = false) => {
  const now = Date.now();
  
  // Return cached promise if it exists and is still valid
  if (!forceRefresh && authStatusCache.promise && (now - authStatusCache.timestamp < authStatusCache.cacheTimeMs)) {
    console.log('Using cached auth status');
    return authStatusCache.promise;
  }
  
  // Create a new promise for the auth status check
  authStatusCache.timestamp = now;
  authStatusCache.promise = new Promise(async (resolve, reject) => {
    try {
      // Set token from localStorage if it exists
      const token = localStorage.getItem('token');
      if (!token) {
        // If no token exists, user is not authenticated
        reject({ message: 'No authentication token found' });
        return;
      }
      
      // Use the api utility which already has token handling
      const response = await api.get(`${API_URL}/status`);
      
      if (response.data.authenticated) {
        // Update user data in localStorage
        localStorage.setItem('user', JSON.stringify(response.data.user));
        resolve(response.data.user);
      } else {
        // Clear token if not authenticated
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        reject({ message: 'Not authenticated' });
      }
    } catch (error) {
      console.error('Auth status check error:', error);
      
      // Only clear token if it's an authentication error (401)
      if (error.response && error.response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
      
      reject(error.response?.data || { message: 'Authentication check failed' });
    }
  });
  
  return authStatusCache.promise;
};

// updateProfile function is now defined above

/**
 * Change user password
 * @param {Object} passwordData - Password change data
 * @returns {Promise} - Promise with status
 */
export const changePassword = async (passwordData) => {
  try {
    const response = await axios.put(`${API_URL}/password`, passwordData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Password change failed' };
  }
};
