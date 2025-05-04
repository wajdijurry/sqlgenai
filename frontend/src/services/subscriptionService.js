import api from '../utils/api';
import axios from 'axios';
import { SUBSCRIPTION_API_URL } from '../config/api';
import { withCache, CACHE_KEYS, clearCacheByPrefix } from '../utils/apiCache';

const API_URL = SUBSCRIPTION_API_URL;

/**
 * Get current user's subscription (original function without caching)
 * @param {boolean} forceRefresh - Whether to force a refresh from the server
 * @returns {Promise} - Promise with subscription data
 */
const fetchSubscription = async (forceRefresh = false) => {
  try {
    // Get token from localStorage
    const token = localStorage.getItem('token');
    
    if (!token) {
      console.error('No authentication token available');
      throw { message: 'Authentication required' };
    }
    
    console.log('Fetching subscription data from server');
    const response = await axios.get(`${API_URL}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      withCredentials: true
    });
    
    return response.data.subscription;
  } catch (error) {
    console.error('Error getting subscription:', error);
    console.error('Error response:', error.response?.data);
    
    // If authentication error, redirect to login
    if (error.response?.status === 401) {
      console.log('Authentication error, redirecting to login');
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    
    throw error.response?.data || { message: 'Failed to get subscription data' };
  }
};

// Cached version of getSubscription
export const getSubscription = withCache(fetchSubscription, {
  key: CACHE_KEYS.SUBSCRIPTION,
  ttl: 5 * 60 * 1000, // 5 minutes
  bypassCache: (forceRefresh) => forceRefresh === true
});

/**
 * Get all available subscription plans (original function without caching)
 * @returns {Promise} - Promise with plans data
 */
const fetchSubscriptionPlans = async () => {
  try {
    // Get token from localStorage
    const token = localStorage.getItem('token');
    
    if (!token) {
      console.error('No authentication token available');
      throw { message: 'Authentication required' };
    }
    
    console.log('Fetching subscription plans from server');
    const response = await axios.get(`${API_URL}/plans`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      withCredentials: true
    });
    
    return response.data.plans;
  } catch (error) {
    console.error('Error getting subscription plans:', error);
    console.error('Error response:', error.response?.data);
    
    // If authentication error, redirect to login
    if (error.response?.status === 401) {
      console.log('Authentication error, redirecting to login');
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    
    throw error.response?.data || { message: 'Failed to get subscription plans' };
  }
};

// Cached version of getSubscriptionPlans
export const getSubscriptionPlans = withCache(fetchSubscriptionPlans, {
  key: `${CACHE_KEYS.SUBSCRIPTION}_plans`,
  ttl: 5 * 60 * 1000 // 5 minutes
});

/**
 * Clear the subscription cache
 * This should be called after actions that would change the subscription
 * such as subscribing or cancelling
 */
export const clearSubscriptionCache = () => {
  clearCacheByPrefix(CACHE_KEYS.SUBSCRIPTION);
  console.log('Subscription cache cleared');
};

/**
 * Get available subscription plans
 * @returns {Promise} - Promise with plans data
 */
export const getPlans = async () => {
  try {
    const response = await api.get(`${API_URL}/plans`);
    return response.data.plans;
  } catch (error) {
    console.error('Error getting plans:', error);
    throw error.response?.data || { message: 'Failed to get subscription plans' };
  }
};

/**
 * Create a Stripe checkout session for subscription
 * @param {Object} subscriptionData - Subscription data
 * @param {string} subscriptionData.plan_id - Plan ID
 * @param {string} subscriptionData.billing_cycle - Billing cycle (monthly or yearly)
 * @returns {Promise} - Promise with checkout session data containing checkout URL
 */
export const createCheckoutSession = async (subscriptionData) => {
  try {
    // Get token from localStorage
    const token = localStorage.getItem('token');
    
    if (!token) {
      console.error('No authentication token available');
      throw { message: 'Authentication required' };
    }
    
    const response = await api.post(`${API_URL}/checkout`, subscriptionData, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      withCredentials: true
    });
    
    // Return the checkout URL and ID from Stripe
    return response.data;
  } catch (error) {
    console.error('Error creating checkout session:', error);
    
    // If authentication error, redirect to login
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    
    throw error.response?.data || { message: 'Failed to create checkout session' };
  }
};

/**
 * Process subscription payment after Stripe checkout completion (original function without caching)
 * @param {Object} sessionData - Session data
 * @param {string} sessionData.session_id - Stripe checkout session ID
 * @returns {Promise} - Promise with payment result
 */
const fetchProcessPayment = async (sessionData) => {
  try {
    // Get token from localStorage
    const token = localStorage.getItem('token');
    
    if (!token) {
      console.error('No authentication token available');
      throw { message: 'Authentication required' };
    }
    
    console.log('Processing payment with session ID:', sessionData.session_id);
    const response = await api.post(`${API_URL}/process`, sessionData, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      withCredentials: true
    });
    return response.data;
  } catch (error) {
    console.error('Error processing payment:', error);
    
    // If authentication error, redirect to login
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    
    throw error.response?.data || { message: 'Payment processing failed' };
  }
};

// Cached version of processPayment
export const processPayment = withCache(fetchProcessPayment, {
  // Use the session_id as part of the cache key to make it unique per session
  key: (sessionData) => `${CACHE_KEYS.SUBSCRIPTION}_payment_${sessionData.session_id}`,
  ttl: 24 * 60 * 60 * 1000 // 24 hours - long enough to prevent duplicate processing
});

/**
 * Get all available subscription plans with pricing and features
 * @param {boolean} forceRefresh - Whether to force a refresh from the server
 * @returns {Promise} - Promise with subscription plans data
 */
export const getSubscriptionPlansWithPricing = async (forceRefresh = false) => {
  try {
    // Check if we have valid cached plans
    const now = Date.now();
    
    if (!forceRefresh && plansCache && (now - plansCacheTimestamp < PLANS_CACHE_TTL)) {
      console.log('Using cached subscription plans data');
      return plansCache;
    }
    
    console.log('Fetching subscription plans from server');
    const response = await api.get(`${API_URL}/plans/config`);
    
    // Cache the result
    plansCache = response.data.plans;
    plansCacheTimestamp = now;
    
    return response.data.plans;
  } catch (error) {
    console.error('Error getting subscription plans:', error);
    throw error;
  }
};

/**
 * Redirect to Stripe Checkout
 * @param {string} checkoutUrl - Stripe checkout URL
 */
export const redirectToStripeCheckout = (checkoutUrl) => {
  // Redirect to Stripe checkout page
  window.location.href = checkoutUrl;
};

/**
 * Cancel subscription
 * @returns {Promise} - Promise with the cancellation result
 */
export const cancelSubscription = async () => {
  try {
    // Get token from localStorage
    const token = localStorage.getItem('token');
    
    if (!token) {
      console.error('No authentication token available');
      throw { message: 'Authentication required' };
    }
    
    const response = await axios.post(`${API_URL}/cancel`, {}, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      withCredentials: true
    });
    
    // Clear the subscription cache
    clearSubscriptionCache();
    
    return response.data;
  } catch (error) {
    console.error('Error canceling subscription:', error);
    
    // If authentication error, redirect to login
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    
    throw error.response?.data || { message: 'Failed to cancel subscription' };
  }
};

/**
 * Get payment history (original function without caching)
 * @returns {Promise} - Promise with payment history data
 */
const fetchPaymentHistory = async () => {
  try {
    // Get token from localStorage
    const token = localStorage.getItem('token');
    
    if (!token) {
      console.error('No authentication token available');
      throw { message: 'Authentication required' };
    }
    
    console.log('Fetching payment history from server');
    const response = await api.get(`${API_URL}/payments`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      withCredentials: true
    });
    return response.data.payments;
  } catch (error) {
    console.error('Error getting payment history:', error);
    
    // If authentication error, redirect to login
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    
    throw error.response?.data || { message: 'Failed to get payment history' };
  }
};

// Cached version of getPaymentHistory
export const getPaymentHistory = withCache(fetchPaymentHistory, {
  key: `${CACHE_KEYS.SUBSCRIPTION}_payments`,
  ttl: 5 * 60 * 1000 // 5 minutes
});

/**
 * Update current subscription
 * @param {Object} subscriptionData - Updated subscription data
 * @param {string} subscriptionData.plan_id - New plan ID
 * @param {string} subscriptionData.billing_cycle - New billing cycle (monthly or yearly)
 * @returns {Promise} - Promise with updated subscription data
 */
export const updateSubscription = async (subscriptionData) => {
  try {
    // Get token from localStorage
    const token = localStorage.getItem('token');
    
    if (!token) {
      console.error('No authentication token available');
      throw { message: 'Authentication required' };
    }
    
    const response = await api.put(`${API_URL}/update`, subscriptionData, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      withCredentials: true
    });
    return response.data;
  } catch (error) {
    console.error('Error updating subscription:', error);
    
    // If authentication error, redirect to login
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    
    throw error.response?.data || { message: 'Failed to update subscription' };
  }
};
