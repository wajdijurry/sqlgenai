import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

/**
 * Default help panel for explain plans when database type is unknown
 */
const DefaultHelpPanel = () => {
  return (
    <Paper sx={{ p: 2, mb: 2, bgcolor: '#f8f9fa' }}>
      <Typography variant="subtitle2" gutterBottom>Understanding Explain Plans</Typography>
      <Typography variant="body2" sx={{ mb: 1 }}>
        Explain plans show how the database executes your query. Here's what to look for:
      </Typography>
      <Box component="ul" sx={{ mt: 0, pl: 3 }}>
        <Box component="li">
          <Typography variant="body2" component="div">
            <strong>Access Method:</strong> How tables are accessed. Full table scans are generally less efficient than index scans.
          </Typography>
        </Box>
        <Box component="li">
          <Typography variant="body2" component="div">
            <strong>Rows:</strong> Estimated number of rows examined - lower is generally better.
          </Typography>
        </Box>
        <Box component="li">
          <Typography variant="body2" component="div">
            <strong>Cost:</strong> Relative cost of the operation - lower is better.
          </Typography>
        </Box>
      </Box>
      <Typography variant="body2">
        <strong>Tip:</strong> Hover over column headers for more detailed explanations.
      </Typography>
    </Paper>
  );
};

export default DefaultHelpPanel;
