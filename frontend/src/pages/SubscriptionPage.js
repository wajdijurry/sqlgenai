import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  ToggleButtonGroup,
  ToggleButton,
  Stack
} from '@mui/material';
import {
  Check as CheckIcon,
  Close as CloseIcon,
  CreditCard as CreditCardIcon,
  Receipt as ReceiptIcon,
  History as HistoryIcon
} from '@mui/icons-material';

// Services
import { getSubscription, updateSubscription, getPaymentHistory, createCheckoutSession, redirectToStripeCheckout, processPayment, getSubscriptionPlans } from '../services/subscriptionService';

const SubscriptionPage = () => {
  // State for subscription
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // State for payment history
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  
  // State for payment dialog
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [processing, setProcessing] = useState(false);
  
  // State for billing cycle toggle
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' or 'annual'
  
  // State for pricing plans
  const [pricingPlans, setPricingPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(true);
  
  // State for payment form
  const [paymentForm, setPaymentForm] = useState({
    cardNumber: '',
    cardName: '',
    expiryDate: '',
    cvv: ''
  });
  const [formErrors, setFormErrors] = useState({});
  
  // Load subscription, plans, and payment history on component mount
  useEffect(() => {
    loadSubscription();
    loadSubscriptionPlans();
    loadPaymentHistory();
  }, []);
  
  // Load subscription plans from the API
  const loadSubscriptionPlans = async () => {
    setPlansLoading(true);
    
    try {
      const plans = await getSubscriptionPlans();
      setPricingPlans(plans);
    } catch (err) {
      setError('Failed to load subscription plans');
      console.error('Error loading subscription plans:', err);
    } finally {
      setPlansLoading(false);
    }
  };
  
  const loadSubscription = async () => {
    setLoading(true);
    setError('');
    
    try {
      const data = await getSubscription();
      setSubscription(data);
    } catch (err) {
      setError('Failed to load subscription information');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  const loadPaymentHistory = async () => {
    setHistoryLoading(true);
    
    try {
      const data = await getPaymentHistory();
      setPaymentHistory(data);
    } catch (err) {
      console.error('Failed to load payment history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };
  
  // Handle billing cycle toggle
  const handleBillingCycleChange = (event, newBillingCycle) => {
    if (newBillingCycle !== null) {
      setBillingCycle(newBillingCycle);
    }
  };

  const handlePlanSelect = async (plan) => {
    setSelectedPlan(plan);
    
    try {
      // Create a checkout session with Stripe
      const result = await createCheckoutSession({
        plan_id: plan.plan_id,
        billing_cycle: billingCycle
      });
      
      if (result.success) {
        // Redirect to Stripe checkout
        redirectToStripeCheckout(result.checkout_url);
      } else {
        setError(result.message || 'Failed to create checkout session');
      }
    } catch (err) {
      setError(err.message || 'An error occurred while creating checkout session');
      console.error('Error creating checkout session:', err);
    }
  };
  
  const handlePaymentDialogClose = () => {
    setPaymentDialogOpen(false);
    setSelectedPlan(null);
    setPaymentForm({
      cardNumber: '',
      cardName: '',
      expiryDate: '',
      cvv: ''
    });
    setFormErrors({});
  };
  
  const handlePaymentInputChange = (event) => {
    const { name, value } = event.target;
    setPaymentForm({
      ...paymentForm,
      [name]: value
    });
    
    // Clear error for this field
    if (formErrors[name]) {
      setFormErrors({
        ...formErrors,
        [name]: ''
      });
    }
  };
  
  const validatePaymentForm = () => {
    const errors = {};
    
    if (!paymentForm.cardNumber.trim()) {
      errors.cardNumber = 'Card number is required';
    } else if (!/^\d{16}$/.test(paymentForm.cardNumber.replace(/\s/g, ''))) {
      errors.cardNumber = 'Invalid card number';
    }
    
    if (!paymentForm.cardName.trim()) {
      errors.cardName = 'Name on card is required';
    }
    
    if (!paymentForm.expiryDate.trim()) {
      errors.expiryDate = 'Expiry date is required';
    } else if (!/^\d{2}\/\d{2}$/.test(paymentForm.expiryDate)) {
      errors.expiryDate = 'Invalid format (MM/YY)';
    }
    
    if (!paymentForm.cvv.trim()) {
      errors.cvv = 'CVV is required';
    } else if (!/^\d{3,4}$/.test(paymentForm.cvv)) {
      errors.cvv = 'Invalid CVV';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  const handleSubscriptionUpdate = async () => {
    if (!selectedPlan) return;
    
    setProcessing(true);
    
    try {
      // Create a checkout session with Stripe for the updated plan
      const billing_cycle = selectedPlan.id === 'enterprise' ? 'yearly' : 'monthly';
      const result = await createCheckoutSession({
        plan_id: selectedPlan.id,
        billing_cycle: billing_cycle
      });
      
      if (result.success) {
        // Redirect to Stripe checkout
        redirectToStripeCheckout(result.checkout_url);
      } else {
        setError(result.message || 'Failed to create checkout session');
      }
    } catch (err) {
      setError(err.message || 'An error occurred while updating subscription');
    } finally {
      setProcessing(false);
      setPaymentDialogOpen(false);
    }
  };
  
  const formatDate = (dateString) => {
    try {
      // Ensure the date string is valid
      if (!dateString) return 'N/A';
      
      // Create a date object from the ISO string
      const date = new Date(dateString);
      
      // Check if the date is valid
      if (isNaN(date.getTime())) return 'N/A';
      
      // Format the date as MM/DD/YYYY
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'N/A';
    }
  };
  
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };
  
  const getCurrentPlan = () => {
    if (!subscription) return null;
    return pricingPlans.find(plan => plan.id === subscription.plan_id);
  };
  
  const currentPlan = getCurrentPlan();
  
  if (loading) {
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
          Subscription
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" gutterBottom>
          Manage your subscription plan and payment details
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        {/* Current Subscription */}
        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Current Plan
          </Typography>
          <Divider sx={{ mb: 2 }} />
          
          {subscription ? (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Box>
                  <Typography variant="h5" color="primary" gutterBottom>
                    {subscription.plan_name || subscription.plan_id}
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {subscription.is_annual 
                      ? `${formatCurrency(pricingPlans.find(plan => plan.plan_id === subscription.plan_id)?.annual_price || 0)} / year` 
                      : `${formatCurrency(pricingPlans.find(plan => plan.plan_id === subscription.plan_id)?.monthly_price || 0)} / month`
                    }
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    <Chip 
                      label={`Active until: ${formatDate(subscription.end_date)}`} 
                      color="success" 
                      variant="outlined"
                    />
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Plan Features:
                  </Typography>
                  <List dense disablePadding>
                    {subscription.features && Object.entries(subscription.features).map(([key, value]) => {
                      // Format the feature key from snake_case to readable text
                      const featureKey = key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
                      
                      // Format the feature value based on its type
                      let featureValue;
                      if (typeof value === 'boolean') {
                        featureValue = value ? 'Yes' : 'No';
                      } else if (value === -1) {
                        featureValue = 'Unlimited';
                      } else {
                        featureValue = value.toString();
                      }
                      
                      return (
                        <ListItem key={key} disablePadding sx={{ py: 0.5 }}>
                          <ListItemIcon sx={{ minWidth: 30 }}>
                            <CheckIcon color="success" fontSize="small" />
                          </ListItemIcon>
                          <ListItemText 
                            primary={`${featureKey}: ${featureValue}`} 
                            primaryTypographyProps={{ component: 'div' }}
                          />
                        </ListItem>
                      );
                    })}
                  </List>
                </Box>
              </Grid>
            </Grid>
          ) : (
            <Box sx={{ textAlign: 'center', py: 3 }}>
              <Typography variant="body1" component="div" sx={{ mb: 2 }}>
                You don't have an active subscription.
              </Typography>
              <Typography variant="body2" color="text.secondary" component="div" sx={{ mb: 2 }}>
                Choose a plan below to get started with SQLGenAI.
              </Typography>
            </Box>
          )}
        </Paper>
        
        {/* Pricing Plans */}
        <Typography variant="h5" gutterBottom>
          Available Plans
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" gutterBottom sx={{ mb: 2 }}>
          Choose the plan that best fits your needs
        </Typography>
        
        {/* Billing Cycle Toggle */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="body2">Monthly</Typography>
            <ToggleButtonGroup
              value={billingCycle}
              exclusive
              onChange={handleBillingCycleChange}
              aria-label="billing cycle"
              size="small"
            >
              <ToggleButton value="monthly" aria-label="monthly billing">
                Monthly
              </ToggleButton>
              <ToggleButton value="annual" aria-label="annual billing">
                Annual
              </ToggleButton>
            </ToggleButtonGroup>
            <Typography variant="body2" component="div">
              Annual <Chip label="Save ~17%" size="small" color="success" sx={{ ml: 0.5 }} />
            </Typography>
          </Stack>
        </Box>
        
        {plansLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : pricingPlans.length === 0 ? (
          <Alert severity="error" sx={{ mb: 3 }}>
            Unable to load subscription plans. Please try again later.
          </Alert>
        ) : (
          <Box sx={{ overflowX: 'auto', pb: 2, mb: 2 }}>
            <Box sx={{ display: 'flex', width: 'max-content', minWidth: '100%' }}>
            {/* Sort plans to have free plan first, then others by price */}
            {pricingPlans
              .sort((a, b) => {
                // Free plan first
                if (a.plan_id === 'free') return -1;
                if (b.plan_id === 'free') return 1;
                // Then sort by price
                return a.monthly_price - b.monthly_price;
              })
              .map((plan) => (
            <Box key={plan.id} sx={{ minWidth: '300px', maxWidth: '350px', px: 1.5 }}>
              <Card 
                sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  ...(currentPlan?.id === plan.id && {
                    border: '2px solid',
                    borderColor: 'primary.main'
                  })
                }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  {currentPlan?.id === plan.id && (
                    <Chip 
                      label="Current Plan" 
                      color="primary" 
                      size="small"
                      sx={{ mb: 2 }}
                    />
                  )}
                  
                  <Typography variant="h5" component="div" gutterBottom>
                    {plan.name}
                  </Typography>
                  <Typography variant="h4" color="primary" gutterBottom>
                    {formatCurrency(billingCycle === 'monthly' ? 
                      plan.monthly_price : 
                      plan.annual_price / 12
                    )}
                    <Typography variant="caption" color="text.secondary">
                      /month
                    </Typography>
                  </Typography>
                  {billingCycle === 'annual' && (
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Billed annually as {formatCurrency(plan.annual_price)}
                    </Typography>
                  )}
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <List dense disablePadding>
                    {/* Display positive features with green checkmarks */}
                    {plan.features && Object.entries(plan.features).map(([key, value]) => {
                      // Format the feature key from snake_case to readable text
                      const featureKey = key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
                      
                      return (
                        <ListItem key={`feature-${key}`} disablePadding sx={{ py: 0.5 }}>
                          <ListItemIcon sx={{ minWidth: 30 }}>
                            <CheckIcon color="success" fontSize="small" />
                          </ListItemIcon>
                          <ListItemText 
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                {`${featureKey}: ${value}`}
                              </Box>
                            }
                            primaryTypographyProps={{ component: 'div' }}
                          />
                        </ListItem>
                      );
                    })}
                    
                    {/* Display limitations with red X marks */}
                    {plan.limitations && Object.entries(plan.limitations).map(([key, value]) => {
                      // Format the limitation key from snake_case to readable text
                      const limitationKey = key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
                      
                      return (
                        <ListItem key={`limitation-${key}`} disablePadding sx={{ py: 0.5 }}>
                          <ListItemIcon sx={{ minWidth: 30 }}>
                            <CloseIcon color="error" fontSize="small" />
                          </ListItemIcon>
                          <ListItemText 
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                {`${limitationKey}: ${value}`}
                              </Box>
                            }
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
                <CardActions sx={{ p: 2, pt: 0 }}>
                  <Button
                    fullWidth
                    variant={currentPlan?.id === plan.id ? 'outlined' : 'contained'}
                    color={currentPlan?.id === plan.id ? 'primary' : 'primary'}
                    onClick={() => handlePlanSelect(plan)}
                    disabled={currentPlan?.id === plan.id || plan.can_select === false}
                  >
                    {currentPlan?.id === plan.id ? 'Current Plan' : 
                     plan.can_select === false ? 'Downgrade Not Available' : 'Select Plan'}
                  </Button>
                </CardActions>
              </Card>
            </Box>
          ))}
            </Box>
          </Box>
        )}
        
        {/* Payment History */}
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Payment History
            </Typography>
            <HistoryIcon color="primary" />
          </Box>
          <Divider sx={{ mb: 2 }} />
          
          {historyLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : paymentHistory.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 3 }}>
              <Typography variant="body1" color="text.secondary">
                No payment history available
              </Typography>
            </Box>
          ) : (
            <Box sx={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid #eee' }}>
                      Date
                    </th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid #eee' }}>
                      Plan
                    </th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid #eee' }}>
                      Amount
                    </th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid #eee' }}>
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paymentHistory.map((payment) => (
                    <tr key={payment.id}>
                      <td style={{ padding: '12px 16px', borderBottom: '1px solid #eee' }}>
                        {formatDate(payment.date)}
                      </td>
                      <td style={{ padding: '12px 16px', borderBottom: '1px solid #eee' }}>
                        {payment.description ? payment.description : (payment.plan_name || payment.plan_id)}
                      </td>
                      <td style={{ padding: '12px 16px', borderBottom: '1px solid #eee' }}>
                        {formatCurrency(payment.amount)}
                      </td>
                      <td style={{ padding: '12px 16px', borderBottom: '1px solid #eee' }}>
                        <Chip 
                          label={payment.status} 
                          color={payment.status === 'success' || payment.status === 'successful' ? 'success' : 'error'} 
                          size="small"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Box>
          )}
        </Paper>
      </Box>
      
      {/* Payment Dialog */}
      <Dialog
        open={paymentDialogOpen}
        onClose={handlePaymentDialogClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Update Subscription to {selectedPlan?.name}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              {formatCurrency(selectedPlan?.price || 0)} / month
            </Typography>
            <Divider sx={{ my: 2 }} />
            
            <Typography variant="body1" component="div" sx={{ mb: 2 }}>
              You will be redirected to Stripe's secure payment page to complete your subscription update.
            </Typography>
            
            <Typography variant="body2" color="text.secondary">
              Your payment information is securely processed by Stripe and is not stored on our servers.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handlePaymentDialogClose} disabled={processing}>
            Cancel
          </Button>
          <Button
            onClick={handleSubscriptionUpdate}
            color="primary"
            variant="contained"
            disabled={processing}
            startIcon={processing ? <CircularProgress size={20} /> : null}
          >
            {processing ? 'Processing...' : 'Proceed to Payment'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default SubscriptionPage;
