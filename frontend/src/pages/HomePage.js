import React, { useState, useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Container,
  Divider,
  Grid,
  Typography,
  useTheme,
  ToggleButtonGroup,
  ToggleButton,
  Stack,
  Chip,
  CircularProgress
} from '@mui/material';
import {
  Code as CodeIcon,
  Storage as DatabaseIcon,
  Comment as CommentIcon,
  CheckCircle as CheckCircleIcon,
  Close as CloseIcon,
  Download as DownloadIcon,
  Dashboard as DashboardIcon
} from '@mui/icons-material';

// Placeholder for hero image
import heroImage from '../assets/hero-illustration.svg';
import aiImage from '../assets/ai-illustration.svg';

// Import subscription service
import { getSubscriptionPlans } from '../services/subscriptionService';

// No need to import authentication context as we'll use localStorage

const HomePage = () => {
  const theme = useTheme();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  
  // State for subscription plans
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [billingCycle, setBillingCycle] = useState('monthly'); // Default to monthly pricing
  
  // Check authentication status and fetch subscription plans from API
  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
        setIsAuthenticated(true);
      } catch (e) {
        console.error('Error parsing stored user data:', e);
        setIsAuthenticated(false);
      }
    } else {
      setIsAuthenticated(false);
    }
    
    // Fetch subscription plans
    const fetchPlans = async () => {
      try {
        const plansData = await getSubscriptionPlans();
        setPlans(plansData);
      } catch (err) {
        console.error('Error fetching subscription plans:', err);
        setError('Failed to load subscription plans');
      } finally {
        setLoading(false);
      }
    };
    
    fetchPlans();
  }, []);

  return (
    <Box>
      {/* Hero Section */}
      <Box sx={{ bgcolor: 'background.paper', py: 8 }}>
        <Container maxWidth="lg">
          <Grid container spacing={6} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography
                component="h1"
                variant="h2"
                color="primary"
                fontWeight="bold"
                gutterBottom
              >
                Transform Natural Language into SQL
              </Typography>
              <Typography variant="h5" color="text.secondary" paragraph>
                SQLGenAI uses advanced AI models to generate accurate SQL queries from natural language.
                Connect to your databases, ask questions in plain English, and get instant SQL queries.
              </Typography>
              <Box sx={{ mt: 4, display: 'flex', gap: 2 }}>
                {isAuthenticated ? (
                  <Button
                    variant="contained"
                    size="large"
                    component={RouterLink}
                    to="/dashboard"
                    startIcon={<DashboardIcon />}
                  >
                    Go to Dashboard
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="contained"
                      size="large"
                      component={RouterLink}
                      to="/register"
                      startIcon={<CodeIcon />}
                    >
                      Get Started
                    </Button>
                    <Button
                      variant="outlined"
                      size="large"
                      component={RouterLink}
                      to="/login"
                    >
                      Login
                    </Button>
                  </>
                )}
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box
                component="img"
                src={heroImage}
                alt="SQLGenAI Illustration"
                sx={{
                  width: '100%',
                  maxWidth: 500,
                  height: 'auto',
                  display: 'block',
                  mx: 'auto'
                }}
              />
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* How It Works Section */}
      <Box sx={{ py: 8 }}>
        <Container maxWidth="lg">
          <Typography
            component="h2"
            variant="h3"
            align="center"
            color="text.primary"
            gutterBottom
          >
            How It Works
          </Typography>
          <Typography variant="h5" align="center" color="text.secondary" paragraph>
            Generate SQL queries in three simple steps
          </Typography>

          <Grid container spacing={4} sx={{ mt: 4 }}>
            <Grid item xs={12} md={4}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.3s, box-shadow 0.3s',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: 8
                  }
                }}
              >
                <CardContent sx={{ flexGrow: 1, textAlign: 'center', p: 4 }}>
                  <Box
                    sx={{
                      bgcolor: 'primary.main',
                      color: 'white',
                      width: 60,
                      height: 60,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mx: 'auto',
                      mb: 3
                    }}
                  >
                    <DatabaseIcon fontSize="large" />
                  </Box>
                  <Typography gutterBottom variant="h5" component="h3">
                    1. Connect
                  </Typography>
                  <Typography color="text.secondary">
                    Connect to your database using our secure connection manager. We support MySQL, PostgreSQL, SQL Server, and more.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.3s, box-shadow 0.3s',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: 8
                  }
                }}
              >
                <CardContent sx={{ flexGrow: 1, textAlign: 'center', p: 4 }}>
                  <Box
                    sx={{
                      bgcolor: 'primary.main',
                      color: 'white',
                      width: 60,
                      height: 60,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mx: 'auto',
                      mb: 3
                    }}
                  >
                    <CommentIcon fontSize="large" />
                  </Box>
                  <Typography gutterBottom variant="h5" component="h3">
                    2. Ask
                  </Typography>
                  <Typography color="text.secondary">
                    Ask questions about your data in plain English. Our AI understands your database schema and your intent.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.3s, box-shadow 0.3s',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: 8
                  }
                }}
              >
                <CardContent sx={{ flexGrow: 1, textAlign: 'center', p: 4 }}>
                  <Box
                    sx={{
                      bgcolor: 'primary.main',
                      color: 'white',
                      width: 60,
                      height: 60,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mx: 'auto',
                      mb: 3
                    }}
                  >
                    <CodeIcon fontSize="large" />
                  </Box>
                  <Typography gutterBottom variant="h5" component="h3">
                    3. Generate
                  </Typography>
                  <Typography color="text.secondary">
                    Get optimized SQL queries instantly. Execute them directly or copy and use them in your applications.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Pricing Section */}
      <Box sx={{ bgcolor: 'background.paper', py: 8 }}>
        <Container maxWidth="lg">
          <Typography
            component="h2"
            variant="h3"
            align="center"
            color="text.primary"
            gutterBottom
          >
            Subscription Plans
          </Typography>
          <Typography variant="h5" align="center" color="text.secondary" paragraph>
            Choose the plan that fits your needs
          </Typography>
          
          {/* Billing Cycle Toggle */}
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="body2" component="div">
                Monthly
              </Typography>
              <ToggleButtonGroup
                value={billingCycle}
                exclusive
                onChange={(e, newValue) => {
                  if (newValue !== null) {
                    setBillingCycle(newValue);
                  }
                }}
                size="small"
              >
                <ToggleButton value="monthly">
                  Monthly
                </ToggleButton>
                <ToggleButton value="annual">
                  Annual
                </ToggleButton>
              </ToggleButtonGroup>
              <Typography variant="body2" component="div">
                Annual <Chip label="Save ~17%" size="small" color="success" sx={{ ml: 0.5 }} />
              </Typography>
            </Stack>
          </Box>
          
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Box sx={{ textAlign: 'center', p: 4 }}>
              <Typography color="error" gutterBottom>
                {error}
              </Typography>
              <Button 
                variant="contained" 
                onClick={() => {
                  setLoading(true);
                  setError('');
                  getSubscriptionPlans(true).then(data => {
                    setPlans(data);
                    setLoading(false);
                  }).catch(err => {
                    console.error('Error refreshing plans:', err);
                    setError('Failed to load subscription plans');
                    setLoading(false);
                  });
                }}
                sx={{ mt: 2 }}
              >
                Retry
              </Button>
            </Box>
          ) : plans.length === 0 ? (
            <Box sx={{ textAlign: 'center', p: 4 }}>
              <Typography color="text.secondary">
                No subscription plans available at this time.
              </Typography>
            </Box>
          ) : (
            <Box sx={{ overflowX: 'auto', pb: 2, mb: 2 }}>
              <Box sx={{ display: 'flex', width: 'max-content', minWidth: '100%' }}>
              {/* Sort plans to have free plan first, then others by price */}
              {plans
                .sort((a, b) => {
                  // Free plan first
                  if (a.plan_id === 'free') return -1;
                  if (b.plan_id === 'free') return 1;
                  // Then sort by price
                  return a.monthly_price - b.monthly_price;
                })
                .map((plan) => (
              <Box key={plan.plan_id} sx={{ minWidth: '300px', maxWidth: '350px', px: 1.5 }}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    border: plan.popular ? `2px solid ${theme.palette.primary.main}` : 'none',
                    transition: 'transform 0.3s, box-shadow 0.3s',
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      boxShadow: 8
                    }
                  }}
                >
                  {plan.popular && (
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 0,
                        right: 0,
                        bgcolor: 'warning.main',
                        color: 'warning.contrastText',
                        py: 0.5,
                        px: 2,
                        borderRadius: '0 4px 0 4px',
                        fontWeight: 'bold',
                        fontSize: '0.875rem'
                      }}
                    >
                      Popular
                    </Box>
                  )}
                  <Box
                    sx={{
                      bgcolor: 'primary.main',
                      color: 'white',
                      py: 3,
                      textAlign: 'center'
                    }}
                  >
                    <Typography variant="h5" component="h3">
                      {plan.name}
                    </Typography>
                  </Box>
                  <CardContent sx={{ flexGrow: 1, p: 4 }}>
                    <Box sx={{ textAlign: 'center', mb: 4 }}>
                      <Typography variant="h3" component="div">
                        ${billingCycle === 'monthly' ? 
                          plan.monthly_price : 
                          (plan.annual_price / 12).toFixed(2)
                        }
                      </Typography>
                      <Typography variant="subtitle1" color="text.secondary">
                        per month
                      </Typography>
                      {billingCycle === 'annual' && (
                        <Typography variant="body2" color="success.main">
                          Billed annually as ${plan.annual_price}
                        </Typography>
                      )}
                    </Box>
                    <Divider sx={{ my: 2 }} />
                    <Box sx={{ mt: 2 }}>
                      {/* Display features with green checkmarks */}
                      {plan.features && Object.entries(plan.features).map(([key, value]) => {
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
                          <Box
                            key={`feature-${key}`}
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              mb: 1.5
                            }}
                          >
                            <CheckCircleIcon
                              sx={{ mr: 1, color: 'success.main' }}
                            />
                            <Typography variant="body1" component="div">
                              {`${featureKey}: ${featureValue}`}
                            </Typography>
                          </Box>
                        );
                      })}
                      
                      {/* Display limitations with red X marks if present */}
                      {plan.limitations && Object.entries(plan.limitations).map(([key, value]) => {
                        // Format the limitation key from snake_case to readable text
                        const limitationKey = key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
                        
                        return (
                          <Box
                            key={`limitation-${key}`}
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              mb: 1.5
                            }}
                          >
                            <CloseIcon
                              sx={{ mr: 1, color: 'error.main' }}
                            />
                            <Typography variant="body1" component="div" color="text.secondary">
                              {`${limitationKey}: ${value}`}
                            </Typography>
                          </Box>
                        );
                      })}
                    </Box>
                  </CardContent>
                  <CardActions sx={{ p: 2, pt: 0 }}>
                    <Button
                      fullWidth
                      variant="contained"
                      color="primary"
                      component={RouterLink}
                      to={isAuthenticated ? '/subscription' : '/register'}
                    >
                      {isAuthenticated ? 'Subscribe' : 'Get Started'}
                    </Button>
                  </CardActions>
                </Card>
              </Box>
            ))}
              </Box>
            </Box>
          )}
        </Container>
      </Box>

      {/* AI Section */}
      <Box sx={{ py: 8 }}>
        <Container maxWidth="lg">
          <Grid container spacing={6} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography
                component="h2"
                variant="h3"
                color="text.primary"
                gutterBottom
              >
                Powered by Advanced AI
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                SQLGenAI leverages the latest AI models from OpenAI and DeepSeek to understand your database schema
                and generate accurate SQL queries. Our AI is trained on millions of SQL queries and can handle complex
                database structures.
              </Typography>
              <Box sx={{ mt: 2 }}>
                {[
                  'Understands complex database schemas',
                  'Generates optimized SQL queries',
                  'Supports multiple database types',
                  'Continuously improving accuracy'
                ].map((feature, index) => (
                  <Box
                    key={index}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      mb: 1.5
                    }}
                  >
                    <CheckCircleIcon
                      sx={{ mr: 1, color: 'success.main' }}
                    />
                    <Typography variant="body1">{feature}</Typography>
                  </Box>
                ))}
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box
                component="img"
                src={aiImage}
                alt="AI Illustration"
                sx={{
                  width: '100%',
                  maxWidth: 500,
                  height: 'auto',
                  display: 'block',
                  mx: 'auto'
                }}
              />
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Desktop App Section */}
      <Box sx={{ py: 8, bgcolor: 'background.default' }}>
        <Container maxWidth="lg">
          <Grid container spacing={6} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography
                component="h2"
                variant="h3"
                color="text.primary"
                gutterBottom
              >
                Need Local Database Access?
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                For databases hosted on your local network or behind a firewall, we offer a Windows desktop application with the same powerful AI capabilities. Connect directly to your databases without exposing them to the internet.
              </Typography>
              <Box sx={{ mt: 3 }}>
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  href="/downloads/SQLGenAI-Setup.exe"
                  startIcon={<DownloadIcon />}
                  sx={{ px: 4, py: 1.5 }}
                >
                  Download Windows App
                </Button>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Compatible with Windows 10/11 (64-bit)
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box
                component="img"
                src="/images/desktop-app-preview.png"
                alt="SQLGenAI Desktop Application"
                sx={{
                  width: '100%',
                  maxWidth: 500,
                  height: 'auto',
                  display: 'block',
                  mx: 'auto',
                  boxShadow: 3,
                  borderRadius: 2
                }}
              />
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* CTA Section */}
      <Box sx={{ bgcolor: 'primary.main', color: 'white', py: 8 }}>
        <Container maxWidth="md" sx={{ textAlign: 'center' }}>
          <Typography variant="h3" gutterBottom>
            Ready to Transform Your SQL Workflow?
          </Typography>
          <Typography variant="h6" paragraph sx={{ mb: 4 }}>
            Join thousands of developers and data analysts who are saving time with SQLGenAI.
          </Typography>
          <Button
            variant="contained"
            size="large"
            color="secondary"
            component={RouterLink}
            to="/register"
            sx={{ px: 4, py: 1.5 }}
          >
            Get Started for Free
          </Button>
        </Container>
      </Box>
    </Box>
  );
};

export default HomePage;
