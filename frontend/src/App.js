import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

// Context Providers
import { SubscriptionProvider } from './context/SubscriptionContext';
import { ConnectionsProvider } from './context/ConnectionsContext';
import { HistoryProvider } from './context/HistoryContext';

// Components
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import GeneratePage from './pages/GeneratePage';
import ConnectionsPage from './pages/ConnectionsPage';
import AddConnectionPage from './pages/AddConnectionPage';
import EditConnectionPage from './pages/EditConnectionPage';
import HistoryPage from './pages/HistoryPage';
import ProfilePage from './pages/ProfilePage';
import SubscriptionPage from './pages/SubscriptionPage';
import SubscriptionSuccessPage from './pages/SubscriptionSuccessPage';
import SubscriptionCancelPage from './pages/SubscriptionCancelPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TermsOfServicePage from './pages/TermsOfServicePage';
import AuthCallbackPage from './pages/AuthCallbackPage';

// Services
import { checkAuthStatus } from './services/authService';

// Create theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#2563EB', // Main blue from the database icon
      light: '#3B82F6',
      dark: '#1D4ED8',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#7DD3FC', // Light blue from the AI badge
      light: '#BAE6FD',
      dark: '#38BDF8',
      contrastText: '#0F172A',
    },
    background: {
      default: '#F8FAFC',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
    },
    h2: {
      fontWeight: 700,
    },
    h3: {
      fontWeight: 600,
    },
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
    button: {
      fontWeight: 500,
      textTransform: 'none',
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
            transform: 'translateY(-2px)',
          },
          transition: 'all 0.3s ease',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          '&:hover': {
            boxShadow: '0 10px 20px rgba(0, 0, 0, 0.12)',
            transform: 'translateY(-5px)',
          },
          transition: 'all 0.3s ease',
        },
      },
    },
  },
});

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check if we have a token first
        const token = localStorage.getItem('token');
        
        if (!token) {
          console.log('No token found, user is not authenticated');
          setUser(null);
          setLoading(false);
          return;
        }
        
        // Try to get user data from localStorage first
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          try {
            const parsedUser = JSON.parse(storedUser);
            setUser(parsedUser);
          } catch (e) {
            console.error('Error parsing stored user data:', e);
          }
        }
        
        // Then verify with the server
        const userData = await checkAuthStatus();
        setUser(userData);
      } catch (error) {
        // Only clear user if it's an authentication error
        if (error.response && error.response.status === 401) {
          console.error('Authentication error:', error);
          setUser(null);
          // Don't redirect here, just set the user to null
        } else {
          // For other errors, keep the current user state
          console.error('Error checking authentication status:', error);
          // Don't change the user state for non-auth errors
        }
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    navigate('/dashboard');
  };

  const handleLogout = () => {
    setUser(null);
    navigate('/');
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <SubscriptionProvider>
        <ConnectionsProvider>
          <HistoryProvider>
            <div className="app">
              <Navbar user={user} onLogout={handleLogout} />
              <main className="main-content">
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/auth-callback" element={<AuthCallbackPage onLogin={handleLogin} />} />
            
            {/* Protected routes */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute user={user}>
                  <DashboardPage user={user} />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/generate" 
              element={
                <ProtectedRoute user={user}>
                  <GeneratePage user={user} />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/connections" 
              element={
                <ProtectedRoute user={user}>
                  <ConnectionsPage user={user} />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/connections/add" 
              element={
                <ProtectedRoute user={user}>
                  <AddConnectionPage user={user} />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/connections/edit/:id" 
              element={
                <ProtectedRoute user={user}>
                  <EditConnectionPage user={user} />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/connections/schema/:id" 
              element={
                <ProtectedRoute user={user}>
                  <ConnectionsPage user={user} showSchema={true} />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/history" 
              element={
                <ProtectedRoute user={user}>
                  <HistoryPage user={user} />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/profile" 
              element={
                <ProtectedRoute user={user}>
                  <ProfilePage user={user} />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/subscription" 
              element={
                <ProtectedRoute user={user}>
                  <SubscriptionPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/subscription/success" 
              element={
                <ProtectedRoute user={user}>
                  <SubscriptionSuccessPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/subscription/cancel" 
              element={
                <ProtectedRoute user={user}>
                  <SubscriptionCancelPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/privacy-policy" 
              element={<PrivacyPolicyPage />} 
            />
            <Route 
              path="/terms-of-service" 
              element={<TermsOfServicePage />} 
            />
          </Routes>
              </main>
              <Footer />
            </div>
          </HistoryProvider>
        </ConnectionsProvider>
      </SubscriptionProvider>
    </ThemeProvider>
  );
}

export default App;
