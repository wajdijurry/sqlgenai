import React, { useState, useEffect } from 'react';
import { Container, Typography, Paper, Box, TextField, Button, Grid, Snackbar, Alert, CircularProgress } from '@mui/material';
import { updateProfile } from '../services/authService';

const ProfilePage = () => {
  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    email: '',
    company: '',
    jobTitle: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'success' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Load user profile data from localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        setProfile({
          ...profile,
          firstName: user.first_name || '',
          lastName: user.last_name || '',
          email: user.email || '',
          company: user.company || '',
          jobTitle: user.job_title || ''
        });
        
        console.log('Loaded user profile data:', user);
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile({ ...profile, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate password change if attempted
    if (profile.newPassword || profile.confirmPassword || profile.currentPassword) {
      if (!profile.currentPassword) {
        setAlert({
          open: true,
          message: 'Current password is required to change password',
          severity: 'error'
        });
        return;
      }
      
      if (profile.newPassword !== profile.confirmPassword) {
        setAlert({
          open: true,
          message: 'New passwords do not match',
          severity: 'error'
        });
        return;
      }
    }
    
    // Prepare data for API call
    const profileData = {
      name: `${profile.firstName} ${profile.lastName}`.trim(),
      company: profile.company,
      job_title: profile.jobTitle
    };
    
    // Add password data if changing password
    if (profile.newPassword && profile.currentPassword) {
      profileData.currentPassword = profile.currentPassword;
      profileData.newPassword = profile.newPassword;
    }
    
    setLoading(true);
    
    try {
      // Call the API to update profile
      const response = await updateProfile(profileData);
      
      // Clear password fields
      setProfile({
        ...profile,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      
      // Show success message
      setAlert({
        open: true,
        message: response.message || 'Profile updated successfully',
        severity: 'success'
      });
    } catch (error) {
      // Show error message
      setAlert({
        open: true,
        message: error.message || 'Failed to update profile',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseAlert = () => {
    setAlert({ ...alert, open: false });
  };

  return (
    <Container maxWidth="md">
      <Box my={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          Profile Settings
        </Typography>
        
        <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Personal Information
                </Typography>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="First Name"
                  name="firstName"
                  value={profile.firstName}
                  onChange={handleChange}
                  variant="outlined"
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Last Name"
                  name="lastName"
                  value={profile.lastName}
                  onChange={handleChange}
                  variant="outlined"
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Email"
                  name="email"
                  value={profile.email}
                  onChange={handleChange}
                  variant="outlined"
                  disabled
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Company"
                  name="company"
                  value={profile.company}
                  onChange={handleChange}
                  variant="outlined"
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Job Title"
                  name="jobTitle"
                  value={profile.jobTitle}
                  onChange={handleChange}
                  variant="outlined"
                />
              </Grid>
              
              <Grid item xs={12} sx={{ mt: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Change Password
                </Typography>
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Current Password"
                  name="currentPassword"
                  type="password"
                  value={profile.currentPassword}
                  onChange={handleChange}
                  variant="outlined"
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="New Password"
                  name="newPassword"
                  type="password"
                  value={profile.newPassword}
                  onChange={handleChange}
                  variant="outlined"
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Confirm New Password"
                  name="confirmPassword"
                  type="password"
                  value={profile.confirmPassword}
                  onChange={handleChange}
                  variant="outlined"
                />
              </Grid>
              
              <Grid item xs={12} sx={{ mt: 2 }}>
                <Button 
                  type="submit" 
                  variant="contained" 
                  color="primary"
                  fullWidth
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <CircularProgress size={24} sx={{ mr: 1 }} />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </Grid>
            </Grid>
          </form>
        </Paper>
      </Box>
      
      <Snackbar open={alert.open} autoHideDuration={6000} onClose={handleCloseAlert}>
        <Alert onClose={handleCloseAlert} severity={alert.severity} sx={{ width: '100%' }}>
          {alert.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default ProfilePage;
