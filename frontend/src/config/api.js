/**
 * API configuration for the SQLGenAI frontend
 * This file centralizes API URL configuration for all services
 */

// In production, use the api subdomain; in development, use localhost
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// API is now at the root level for both production and development
export const BASE_API_URL = API_BASE;

// API endpoints
export const AUTH_API_URL = `${BASE_API_URL}/auth`;
export const DATABASE_API_URL = `${BASE_API_URL}/database`;
export const SUBSCRIPTION_API_URL = `${BASE_API_URL}/subscription`;
export const QUERY_API_URL = BASE_API_URL;

// Export a default config object
export default {
  baseUrl: BASE_API_URL,
  authUrl: AUTH_API_URL,
  databaseUrl: DATABASE_API_URL,
  subscriptionUrl: SUBSCRIPTION_API_URL,
  queryUrl: QUERY_API_URL
};
