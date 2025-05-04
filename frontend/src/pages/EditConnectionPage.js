import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Paper,
  Grid,
  CircularProgress,
  FormControlLabel,
  Switch
} from '@mui/material';
import { getConnectionById, updateConnection } from '../services/connectionService';

const EditConnectionPage = ({ user }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    db_type: '',
    host: '',
    port: '',
    database_name: '',
    service_name: '',  // Added for Oracle connections
    use_service_name: false, // Toggle between SID and Service Name for Oracle
    oracle_database_name: '', // Specific database name for Oracle connections
    username: '',
    password: '',
    useEmptyPassword: false, // Flag to explicitly use an empty password
    ssl_enabled: false,
    options: ''
  });

  useEffect(() => {
    const fetchConnection = async () => {
      try {
        setLoading(true);
        const connection = await getConnectionById(id);
        // Determine if using service_name for Oracle
        const isOracle = connection.db_type === 'oracle';
        const useServiceName = isOracle && connection.service_name && connection.service_name.trim() !== '';
        
        // For Oracle connections, initialize the oracle_database_name field
        let oracleDatabaseName = '';
        if (isOracle && connection.database_name && connection.database_name.trim() !== '') {
          // If this is an Oracle connection with a database name, initialize the oracle_database_name field
          oracleDatabaseName = connection.database_name;
        }
        
        setFormData({
          ...connection,
          use_service_name: useServiceName,
          oracle_database_name: oracleDatabaseName,
          // Don't show the password in the form
          password: '',
          // Check if this connection already has an empty password
          useEmptyPassword: connection.has_empty_password || false,
          ssl_enabled: connection.ssl_enabled || false,
          options: connection.options || ''
        });
        
        console.log('Loaded connection data:', connection);
        setError('');
      } catch (err) {
        console.error('Error fetching connection:', err);
        setError('Failed to load connection details. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchConnection();
  }, [id]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      // Create a copy of the form data for submission
      const connectionData = {
        ...formData
      };
      
      // Handle password field based on user's intention
      if (connectionData.useEmptyPassword) {
        // User explicitly wants an empty password
        connectionData.password = '';
      } else if (!connectionData.password || connectionData.password.trim() === '') {
        // Password field is empty but user doesn't want an empty password
        // This means they want to keep the existing password
        delete connectionData.password;
      }
      
      // Remove the useEmptyPassword field as it's not needed in the backend
      delete connectionData.useEmptyPassword;
      
      // For Oracle connections, handle the SID/Service Name toggle
      if (formData.db_type === 'oracle') {
        if (formData.use_service_name) {
          // Using Service Name - ensure database_name is empty or matches service_name
          connectionData.database_name = ''; // Clear SID if using Service Name
        } else {
          // Using SID - ensure service_name is empty
          connectionData.service_name = ''; // Clear Service Name if using SID
        }
        
        // Handle the oracle_database_name field
        if (formData.oracle_database_name && formData.oracle_database_name.trim() !== '') {
          // If oracle_database_name is provided, use it as the database_name
          connectionData.database_name = formData.oracle_database_name.trim();
        }
      }
      
      // Remove the fields not needed in the backend
      delete connectionData.use_service_name;
      delete connectionData.oracle_database_name;
      
      console.log('Submitting connection data:', connectionData);
      await updateConnection(id, connectionData);
      
      setSuccess('Connection updated successfully!');
      setError('');
      // Navigate back to connections page after a short delay
      setTimeout(() => {
        navigate('/connections');
      }, 1500);
    } catch (err) {
      console.error('Error updating connection:', err);
      setError('Failed to update connection. Please try again.');
      setSuccess('');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !formData.name) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Edit Connection
        </Typography>
        
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
        
        <Box component="form" onSubmit={handleSubmit} noValidate>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                label="Connection Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth margin="normal">
                <InputLabel id="db-type-label">Database Type</InputLabel>
                <Select
                  labelId="db-type-label"
                  name="db_type"
                  value={formData.db_type}
                  onChange={handleChange}
                  label="Database Type"
                  required
                  disabled={loading}
                >
                  <MenuItem value="mysql">MySQL</MenuItem>
                  <MenuItem value="postgresql">PostgreSQL</MenuItem>
                  <MenuItem value="sqlserver">SQL Server</MenuItem>
                  <MenuItem value="oracle">Oracle</MenuItem>
                  <MenuItem value="sqlite">SQLite</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={8}>
              <TextField
                required
                fullWidth
                label="Host"
                name="host"
                value={formData.host}
                onChange={handleChange}
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Port"
                name="port"
                value={formData.port}
                onChange={handleChange}
                margin="normal"
                type="number"
              />
            </Grid>
            <Grid item xs={12}>
              {formData.db_type === 'oracle' ? (
                <>
                  <Box sx={{ mb: 2 }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.use_service_name}
                          onChange={(e) => setFormData({
                            ...formData,
                            use_service_name: e.target.checked
                          })}
                          name="use_service_name"
                          disabled={loading}
                        />
                      }
                      label="Use Service Name instead of SID"
                    />
                  </Box>
                  <TextField
                    required
                    fullWidth
                    label={formData.use_service_name ? "Service Name" : "SID"}
                    name={formData.use_service_name ? "service_name" : "database_name"}
                    value={formData.use_service_name ? formData.service_name : formData.database_name}
                    onChange={handleChange}
                    margin="normal"
                    disabled={loading}
                    helperText={formData.use_service_name 
                      ? "Oracle service name (e.g., XE)" 
                      : "Oracle SID (e.g., XE, ORCL)"}
                  />
                  <TextField
                    fullWidth
                    label="Database Name"
                    name="oracle_database_name"
                    value={formData.oracle_database_name || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      oracle_database_name: e.target.value
                    })}
                    margin="normal"
                    disabled={loading}
                    helperText="Specify the database name if you have multiple databases (optional)"
                  />
                </>
              ) : (
                <>
                  <TextField
                    required
                    fullWidth
                    label="Database Name"
                    name="database_name"
                    value={formData.database_name}
                    onChange={handleChange}
                    margin="normal"
                    disabled={loading}
                    helperText={formData.db_type === 'sqlite' ? "For SQLite, enter the file path" : ""}
                  />
                  {formData.db_type === 'postgresql' && (
                    <TextField
                      fullWidth
                      label="Schema Name"
                      name="schema_name"
                      value={formData.schema_name || ''}
                      onChange={handleChange}
                      margin="normal"
                      disabled={loading}
                      helperText="PostgreSQL schema name (default: public)"
                    />
                  )}
                </>
              )}
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                margin="normal"
                placeholder="Leave blank to keep current password"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.useEmptyPassword}
                    onChange={handleChange}
                    name="useEmptyPassword"
                    disabled={loading}
                  />
                }
                label="Use empty password (no password)"
                sx={{ mt: 1 }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Additional Options"
                name="options"
                value={formData.options}
                onChange={handleChange}
                margin="normal"
                multiline
                rows={2}
                helperText="Additional connection options in JSON format"
              />
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                <Button 
                  variant="outlined" 
                  onClick={() => navigate('/connections')}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  variant="contained" 
                  color="primary"
                  disabled={loading}
                >
                  {loading ? <CircularProgress size={24} /> : 'Update Connection'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Paper>
    </Container>
  );
};

export default EditConnectionPage;
