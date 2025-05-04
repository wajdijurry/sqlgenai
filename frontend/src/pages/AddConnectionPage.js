import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  FormControlLabel,
  Switch,
  Alert,
  CircularProgress,
  Divider,
  IconButton,
  InputAdornment,
  Stepper,
  Step,
  StepLabel
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Check as CheckIcon
} from '@mui/icons-material';

// Services
import { createConnection, testNewConnection } from '../services/connectionService';

// Contexts
import { useConnections } from '../context/ConnectionsContext';
import { useSubscription } from '../context/SubscriptionContext';

const steps = ['Connection Details', 'Authentication', 'Test Connection'];

const AddConnectionPage = () => {
  const navigate = useNavigate();
  
  // Get data from contexts
  const { connections, loadConnections } = useConnections();
  const { subscription, queryLimit, loadSubscription } = useSubscription();
  
  // State for subscription check
  const [checkingLimits, setCheckingLimits] = useState(true);
  const [connectionLimit, setConnectionLimit] = useState(1); // Default limit for free tier
  const [connectionCount, setConnectionCount] = useState(0);
  
  // State for form
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState({
    name: '',
    db_type: '',
    host: '',
    port: '',
    database_name: '',
    service_name: '',  // Added for Oracle connections
    schema_name: '',   // Added for PostgreSQL connections
    use_service_name: false, // Toggle between SID and Service Name for Oracle
    username: '',
    password: '',
    ssl_enabled: false,
    connection_string: ''
  });
  
  // State for form validation
  const [errors, setErrors] = useState({});
  
  // State for form submission
  const [submitting, setSubmitting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [error, setError] = useState(''); // Shared error state for all operations
  
  // State for password visibility
  const [showPassword, setShowPassword] = useState(false);
  
  // Default ports for different database types
  const defaultPorts = {
    mysql: '3306',
    postgresql: '5432',
    sqlserver: '1433',
    oracle: '1521',
    sqlite: ''
  };
  
  const handleDbTypeChange = (event) => {
    const dbType = event.target.value;
    setFormData({
      ...formData,
      db_type: dbType,
      port: defaultPorts[dbType] || ''
    });
  };
  
  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData({
      ...formData,
      [name]: value
    });
    
    // Clear error for this field
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: ''
      });
    }
  };
  
  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };
  
  // Check subscription limits when component mounts
  useEffect(() => {
    const loadData = async () => {
      try {
        setCheckingLimits(true);
        setError('');
        
        // Load connections from context (will use cached data if available)
        await loadConnections();
        setConnectionCount(connections.length);
        
        // Load subscription from context (will use cached data if available)
        await loadSubscription();
        
        // Determine connection limit based on subscription plan
        let limit = 1; // Default for free tier
        
        if (subscription) {
          // If user has a subscription, check the plan features
          if (subscription.plan_id === 'basic') {
            limit = 3;
          } else if (subscription.plan_id === 'professional') {
            limit = 10;
          } else if (subscription.plan_id === 'enterprise') {
            limit = 50; // High limit for enterprise
          }
        }
        
        setConnectionLimit(limit);
        
        // If user has reached their limit, redirect to connections page
        if (connections.length >= limit) {
          navigate('/connections', { 
            state: { 
              error: `You have reached your connection limit (${limit}). Please upgrade your plan to add more connections.` 
            } 
          });
        }
      } catch (err) {
        console.error('Error checking subscription limits:', err);
        setError('Failed to check subscription limits. Please try again.');
      } finally {
        setCheckingLimits(false);
      }
    };
    
    loadData();
  }, [loadConnections, loadSubscription, connections, subscription, navigate]);
  
  const validateStep = () => {
    const newErrors = {};
    
    if (activeStep === 0) {
      // Validate connection details
      if (!formData.name.trim()) {
        newErrors.name = 'Connection name is required';
      }
      
      if (!formData.db_type) {
        newErrors.db_type = 'Database type is required';
      }
      
      if (formData.db_type !== 'sqlite') {
        if (!formData.host.trim()) {
          newErrors.host = 'Host is required';
        }
        
        if (!formData.port.trim()) {
          newErrors.port = 'Port is required';
        } else if (!/^\d+$/.test(formData.port)) {
          newErrors.port = 'Port must be a number';
        }
      }
      
      // For Oracle, validate either database_name (SID) or service_name based on toggle
      if (formData.db_type === 'oracle') {
        if (formData.use_service_name) {
          if (!formData.service_name.trim()) {
            newErrors.service_name = 'Service Name is required';
          }
        } else {
          if (!formData.database_name.trim()) {
            newErrors.database_name = 'SID is required';
          }
        }
      } else if (!formData.database_name.trim()) {
        newErrors.database_name = 'Database name is required';
      }
    }
    
    if (activeStep === 1) {
      if (!formData.username.trim() && formData.db_type !== 'sqlite') {
        newErrors.username = 'Username is required';
      }
      
      if (!formData.password.trim() && formData.db_type !== 'sqlite') {
        newErrors.password = 'Password is required';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleNext = () => {
    if (validateStep()) {
      setActiveStep((prevStep) => prevStep + 1);
    }
  };
  
  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };
  
  const handleTestConnection = async () => {
    if (!validateStep()) return;
    
    setTesting(true);
    setTestResult(null);
    setError('');
    
    try {
      // Create a copy of the form data for testing
      const connectionData = {
        ...formData
      };
      
      // For Oracle connections, handle the SID/Service Name toggle
      if (formData.db_type === 'oracle') {
        if (formData.use_service_name) {
          // Using Service Name - ensure database_name is empty or matches service_name
          connectionData.database_name = ''; // Clear SID if using Service Name
        } else {
          // Using SID - ensure service_name is empty
          connectionData.service_name = ''; // Clear Service Name if using SID
        }
      }
      
      // Use testNewConnection to test the connection before saving
      const testResponse = await testNewConnection(connectionData);
      
      setTestResult({
        success: testResponse.success,
        message: testResponse.message
      });
      
      // No need to store a temporary connection ID anymore
    } catch (err) {
      console.error('Test connection error:', err);
      setError(err.message || 'An error occurred while testing the connection');
      setTestResult({
        success: false,
        message: err.message
      });
    } finally {
      setTesting(false);
    }
  };
  
  const handleSubmit = async (event) => {
    event.preventDefault();
    
    if (!validateStep()) return;
    
    setSubmitting(true);
    setError('');
    
    try {
      // Create a copy of the form data for submission
      const connectionData = {
        ...formData,
        is_temporary: false
      };
      
      // For Oracle connections, handle the SID/Service Name toggle
      if (formData.db_type === 'oracle') {
        if (formData.use_service_name) {
          // Using Service Name - ensure database_name is empty or matches service_name
          connectionData.database_name = ''; // Clear SID if using Service Name
        } else {
          // Using SID - ensure service_name is empty
          connectionData.service_name = ''; // Clear Service Name if using SID
        }
      }
      
      // If we have a temporary connection ID, use it
      if (formData.temp_connection_id) {
        connectionData.temp_connection_id = formData.temp_connection_id;
      }
      
      const response = await createConnection(connectionData);
      
      if (response.success) {
        navigate('/connections');
      } else {
        setError(response.message || 'Failed to create connection');
      }
    } catch (err) {
      setError(err.message || 'An error occurred while creating the connection');
    } finally {
      setSubmitting(false);
    }
  };
  
  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Connection Name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                error={!!errors.name}
                helperText={errors.name}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth error={!!errors.db_type} required>
                <InputLabel id="db-type-label">Database Type</InputLabel>
                <Select
                  labelId="db-type-label"
                  name="db_type"
                  value={formData.db_type}
                  onChange={handleDbTypeChange}
                  label="Database Type"
                >
                  <MenuItem value="mysql">MySQL</MenuItem>
                  <MenuItem value="postgresql">PostgreSQL</MenuItem>
                  <MenuItem value="sqlserver">SQL Server</MenuItem>
                  <MenuItem value="oracle">Oracle</MenuItem>
                  <MenuItem value="sqlite">SQLite</MenuItem>
                </Select>
                {errors.db_type && <FormHelperText>{errors.db_type}</FormHelperText>}
              </FormControl>
            </Grid>
            
            {formData.db_type !== 'sqlite' && (
              <>
                <Grid item xs={12} md={8}>
                  <TextField
                    fullWidth
                    label="Host"
                    name="host"
                    value={formData.host}
                    onChange={handleInputChange}
                    error={!!errors.host}
                    helperText={errors.host}
                    required
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Port"
                    name="port"
                    value={formData.port}
                    onChange={handleInputChange}
                    error={!!errors.port}
                    helperText={errors.port}
                    required
                  />
                </Grid>
              </>
            )}
            
            {formData.db_type === 'oracle' ? (
              <>
                <Grid item xs={12}>
                  <FormControl component="fieldset" sx={{ mb: 2 }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.use_service_name}
                          onChange={(e) => setFormData({
                            ...formData,
                            use_service_name: e.target.checked
                          })}
                          name="use_service_name"
                        />
                      }
                      label="Use Service Name instead of SID"
                    />
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label={formData.use_service_name ? "Service Name" : "SID"}
                    name={formData.use_service_name ? "service_name" : "database_name"}
                    value={formData.use_service_name ? formData.service_name : formData.database_name}
                    onChange={handleInputChange}
                    error={formData.use_service_name ? !!errors.service_name : !!errors.database_name}
                    helperText={formData.use_service_name 
                      ? (errors.service_name || 'Oracle service name (e.g., XE)') 
                      : (errors.database_name || 'Oracle SID (e.g., XE, ORCL)')}
                    required
                  />
                </Grid>
              </>
            ) : (
              <>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Database Name"
                    name="database_name"
                    value={formData.database_name}
                    onChange={handleInputChange}
                    error={!!errors.database_name}
                    helperText={errors.database_name || (formData.db_type === 'sqlite' ? 'For SQLite, enter the file path' : '')}
                    required
                  />
                </Grid>
                {formData.db_type === 'postgresql' && (
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Schema Name"
                      name="schema_name"
                      value={formData.schema_name}
                      onChange={handleInputChange}
                      helperText="PostgreSQL schema name (default: public)"
                    />
                  </Grid>
                )}
              </>
            )}
          </Grid>
        );
      case 1:
        return (
          <Grid container spacing={3}>
            {formData.db_type !== 'sqlite' && (
              <>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Username"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    error={!!errors.username}
                    helperText={errors.username}
                    required
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={handleInputChange}
                    error={!!errors.password}
                    helperText={errors.password}
                    required
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={handleTogglePasswordVisibility}
                            edge="end"
                          >
                            {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                          </IconButton>
                        </InputAdornment>
                      )
                    }}
                  />
                </Grid>
              </>
            )}
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Connection String (Optional)"
                name="connection_string"
                value={formData.connection_string}
                onChange={handleInputChange}
                helperText="Leave empty to use individual connection parameters"
                multiline
                rows={3}
              />
            </Grid>
          </Grid>
        );
      case 2:
        return (
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Connection Summary
            </Typography>
            <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Connection Name
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {formData.name}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Database Type
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {formData.db_type.toUpperCase()}
                  </Typography>
                </Grid>
                {formData.db_type !== 'sqlite' && (
                  <>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">
                        Host
                      </Typography>
                      <Typography variant="body1" gutterBottom>
                        {formData.host}:{formData.port}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">
                        Username
                      </Typography>
                      <Typography variant="body1" gutterBottom>
                        {formData.username}
                      </Typography>
                    </Grid>
                  </>
                )}
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    Database Name
                  </Typography>
                  <Typography variant="body1">
                    {formData.database_name}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>
            
            <Box sx={{ mb: 3 }}>
              <Button
                variant="outlined"
                onClick={handleTestConnection}
                disabled={testing}
                startIcon={testing ? <CircularProgress size={20} /> : null}
              >
                {testing ? 'Testing...' : 'Test Connection'}
              </Button>
            </Box>
            
            {testResult && (
              <Alert 
                severity={testResult.success ? 'success' : 'error'}
                sx={{ mb: 3 }}
                icon={testResult.success ? <CheckIcon /> : undefined}
              >
                {testResult.message}
              </Alert>
            )}
            
            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}
          </Box>
        );
      default:
        return null;
    }
  };
  
  return (
    <Container maxWidth="md">
      <Box sx={{ my: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <IconButton 
            onClick={() => navigate('/connections')}
            sx={{ mr: 2 }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" component="h1">
            Add Database Connection
          </Typography>
        </Box>
        
        <Paper sx={{ p: 3, mb: 4 }}>
          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
          
          <form onSubmit={handleSubmit}>
            {renderStepContent(activeStep)}
            
            <Divider sx={{ my: 3 }} />
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Button
                onClick={() => navigate('/connections')}
                sx={{ mr: 1 }}
              >
                Cancel
              </Button>
              
              <Box>
                {activeStep > 0 && (
                  <Button
                    onClick={handleBack}
                    sx={{ mr: 1 }}
                  >
                    Back
                  </Button>
                )}
                
                {activeStep < steps.length - 1 ? (
                  <Button
                    variant="contained"
                    onClick={handleNext}
                  >
                    Next
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    disabled={submitting || (testResult && !testResult.success)}
                    startIcon={submitting ? <CircularProgress size={20} /> : <SaveIcon />}
                  >
                    {submitting ? 'Saving...' : 'Save Connection'}
                  </Button>
                )}
              </Box>
            </Box>
          </form>
        </Paper>
      </Box>
    </Container>
  );
};

export default AddConnectionPage;
