import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { getConnections } from '../services/connectionService';

// Create the context
const ConnectionsContext = createContext();

// Custom hook to use the connections context
export const useConnections = () => {
  const context = useContext(ConnectionsContext);
  if (!context) {
    throw new Error('useConnections must be used within a ConnectionsProvider');
  }
  return context;
};

// Provider component
export const ConnectionsProvider = ({ children }) => {
  // State for connections data
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Function to load connections data
  const loadConnections = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);
      
      // Get connections data from API using our cached service
      // The service will handle caching internally
      const connectionsData = await getConnections(forceRefresh);
      
      setConnections(connectionsData);
      setLastUpdated(Date.now());
      
      return connectionsData;
    } catch (err) {
      console.error('Error loading connections:', err);
      setError(err.message || 'Failed to load connections');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Load connections data on mount
  useEffect(() => {
    loadConnections();
  }, [loadConnections]);

  // Provide the context value
  const value = {
    connections,
    loading,
    error,
    loadConnections
  };

  return (
    <ConnectionsContext.Provider value={value}>
      {children}
    </ConnectionsContext.Provider>
  );
};
