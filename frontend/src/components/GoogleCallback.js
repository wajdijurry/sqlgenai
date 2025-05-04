import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress, Typography, Alert } from '@mui/material';
import { handleGoogleCallback } from '../services/googleAuthService';

const GoogleCallback = ({ onLogin }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const processGoogleCallback = async () => {
      try {
        // Parse query parameters from URL
        const queryParams = new URLSearchParams(location.search);
        const code = queryParams.get('code');
        const state = queryParams.get('state');
        
        if (!code || !state) {
          throw new Error('Missing authorization code or state');
        }
        
        // Exchange code for token
        const userData = await handleGoogleCallback(code, state);
        
        // Call the onLogin callback with the user data
        onLogin(userData);
        
        // Navigate to dashboard
        navigate('/dashboard', { replace: true });
      } catch (err) {
        console.error('Error processing Google callback:', err);
        setError(err.message || 'Authentication failed');
        setLoading(false);
      }
    };
    
    processGoogleCallback();
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
        Completing Google Sign-In
      </Typography>
      <Box sx={{ mt: 2 }}>
        <CircularProgress />
      </Box>
    </Box>
  );
};

export default GoogleCallback;
