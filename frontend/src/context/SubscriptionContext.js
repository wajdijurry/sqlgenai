import React, { createContext, useState, useContext, useEffect, useCallback, useMemo } from 'react';
import { getSubscription } from '../services/subscriptionService';

// Create the context
const SubscriptionContext = createContext();

// Custom hook to use the subscription context
export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};

// Provider component
export const SubscriptionProvider = ({ children }) => {
  // State for subscription data
  const [subscription, setSubscription] = useState(null);
  const [queryLimit, setQueryLimit] = useState(10); // Default limit for free tier
  const [queryCount, setQueryCount] = useState(0);
  const [aiCreditsCount, setAiCreditsCount] = useState(0);
  const [generateCount, setGenerateCount] = useState(0);
  const [explainCount, setExplainCount] = useState(0);
  const [executeCount, setExecuteCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Function to load subscription data
  const loadSubscription = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);
      
      // Get subscription data from API using our cached service
      // The service will handle caching internally
      const subscriptionData = await getSubscription(forceRefresh);
      console.log('Subscription data loaded in context:', subscriptionData);
      
      // Extract the subscription object from the response
      let extractedSubscription = subscriptionData;
      if (subscriptionData && subscriptionData.subscription) {
        extractedSubscription = subscriptionData.subscription;
      }
      
      setSubscription(extractedSubscription);
      
      // Get query usage from the subscription response
      if (subscriptionData && subscriptionData.query_usage) {
        const { 
          monthly_count, 
          limit, 
          ai_credits_count, 
          generate_count, 
          explain_count, 
          execute_count 
        } = subscriptionData.query_usage;
        
        setQueryCount(monthly_count || 0);
        
        // Ensure the free plan always has at least 10 credits
        if (extractedSubscription && extractedSubscription.plan_id === 'free' && (!limit || limit === 0)) {
          setQueryLimit(10);
        } else {
          setQueryLimit(limit || 10);
        }
        
        // Set the AI credits counts
        setAiCreditsCount(ai_credits_count || 0);
        setGenerateCount(generate_count || 0);
        setExplainCount(explain_count || 0);
        setExecuteCount(execute_count || 0);
      } else if (extractedSubscription) {
        // Fallback to plan_id if query_usage is not available
        const planId = extractedSubscription.plan_id;
        let defaultLimit = 10; // Default for free tier
        
        // Set default limits based on plan
        if (planId === 'basic') {
          defaultLimit = 100;
        } else if (planId === 'professional') {
          defaultLimit = 500;
        } else if (planId === 'enterprise') {
          defaultLimit = Number.MAX_SAFE_INTEGER; // Unlimited
        }
        
        setQueryLimit(defaultLimit);
      }
      
      // Update last updated timestamp
      setLastUpdated(Date.now());
      
      return { 
        subscription: extractedSubscription, 
        queryLimit, 
        queryCount, 
        aiCreditsCount 
      };
    } catch (err) {
      console.error('Error loading subscription in context:', err);
      setError(err.message || 'Failed to load subscription data');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Load subscription data on mount
  useEffect(() => {
    loadSubscription();
  }, [loadSubscription]);

  // Check if subscription has reached its limit
  const isLimitReached = useMemo(() => {
    if (!subscription) return false;
    
    // Special case for Enterprise plan: queryLimit of -1 means unlimited queries
    if (queryLimit === -1) return false;
    
    // Check if subscription is annual to adjust limits accordingly
    const isAnnual = subscription.is_annual;
    
    // Adjust limit for annual plans
    const adjustedLimit = isAnnual ? queryLimit * 12 : queryLimit;
    
    // Check if limit is reached
    return queryCount >= adjustedLimit;
  }, [subscription, queryCount, queryLimit]);

  // Provide the context value
  const value = {
    subscription,
    queryLimit,
    queryCount,
    aiCreditsCount,
    generateCount,
    explainCount,
    executeCount,
    loading,
    error,
    isLimitReached,
    loadSubscription,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};
