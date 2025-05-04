import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link as RouterLink } from 'react-router-dom';
// Services
import { generateQuery, getAvailableModels } from '../services/queryService';
// Context
import { useSubscription } from '../context/SubscriptionContext';
import { useConnections } from '../context/ConnectionsContext';
import { useHistory } from '../context/HistoryContext';
import QueryLimitWarning from '../components/QueryLimitWarning';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography
} from '@mui/material';
import {
  Add as AddIcon,
  ArrowForward as ArrowForwardIcon,
  Code as CodeIcon,
  Computer as ComputerIcon,
  Dashboard as DashboardIcon,
  History as HistoryIcon,
  PlayArrow as PlayArrowIcon,
  Storage as StorageIcon
} from '@mui/icons-material';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { dracula } from 'react-syntax-highlighter/dist/esm/styles/prism';

// Database type icons
const DbTypeIcon = ({ type, sx = {} }) => {
  const getIconUrl = (dbType) => {
    switch (dbType.toLowerCase()) {
      case 'mysql':
        return 'https://www.mysql.com/common/logos/logo-mysql-170x115.png';
      case 'postgresql':
        return 'https://www.postgresql.org/media/img/about/press/elephant.png';
      case 'sqlserver':
        return 'https://www.microsoft.com/en-us/sql-server/img/sql-server-logo.png';
      case 'oracle':
        return 'https://www.oracle.com/a/ocom/img/cb71-java-logo.png';
      case 'sqlite':
        return 'https://www.sqlite.org/images/sqlite370_banner.gif';
      default:
        return null;
    }
  };

  const iconUrl = getIconUrl(type);
  
  if (iconUrl) {
    return (
      <img 
        src={iconUrl} 
        alt={`${type} logo`} 
        style={{ 
          width: 40, 
          height: 40, 
          objectFit: 'contain',
          ...sx
        }} 
      />
    );
  }
  
  return <StorageIcon sx={{ fontSize: 40, ...sx }} />;
};

// Register ChartJS components
ChartJS.register(ArcElement, Tooltip, Legend);

const DashboardPage = ({ user }) => {
  // State for dashboard data
  const [queryCount, setQueryCount] = useState(0);
  const [queryLimit, setQueryLimit] = useState(10); // Default to 10 for free tier
  const [totalQueryCount, setTotalQueryCount] = useState(0); // Total query count for statistics
  const [aiCreditsCount, setAiCreditsCount] = useState(0);
  const [generateCount, setGenerateCount] = useState(0);
  const [explainCount, setExplainCount] = useState(0);
  const [executeCount, setExecuteCount] = useState(0);
  const [localLoading, setLocalLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Get data from global contexts
  const { subscription, loading, error: subscriptionError, loadSubscription, queryLimit: contextQueryLimit, queryCount: contextQueryCount, isLimitReached } = useSubscription();
  const { connections, loading: connectionsLoading, error: connectionsError, loadConnections } = useConnections();
  const { recentQueries: historyQueries, totalCount: historyTotalCount, loading: historyLoading, error: historyError, loadHistory } = useHistory();
  
  // State for quick query generation
  const [selectedConnection, setSelectedConnection] = useState('');
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState(''); // Start with empty selection to avoid errors
  const [generatedQuery, setGeneratedQuery] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState('');
  const [availableModels, setAvailableModels] = useState([]);
  const [loadingModels, setLoadingModels] = useState(false);
  
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
  }, [subscription]);
  
  // Update model selection when available models change
  useEffect(() => {
    // If the current model is not available, select the first available model
    if (!hasModelAccess[model]) {
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
  }, [hasModelAccess, model]);
  
  // Refs to track data loading status to prevent redundant API calls
  const connectionsLoadedRef = useRef(false);
  const historyLoadedRef = useRef(false);
  
  // Ref to track user's explicit model selection
  const userSelectedModelRef = useRef('');
  
  // Load available models
  useEffect(() => {
    const loadAvailableModels = async () => {
      try {
        setLoadingModels(true);
        const models = await getAvailableModels();
        if (models && Array.isArray(models)) {
          // Check if user is on Enterprise plan - they should see all models
          const isEnterprisePlan = subscription?.plan_id === 'enterprise';
          
          // For Enterprise plan, show all models; otherwise filter based on subscription
          let modelsToShow = models;
          if (!isEnterprisePlan) {
            modelsToShow = models.filter(model => {
              // Check if user has access to this model type
              return hasModelAccess[model.id] === true;
            });
          }
          
          setAvailableModels(modelsToShow);
          
          // If user has explicitly selected a model, keep that selection
          if (userSelectedModelRef.current) {
            // Check if the user-selected model is in the available models
            const isModelAvailable = modelsToShow.some(m => m.id === userSelectedModelRef.current);
            if (isModelAvailable) {
              setModel(userSelectedModelRef.current);
            } else if (modelsToShow.length > 0) {
              // If the user-selected model is not available, select the first one
              setModel(modelsToShow[0].id);
              userSelectedModelRef.current = modelsToShow[0].id;
            }
          }
          // If no model is selected and no user preference, select the first one
          else if (modelsToShow.length > 0 && !model) {
            setModel(modelsToShow[0].id);
            // Don't set userSelectedModelRef here as this is an automatic selection
          }
        }
      } catch (err) {
        console.error('Error loading available models:', err);
      } finally {
        setLoadingModels(false);
      }
    };
    
    loadAvailableModels();
  }, [hasModelAccess, subscription]); // Add subscription as dependency to detect plan changes
  
  // Load dashboard data on component mount
  useEffect(() => {
    const loadDashboardData = async () => {
      setLocalLoading(true);
      let errorMessages = [];
      
      try {
        // Load connections from global context if not already loaded
        if (!connectionsLoadedRef.current) {
          try {
            console.log('Loading connections from global context...');
            await loadConnections();
            connectionsLoadedRef.current = true;
            
            // Automatically select the first connection if available
            if (connections && connections.length > 0) {
              setSelectedConnection(connections[0].id);
              console.log('Auto-selected connection:', connections[0].id);
            }
          } catch (connErr) {
            console.error('Error loading connections:', connErr);
            errorMessages.push('Could not load database connections');
          }
        } else {
          console.log('Connections already loaded, skipping API call');
        }
        
        // Load history data from global context if not already loaded
        if (!historyLoadedRef.current) {
          try {
            console.log('Loading history from global context...');
            await loadHistory(1, 5);
            historyLoadedRef.current = true;
            console.log('Recent queries loaded from context');
          } catch (historyErr) {
            console.error('Error loading query history:', historyErr);
            errorMessages.push('Could not load recent queries');
          }
        } else {
          console.log('History already loaded, skipping API call');
        }
        
        // Subscription data is loaded from the global context
        console.log('Using subscription data from global context');
        
        // Update local state with subscription data
        if (subscription && subscription.query_usage) {
          const { 
            monthly_count, 
            limit, 
            ai_credits_count, 
            generate_count, 
            explain_count, 
            execute_count 
          } = subscription.query_usage;
          
          setQueryCount(monthly_count || 0);
          setQueryLimit(limit || 10); // Default to 10 for free tier
          setAiCreditsCount(ai_credits_count || 0);
          setGenerateCount(generate_count || 0);
          setExplainCount(explain_count || 0);
          setExecuteCount(execute_count || 0);
        } else if (subscription) {
          // Fallback to setting query limit based on plan name if available
          const planId = subscription.plan_id;
          const isAnnual = subscription.is_annual;
          
          let defaultLimit = 10; // Default for free tier
          
          // Set default limits based on plan
          if (planId === 'basic') {
            defaultLimit = isAnnual ? 1200 : 100;
          } else if (planId === 'professional') {
            defaultLimit = isAnnual ? 6000 : 500;
          } else if (planId === 'enterprise') {
            defaultLimit = Number.MAX_SAFE_INTEGER; // Unlimited
          }
          
          console.log(`Using default query limit for ${planId} plan:`, defaultLimit);
          setQueryLimit(defaultLimit);
        }
        
        // Set appropriate error message if any component failed to load
        if (errorMessages.length > 0) {
          setError(`Dashboard data incomplete: ${errorMessages.join(', ')}`);
        }
      } catch (err) {
        console.error('General dashboard error:', err);
        setError('Could not load dashboard data. Please check your connection and try again.');
      } finally {
        setLocalLoading(false);
      }
    };
    
    loadDashboardData();
  }, [loadConnections, loadHistory, loadSubscription, connections, subscription]);
  
  // Calculate usage statistics
  const calculateUsage = () => {
    if (!subscription) return { queries: 0, connections: 0 };
    
    // Get plan limits from subscription
    const plan = subscription.plan_id;
    let queryLimit = 0;
    let connectionLimit = 0;
    
    switch (plan) {
      case 'basic':
        queryLimit = subscription.query_usage.limit;
        connectionLimit = 3;
        break;
      case 'professional':
        queryLimit = subscription.query_usage.limit;
        connectionLimit = 10;
        break;
      case 'enterprise':
        queryLimit = Infinity;
        connectionLimit = Infinity;
        break;
      case 'free':
        queryLimit = subscription.query_usage.limit;
        connectionLimit = 1;
        break;
      default:
        queryLimit = 0;
        connectionLimit = 0;
    }
    
    return {
      queries: {
        used: aiCreditsCount, // Use AI credits count instead of total query count
        limit: queryLimit,
        percentage: queryLimit ? Math.min(100, (aiCreditsCount / queryLimit) * 100) : 0
      },
      connections: {
        used: connections.length,
        limit: connectionLimit,
        percentage: connectionLimit ? Math.min(100, (connections.length / connectionLimit) * 100) : 0
      }
    };
  };
  
  const usage = calculateUsage();
  
  // Prepare chart data
  const chartData = {
    labels: ['SQL Server', 'MySQL', 'PostgreSQL', 'SQLite'],
    datasets: [
      {
        data: [
          connections.filter(c => c.db_type === 'sqlserver').length,
          connections.filter(c => c.db_type === 'mysql').length,
          connections.filter(c => c.db_type === 'postgresql').length,
          connections.filter(c => c.db_type === 'sqlite').length
        ],
        backgroundColor: [
          '#4CAF50',
          '#2196F3',
          '#FF9800',
          '#9C27B0'
        ],
        borderWidth: 0
      }
    ]
  };
  
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom'
      }
    }
  };
  
  // Handle quick query generation
  const handleConnectionChange = (event) => {
    setSelectedConnection(event.target.value);
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
  
  const handleGenerateQuery = async () => {
    if (!selectedConnection || !prompt.trim()) {
      setGenerationError('Please select a connection and enter a prompt');
      return;
    }
    
    // Check if the user has reached their query limit
    // Special case for Enterprise plan: queryLimit of -1 means unlimited queries
    if (queryLimit !== -1 && queryCount >= queryLimit) {
      setGenerationError(`You have reached your monthly query limit. Please upgrade your plan to continue.`);
      return;
    }
    
    setGenerationError('');
    setGenerating(true);
    
    try {
      const result = await generateQuery({
        connection_id: selectedConnection,
        prompt: prompt.trim(),
        model_type: model
      });
      
      if (result.success) {
        setGeneratedQuery(result.query);
        
        // After successful query generation, reload subscription data from global context
        loadSubscription(true); // true means force refresh
        
        // Also update total query count for the usage statistics
        setTotalQueryCount(prevCount => prevCount + 1);
      } else {
        setGenerationError(result.message || 'Failed to generate SQL query');
      }
    } catch (err) {
      // Check if this is a query limit error (HTTP 403)
      if (err.response && err.response.status === 403) {
        const errorData = err.response.data;
        setGenerationError(`You have reached your monthly query limit. Please upgrade your plan to continue.`);
        
        // Update the query count and limit from the error response if available
        if (errorData && errorData.query_count !== undefined && errorData.query_limit !== undefined) {
          setQueryCount(errorData.query_count);
          setQueryLimit(errorData.query_limit);
        } else {
          // If not available in the error, reload subscription data from global context
          loadSubscription(true); // true means force refresh
        }
      } else {
        setGenerationError(err.message || 'An error occurred while generating the query');
      }
    } finally {
      setGenerating(false);
    }
  };
  
  const handleCopyQuery = () => {
    navigator.clipboard.writeText(generatedQuery);
  };

  // We're now using the global subscription context instead of loading subscription details directly
  
  // Check if any of the global contexts are still loading
  const isLoading = localLoading || loading || connectionsLoading || historyLoading;
  
  if (isLoading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }
  
  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Welcome, {(user?.first_name && user?.last_name) ? `${user.first_name} ${user.last_name}` : (user?.email || 'User')}!
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" gutterBottom>
          Your AI-powered SQL query generation dashboard
        </Typography>
        
        {error && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom component="span">
              {error.includes('incomplete') ? 'Some dashboard components could not be loaded' : 'Dashboard Data Issue'}
            </Typography>
            <Typography variant="body2" component="span">
              {error}
              {!error.includes('Check your connection') && ' Some features may be limited.'}
            </Typography>
            <Button 
              size="small" 
              sx={{ mt: 1 }}
              onClick={() => window.location.reload()}
            >
              Refresh Dashboard
            </Button>
          </Alert>
        )}
        
        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={4}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" component="div">
                    Database Connections
                  </Typography>
                  <StorageIcon color="primary" fontSize="large" />
                </Box>
                <Typography variant="h3" component="div" gutterBottom>
                  {connections.length}
                </Typography>
                {subscription && (
                  <>
                    <LinearProgress 
                      variant="determinate" 
                      value={usage.connections.percentage} 
                      sx={{ mb: 1, height: 8, borderRadius: 4 }}
                    />
                    <Box component="div" sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>
                      {usage.connections.limit === Infinity 
                        ? 'Unlimited connections' 
                        : `${connections.length} of ${usage.connections.limit} connections used`}
                    </Box>
                  </>
                )}
              </CardContent>
              <CardActions>
                <Button 
                  size="small" 
                  component={RouterLink} 
                  to="/connections"
                  endIcon={<ArrowForwardIcon />}
                >
                  View Connections
                </Button>
              </CardActions>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={4}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" component="div">
                    AI Credits Used
                  </Typography>
                  <CodeIcon color="primary" fontSize="large" />
                </Box>
                <Typography variant="h3" component="div" gutterBottom>
                  {aiCreditsCount}
                </Typography>
                {subscription && (
                  <>
                    <LinearProgress 
                      variant="determinate" 
                      value={usage.queries.percentage} 
                      sx={{ mb: 1, height: 8, borderRadius: 4 }}
                    />
                    <Box component="div" sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>
                      {usage.queries.limit === Infinity 
                        ? 'Unlimited credits' 
                        : `${aiCreditsCount} of ${usage.queries.limit} credits used this month`}
                    </Box>
                    
                    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
                      <Box>
                        <Typography variant="body2" color="text.secondary">Generate:</Typography>
                        <Typography variant="body1" fontWeight="medium">{generateCount}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary">Explain:</Typography>
                        <Typography variant="body1" fontWeight="medium">{explainCount}</Typography>
                      </Box>
                    </Box>
                  </>
                )}
              </CardContent>
              <CardActions>
                <Button 
                  size="small" 
                  component={RouterLink} 
                  to="/history"
                  endIcon={<ArrowForwardIcon />}
                >
                  View History
                </Button>
              </CardActions>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={4}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" component="div">
                    Subscription
                  </Typography>
                  <DashboardIcon color="primary" fontSize="large" />
                </Box>
                <Typography variant="h5" component="div" gutterBottom>
                  {subscription ? subscription.plan_id.charAt(0).toUpperCase() + subscription.plan_id.slice(1) : 'No Plan'}
                </Typography>
                {subscription ? (
                  <Box component="div" sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>
                    {(subscription.plan_id === 'free' && typeof aiCreditsCount === 'number' && aiCreditsCount >= subscription.query_usage.limit) ? (
                      <span style={{ color: 'red', fontWeight: 600 }}>AI Credits Limit Reached</span>
                    ) : (
                      <>
                        {subscription.plan_id === 'free'
                          ? `${Math.max(0, subscription.query_usage.limit - aiCreditsCount)} AI credits left`
                          : (typeof aiCreditsCount === 'number' && aiCreditsCount > 0 ? `${aiCreditsCount} AI credits used` : 
                             'Valid')}
                      </>
                    )}
                  </Box>
                ) : (
                  <Box component="div" sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>
                    Subscribe to unlock all features
                  </Box>
                )}
              </CardContent>
              <CardActions>
                <Button 
                  size="small" 
                  component={RouterLink} 
                  to="/subscription"
                  endIcon={<ArrowForwardIcon />}
                >
                  Manage Subscription
                </Button>
              </CardActions>
            </Card>
          </Grid>
        </Grid>
        
        {/* Quick SQL Generation */}
        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Quick SQL Generation
          </Typography>
          <Divider sx={{ mb: 3 }} />
          
          {connections.length === 0 ? (
            <Alert severity="info" sx={{ mb: 2 }}>
              You need to add a database connection first.
              <Button 
                component={RouterLink} 
                to="/connections/add" 
                size="small" 
                sx={{ ml: 2 }}
              >
                Add Connection
              </Button>
            </Alert>
          ) : (
            <>
              <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel id="quick-connection-label">Database Connection</InputLabel>
                    <Select
                      labelId="quick-connection-label"
                      id="quick-connection-select"
                      value={selectedConnection}
                      onChange={handleConnectionChange}
                      label="Database Connection"
                    >
                      <MenuItem value="">-- Select a connection --</MenuItem>
                      {connections.map((conn) => (
                        <MenuItem value={conn.id} key={conn.id}>
                          {conn.name} ({conn.db_type})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel id="quick-model-label">AI Model</InputLabel>
                    <Select
                      labelId="quick-model-label"
                      id="quick-model-select"
                      value={model}
                      onChange={handleModelChange}
                      label="AI Model"
                      disabled={loadingModels || availableModels.length === 0}
                    >
                      {availableModels.length === 0 ? (
                        <MenuItem value="">Loading models...</MenuItem>
                      ) : (
                        availableModels.map((modelOption) => (
                          <MenuItem key={modelOption.id} value={modelOption.id}>
                            {modelOption.name}
                          </MenuItem>
                        ))
                      )}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
              
              {(() => {
                const sub = subscription?.subscription || subscription;
                let isLimitReached = false;
                if (sub && sub.query_usage && typeof sub.query_usage.monthly_count === 'number' && typeof sub.query_usage.limit === 'number') {
                  // Special case for Enterprise plan: limit of -1 means unlimited queries
                  isLimitReached = sub.query_usage.limit !== -1 && sub.query_usage.monthly_count >= sub.query_usage.limit;
                } else if (typeof queryCount === 'number' && typeof queryLimit === 'number') {
                  // Special case for Enterprise plan: limit of -1 means unlimited queries
                  isLimitReached = queryLimit !== -1 && queryCount >= queryLimit;
                }
                if (!loading && isLimitReached) {
                  return (
                    <QueryLimitWarning
                      queryLimit={queryLimit}
                      planName={subscription && subscription.plan_name ? subscription.plan_name : 'current'}
                    />
                  );
                }
                // Show input field and generate button when queries are available
                return (
                  <>
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      placeholder="e.g., Show me all customers who made a purchase in the last month"
                      value={prompt}
                      onChange={handlePromptChange}
                      label="What would you like to query?"
                      sx={{ mb: 2 }}
                    />
                    
                    <Button
                      variant="contained"
                      onClick={() => {
                        console.log('Dashboard button clicked with state:', {
                          selectedConnection,
                          promptEmpty: !prompt.trim(),
                          generating,
                          queryCount,
                          queryLimit
                        });
                        handleGenerateQuery();
                      }}
                      disabled={!selectedConnection || !prompt.trim() || generating || isLimitReached}
                      sx={{ mb: 3 }}
                    >
                      {generating ? (
                        <>
                          <CircularProgress size={20} sx={{ mr: 1 }} color="inherit" />
                          Generating...
                        </>
                      ) : (
                        'Generate SQL'
                      )}
                    </Button>
                  </>
                );
              })()}
              
              {generationError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  <Typography variant="body2" component="span">{generationError}</Typography>
                </Alert>
              )}
              
              {generatedQuery && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Generated SQL:
                  </Typography>
                  <Paper variant="outlined" sx={{ position: 'relative' }}>
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
                    <Button
                      variant="contained"
                      size="small"
                      onClick={handleCopyQuery}
                      sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        opacity: 0.8
                      }}
                    >
                      Copy
                    </Button>
                  </Paper>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                    <Button 
                      variant="contained" 
                      color="primary"
                      component={RouterLink}
                      to="/generate"
                    >
                      Go to SQL Generator
                    </Button>
                  </Box>
                </Box>
              )}
            </>
          )}
        </Paper>
        
        {/* Dashboard Content */}
        <Grid container spacing={4}>
          {/* Recent Queries */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Recent Queries</Typography>
                <HistoryIcon color="primary" />
              </Box>
              <Divider sx={{ mb: 2 }} />
              
              {historyQueries && historyQueries.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography color="text.secondary" gutterBottom>
                    No queries yet
                  </Typography>
                  <Button 
                    variant="contained" 
                    component={RouterLink} 
                    to="/generate"
                    sx={{ mt: 2 }}
                  >
                    Generate Your First Query
                  </Button>
                </Box>
              ) : (
                <>
                  <List>
                    {historyQueries && historyQueries.map((query) => (
                      <React.Fragment key={query.id}>
                        <ListItem alignItems="flex-start" sx={{ px: 0 }}>
                          <ListItemText
                            primary={<Typography component="span" variant="subtitle2" sx={{ display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{query.natural_language_query || query.prompt}</Typography>}
                            secondary={
                              <>
                                <Typography component="span" variant="body2" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden', fontFamily: 'monospace', fontSize: '0.8rem' }}>{query.generated_sql || query.query}</Typography>
                                <Typography component="span" variant="caption" color="text.secondary">
                                  {new Date(query.created_at).toLocaleString()} • 
                                  {query.is_successful !== undefined ? (query.is_successful ? (
                                    <span style={{ color: 'green' }}> Success</span>
                                  ) : (
                                    <span style={{ color: 'red' }}> Failed</span>
                                  )) : ''}
                                </Typography>
                              </>
                            }
                          />
                        </ListItem>
                        <Divider component="li" />
                      </React.Fragment>
                    ))}
                  </List>
                  
                  <Box sx={{ textAlign: 'center', mt: 2 }}>
                    <Button 
                      component={RouterLink} 
                      to="/history"
                      endIcon={<ArrowForwardIcon />}
                    >
                      View All Queries
                    </Button>
                  </Box>
                </>
              )}
            </Paper>
          </Grid>
          
          {/* Database Connections */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, height: '100%', overflow: 'hidden' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>Database Connections</Typography>
                <Avatar sx={{ bgcolor: 'primary.light', width: 36, height: 36 }}>
                  <StorageIcon color="primary" sx={{ color: 'white' }} />
                </Avatar>
              </Box>
              <Divider sx={{ mb: 2 }} />
              
              {connections && connections.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography color="text.secondary" gutterBottom>
                    No database connections yet
                  </Typography>
                  <Button 
                    variant="contained" 
                    component={RouterLink} 
                    to="/connections/add"
                    sx={{ mt: 2 }}
                    startIcon={<AddIcon />}
                  >
                    Add Your First Connection
                  </Button>
                </Box>
              ) : (
                <>
                  {connections && connections.slice(0, 3).map((connection, index) => (
                    <Box 
                      key={connection.id}
                      sx={{
                        mb: index < connections.slice(0, 3).length - 1 ? 2 : 0,
                        p: 1.5,
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: 'divider',
                        transition: 'all 0.2s',
                        '&:hover': {
                          bgcolor: 'action.hover',
                          transform: 'translateX(5px)'
                        }
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Box sx={{ mr: 1.5 }}>
                          <DbTypeIcon type={connection.database_type || connection.db_type} />
                        </Box>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                            {connection.name}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                            <Chip 
                              label={(connection.database_type || connection.db_type).toUpperCase()} 
                              size="small" 
                              color="primary"
                              variant="outlined"
                              sx={{ mr: 1, height: 20, fontSize: '0.7rem' }}
                            />
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                              <ComputerIcon sx={{ fontSize: 12, mr: 0.5 }} />
                              {connection.host}:{connection.port || ''}
                            </Typography>
                          </Box>
                        </Box>
                        <IconButton 
                          component={RouterLink}
                          to={`/generate?connection=${connection.id}`}
                          color="primary"
                          size="small"
                          sx={{ 
                            bgcolor: 'action.hover',
                            '&:hover': { bgcolor: 'primary.light', color: 'white' }
                          }}
                        >
                          <PlayArrowIcon />
                        </IconButton>
                      </Box>
                    </Box>
                  ))}
                  
                  {connections && connections.length > 3 && (
                    <Box sx={{ textAlign: 'center', mt: 2 }}>
                      <Button 
                        component={RouterLink} 
                        to="/connections"
                        endIcon={<ArrowForwardIcon />}
                      >
                        View All Connections
                      </Button>
                    </Box>
                  )}
                </>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default DashboardPage;
