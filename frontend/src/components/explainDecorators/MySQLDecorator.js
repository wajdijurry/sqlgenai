import React from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  Tooltip,
  Chip
} from '@mui/material';

/**
 * MySQLDecorator - A specialized component for rendering MySQL explain plans
 * 
 * @param {Object} props - Component props
 * @param {Object} props.explainData - The MySQL explain plan data
 * @returns {JSX.Element} Rendered component
 */
const MySQLDecorator = ({ explainData }) => {
  if (!explainData) {
    return (
      <Typography variant="body2" color="text.secondary">
        No MySQL explain plan data available
      </Typography>
    );
  }

  // Handle the case where explainData might be a string
  let parsedData = explainData;
  if (typeof explainData === 'string') {
    try {
      parsedData = JSON.parse(explainData);
    } catch (e) {
      console.error('Error parsing MySQL EXPLAIN JSON string:', e);
      return (
        <Typography variant="body2" color="text.secondary">
          Unable to parse MySQL EXPLAIN data (invalid JSON string)
        </Typography>
      );
    }
  }

  // Handle the case where the data might be in the explain_data.data[0].EXPLAIN format
  if (parsedData.explain_data && parsedData.explain_data.data && parsedData.explain_data.data.length > 0) {
    const explainContent = parsedData.explain_data.data[0]['EXPLAIN'];
    if (typeof explainContent === 'string') {
      try {
        parsedData = JSON.parse(explainContent);
      } catch (e) {
        console.error('Error parsing nested EXPLAIN JSON:', e);
      }
    } else if (typeof explainContent === 'object') {
      parsedData = explainContent;
    }
  }
  
  // Handle the case where the data might be in the rows[0].EXPLAIN format
  if (parsedData.rows && parsedData.rows.length > 0 && parsedData.rows[0].EXPLAIN) {
    const explainContent = parsedData.rows[0].EXPLAIN;
    if (typeof explainContent === 'string') {
      try {
        parsedData = JSON.parse(explainContent);
      } catch (e) {
        console.error('Error parsing rows[0].EXPLAIN JSON:', e);
      }
    } else if (typeof explainContent === 'object') {
      parsedData = explainContent;
    }
  }

  // Check if we have a valid query_block structure
  if (!parsedData.query_block) {
    return (
      <Typography variant="body2" color="text.secondary">
        Unable to parse MySQL EXPLAIN data (missing query_block)
      </Typography>
    );
  }

  // Extract the query execution steps
  const extractSteps = (queryBlock, steps = [], level = 0) => {
    // Add the main query block
    const step = {
      id: steps.length + 1,
      level,
      table: queryBlock.table?.table_name || '-',
      type: queryBlock.table?.access_type || 'query_block',
      access: queryBlock.table?.key || '-',
      rows: queryBlock.table?.rows_examined_per_scan || '-',
      filtered: queryBlock.table?.filtered || queryBlock.filtered || '',
      cost: queryBlock.cost_info?.query_cost || '-',
      extra: []
    };
    
    // Add extra information
    if (queryBlock.using_temporary_table) step.extra.push('Using temporary');
    if (queryBlock.using_filesort) step.extra.push('Using filesort');
    if (queryBlock.table?.key) step.extra.push(`Using index: ${queryBlock.table.key}`);
    
    steps.push(step);
    
    // Handle grouping_operation which may contain nested_loop
    if (queryBlock.grouping_operation) {
      if (queryBlock.grouping_operation.using_temporary_table) {
        step.extra.push('Using temporary table for grouping');
      }
      if (queryBlock.grouping_operation.using_filesort) {
        step.extra.push('Using filesort for grouping');
      }
      
      // Process nested loops inside grouping_operation
      if (queryBlock.grouping_operation.nested_loop && Array.isArray(queryBlock.grouping_operation.nested_loop)) {
        queryBlock.grouping_operation.nested_loop.forEach(nestedItem => {
          if (nestedItem.table) {
            const nestedStep = {
              id: steps.length + 1,
              level: level + 1,
              table: nestedItem.table.table_name || '-',
              type: nestedItem.table.access_type || '-',
              access: nestedItem.table.key || '-',
              rows: nestedItem.table.rows_examined_per_scan || '-',
              filtered: nestedItem.table.filtered || '',
              cost: nestedItem.table.cost_info?.prefix_cost || '-',
              extra: []
            };
            
            // Add key information if available
            if (nestedItem.table.key) {
              nestedStep.extra.push(`Using index: ${nestedItem.table.key}`);
            }
            
            // Add attached condition if available
            if (nestedItem.table.attached_condition) {
              nestedStep.extra.push(`Where: ${nestedItem.table.attached_condition}`);
            }
            
            // Add join type information if available
            if (nestedItem.table.access_type === 'ref' || nestedItem.table.access_type === 'eq_ref') {
              if (nestedItem.table.ref && Array.isArray(nestedItem.table.ref)) {
                nestedStep.extra.push(`Join using: ${nestedItem.table.ref.join(', ')}`);
              }
            }
            
            steps.push(nestedStep);
          }
        });
      }
      return steps;
    }
    
    // Process regular nested loops
    if (queryBlock.nested_loop && Array.isArray(queryBlock.nested_loop)) {
      queryBlock.nested_loop.forEach(nestedItem => {
        if (nestedItem.table) {
          const nestedStep = {
            id: steps.length + 1,
            level: level + 1,
            table: nestedItem.table.table_name || '-',
            type: nestedItem.table.access_type || '-',
            access: nestedItem.table.key || '-',
            rows: nestedItem.table.rows_examined_per_scan || '-',
            filtered: nestedItem.table.filtered || '',
            cost: nestedItem.table.cost_info?.prefix_cost || '-',
            extra: []
          };
          
          // Add key information if available
          if (nestedItem.table.key) {
            nestedStep.extra.push(`Using index: ${nestedItem.table.key}`);
          }
          
          // Add attached condition if available
          if (nestedItem.table.attached_condition) {
            nestedStep.extra.push(`Where: ${nestedItem.table.attached_condition}`);
          }
          
          // Add join type information if available
          if (nestedItem.table.access_type === 'ref' || nestedItem.table.access_type === 'eq_ref') {
            if (nestedItem.table.ref && Array.isArray(nestedItem.table.ref)) {
              nestedStep.extra.push(`Join using: ${nestedItem.table.ref.join(', ')}`);
            }
          }
          
          steps.push(nestedStep);
        }
      });
    }
    
    return steps;
  };
  
  const executionSteps = extractSteps(parsedData.query_block);
  
  if (executionSteps.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No execution steps found in the EXPLAIN plan
      </Typography>
    );
  }

  // Helper function to get color for access type
  const getAccessTypeColor = (type) => {
    switch (type?.toLowerCase()) {
      case 'const':
      case 'eq_ref':
        return 'success';
      case 'ref':
      case 'range':
      case 'index':
        return 'info';
      case 'all':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <TableContainer component={Paper} sx={{ maxHeight: 400, overflow: 'auto' }}>
      <Table stickyHeader size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5', width: '5%' }}>
              <Tooltip title="Unique identifier for each step in the execution plan">
                <span>ID</span>
              </Tooltip>
            </TableCell>
            <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5', width: '15%' }}>
              <Tooltip title="The table being accessed in this step">
                <span>Table</span>
              </Tooltip>
            </TableCell>
            <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5', width: '10%' }}>
              <Tooltip title="Access type indicates how MySQL accesses the table. 'ALL' means full table scan (worst), 'eq_ref' and 'const' are best.">
                <span>Type</span>
              </Tooltip>
            </TableCell>
            <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5', width: '10%' }}>
              <Tooltip title="The index being used for table access">
                <span>Access</span>
              </Tooltip>
            </TableCell>
            <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5', width: '10%' }}>
              <Tooltip title="Estimated number of rows MySQL will examine">
                <span>Rows</span>
              </Tooltip>
            </TableCell>
            <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5', width: '10%' }}>
              <Tooltip title="Percentage of rows that will be kept after filtering">
                <span>Filtered %</span>
              </Tooltip>
            </TableCell>
            <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5', width: '10%' }}>
              <Tooltip title="Estimated cost of the operation (lower is better)">
                <span>Cost</span>
              </Tooltip>
            </TableCell>
            <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5', width: '30%' }}>
              <Tooltip title="Additional information about how MySQL executes the query">
                <span>Extra</span>
              </Tooltip>
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {executionSteps.map((step) => (
            <TableRow key={step.id} hover>
              <TableCell>{step.id}</TableCell>
              <TableCell>
                <Box sx={{ 
                  pl: step.level * 2, 
                  display: 'flex', 
                  alignItems: 'center',
                  fontFamily: 'monospace'
                }}>
                  {step.level > 0 && (
                    <Box component="span" sx={{ color: 'text.secondary', mr: 1 }}>
                      └─
                    </Box>
                  )}
                  <Box component="span" sx={{ fontWeight: step.level === 0 ? 'bold' : 'normal' }}>
                    {step.table}
                  </Box>
                </Box>
              </TableCell>
              <TableCell>
                <Chip 
                  label={step.type} 
                  size="small" 
                  color={getAccessTypeColor(step.type)}
                  variant={step.type.toLowerCase() === 'all' ? 'filled' : 'outlined'}
                  sx={{ 
                    height: 24, 
                    fontSize: '0.75rem',
                    fontWeight: step.type.toLowerCase() === 'all' ? 'bold' : 'normal'
                  }}
                />
              </TableCell>
              <TableCell>{step.access}</TableCell>
              <TableCell>
                {typeof step.rows === 'number' ? step.rows.toLocaleString() : step.rows}
              </TableCell>
              <TableCell>
                {step.filtered && typeof step.filtered === 'number' 
                  ? `${step.filtered.toFixed(2)}%` 
                  : step.filtered}
              </TableCell>
              <TableCell>
                {typeof step.cost === 'number' ? step.cost.toFixed(2) : step.cost}
              </TableCell>
              <TableCell>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {step.extra.map((info, idx) => {
                    // Check if it contains certain keywords to determine color
                    const color = 
                      info.includes('Using temporary') || info.includes('Using filesort') 
                        ? 'warning'
                        : info.includes('Using index') 
                          ? 'success' 
                          : 'default';
                    
                    return (
                      <Chip 
                        key={idx} 
                        label={info} 
                        size="small" 
                        color={color}
                        variant="outlined"
                        sx={{ height: 20, fontSize: '0.7rem' }}
                      />
                    );
                  })}
                </Box>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default MySQLDecorator;
