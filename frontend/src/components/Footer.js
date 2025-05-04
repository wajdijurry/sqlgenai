import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Container, Grid, Typography, Link, Divider } from '@mui/material';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <Box component="footer" sx={{ bgcolor: 'primary.dark', color: 'white', py: 6, mt: 'auto' }}>
      <Container maxWidth="lg">
        <Grid container spacing={4}>
          <Grid item xs={12} md={4}>
            <Typography variant="h6" gutterBottom>
              SQLGenAI
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Generate SQL queries from natural language using AI. Connect to your databases, ask questions in plain English, and get instant SQL queries.
            </Typography>
          </Grid>
          
          <Grid item xs={12} sm={6} md={4}>
            <Typography variant="h6" gutterBottom>
              Links
            </Typography>
            <Box component="ul" sx={{ p: 0, listStyle: 'none' }}>
              <Box component="li" sx={{ mb: 1 }}>
                <Link component={RouterLink} to="/" color="inherit" underline="hover">
                  Home
                </Link>
              </Box>
              <Box component="li" sx={{ mb: 1 }}>
                <Link component={RouterLink} to="/dashboard" color="inherit" underline="hover">
                  Dashboard
                </Link>
              </Box>
              <Box component="li" sx={{ mb: 1 }}>
                <Link component={RouterLink} to="/generate" color="inherit" underline="hover">
                  Generate SQL
                </Link>
              </Box>
              <Box component="li" sx={{ mb: 1 }}>
                <Link component={RouterLink} to="/connections" color="inherit" underline="hover">
                  Database Connections
                </Link>
              </Box>
            </Box>
          </Grid>
          
          <Grid item xs={12} sm={6} md={4}>
            <Typography variant="h6" gutterBottom>
              Contact
            </Typography>
            <Box component="ul" sx={{ p: 0, listStyle: 'none' }}>
              <Box component="li" sx={{ mb: 1 }}>
                <Link href="mailto:support@sqlgenai.com" color="inherit" underline="hover">
                  support@sqlgenai.com
                </Link>
              </Box>
              <Box component="li" sx={{ mb: 1 }}>
                <Link href="tel:+962795845634" color="inherit" underline="hover">
                  +962 (79) 584-5634
                </Link>
              </Box>
            </Box>
          </Grid>
        </Grid>
        
        <Divider sx={{ my: 3, borderColor: 'rgba(255, 255, 255, 0.2)' }} />
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <Typography variant="body2" sx={{ mb: { xs: 2, md: 0 } }}>
            &copy; {currentYear} SQLGenAI. All rights reserved.
          </Typography>
          <Box>
            <Link component={RouterLink} to="/privacy-policy" color="inherit" underline="hover" sx={{ mx: 1 }}>
              Privacy Policy
            </Link>
            <Link component={RouterLink} to="/terms-of-service" color="inherit" underline="hover" sx={{ mx: 1 }}>
              Terms of Service
            </Link>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer;
