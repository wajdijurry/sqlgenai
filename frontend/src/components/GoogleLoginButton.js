import React, { useState } from 'react';
import { Button, CircularProgress } from '@mui/material';
import { Google as GoogleIcon } from '@mui/icons-material';
import { initiateGoogleLogin } from '../services/googleAuthService';

const GoogleLoginButton = () => {
  const [loading, setLoading] = useState(false);
  
  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      
      // Initiate Google login flow
      const authData = await initiateGoogleLogin();
      
      // Redirect to Google's authorization page
      if (authData.auth_url) {
        window.location.href = authData.auth_url;
      } else {
        throw new Error('Invalid authentication URL');
      }
    } catch (error) {
      console.error('Error initiating Google login:', error);
      setLoading(false);
      // Error is handled in the parent component
      throw error;
    }
  };
  
  return (
    <Button
      fullWidth
      variant="outlined"
      color="primary"
      startIcon={loading ? <CircularProgress size={20} /> : <GoogleIcon />}
      onClick={handleGoogleLogin}
      disabled={loading}
      sx={{
        mt: 2,
        mb: 2,
        py: 1.5,
        borderColor: '#4285F4',
        color: '#4285F4',
        '&:hover': {
          borderColor: '#4285F4',
          backgroundColor: 'rgba(66, 133, 244, 0.04)'
        }
      }}
    >
      {loading ? 'Connecting...' : 'Sign in with Google'}
    </Button>
  );
};

export default GoogleLoginButton;
