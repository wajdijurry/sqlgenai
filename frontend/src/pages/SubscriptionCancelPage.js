import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  Alert
} from '@mui/material';
import { Cancel as CancelIcon } from '@mui/icons-material';

const SubscriptionCancelPage = () => {
  const navigate = useNavigate();
  
  const handleGoToDashboard = () => {
    navigate('/dashboard');
  };
  
  const handleGoToSubscription = () => {
    navigate('/subscription');
  };
  
  return (
    <Container maxWidth="md">
      <Box sx={{ py: 4 }}>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
            <Box sx={{ 
              backgroundColor: 'error.light', 
              borderRadius: '50%', 
              p: 2, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              <CancelIcon fontSize="large" sx={{ color: 'white' }} />
            </Box>
          </Box>
          <Typography variant="h4" gutterBottom>
            Subscription Cancelled
          </Typography>
          <Typography variant="body1" paragraph>
            You have cancelled the subscription process. No charges have been made to your account.
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            If you have any questions or encountered any issues during the checkout process, please contact our support team.
          </Typography>
          <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center', gap: 2 }}>
            <Button variant="outlined" onClick={handleGoToSubscription}>
              Back to Subscription
            </Button>
            <Button variant="contained" color="primary" onClick={handleGoToDashboard}>
              Go to Dashboard
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default SubscriptionCancelPage;
