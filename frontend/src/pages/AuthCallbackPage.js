import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress, Typography, Alert } from '@mui/material';
import { checkAuthStatus } from '../services/authService';
import api from '../utils/api';

const AuthCallbackPage = ({ onLogin }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const processCallback = async () => {
      try {
        // Parse query parameters from URL
        const queryParams = new URLSearchParams(location.search);
        const token = queryParams.get('token');
        
        if (!token) {
          throw new Error('Missing authentication token');
        }
        
        // Store the token in localStorage
        localStorage.setItem('token', token);
        
        // Set the token in the API headers
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        console.log('Set auth token in headers:', token.substring(0, 10) + '...');
        
        // Get user data
        const userData = await checkAuthStatus(true);
        
        // Call the onLogin callback with the user data
        onLogin(userData);
        
        // Navigate to dashboard
        navigate('/dashboard', { replace: true });
      } catch (err) {
        console.error('Error processing auth callback:', err);
        setError(err.message || 'Authentication failed');
        setLoading(false);
      }
    };
    
    processCallback();
  }, [location, navigate, onLogin]);
  
  if (error) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          p: 3
        }}
      >
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Typography variant="body1">
          Redirecting to login page...
        </Typography>
        <Box sx={{ mt: 2 }}>
          <CircularProgress size={24} />
        </Box>
        {setTimeout(() => navigate('/login', { replace: true }), 3000)}
      </Box>
    );
  }
  
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        p: 3
      }}
    >
      <Typography variant="h5" gutterBottom>
        Completing Authentication
      </Typography>
      <Box sx={{ mt: 2 }}>
        <CircularProgress />
      </Box>
    </Box>
  );
};

export default AuthCallbackPage;
