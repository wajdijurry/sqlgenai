import React from 'react';
import { Box, Typography, Button, Alert } from '@mui/material';

/**
 * Component to display a warning when the user has reached their query limit
 * Will not display anything if queryLimit is -1 (unlimited)
 */
const QueryLimitWarning = ({ queryLimit, planName = 'current' }) => {
  // Don't render anything if the user has unlimited queries
  if (queryLimit === -1) {
    return null;
  }
  
  return (
    <Box sx={{ mt: 2, mb: 2 }}>
      <Alert severity="warning" sx={{ mb: 2 }}>
        <Typography variant="subtitle1">
          You have reached your monthly query limit
        </Typography>
        <Typography variant="body2" sx={{ mt: 1, mb: 2 }}>
          Your {planName} plan allows {queryLimit} queries per month.
          You have used all {queryLimit} queries for this month.
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          size="small" 
          href="/subscription"
        >
          Upgrade your plan
        </Button>
      </Alert>
    </Box>
  );
};

export default QueryLimitWarning;
