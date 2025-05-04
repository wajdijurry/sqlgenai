import React from 'react';
import { Box, Typography, Paper, Divider } from '@mui/material';

/**
 * Oracle-specific help panel for explain plans
 */
const OracleHelpPanel = () => {
  return (
    <Paper sx={{ p: 2, mb: 2, bgcolor: '#f8f9fa' }}>
      <Typography variant="subtitle2" gutterBottom>Understanding Oracle Explain Plans</Typography>
      <Typography variant="body2" sx={{ mb: 1 }}>
        Oracle EXPLAIN PLAN shows the execution path chosen by the optimizer. Key elements to focus on:
      </Typography>
      
      <Box component="ul" sx={{ mt: 0, pl: 3 }}>
        <Box component="li">
          <Typography variant="body2" component="div">
            <strong>Operation:</strong> The type of operation performed, such as:
            <Box component="ul" sx={{ pl: 3 }}>
              <Box component="li">
                <Typography variant="body2" component="div">
                  <code>TABLE ACCESS FULL</code>: Full table scan (potentially inefficient for large tables)
                </Typography>
              </Box>
              <Box component="li">
                <Typography variant="body2" component="div">
                  <code>INDEX UNIQUE SCAN</code>: Using a unique index (very efficient)
                </Typography>
              </Box>
              <Box component="li">
                <Typography variant="body2" component="div">
                  <code>INDEX RANGE SCAN</code>: Using an index to access a range of rows
                </Typography>
              </Box>
              <Box component="li">
                <Typography variant="body2" component="div">
                  <code>HASH JOIN/NESTED LOOPS/MERGE JOIN</code>: Different join methods
                </Typography>
              </Box>
            </Box>
          </Typography>
        </Box>
        
        <Box component="li">
          <Typography variant="body2" component="div">
            <strong>Cost:</strong> Estimated cost of the operation. Lower is better.
          </Typography>
        </Box>
        
        <Box component="li">
          <Typography variant="body2" component="div">
            <strong>Cardinality:</strong> Estimated number of rows the operation will produce.
          </Typography>
        </Box>
        
        <Box component="li">
          <Typography variant="body2" component="div">
            <strong>Bytes:</strong> Estimated size of data the operation will process.
          </Typography>
        </Box>
        
        <Box component="li">
          <Typography variant="body2" component="div">
            <strong>Time:</strong> Estimated time for the operation (when available).
          </Typography>
        </Box>
        
        <Box component="li">
          <Typography variant="body2" component="div">
            <strong>Access/Filter Predicates:</strong> Conditions used to access or filter data.
          </Typography>
        </Box>
      </Box>
      
      <Divider sx={{ my: 1.5 }} />
      
      <Typography variant="subtitle2" gutterBottom>Performance Warning Signs</Typography>
      <Box component="ul" sx={{ mt: 0, pl: 3 }}>
        <Box component="li">
          <Typography variant="body2" component="div">
            <code>TABLE ACCESS FULL</code> on large tables without a restrictive condition
          </Typography>
        </Box>
        <Box component="li">
          <Typography variant="body2" component="div">
            <code>FILTER</code> operations instead of <code>ACCESS</code> predicates (post-filtering)
          </Typography>
        </Box>
        <Box component="li">
          <Typography variant="body2" component="div">
            <code>HASH JOIN</code> with large tables and high memory usage
          </Typography>
        </Box>
        <Box component="li">
          <Typography variant="body2" component="div">
            <code>TEMP TABLE TRANSFORMATION</code> or excessive sorting operations
          </Typography>
        </Box>
        <Box component="li">
          <Typography variant="body2" component="div">
            <code>CARTESIAN JOINS</code> (missing join conditions)
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
            Gather statistics regularly with <code>DBMS_STATS</code>
          </Typography>
        </Box>
        <Box component="li">
          <Typography variant="body2" component="div">
            Consider using <code>EXPLAIN PLAN FOR</code> or <code>DBMS_XPLAN.DISPLAY_CURSOR</code> for detailed plans
          </Typography>
        </Box>
        <Box component="li">
          <Typography variant="body2" component="div">
            Review table partitioning for very large tables
          </Typography>
        </Box>
        <Box component="li">
          <Typography variant="body2" component="div">
            Use bind variables instead of literals for better plan reuse
          </Typography>
        </Box>
      </Box>
      
      <Typography variant="body2" sx={{ mt: 1.5, fontStyle: 'italic' }}>
        <strong>Tip:</strong> Hover over column headers for more detailed explanations.
      </Typography>
    </Paper>
  );
};

export default OracleHelpPanel;
