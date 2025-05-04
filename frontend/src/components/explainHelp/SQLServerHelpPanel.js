import React from 'react';
import { Box, Typography, Paper, Divider } from '@mui/material';

/**
 * SQL Server-specific help panel for execution plans
 */
const SQLServerHelpPanel = () => {
  return (
    <Paper sx={{ p: 2, mb: 2, bgcolor: '#f8f9fa' }}>
      <Typography variant="subtitle2" gutterBottom>Understanding SQL Server Execution Plans</Typography>
      <Typography variant="body2" sx={{ mb: 1 }}>
        SQL Server execution plans show how the query optimizer processes your query. Key elements to focus on:
      </Typography>
      
      <Box component="ul" sx={{ mt: 0, pl: 3 }}>
        <Box component="li">
          <Typography variant="body2" component="div">
            <strong>Operation:</strong> The physical operation type, such as:
            <Box component="ul" sx={{ pl: 3 }}>
              <Box component="li">
                <Typography variant="body2" component="div">
                  <code>Table Scan</code>/<code>Clustered Index Scan</code>: Full table/index scan (potentially inefficient)
                </Typography>
              </Box>
              <Box component="li">
                <Typography variant="body2" component="div">
                  <code>Index Seek</code>: Using an index to find specific rows (efficient)
                </Typography>
              </Box>
              <Box component="li">
                <Typography variant="body2" component="div">
                  <code>Key Lookup</code>: Additional lookup after an index seek (can be costly if frequent)
                </Typography>
              </Box>
              <Box component="li">
                <Typography variant="body2" component="div">
                  <code>Sort</code>: Sorting operation (memory/disk intensive)
                </Typography>
              </Box>
            </Box>
          </Typography>
        </Box>
        
        <Box component="li">
          <Typography variant="body2" component="div">
            <strong>Cost:</strong> Relative cost as a percentage of the batch. Higher percentages indicate bottlenecks.
          </Typography>
        </Box>
        
        <Box component="li">
          <Typography variant="body2" component="div">
            <strong>Estimated Rows:</strong> Number of rows the optimizer expects each operation to process.
          </Typography>
        </Box>
        
        <Box component="li">
          <Typography variant="body2" component="div">
            <strong>Actual Rows:</strong> When using actual execution plan, shows the actual number of rows processed.
          </Typography>
        </Box>
        
        <Box component="li">
          <Typography variant="body2" component="div">
            <strong>I/O Cost:</strong> Estimated disk I/O cost of the operation.
          </Typography>
        </Box>
        
        <Box component="li">
          <Typography variant="body2" component="div">
            <strong>CPU Cost:</strong> Estimated CPU cost of the operation.
          </Typography>
        </Box>
      </Box>
      
      <Divider sx={{ my: 1.5 }} />
      
      <Typography variant="subtitle2" gutterBottom>Performance Warning Signs</Typography>
      <Box component="ul" sx={{ mt: 0, pl: 3 }}>
        <Box component="li">
          <Typography variant="body2" component="div">
            <code>Table Scan</code> operations on large tables
          </Typography>
        </Box>
        <Box component="li">
          <Typography variant="body2" component="div">
            High number of <code>Key Lookup</code> operations (consider covering indexes)
          </Typography>
        </Box>
        <Box component="li">
          <Typography variant="body2" component="div">
            <code>Hash Match</code> or <code>Sort</code> operations with high costs
          </Typography>
        </Box>
        <Box component="li">
          <Typography variant="body2" component="div">
            <code>Spills to tempdb</code> (indicates memory pressure)
          </Typography>
        </Box>
        <Box component="li">
          <Typography variant="body2" component="div">
            Large discrepancy between estimated and actual rows (statistics may be outdated)
          </Typography>
        </Box>
      </Box>
      
      <Divider sx={{ my: 1.5 }} />
      
      <Typography variant="subtitle2" gutterBottom>Optimization Tips</Typography>
      <Box component="ul" sx={{ mt: 0, pl: 3 }}>
        <Box component="li">
          <Typography variant="body2" component="div">
            Create appropriate indexes for query patterns
          </Typography>
        </Box>
        <Box component="li">
          <Typography variant="body2" component="div">
            Update statistics regularly with <code>UPDATE STATISTICS</code>
          </Typography>
        </Box>
        <Box component="li">
          <Typography variant="body2" component="div">
            Consider filtered indexes for queries with specific WHERE clauses
          </Typography>
        </Box>
        <Box component="li">
          <Typography variant="body2" component="div">
            Use covering indexes to avoid key lookups
          </Typography>
        </Box>
        <Box component="li">
          <Typography variant="body2" component="div">
            Review and adjust query hints only when necessary
          </Typography>
        </Box>
      </Box>
      
      <Typography variant="body2" sx={{ mt: 1.5, fontStyle: 'italic' }}>
        <strong>Tip:</strong> Hover over column headers for more detailed explanations.
      </Typography>
    </Paper>
  );
};

export default SQLServerHelpPanel;
