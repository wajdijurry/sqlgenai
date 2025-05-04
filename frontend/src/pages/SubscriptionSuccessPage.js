import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Card,
  CardContent
} from '@mui/material';
import { 
  Check as CheckIcon,
  Close as CloseIcon 
} from '@mui/icons-material';
import { processPayment, clearSubscriptionCache } from '../services/subscriptionService';

const SubscriptionSuccessPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [subscription, setSubscription] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  
  useEffect(() => {
    const processCheckoutSession = async () => {
      // Get session_id from URL query parameters
      const params = new URLSearchParams(location.search);
      const sessionId = params.get('session_id');
      
      if (!sessionId) {
        setError('Invalid session ID. Please try again.');
        setLoading(false);
        return;
      }
      
      try {
        // Process the payment with the backend
        // The withCache utility will prevent duplicate API calls
        const result = await processPayment({ session_id: sessionId });
        
        if (result.success) {
          setSuccess(true);
          // Store the subscription details if available
          if (result.subscription) {
            setSubscription(result.subscription);
          }
        } else {
          setError(result.message || 'Failed to process payment');
        }
      } catch (err) {
        console.error('Error processing payment:', err);
        setError(err.message || 'An error occurred while processing payment');
      } finally {
        setLoading(false);
      }
    };
    
    processCheckoutSession();
  }, [location]);
  
  const handleGoToDashboard = () => {
    navigate('/dashboard');
  };
  
  const handleGoToSubscription = () => {
    // Clear the subscription cache to ensure fresh data is loaded
    clearSubscriptionCache();
    
    // Navigate to the subscription page
    navigate('/subscription');
  };
  
  if (loading) {
    return (
      <Container maxWidth="md">
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <CircularProgress size={60} />
          <Typography variant="h6" sx={{ mt: 3 }}>
            Processing your subscription...
          </Typography>
        </Box>
      </Container>
    );
  }
  
  return (
    <Container maxWidth="md">
      <Box sx={{ py: 4 }}>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          {success ? (
            <>
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
                <Box sx={{ 
                  backgroundColor: 'success.light', 
                  borderRadius: '50%', 
                  p: 2, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center' 
                }}>
                  <CheckIcon fontSize="large" sx={{ color: 'white' }} />
                </Box>
              </Box>
              <Typography variant="h4" gutterBottom>
                Subscription Successful!
              </Typography>
              <Typography variant="body1" paragraph>
                Thank you for subscribing to SQLGenAI. Your subscription is now active.
              </Typography>
              
              {subscription && (
                <Card variant="outlined" sx={{ mb: 3, mt: 2 }}>
                  <CardContent>
                    <Typography variant="h6" color="primary" gutterBottom>
                      {subscription.plan_name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {subscription.is_annual ? 'Annual' : 'Monthly'} subscription
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Active until: {new Date(subscription.end_date).toLocaleDateString()}
                    </Typography>
                    
                    <Divider sx={{ my: 2 }} />
                    
                    <Typography variant="subtitle2" gutterBottom>
                      Plan Features:
                    </Typography>
                    <List dense disablePadding>
                      {/* Display positive features with green checkmarks */}
                      {subscription.features && Object.entries(subscription.features).map(([key, value]) => {
                        // Format the feature key from snake_case to readable text
                        const featureKey = key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
                        
                        return (
                          <ListItem key={`feature-${key}`} disablePadding sx={{ py: 0.5 }}>
                            <ListItemIcon sx={{ minWidth: 30 }}>
                              <CheckIcon color="success" fontSize="small" />
                            </ListItemIcon>
                            <ListItemText 
                              primary={`${featureKey}: ${value}`}
                              primaryTypographyProps={{ component: 'div' }}
                            />
                          </ListItem>
                        );
                      })}
                      
                      {/* Display limitations with red X marks */}
                      {subscription.limitations && Object.entries(subscription.limitations).map(([key, value]) => {
                        // Format the limitation key from snake_case to readable text
                        const limitationKey = key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
                        
                        return (
                          <ListItem key={`limitation-${key}`} disablePadding sx={{ py: 0.5 }}>
                            <ListItemIcon sx={{ minWidth: 30 }}>
                              <CloseIcon color="error" fontSize="small" />
                            </ListItemIcon>
                            <ListItemText 
                              primary={`${limitationKey}: ${value}`}
                              primaryTypographyProps={{ 
                                component: 'div',
                                color: 'text.secondary'
                              }}
                            />
                          </ListItem>
                        );
                      })}
                    </List>
                  </CardContent>
                </Card>
              )}
              
              <Typography variant="body2" color="text.secondary" paragraph>
                You now have access to all the features included in your plan.
              </Typography>
              
              <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center', gap: 2 }}>
                <Button variant="outlined" onClick={handleGoToSubscription}>
                  View Subscription
                </Button>
                <Button variant="contained" color="primary" onClick={handleGoToDashboard}>
                  Go to Dashboard
                </Button>
              </Box>
            </>
          ) : (
            <>
              <Alert severity="error" sx={{ mb: 3 }}>
                {error || 'There was an error processing your subscription.'}
              </Alert>
              <Typography variant="h5" gutterBottom>
                Subscription Processing Failed
              </Typography>
              <Typography variant="body1" paragraph>
                We couldn't process your subscription at this time. Please try again later.
              </Typography>
              <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center', gap: 2 }}>
                <Button variant="outlined" onClick={handleGoToSubscription}>
                  Back to Subscription
                </Button>
                <Button variant="contained" color="primary" onClick={handleGoToDashboard}>
                  Go to Dashboard
                </Button>
              </Box>
            </>
          )}
        </Paper>
      </Box>
    </Container>
  );
};

export default SubscriptionSuccessPage;
