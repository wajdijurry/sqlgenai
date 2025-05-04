import axios from 'axios';
import { AUTH_API_URL } from '../config/api';

/**
 * Initiates Google OAuth login flow
 * @returns {Promise} Promise with Google auth URL
 */
export const initiateGoogleLogin = async () => {
  try {
    console.log('Initiating Google login with URL:', `${AUTH_API_URL}/google/login`);
    const response = await axios.get(`${AUTH_API_URL}/google/login`, {
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    console.log('Google login response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error initiating Google login:', error);
    throw new Error(error.response?.data?.message || 'Failed to initiate Google login');
  }
};

/**
 * Exchange Google authorization code for token
 * @param {string} code - Authorization code from Google
 * @param {string} state - State parameter for CSRF protection
 * @returns {Promise} Promise with user data and token
 */
export const exchangeGoogleCode = async (code, state) => {
  try {
    console.log('Exchanging Google code with URL:', `${AUTH_API_URL}/google/token`);
    const response = await axios.post(`${AUTH_API_URL}/google/token`, 
      { code, state },
      {
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('Google token exchange response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error exchanging Google code:', error);
    throw new Error(error.response?.data?.message || 'Failed to exchange Google code');
  }
};

/**
 * Handle the Google OAuth callback
 * @param {string} code - Authorization code from Google
 * @param {string} state - State parameter for CSRF protection
 * @returns {Promise} Promise with user data and token
 */
export const handleGoogleCallback = async (code, state) => {
  try {
    const userData = await exchangeGoogleCode(code, state);
    
    // Store the token in localStorage
    if (userData.token) {
      localStorage.setItem('token', userData.token);
      
      // Set the Authorization header for future API requests
      axios.defaults.headers.common['Authorization'] = `Bearer ${userData.token}`;
      
      // Also set it for the api utility if it's imported
      if (window.api) {
        window.api.defaults.headers.common['Authorization'] = `Bearer ${userData.token}`;
      }
      
      console.log('Google auth token stored and headers set');
    } else {
      console.error('No token received from Google authentication');
    }
    
    return userData;
  } catch (error) {
    console.error('Error handling Google callback:', error);
    throw error;
  }
};
