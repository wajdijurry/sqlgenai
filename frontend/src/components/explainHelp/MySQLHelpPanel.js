import React from 'react';
import { Box, Typography, Paper, Divider } from '@mui/material';

/**
 * MySQL-specific help panel for explain plans
 */
const MySQLHelpPanel = () => {
  return (
    <Paper sx={{ p: 2, mb: 2, bgcolor: '#f8f9fa' }}>
      <Typography variant="subtitle2" gutterBottom>Understanding MySQL Explain Plans</Typography>
      <Typography variant="body2" sx={{ mb: 1 }}>
        MySQL EXPLAIN shows how the query optimizer executes your query. Key columns to focus on:
      </Typography>
      
      <Box component="ul" sx={{ mt: 0, pl: 3 }}>
        <Box component="li">
          <Typography variant="body2" component="div">
            <strong>type:</strong> Access method, from best to worst: 
            <code>system</code> → <code>const</code> → <code>eq_ref</code> → <code>ref</code> → 
            <code>fulltext</code> → <code>ref_or_null</code> → <code>index_merge</code> → 
            <code>unique_subquery</code> → <code>index_subquery</code> → <code>range</code> → 
            <code>index</code> → <code>ALL</code>
          </Typography>
        </Box>
        
        <Box component="li">
          <Typography variant="body2" component="div">
            <strong>key:</strong> The index MySQL decided to use. <code>NULL</code> means no index was used.
          </Typography>
        </Box>
        
        <Box component="li">
          <Typography variant="body2" component="div">
            <strong>rows:</strong> Estimated number of rows MySQL will examine - lower is better.
          </Typography>
        </Box>
        
        <Box component="li">
          <Typography variant="body2" component="div">
            <strong>filtered:</strong> Percentage of rows that will be filtered by table condition.
          </Typography>
        </Box>
        
        <Box component="li">
          <Typography variant="body2" component="div">
            <strong>Extra:</strong> Watch for these warning signs:
            <Box component="ul" sx={{ pl: 3 }}>
              <Box component="li">
                <Typography variant="body2" component="div">
                  <code>Using filesort</code>: MySQL needs an additional pass to sort results
                </Typography>
              </Box>
              <Box component="li">
                <Typography variant="body2" component="div">
                  <code>Using temporary</code>: MySQL needs a temporary table to hold results
                </Typography>
              </Box>
              <Box component="li">
                <Typography variant="body2" component="div">
                  <code>Using where</code>: Rows are filtered after retrieval
                </Typography>
              </Box>
            </Box>
          </Typography>
        </Box>
      </Box>
      
      <Divider sx={{ my: 1.5 }} />
      
      <Typography variant="subtitle2" gutterBottom>Optimization Tips</Typography>
      <Box component="ul" sx={{ mt: 0, pl: 3 }}>
        <Box component="li">
          <Typography variant="body2" component="div">
            Add indexes for columns used in WHERE, JOIN, ORDER BY, and GROUP BY clauses
          </Typography>
        </Box>
        <Box component="li">
          <Typography variant="body2" component="div">
            Avoid SELECT * and retrieve only needed columns
          </Typography>
        </Box>
        <Box component="li">
          <Typography variant="body2" component="div">
            Consider LIMIT for large result sets
          </Typography>
        </Box>
      </Box>
      
      <Typography variant="body2" sx={{ mt: 1.5, fontStyle: 'italic' }}>
        <strong>Tip:</strong> Hover over column headers for more detailed explanations.
      </Typography>
    </Paper>
  );
};

export default MySQLHelpPanel;
