import React, { useState, useEffect } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  IconButton,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  CircularProgress,
  Alert,
  Chip,
  Tooltip,
  Paper,
  TextField,
  InputAdornment
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Refresh as RefreshIcon,
  Check as CheckIcon,
  Error as ErrorIcon,
  Search as SearchIcon,
  Storage as StorageIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';

// Services
import { 
  getConnections, 
  deleteConnection, 
  testConnection,
  getSchema
} from '../services/connectionService';
import { getSubscription, getPlans } from '../services/subscriptionService';

// Database type icons
const DbTypeIcon = ({ type }) => {
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
          objectFit: 'contain' 
        }} 
      />
    );
  }
  
  return <StorageIcon sx={{ fontSize: 40 }} />;
};

const ConnectionsPage = ({ showSchema, user }) => {
  const navigate = useNavigate();
  
  // State for connections
  const [connections, setConnections] = useState([]);
  const [filteredConnections, setFilteredConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // State for subscription
  const [subscription, setSubscription] = useState(null);
  const [connectionLimit, setConnectionLimit] = useState(1); // Default limit for free tier
  const [loadingSubscription, setLoadingSubscription] = useState(true);
  
  // State for connection testing
  const [testingConnection, setTestingConnection] = useState(null);
  const [testResult, setTestResult] = useState({});
  
  // State for connection deletion
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [connectionToDelete, setConnectionToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  
  // State for schema viewing
  const [schemaData, setSchemaData] = useState(null);
  const [loadingSchema, setLoadingSchema] = useState(false);
  const [schemaError, setSchemaError] = useState('');
  
  // Load connections on component mount
  useEffect(() => {
    loadConnections();
    loadSubscriptionDetails();
    
    // If showing schema, get the connection ID from the URL
    if (showSchema) {
      const pathParts = window.location.pathname.split('/');
      const connectionId = pathParts[pathParts.length - 1];
      if (connectionId && !isNaN(parseInt(connectionId))) {
        loadSchema(parseInt(connectionId));
      }
    }
  }, [showSchema]);
  
  // Filter connections based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredConnections(connections);
      return;
    }
    
    const filtered = connections.filter(conn => 
      conn.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conn.db_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conn.host.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conn.database_name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    setFilteredConnections(filtered);
  }, [searchQuery, connections]);
  
  // Load connections from the API
  const loadConnections = async () => {
    try {
      setLoading(true);
      const data = await getConnections();
      setConnections(data);
      setFilteredConnections(data);
      setLoading(false);
    } catch (err) {
      setError(err.message || 'Failed to load connections');
      setLoading(false);
    }
  };
  
  // Load subscription details
  const loadSubscriptionDetails = async () => {
    try {
      setLoadingSubscription(true);
      
      // Try to get user's subscription
      let userSubscription = null;
      try {
        userSubscription = await getSubscription();
        setSubscription(userSubscription);
      } catch (err) {
        // User might not have a subscription yet
        console.log('No active subscription found');
      }
      
      // Determine connection limit based on subscription plan
      let limit = 1; // Default for free tier
      
      if (userSubscription) {
        // If user has a subscription, check the plan features
        if (userSubscription.plan_id === 'basic') {
          limit = 3;
        } else if (userSubscription.plan_id === 'professional') {
          limit = 10;
        } else if (userSubscription.plan_id === 'enterprise') {
          limit = 50; // High limit for enterprise
        }
      }
      
      setConnectionLimit(limit);
      setLoadingSubscription(false);
    } catch (err) {
      console.error('Error loading subscription details:', err);
      setLoadingSubscription(false);
    }
  };
  
  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
  };
  
  const handleTestConnection = async (connectionId) => {
    setTestingConnection(connectionId);
    setTestResult({}); // Clear previous results
    
    try {
      console.log('Testing connection:', connectionId);
      const result = await testConnection(connectionId);
      console.log('Test connection result:', result);
      
      // Ensure we're setting the state with the correct structure
      const newTestResult = {
        [connectionId]: {
          success: result.success,
          message: result.message || (result.success ? 'Connection successful' : 'Connection failed')
        }
      };
      
      console.log('Setting test result state:', newTestResult);
      setTestResult(newTestResult);
      setTestingConnection(null); // Clear testing state immediately after getting result
    } catch (err) {
      console.error('Test connection error:', err);
      const errorResult = {
        [connectionId]: {
          success: false,
          message: err.message || 'Connection test failed'
        }
      };
      console.log('Setting error result state:', errorResult);
      setTestResult(errorResult);
      setTestingConnection(null); // Clear testing state immediately after getting result
    } finally {
      // Clear test result after 5 seconds
      setTimeout(() => {
        console.log('Clearing test result after timeout');
        setTestResult({});
      }, 2000);
    }
  };
  
  const handleDeleteClick = (connection) => {
    setConnectionToDelete(connection);
    setDeleteDialogOpen(true);
  };
  
  const handleDeleteCancel = () => {
    setConnectionToDelete(null);
    setDeleteDialogOpen(false);
  };
  
  const handleDeleteConfirm = async () => {
    if (!connectionToDelete) return;
    
    setDeleting(true);
    
    try {
      await deleteConnection(connectionToDelete.id);
      setConnections(connections.filter(conn => conn.id !== connectionToDelete.id));
      setDeleteDialogOpen(false);
    } catch (err) {
      setError(`Failed to delete connection: ${err.message}`);
    } finally {
      setDeleting(false);
      setConnectionToDelete(null);
    }
  };
  
  const handleEditConnection = (connectionId) => {
    navigate(`/connections/edit/${connectionId}`);
  };
  
  const handleViewSchema = (connectionId) => {
    navigate(`/connections/schema/${connectionId}`);
  };
  
  const loadSchema = async (connectionId) => {
    setLoadingSchema(true);
    setSchemaError('');
    
    try {
      const response = await getSchema(connectionId);
      console.log('Schema response:', response);
      
      // Check if the schema data is nested in a 'schema' property
      if (response.schema) {
        setSchemaData(response.schema);
      } else {
        // Fallback to using the response directly if schema property doesn't exist
        setSchemaData(response);
      }
    } catch (err) {
      console.error('Error loading schema:', err);
      setSchemaError(err.message || 'Failed to load database schema');
    } finally {
      setLoadingSchema(false);
    }
  };
  
  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }
  
  // Render schema view if showSchema is true
  if (showSchema) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Database Schema
          </Typography>
          <Button
            variant="outlined"
            startIcon={<StorageIcon />}
            component={RouterLink}
            to="/connections"
          >
            Back to Connections
          </Button>
        </Box>
        
        {loadingSchema ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <CircularProgress />
          </Box>
        ) : schemaError ? (
          <Alert severity="error" sx={{ mt: 2 }}>{schemaError}</Alert>
        ) : schemaData ? (
          <Paper sx={{ p: 3, mt: 2 }}>
            <Typography variant="h5" gutterBottom>
              {schemaData.database}
            </Typography>
            
            {schemaData.tables && schemaData.tables.length > 0 ? (
              <Box>
                {schemaData.tables.map((table, index) => (
                  <Box key={index} sx={{ mt: 3 }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
                      <StorageIcon sx={{ mr: 1 }} />
                      {table.name}
                    </Typography>
                    {table.description && (
                      <Typography variant="body2" color="textSecondary" sx={{ ml: 4, mb: 1 }}>
                        {table.description}
                      </Typography>
                    )}
                    
                    <Box sx={{ ml: 4, mt: 1 }}>
                      <Grid container spacing={1} sx={{ fontWeight: 'bold', mb: 1 }}>
                        <Grid item xs={4}>Column</Grid>
                        <Grid item xs={4}>Type</Grid>
                        <Grid item xs={4}>Description</Grid>
                      </Grid>
                      <Divider />
                      
                      {table.columns.map((column, colIndex) => (
                        <Grid container spacing={1} key={colIndex} sx={{ mt: 1 }}>
                          <Grid item xs={4}>{column.name}</Grid>
                          <Grid item xs={4}>
                            <Chip size="small" label={column.dataType} />
                          </Grid>
                          <Grid item xs={4}>{column.description || '-'}</Grid>
                        </Grid>
                      ))}
                    </Box>
                  </Box>
                ))}
              </Box>
            ) : (
              <Typography>No tables found in this database.</Typography>
            )}
          </Paper>
        ) : (
          <Typography>No schema data available.</Typography>
        )}
      </Container>
    );
  }
  
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Database Connections
        </Typography>
        <Tooltip title={connections.length >= connectionLimit ? 
          `You have reached your connection limit (${connectionLimit}). Please upgrade your plan to add more connections.` : 
          "Add a new database connection"}>
          <span> {/* Wrapper needed for disabled buttons with tooltip */}
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              component={RouterLink}
              to="/connections/add"
              disabled={connections.length >= connectionLimit}
            >
              Add Connection
            </Button>
          </span>
        </Tooltip>
      </Box>
      
      <Typography variant="subtitle1" color="text.secondary" gutterBottom>
        Manage your database connections for SQL generation
      </Typography>
      
      {/* Subscription limit information */}
      {!loadingSubscription && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {subscription ? 
              `Your ${subscription.plan_name} plan allows up to ${connectionLimit} database connections. You are using ${connections.length} of ${connectionLimit}.` :
              `Free tier allows up to ${connectionLimit} database connection. You are using ${connections.length} of ${connectionLimit}.`
            }
          </Typography>
          {connections.length >= connectionLimit && (
            <Alert severity="warning" sx={{ mt: 1 }}>
              You have reached your connection limit. <RouterLink to="/subscription">Upgrade your plan</RouterLink> to add more connections.
            </Alert>
          )}
        </Box>
      )}
        
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
        
      {/* Search and Filter */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              placeholder="Search connections..."
              value={searchQuery}
              onChange={handleSearchChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                )
              }}
              size="small"
            />
          </Grid>
          <Grid item xs={12} md={6} sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
            <Button
              startIcon={<RefreshIcon />}
              onClick={loadConnections}
              sx={{ mr: 1 }}
            >
              Refresh
            </Button>
          </Grid>
        </Grid>
      </Paper>
        
      {/* Connection Cards */}
      {filteredConnections.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          {searchQuery ? (
            <>
              <Typography variant="h6" gutterBottom>
                No connections match your search
              </Typography>
              <Button 
                variant="outlined" 
                onClick={() => setSearchQuery('')}
                sx={{ mt: 2 }}
              >
                Clear Search
              </Button>
            </>
          ) : (
            <>
              <Typography variant="h6" gutterBottom>
                No database connections yet
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                Add your first database connection to start generating SQL queries
              </Typography>
              <Button 
                variant="contained" 
                startIcon={<AddIcon />}
                component={RouterLink}
                to="/connections/add"
                sx={{ mt: 2 }}
              >
                Add Connection
              </Button>
            </>
          )}
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {filteredConnections.map((connection) => (
            <Grid item xs={12} sm={6} md={4} key={connection.id}>
              <Card 
                sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  position: 'relative'
                }}
              >
                {/* Connection Status Indicator */}
                {testingConnection === connection.id ? (
                  <Box 
                    sx={{ 
                      position: 'absolute', 
                      top: 0,
                      right: 0,
                      bottom: 0,
                      left: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 10,
                      backgroundColor: 'rgba(255, 255, 255, 0.7)',
                      borderRadius: '4px'
                    }}
                  >
                    <CircularProgress size={30} />
                  </Box>
                ) : testResult[connection.id] ? (
                  <Box 
                    sx={{ 
                      position: 'absolute', 
                      top: 0,
                      right: 0,
                      bottom: 0,
                      left: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 10,
                      backgroundColor: testResult[connection.id].success ? 'rgba(232, 245, 233, 0.85)' : 'rgba(253, 236, 234, 0.85)',
                      borderRadius: '4px',
                      padding: 2
                    }}
                  >
                    {testResult[connection.id].success ? (
                      <>
                        <CheckIcon sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
                        <Typography variant="subtitle1" color="success.main" fontWeight="bold">
                          Connection Successful
                        </Typography>
                      </>
                    ) : (
                      <>
                        <ErrorIcon sx={{ fontSize: 40, color: 'error.main', mb: 1 }} />
                        <Typography variant="subtitle1" color="error.main" fontWeight="bold">
                          Connection Failed
                        </Typography>
                      </>
                    )}
                    <Typography variant="body2" align="center" sx={{ mt: 1 }}>
                      {testResult[connection.id].message}
                    </Typography>
                  </Box>
                ) : null}
                  
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Box sx={{ mr: 2 }}>
                      <DbTypeIcon type={connection.db_type} />
                    </Box>
                    <Box>
                      <Typography variant="h6" component="div" gutterBottom>
                        {connection.name}
                      </Typography>
                      <Chip 
                        label={connection.db_type.toUpperCase()} 
                        size="small" 
                        color="primary" 
                        variant="outlined"
                      />
                    </Box>
                  </Box>
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    <strong>Host:</strong> {connection.host}:{connection.port}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    <strong>Database:</strong> {connection.database_name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Username:</strong> {connection.username}
                  </Typography>
                </CardContent>
                  
                <CardActions sx={{ justifyContent: 'space-between', p: 2, pt: 0 }}>
                  <Box>
                    <IconButton 
                      size="small" 
                      onClick={() => handleTestConnection(connection.id)}
                      disabled={testingConnection === connection.id}
                      title="Test Connection"
                    >
                      <RefreshIcon fontSize="small" />
                    </IconButton>
                    <IconButton 
                      size="small" 
                      onClick={() => handleViewSchema(connection.id)}
                      title="View Schema"
                    >
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
                    <IconButton 
                      size="small" 
                      onClick={() => handleEditConnection(connection.id)}
                      title="Edit Connection"
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton 
                      size="small" 
                      onClick={() => handleDeleteClick(connection)}
                      title="Delete Connection"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                  <Button 
                    size="small" 
                    variant="outlined"
                    component={RouterLink}
                    to={`/generate?connection=${connection.id}`}
                  >
                    Use
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
      >
        <DialogTitle>
          Delete Connection
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the connection "{connectionToDelete?.name}"? 
            This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={handleDeleteCancel} 
            disabled={deleting}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteConfirm} 
            color="error" 
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={20} /> : <DeleteIcon />}
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ConnectionsPage;
