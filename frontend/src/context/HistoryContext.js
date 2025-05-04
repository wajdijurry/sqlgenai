import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { getQueryHistory } from '../services/queryService';

// Create the context
const HistoryContext = createContext();

// Custom hook to use the history context
export const useHistory = () => {
  const context = useContext(HistoryContext);
  if (!context) {
    throw new Error('useHistory must be used within a HistoryProvider');
  }
  return context;
};

// Provider component
export const HistoryProvider = ({ children }) => {
  // State for history data
  const [recentQueries, setRecentQueries] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Function to load history data
  const loadHistory = useCallback(async (page = 1, perPage = 5, forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);
      
      // Get history data from API using our cached service
      // The service will handle caching internally
      const historyData = await getQueryHistory({ 
        page, 
        per_page: perPage,
        forceRefresh
      });
      
      setRecentQueries(historyData.history || []);
      setTotalCount(historyData.total || 0);
      setLastUpdated(Date.now());
      
      return historyData;
    } catch (err) {
      console.error('Error loading history:', err);
      setError(err.message || 'Failed to load query history');
      return { history: [], total: 0 };
    } finally {
      setLoading(false);
    }
  }, []);

  // Load history data on mount
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Provide the context value
  const value = {
    recentQueries,
    totalCount,
    loading,
    error,
    loadHistory
  };

  return (
    <HistoryContext.Provider value={value}>
      {children}
    </HistoryContext.Provider>
  );
};
