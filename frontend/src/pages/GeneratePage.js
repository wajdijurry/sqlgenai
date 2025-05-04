import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  IconButton,
  Divider,
  Chip,
  CircularProgress,
  Alert,
  Switch,
  FormControlLabel,
  Snackbar,
  Tooltip
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import SaveIcon from '@mui/icons-material/Save';
import RefreshIcon from '@mui/icons-material/Refresh';
import SchemaIcon from '@mui/icons-material/Schema';
import AssessmentIcon from '@mui/icons-material/Assessment';
import CodeIcon from '@mui/icons-material/Code';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { dracula } from 'react-syntax-highlighter/dist/esm/styles/prism';
import QueryPerformanceAnalysis from '../components/QueryPerformanceAnalysis';
import ExplainPlanTable from '../components/ExplainPlanTable';
import { Analytics as AnalyticsIcon } from '@mui/icons-material';

// Services
import { getConnections, getSchema } from '../services/connectionService';
import { generateQuery, executeQuery, explainQuery, toggleFavorite, getQueryById, getQueryUsage, getAvailableModels } from '../services/queryService';
import { getSubscription, clearSubscriptionCache } from '../services/subscriptionService';

// Schema Viewer Component
const SchemaViewer = ({ schema }) => {
  if (!schema || !schema.tables || schema.tables.length === 0) {
    return (
      <Alert severity="info">No schema information available. Please select a connection.</Alert>
    );
  }

  return (
    <Box sx={{ maxHeight: '400px', overflowY: 'auto', p: 1 }}>
      {schema.tables.map((table) => (
        <Box key={table.name} sx={{ mb: 3 }}>
          <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>
            {table.name}
          </Typography>
          <Paper variant="outlined" sx={{ p: 1 }}>
            {table.columns.map((column) => (
              <Box 
                key={column.name} 
                sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  p: 1,
                  borderBottom: '1px solid #eee',
                  '&:last-child': {
                    borderBottom: 'none'
                  }
                }}
              >
                <Typography variant="body2" fontWeight="medium">
                  {column.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" fontFamily="monospace">
                  {column.dataType}
                </Typography>
              </Box>
            ))}
          </Paper>
        </Box>
      ))}
    </Box>
  );
};

const GeneratePage = ({ user }) => {
  const location = useLocation();
  
  // State for connections
  const [connections, setConnections] = useState([]);
  const [selectedConnection, setSelectedConnection] = useState('');
  const [loadingConnections, setLoadingConnections] = useState(true);
  const [connectionError, setConnectionError] = useState('');
  
  // State for query generation - moved up to avoid reference errors
  const [model, setModel] = useState('');
  const [availableModels, setAvailableModels] = useState([{
    id: 'deepseek',
    name: 'DeepSeek R1',
    description: 'DeepSeek SQL model for general SQL generation'
  }]);
  const [loadingModels, setLoadingModels] = useState(true);
  const [prompt, setPrompt] = useState('');
  const [generatedQuery, setGeneratedQuery] = useState('');
  const [generationTime, setGenerationTime] = useState(null);
  const [queryId, setQueryId] = useState(null);
  
  // State for subscription and query limits
  const [subscription, setSubscription] = useState(null);
  const [queryLimit, setQueryLimit] = useState(10); // Default limit for free tier
  const [queryCount, setQueryCount] = useState(0);
  const [explainLimit, setExplainLimit] = useState(10); // Default explain limit for free tier
  const [explainCount, setExplainCount] = useState(0);
  const [loadingSubscription, setLoadingSubscription] = useState(true);
  
  // --- Subscription limit check logic using useMemo to update when dependencies change ---
  const isLimitReached = useMemo(() => {
    // Check if subscription is annual to adjust limits accordingly
    const isAnnual = subscription?.subscription?.is_annual;
    
    // First check if we have query_usage directly in the subscription response
    if (subscription && subscription.query_usage && 
        typeof subscription.query_usage.monthly_count === 'number' && 
        typeof subscription.query_usage.limit === 'number') {
      // For annual plans, the limit should be 12 times the monthly limit
      const adjustedLimit = isAnnual ? subscription.query_usage.limit * 12 : subscription.query_usage.limit;
      
      // Special case: -1 means unlimited queries (for Enterprise plan)
      if (adjustedLimit === -1) {
        return false; // Never reach limit with unlimited queries
      }
      
      const result = subscription.query_usage.monthly_count >= adjustedLimit;
      return result;
    }
    
    // Then check if we have a nested subscription object
    const nestedSub = subscription?.subscription;
    if (nestedSub && nestedSub.query_usage && 
        typeof nestedSub.query_usage.monthly_count === 'number' && 
        typeof nestedSub.query_usage.limit === 'number') {
      // For annual plans, the limit should be 12 times the monthly limit
      const adjustedLimit = isAnnual ? nestedSub.query_usage.limit * 12 : nestedSub.query_usage.limit;
      
      // Special case: -1 means unlimited queries (for Enterprise plan)
      if (adjustedLimit === -1) {
        return false; // Never reach limit with unlimited queries
      }
      
      const result = nestedSub.query_usage.monthly_count >= adjustedLimit;
      return result;
    }
    
    // Finally fall back to the state variables
    if (typeof queryCount === 'number' && typeof queryLimit === 'number') {
      // Special case: -1 means unlimited queries (for Enterprise plan)
      if (queryLimit === -1) {
        return false; // Never reach limit with unlimited queries
      }
      
      const result = queryCount >= queryLimit;
      return result;
    }
    
    return false;
  }, [subscription, queryCount, queryLimit])
  
  // --- Explain plan limit check logic ---
  const isExplainLimitReached = useMemo(() => {
    // Check if subscription is annual to adjust limits accordingly
    const isAnnual = subscription?.subscription?.is_annual;
    
    // First check if we have explain_usage directly in the subscription response
    if (subscription && subscription.explain_usage && 
        typeof subscription.explain_usage.monthly_count === 'number' && 
        typeof subscription.explain_usage.limit === 'number') {
      // For annual plans, the limit should be 12 times the monthly limit
      const adjustedLimit = isAnnual ? subscription.explain_usage.limit * 12 : subscription.explain_usage.limit;
      const result = subscription.explain_usage.monthly_count >= adjustedLimit;
      return result;
    }
    
    // Then check if we have a nested subscription object
    const nestedSub = subscription?.subscription;
    if (nestedSub && nestedSub.explain_usage && 
        typeof nestedSub.explain_usage.monthly_count === 'number' && 
        typeof nestedSub.explain_usage.limit === 'number') {
      // For annual plans, the limit should be 12 times the monthly limit
      const adjustedLimit = isAnnual ? nestedSub.explain_usage.limit * 12 : nestedSub.explain_usage.limit;
      const result = nestedSub.explain_usage.monthly_count >= adjustedLimit;
      return result;
    }
    
    // Finally fall back to the state variables
    if (typeof explainCount === 'number' && typeof explainLimit === 'number') {
      const result = explainCount >= explainLimit;
      return result;
    }
    
    return false;
  }, [subscription, explainCount, explainLimit])
  
  // Check if the user has access to specific AI models based on their subscription plan
  const hasModelAccess = useMemo(() => {
    // Default access levels
    const defaultAccess = {
      openai: false,  // OpenAI is only available on Professional and Enterprise plans
      deepseek: true, // DeepSeek is now available on all plans including free tier
      claude: false   // Claude is only available on enterprise plan
    };
    
    // Get features from subscription
    const features = subscription?.features || subscription?.subscription?.features;
    
    if (!features) {
      return defaultAccess;
    }
    
    return {
      openai: features.openai_models === "Yes",
      deepseek: features.deepseek_models !== "No", // Default to true if not specified
      claude: features.claude_models === "Yes"
    };
  }, [subscription])
  
  // Update model selection when available models change
  useEffect(() => {
    // If the current model is not available, select the first available model
    if (model && !hasModelAccess[model]) {
      // Find the first available model - prioritize deepseek which is available on all plans
      if (hasModelAccess.deepseek) {
        setModel('deepseek');
      } else if (hasModelAccess.openai) {
        setModel('openai');
      } else if (hasModelAccess.claude) {
        setModel('claude');
      } else {
        // If no models are available, set to empty string
        setModel('');
      }
    }
  }, [hasModelAccess, model]);
  
  // Ensure model is always set to an available option
  useEffect(() => {
    // This runs once after initial render to make sure model has a valid value
    const availableModels = [];
    // Prioritize deepseek which is available on all plans
    if (hasModelAccess.deepseek) availableModels.push('deepseek');
    if (hasModelAccess.openai) availableModels.push('openai');
    if (hasModelAccess.claude) availableModels.push('claude');
    
    if (availableModels.length > 0 && !availableModels.includes(model)) {
      setModel(availableModels[0]);
    } else if (availableModels.length === 0 && model !== '') {
      setModel('');
    }
  }, [hasModelAccess, model])
  
  // State for database connections
  const [schema, setSchema] = useState(null);
  const [showSchema, setShowSchema] = useState(false);
  const [schemaLoading, setSchemaLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState(null); // For additional information from the AI model
  
  // State for query execution
  const [queryResults, setQueryResults] = useState(null);
  const [executing, setExecuting] = useState(false);
  const [executionTime, setExecutionTime] = useState(null);
  const [performanceAnalysis, setPerformanceAnalysis] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalRows, setTotalRows] = useState(0);
  const [hasMorePages, setHasMorePages] = useState(false);
  
  // State for explain plan
  const [explaining, setExplaining] = useState(false);
  const [explainResults, setExplainResults] = useState(null);
  
  // State for notifications
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  
  // Refs
  const promptRef = useRef(null);
  
  // Effect to track state changes related to subscription limits
  useEffect(() => {
    // This effect is kept for reactivity, but logs are removed
  }, [queryCount, queryLimit, subscription, isLimitReached]);
  
  // Track if we've loaded connections to prevent redundant API calls
  const hasLoadedConnectionsRef = useRef(false);
  
  // Load connections from API
  const loadConnections = async (forceRefresh = false) => {
    try {
      // Only show loading indicator if we're forcing a refresh or haven't loaded yet
      if (forceRefresh || !hasLoadedConnectionsRef.current) {
        setLoadingConnections(true);
        setConnectionError('');
      }
      
      // Use the cached connections data if available
      const connectionsData = await getConnections(forceRefresh);
      setConnections(connectionsData);
      hasLoadedConnectionsRef.current = true;
      setLoadingConnections(false);
      return connectionsData;
    } catch (err) {
      console.error('Error loading connections:', err);
      setConnectionError('Failed to load connections');
      setLoadingConnections(false);
      return []; // Return empty array on error
    }
  };
  
  // Track if we've loaded subscription details to prevent redundant API calls
  const hasLoadedSubscriptionRef = useRef(false);
  
  // Track if we've loaded available models to prevent redundant API calls
  const hasLoadedModelsRef = useRef(false);
  
  // Track the user's selected model to prevent it from being reset
  const userSelectedModelRef = useRef('');
  
  // Track if we've already processed URL parameters to prevent duplicate processing
  const hasProcessedUrlParamsRef = useRef(false);
  
  // Load connections and subscription details on component mount
  useEffect(() => {
    console.log('Initial component mount, loading data...');
    
    // Skip if we've already processed URL parameters in this session
    if (hasProcessedUrlParamsRef.current) {
      console.log('URL parameters already processed, skipping connections load');
      return;
    }
    
    // Mark that we're processing URL parameters
    hasProcessedUrlParamsRef.current = true;
    
    // Load connections first - use cache if available
    loadConnections(false).then(connectionsData => {
      if (!connectionsData || connectionsData.length === 0) return;
      
      // Check URL parameters
      const params = new URLSearchParams(location.search);
      const connectionId = params.get('connection');
      
      // If connection ID is in URL, find the matching connection object
      if (connectionId) {
        console.log(`URL contains connection ID: ${connectionId}`);
        // Find the matching connection object
        const connectionObj = connectionsData.find(conn => conn.id.toString() === connectionId.toString());
        
        if (connectionObj) {
          console.log(`Found matching connection: ${connectionObj.name}`);
          // Set the full connection object
          setSelectedConnection(connectionObj);
          
          // Only load the schema if we haven't already loaded it for this connection
          if (!loadedSchemaRef.current[connectionId]) {
            console.log(`Loading schema for connection ${connectionId} from URL parameter`);
            loadSchema(connectionId);
            // Mark this connection as having its schema loaded
            loadedSchemaRef.current[connectionId] = true;
          } else {
            console.log(`Schema for connection ${connectionId} already loaded, skipping`);
          }
          
          // Force a re-render to ensure the dropdown updates
          setTimeout(() => {
            const select = document.getElementById('connection-select');
            if (select) {
              select.value = connectionObj.id;
            }
          }, 100);
        } else {
          console.log(`Connection ID ${connectionId} not found in available connections`);
        }
      }
    }).catch(err => {
      console.error('Error loading connections:', err);
      setConnectionError('Failed to load connections');
    });
    
    // Only load subscription details and check for query ID if we're processing URL parameters
    if (hasProcessedUrlParamsRef.current) {
      // Load subscription details only if we haven't loaded them yet
      if (!hasLoadedSubscriptionRef.current) {
        console.log('Loading subscription details (initial load)');
        loadSubscriptionDetails(false); // false means don't force refresh
        hasLoadedSubscriptionRef.current = true;
        
        // Load available AI models
        console.log('Loading available AI models');
        loadAvailableModels(false);
      }
      
      // Check if we have a query ID from the URL
      const params = new URLSearchParams(location.search);
      const queryId = params.get('id');
      if (queryId) {
        loadQueryById(queryId);
      }
    }
  }, [location]);
  
  // Load available AI models based on user's subscription
  const loadAvailableModels = async (forceRefresh = false) => {
    try {
      setLoadingModels(true);
      
      // Check if user has explicitly selected a model (stored in ref)
      const userSelectedModel = userSelectedModelRef.current;
      console.log(`User selected model from ref: ${userSelectedModel}`);
      
      // Get models from API
      const models = await getAvailableModels();
      
      // Log the available models and the hasModelAccess state
      console.log('Available models from API:', models);
      console.log('hasModelAccess state:', hasModelAccess);
      
      if (models && models.length > 0) {
        setAvailableModels(models);
        
        // If user has explicitly selected a model and it's available, use it
        if (userSelectedModel && models.some(m => m.id === userSelectedModel)) {
          console.log(`Using user's explicitly selected model: ${userSelectedModel}`);
          setModel(userSelectedModel);
        } 
        // Otherwise, if no current selection or current selection not available, use first available
        else if (!model || !models.some(m => m.id === model)) {
          console.log(`Setting model to first available: ${models[0].id}`);
          setModel(models[0].id);
          // Only update the ref if user hasn't made an explicit selection
          if (!userSelectedModel) {
            userSelectedModelRef.current = models[0].id;
          }
        }
      } else {
        // If no models are returned, use models based on hasModelAccess
        const availableModels = [];
        
        // Always add DeepSeek as it's available on all plans
        availableModels.push({
          id: 'deepseek',
          name: 'DeepSeek R1',
          description: 'DeepSeek SQL model for general SQL generation'
        });
        
        // Add OpenAI if available in the plan
        if (hasModelAccess.openai) {
          availableModels.push({
            id: 'openai',
            name: 'OpenAI GPT-4',
            description: 'OpenAI\'s GPT-4 model for advanced SQL generation'
          });
        }
        
        // Add Claude if available in the plan
        if (hasModelAccess.claude) {
          availableModels.push({
            id: 'claude',
            name: 'Claude 3',
            description: 'Anthropic\'s Claude 3 model for advanced SQL generation'
          });
        }
        
        setAvailableModels(availableModels);
        
        // If user has explicitly selected a model and it's in hasModelAccess, use it
        if (userSelectedModel === 'deepseek' || 
            (userSelectedModel === 'openai' && hasModelAccess.openai) || 
            (userSelectedModel === 'claude' && hasModelAccess.claude)) {
          console.log(`Using user's explicitly selected model: ${userSelectedModel}`);
          setModel(userSelectedModel);
        } 
        // Otherwise use the first available model
        else {
          console.log(`Setting model to first available: ${availableModels[0].id}`);
          setModel(availableModels[0].id);
          userSelectedModelRef.current = availableModels[0].id;
        }
      }
    } catch (error) {
      console.error('Error loading available models:', error);
      
      // Check if user has explicitly selected a model
      const userSelectedModel = userSelectedModelRef.current;
      
      // Set default models based on hasModelAccess
      const availableModels = [{
        id: 'deepseek',
        name: 'DeepSeek R1',
        description: 'DeepSeek SQL model for general SQL generation'
      }];
      
      setAvailableModels(availableModels);
      
      // If user has explicitly selected a model, keep it if possible
      if (userSelectedModel) {
        console.log(`Keeping user's explicit model selection after error: ${userSelectedModel}`);
        setModel(userSelectedModel);
      } else {
        console.log('No user selection, defaulting to deepseek after error');
        setModel('deepseek');
        userSelectedModelRef.current = 'deepseek';
      }
    } finally {
      setLoadingModels(false);
    }
  };
  
  // Load subscription details and query usage
  const loadSubscriptionDetails = async (forceRefresh = false) => {
    try {
      setLoadingSubscription(true);
      
      // Try to get user's subscription (using cache if available)
      let userSubscription = null;
      try {
        userSubscription = await getSubscription(forceRefresh);
        
        // Extract the subscription object from the response
        if (userSubscription && userSubscription.subscription) {
          userSubscription = userSubscription.subscription;
        }
        
        setSubscription(userSubscription);

      } catch (err) {
        // User might not have a subscription yet
        console.log('Error loading subscription:', err);
      }
      
      // Get query usage from the subscription response
      if (userSubscription && userSubscription.query_usage) {
        const { monthly_count, limit } = userSubscription.query_usage;

        
        // Set the query count and limit from the subscription response
        // Using functional updates to ensure we're working with the latest state
        setQueryCount(monthly_count);
        setQueryLimit(limit);
        
        // Update state with values from subscription
      } else {
        // Fallback to user object if subscription doesn't have query usage
        let usedQueries = 0;
        if (user && user.query_usage) {
          usedQueries = user.query_usage.monthly_count || 0;
        }
        setQueryCount(usedQueries);
        
        // Query limit will be set based on subscription plan below
      }
      
      // If query limit wasn't set from query_usage, determine it based on subscription plan
      if (!userSubscription || !userSubscription.query_usage) {
        let limit = 10; // Default for free tier
        
        if (userSubscription) {
          // If user has a subscription, check the plan features
          if (userSubscription.plan_id === 'basic') {
            limit = 100;
          } else if (userSubscription.plan_id === 'professional') {
            limit = 500;
          } else if (userSubscription.plan_id === 'enterprise') {
            limit = 9999999; // Effectively unlimited for enterprise
          }
        }
        
        setQueryLimit(limit);
      }
      setLoadingSubscription(false);
    } catch (err) {
      console.error('Error loading subscription details:', err);
      setLoadingSubscription(false);
    }
  };
  
  // We use a ref to track if we've already loaded the schema for this connection
  const loadedSchemaRef = useRef({});
  const initialRenderRef = useRef(true);
  
  // This effect handles schema loading when the connection or showSchema changes
  // It's separate from the URL parameter handling to prevent duplicate calls
  useEffect(() => {
    // Skip this effect on the initial render since we handle URL params separately
    if (initialRenderRef.current) {
      initialRenderRef.current = false;
      return;
    }
    
    if (selectedConnection && showSchema) {
      const connectionId = selectedConnection.id;
      
      // Only load the schema if we haven't already loaded it for this connection
      if (!loadedSchemaRef.current[connectionId]) {
        console.log(`Loading schema for connection ${connectionId} (connection/showSchema change)`);
        loadSchema();
        // Mark this connection as having its schema loaded
        loadedSchemaRef.current[connectionId] = true;
      }
    }
  }, [selectedConnection, showSchema]);
  
  const loadSchema = async (connectionParam, forceRefresh = false) => {
    // Use the provided connection parameter or fall back to the selected connection
    const connectionToUse = connectionParam || selectedConnection;
    if (!connectionToUse) return;
    
    setSchemaLoading(true);
    try {
      // Handle both cases: when connectionToUse is an ID (string/number) or an object with an id property
      const connectionId = typeof connectionToUse === 'object' ? connectionToUse.id : connectionToUse;
      
      // Use the cached schema if available, unless forceRefresh is true
      const data = await getSchema(connectionId, forceRefresh);
      
      // Check if the schema data is nested inside a 'schema' property
      if (data && data.success && data.schema) {
        setSchema(data.schema);
      } else {
        // Fallback to using the data directly if it's not nested
        setSchema(data);
      }
    } catch (err) {
      console.error('Error loading schema:', err);
      setError('Failed to load database schema');
    } finally {
      setSchemaLoading(false);
    }
  };
  
  const handleConnectionChange = (event) => {
    const connectionId = event.target.value;
    
    // Find the connection object with the selected ID
    const connection = connections.find(conn => conn.id.toString() === connectionId.toString());
    
    // Always store the full connection object, not just the ID
    setSelectedConnection(connection || null);
    
    // Clear the schema first
    setSchema(null);
    
    // Then load the new schema
    if (connectionId) {
      loadSchema(connectionId);
    }
  };
  
  const handleModelChange = (event) => {
    const selectedModel = event.target.value;
    setModel(selectedModel);
    // Update the userSelectedModelRef to track the user's explicit selection
    userSelectedModelRef.current = selectedModel;
    console.log(`Selected model changed to: ${selectedModel} (saved to userSelectedModelRef)`);
  };
  
  const handlePromptChange = (event) => {
    setPrompt(event.target.value);
  };
  
  const handleSchemaToggle = (event) => {
    setShowSchema(event.target.checked);
  };
  
  const handleGenerateQuery = async () => {
    // Check if query limit is reached
    
    // Check if user has reached query limit based on monthly_count compared to limit
    // The subscription object might be nested inside a 'subscription' property
    
    if (!selectedConnection || !prompt.trim()) {
      setError('Please select a connection and enter a prompt');
      return;
    }
    
    setError('');
    setGenerating(true);
    setGeneratedQuery('');
    setAdditionalInfo(null); // Clear any previous additional info
    
    try {
      const result = await generateQuery({
        connection_id: selectedConnection.id,
        prompt: prompt,
        model: model,
        include_schema: showSchema
      });
      const endTime = Date.now();
      
      if (result.success) {
        // Use result.query instead of result.sql to match the API response format
        setGeneratedQuery(result.query || result.sql); // Fallback to result.sql for backward compatibility
        
        // Check if the result is from cache
        if (result.from_cache) {
          // Set a special flag to indicate the result is from cache
          setGenerationTime('cached');
        } else {
          // Set the actual generation time
          setGenerationTime(result.execution_time || (endTime - Date.now()) / 1000);
        }
        
        setQueryId(result.query_id || result.id);
        
        // Check if there's additional information from the AI model
        if (result.additional_info) {
          setAdditionalInfo(result.additional_info);
        }
        
        // After successful query generation, clear the subscription cache and reload subscription details
        // to get updated query count
        clearSubscriptionCache();
        
        // Reset the hasLoadedSubscription flag so we'll reload subscription details
        hasLoadedSubscriptionRef.current = false;
        
        // Force refresh to get the latest count
        console.log('Reloading subscription details after successful query generation');
        loadSubscriptionDetails(true);
        
        // Also reload available models in case subscription changed
        loadAvailableModels(true);
      } else {
        setError(result.message || 'Failed to generate SQL query');
      }
    } catch (err) {
      // Check if this is a query limit error (HTTP 403)
      if (err.response && err.response.status === 403) {
        const errorData = err.response.data;
        setError(`You have reached your monthly query limit. Please upgrade your plan to continue.`);
        
        // Update the query count and limit from the error response if available
        if (errorData && errorData.query_count !== undefined && errorData.query_limit !== undefined) {
          setQueryCount(errorData.query_count);
          setQueryLimit(errorData.query_limit);
        } else {
          // If not available in the error, reload subscription details
          loadSubscriptionDetails();
        }
      } else {
        setError(err.message || 'An error occurred while generating the query');
      }
    } finally {
      setGenerating(false);
    }
  };
  
  // Handle page size change by executing the query with the new page size
  const handlePageSizeChange = async (newPageSize) => {
    if (!selectedConnection) {
      setSnackbar({
        open: true,
        message: 'Please select a database connection'
      });
      return;
    }
    
    if (!generatedQuery.trim()) {
      setSnackbar({
        open: true,
        message: 'Please enter a SQL query'
      });
      return;
    }
    
    setExecuting(true);
    
    // Clear query results when changing page size
    setQueryResults(null);
    // Keep explain results so the explain plan section remains visible
    // setExplainResults(null);
    setPerformanceAnalysis(null);
    
    // Reset to page 1
    setCurrentPage(1);
    
    console.log('Executing query with new page size:', newPageSize);
    
    try {
      const result = await executeQuery({
        connection_id: selectedConnection.id,
        sql_query: generatedQuery,
        analyze_performance: analyzePerformance,
        page: 1,
        page_size: newPageSize // Use the new page size directly
      });
      
      setQueryResults(result);
      
      if (result.success) {
        setQueryResults(result);
        setExecutionTime(result.execution_time);
        
        // Update pagination information
        if (result.totalCount !== undefined) {
          // Ensure totalCount is a number
          const totalCount = parseInt(result.totalCount, 10);
          if (!isNaN(totalCount)) {
            setTotalRows(totalCount);
          }
        }
        setHasMorePages(result.hasMore || false);
        
        if (result.performance_analysis) {
          setPerformanceAnalysis(result.performance_analysis);
        }
      } else {
        setError(result.error || 'Failed to execute query');
      }
    } catch (err) {
      setError(err.message || 'An error occurred while executing the query');
      console.error(err);
    } finally {
      setExecuting(false);
    }
  };

  const handleExecuteQuery = async (page = 1) => {
    if (!selectedConnection) {
      setSnackbar({
        open: true,
        message: 'Please select a database connection'
      });
      return;
    }
    
    if (!generatedQuery.trim()) {
      setSnackbar({
        open: true,
        message: 'Please enter a SQL query'
      });
      return;
    }
    
    setExecuting(true);
    
    // Only clear query results when executing a new query (page 1)
    if (page === 1) {
      setQueryResults(null);
      // Clear explain results to avoid duplicate explain plans
      setExplainResults(null);
      setPerformanceAnalysis(null);
    }
    
    // Update current page
    setCurrentPage(page);
    
    try {
      const result = await executeQuery({
        connection_id: selectedConnection.id,
        sql_query: generatedQuery,
        page: page,
        page_size: parseInt(pageSize, 10) // Ensure it's a proper integer
      });
      
      setQueryResults(result);
      
      if (result.success) {
        setQueryResults(result);
        setExecutionTime(result.execution_time);
        
        // Update pagination information
        if (result.totalCount !== undefined) {
          // Ensure totalCount is a number
          const totalCount = parseInt(result.totalCount, 10);
          if (!isNaN(totalCount)) {
            setTotalRows(totalCount);
          }
        }
        setHasMorePages(result.hasMore || false);
        
        // We no longer get performance analysis from execute query
      } else {
        setError(result.error || 'Failed to execute query');
      }
    } catch (err) {
      setError(err.message || 'An error occurred while executing the query');
      console.error(err);
    } finally {
      setExecuting(false);
    }
  };
  
  const handleExplainQuery = async () => {
    if (!selectedConnection || !generatedQuery.trim()) {
      setError('Please select a connection and generate a query first');
      return;
    }
    
    setExplaining(true);
    // Clear existing explain results and performance analysis
    setExplainResults(null);
    setPerformanceAnalysis(null);
    
    try {
      const result = await explainQuery({
        connection_id: selectedConnection.id,
        sql_query: generatedQuery,
        model: model  // Pass the currently selected model
      });
      
      if (result.success) {
        // Set the new explain results, replacing any previous ones
        setExplainResults(result);
        setPerformanceAnalysis(result.performance_analysis);
      } else {
        setError(result.error || 'Failed to get explain plan');
      }
    } catch (err) {
      setError(err.message || 'An error occurred while getting the explain plan');
      console.error(err);
    } finally {
      setExplaining(false);
    }
  };
  
  const handleCopyQuery = () => {
    navigator.clipboard.writeText(generatedQuery);
    setSnackbar({
      open: true,
      message: 'SQL query copied to clipboard',
      severity: 'success'
    });
  };
  
  const handleSaveQuery = async () => {
    if (!queryId) return;
    
    try {
      const result = await toggleFavorite(queryId);
      
      if (result.success) {
        setSnackbar({
          open: true,
          message: result.is_favorite ? 'Query saved to favorites' : 'Query removed from favorites',
          severity: 'success'
        });
      }
    } catch (err) {
      setSnackbar({
        open: true,
        message: 'Failed to save query',
        severity: 'error'
      });
    }
  };
  
  const handleClearPrompt = () => {
    setPrompt('');
    if (promptRef.current) {
      promptRef.current.focus();
    }
  };
  
  const handleCloseSnackbar = () => {
    setSnackbar({
      ...snackbar,
      open: false
    });
  };
  
  return (
    <Container maxWidth="xl">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Generate SQL Query
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" gutterBottom>
          Transform natural language into optimized SQL queries using AI
        </Typography>
        
        {/* Connection and Model Selection */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Grid container spacing={3}>
                  <Grid item xs={12} md={6} lg={6}>
                    <FormControl fullWidth variant="outlined" margin="normal">
                      <InputLabel id="connection-select-label">Database Connection</InputLabel>
                      <Select
                        labelId="connection-select-label"
                        id="connection-select"
                        value={selectedConnection ? selectedConnection.id : ''}
                        onChange={handleConnectionChange}
                        label="Database Connection"
                        disabled={loadingConnections}
                      >
                        {connections.map((connection) => (
                          <MenuItem key={connection.id} value={connection.id}>
                            {connection.name} ({connection.db_type})
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12} md={6} lg={6}>
                    <FormControl fullWidth variant="outlined" margin="normal">
                      <InputLabel id="model-select-label">AI Model</InputLabel>
                      <Select
                        labelId="model-select-label"
                        id="model-select"
                        value={model}
                        onChange={handleModelChange}
                        label="AI Model"
                        disabled={loadingModels || availableModels.length === 0}
                      >
                        {availableModels.map((modelOption) => (
                          <MenuItem key={modelOption.id} value={modelOption.id}>
                            {modelOption.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
          </Grid>
        </Paper>
        
        {/* Query Generation */}
        <Grid container spacing={3}>
          {/* Prompt Section */}
          <Grid item xs={12} md={6}>
            <Paper 
              sx={{ 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column',
                overflow: 'hidden'
              }}
            >
              <Box 
                sx={{ 
                  p: 2, 
                  bgcolor: 'background.default', 
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <Typography variant="subtitle1" fontWeight="medium">
                  Natural Language Query
                </Typography>
                <FormControlLabel
                  control={
                    <Switch 
                      checked={showSchema} 
                      onChange={handleSchemaToggle}
                      size="small"
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <SchemaIcon fontSize="small" sx={{ mr: 0.5 }} />
                      <Typography variant="body2">Show Schema</Typography>
                    </Box>
                  }
                  sx={{ m: 0 }}
                />
              </Box>
              
              {showSchema && (
                <Box sx={{ p: 2, borderBottom: '1px solid #eee' }}>
                  {schemaLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                      <CircularProgress size={30} />
                    </Box>
                  ) : (
                    <SchemaViewer schema={schema} />
                  )}
                </Box>
              )}
              
              <Box sx={{ p: 2, flexGrow: 1 }}>
                <TextField
                  fullWidth
                  multiline
                  rows={10}
                  placeholder="Enter your query in natural language, e.g., 'Show me all customers who made a purchase in the last month'"
                  value={prompt}
                  onChange={handlePromptChange}
                  inputRef={promptRef}
                  sx={{ mb: 2 }}
                />
                {/* Subscription limit warning */}
                {!loadingSubscription && isLimitReached && (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    You have reached your monthly query limit ({queryLimit}).
                    <Button
                      color="primary"
                      size="small"
                      href="/subscription"
                      sx={{ ml: 1 }}
                    >
                      Upgrade your plan
                    </Button>
                  </Alert>
                )}
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Tooltip title={isLimitReached ? 
                    `You have reached your monthly query limit (${queryLimit}). Please upgrade your plan to generate more queries.` : 
                    "Generate SQL query from your natural language prompt"}>
                    <span> {/* Wrapper needed for disabled buttons with tooltip */}
                      <Button
                        variant="contained"
                        color="primary"
                        startIcon={<CodeIcon />}
                        onClick={handleGenerateQuery}
                        disabled={!selectedConnection || !prompt.trim() || generating || isLimitReached}
                      >
                        {generating ? (
                          <>
                            <CircularProgress size={20} sx={{ mr: 1 }} />
                            Generating...
                          </>
                        ) : (
                          'Generate SQL'
                        )}
                      </Button>
                    </span>
                  </Tooltip>
                  <Button
                    variant="outlined"
                    startIcon={<RefreshIcon />}
                    onClick={handleClearPrompt}
                  >
                    Clear
                  </Button>
                </Box>
              </Box>
            </Paper>
          </Grid>
          
          {/* SQL Result Section */}
          <Grid item xs={12} md={6}>
            <Paper 
              sx={{ 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column',
                overflow: 'hidden'
              }}
            >
              <Box 
                sx={{ 
                  p: 2, 
                  bgcolor: 'background.default', 
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <Typography variant="subtitle1" fontWeight="medium">
                  Generated SQL
                </Typography>
                
                {generationTime !== null && (
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Chip 
                      label={generationTime === 'cached' ? 'Cached' : `${typeof generationTime === 'number' ? generationTime.toFixed(2) : '0.00'}s`}
                      size="small"
                      color={generationTime === 'cached' ? 'secondary' : 'default'}
                      sx={{ mr: 1 }}
                    />
                    <Chip 
                      label={model === 'openai' ? 'OpenAI' : 'DeepSeek'}
                      color="primary"
                      size="small"
                    />
                  </Box>
                )}
              </Box>
              
              <Box sx={{ p: 2, flexGrow: 1, overflow: 'auto' }}>
                {error && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                  </Alert>
                )}
                
                {generatedQuery ? (
                  <>
                    <SyntaxHighlighter
                      language="sql"
                      style={dracula}
                      customStyle={{
                        margin: 0,
                        borderRadius: '4px',
                        fontSize: '14px'
                      }}
                    >
                      {generatedQuery}
                    </SyntaxHighlighter>
                    
                    {/* Display additional information from the AI model if available */}
                    {additionalInfo && (
                      <Paper 
                        variant="outlined" 
                        sx={{ 
                          mt: 2, 
                          p: 2, 
                          backgroundColor: '#f8f9fa',
                          borderLeft: '4px solid #4caf50'
                        }}
                      >
                        <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                          Additional Information
                        </Typography>
                        <Typography variant="body2">
                          {additionalInfo}
                        </Typography>
                      </Paper>
                    )}
                  </>
                ) : (
                  <Box 
                    sx={{ 
                      height: '100%', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      color: 'text.secondary',
                      p: 4,
                      textAlign: 'center'
                    }}
                  >
                    {generating ? (
                      <CircularProgress />
                    ) : (
                      <Typography>
                        Generated SQL will appear here
                      </Typography>
                    )}
                  </Box>
                )}
              </Box>
              
              {generatedQuery && (
                <Box 
                  sx={{ 
                    p: 2, 
                    borderTop: '1px solid #eee',
                    display: 'flex',
                    justifyContent: 'space-between',
                    flexDirection: 'column'
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Box>
                      <IconButton 
                        onClick={handleCopyQuery}
                        title="Copy SQL"
                      >
                        <ContentCopyIcon />
                      </IconButton>
                      <IconButton 
                        onClick={handleSaveQuery}
                        title="Save to favorites"
                        disabled={!queryId}
                      >
                        <SaveIcon />
                      </IconButton>
                    </Box>
                    
                    <Box>
                      <Button
                        variant="outlined"
                        color="info"
                        startIcon={<AssessmentIcon />}
                        onClick={handleExplainQuery}
                        disabled={explaining || executing || !selectedConnection}
                        sx={{ mr: 1 }}
                      >
                        {explaining ? (
                          <>
                            <CircularProgress size={20} sx={{ mr: 1 }} color="inherit" />
                            Analyzing...
                          </>
                        ) : (
                          'Explain Plan'
                        )}
                      </Button>
                      
                      <Button
                        variant="contained"
                        color="success"
                        startIcon={<PlayArrowIcon />}
                        onClick={handleExecuteQuery}
                        disabled={executing || explaining || !selectedConnection}
                      >
                        {executing ? (
                          <>
                            <CircularProgress size={20} sx={{ mr: 1 }} color="inherit" />
                            Executing...
                          </>
                        ) : (
                          'Execute'
                        )}
                      </Button>
                    </Box>
                  </Box>
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>
        
        {/* Performance Analysis Section - Single section for both Explain and Execute */}
        {performanceAnalysis && (
          <Paper sx={{ mt: 3, p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="h6" component="div">
                Query Performance Analysis
              </Typography>
              <Chip 
                icon={queryResults ? <AnalyticsIcon fontSize="small" /> : <AssessmentIcon fontSize="small" />}
                label={queryResults ? 
                  (executionTime === 'cached' ? "Cached" : `Execution time: ${executionTime ? executionTime.toFixed(2) : '0.00'}s`) : 
                  "Explain Plan Only (Query Not Executed)"}
                color={queryResults ? (executionTime === 'cached' ? "secondary" : "primary") : "info"}
                variant="outlined"
                size="small"
              />
            </Box>
            <Divider sx={{ mb: 2 }} />
            
            {/* Single Performance Analysis Component */}
            <QueryPerformanceAnalysis 
              performanceData={performanceAnalysis} 
              executionTime={executionTime} 
              isExplainOnly={!queryResults}
            />
          </Paper>
        )}
        
        {/* Explain Plan Results - Always shown when explainResults is available */}
        {explainResults && (
          <Paper sx={{ mt: 3, p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="h6" component="div">
                Query Explain Plan
              </Typography>
              {!queryResults && (
                <Chip 
                  icon={<AssessmentIcon fontSize="small" />}
                  label="Explain Plan Only (Query Not Executed)"
                  color="info"
                  variant="outlined"
                  size="small"
                />
              )}
            </Box>
            <Divider sx={{ mb: 2 }} />
            
            {/* Explain Plan Table */}
            <ExplainPlanTable explainData={explainResults} />
          </Paper>
        )}
        
        {/* Query Execution Results */}
        {queryResults && (
          <Paper sx={{ mt: 3, p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="h6" component="div">
                Query Results
              </Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />
            
            <Box sx={{ overflowX: 'auto' }}>
              {queryResults.columns && queryResults.rows ? (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {queryResults.columns.map((column, index) => (
                        <th 
                          key={index}
                          style={{ 
                            padding: '12px 16px', 
                            textAlign: 'left', 
                            borderBottom: '2px solid #eee',
                            fontWeight: 600
                          }}
                        >
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {queryResults.rows.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {Array.isArray(row) ? (
                          // Handle array rows
                          row.map((cell, cellIndex) => (
                            <td 
                              key={cellIndex}
                              style={{ 
                                padding: '12px 16px', 
                                borderBottom: '1px solid #eee'
                              }}
                            >
                              {cell !== null ? String(cell) : 'NULL'}
                            </td>
                          ))
                        ) : (
                          // Handle object rows
                          queryResults.columns.map((column, cellIndex) => (
                            <td 
                              key={cellIndex}
                              style={{ 
                                padding: '12px 16px', 
                                borderBottom: '1px solid #eee'
                              }}
                            >
                              {row[column] !== null ? String(row[column]) : 'NULL'}
                            </td>
                          ))
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <Alert severity="info" sx={{ mb: 2 }}>
                  {queryResults.message || 'Query executed successfully, but no results were returned.'}
                </Alert>
              )}
            </Box>
            
            {/* Pagination Controls */}
            {(totalRows > 0 || hasMorePages) && (
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mr: 2 }}>
                    {(() => {
                      // Ensure we have valid numbers for calculation
                      const page = Number(currentPage) || 1;
                      const size = Number(pageSize) || 25;
                      const total = Number(totalRows) || 0;
                      
                      if (total > 0) {
                        const startRow = (page - 1) * size + 1;
                        const endRow = Math.min(page * size, total);
                        return `Showing ${startRow} - ${endRow} of ${total} rows`;
                      } else if (queryResults?.rows?.length > 0) {
                        return `Showing ${queryResults.rows.length} rows`;
                      } else {
                        return 'No rows to display';
                      }
                    })()} 
                  </Typography>
                  
                  <FormControl size="small" sx={{ minWidth: 80, mr: 2 }}>
                    <InputLabel id="rows-per-page-label">Rows</InputLabel>
                    <Select
                      labelId="rows-per-page-label"
                      value={pageSize}
                      label="Rows"
                      onChange={(e) => {
                        const newPageSize = parseInt(e.target.value, 10);
                        console.log('Setting new page size:', newPageSize);
                        setPageSize(newPageSize);
                        // Reset to page 1 when changing page size
                        // Pass the new page size directly to ensure it's used immediately
                        handlePageSizeChange(newPageSize);
                      }}
                    >
                      <MenuItem value={10}>10</MenuItem>
                      <MenuItem value={25}>25</MenuItem>
                      <MenuItem value={50}>50</MenuItem>
                      <MenuItem value={100}>100</MenuItem>
                      <MenuItem value={500}>500</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
                
                <Box>
                  <Button
                    disabled={currentPage === 1 || executing}
                    onClick={() => handleExecuteQuery(currentPage - 1)}
                    sx={{ minWidth: '90px', mr: 1 }}
                    startIcon={executing ? <CircularProgress size={16} color="inherit" /> : null}
                  >
                    {executing && currentPage > 1 ? 'Loading...' : 'Previous'}
                  </Button>
                  <Button
                    disabled={!hasMorePages || executing}
                    onClick={() => handleExecuteQuery(currentPage + 1)}
                    sx={{ minWidth: '90px' }}
                    endIcon={executing ? <CircularProgress size={16} color="inherit" /> : null}
                  >
                    {executing && hasMorePages ? 'Loading...' : 'Next'}
                  </Button>
                </Box>
              </Box>
            )}
            
            {/* Export Button */}
            <Box sx={{ mt: 2, textAlign: 'right' }}>
              <Button 
                variant="outlined"
                onClick={() => {
                  // Create CSV content
                  const csvContent = [
                    queryResults.columns.join(','),
                    ...queryResults.rows.map(row => {
                      if (Array.isArray(row)) {
                        return row.join(',');
                      } else {
                        return queryResults.columns.map(col => row[col]).join(',');
                      }
                    })
                  ].join('\n');
                  
                  // Create download link
                  const blob = new Blob([csvContent], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = 'query_results.csv';
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
              >
                Export as CSV
              </Button>
            </Box>
          </Paper>
        )}
      </Box>
      
      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        message={snackbar.message}
      />
    </Container>
  );
};

export default GeneratePage;
