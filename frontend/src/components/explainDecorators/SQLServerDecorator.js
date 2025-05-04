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
 * SQLServerDecorator - A specialized component for rendering SQL Server execution plans
 * 
 * @param {Object} props - Component props
 * @param {Object} props.explainData - The SQL Server execution plan data
 * @returns {JSX.Element} Rendered component
 */
const SQLServerDecorator = ({ explainData }) => {
  if (!explainData || !explainData.rows || explainData.rows.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No SQL Server execution plan data available
      </Typography>
    );
  }

  const { columns, rows } = explainData;
  
  // Determine which columns to display based on what's available
  const hasStmtText = columns.includes('StmtText');
  const hasPhysicalOp = columns.includes('PhysicalOp');
  const hasLogicalOp = columns.includes('LogicalOp');
  const hasEstRows = columns.includes('EstimateRows');
  const hasCost = columns.includes('EstimateCost') || columns.includes('TotalSubtreeCost');
  const hasNodeId = columns.includes('NodeId');
  const hasParentId = columns.includes('ParentId');
  
  // Process the rows to extract indentation and structure
  const processedRows = rows.map((row, index) => {
    // Calculate indentation for StmtText if available
    let indentLevel = 0;
    let stmtText = '';
    
    if (hasStmtText) {
      stmtText = row['StmtText'] || '';
      const indentMatch = stmtText.match(/^(\|\-+)+/);
      indentLevel = indentMatch ? indentMatch[0].length / 2 : 0;
      stmtText = stmtText.replace(/^(\|\-+)+/, '').trim();
    } else if (hasNodeId && hasParentId) {
      // If we don't have StmtText with indentation markers, try to calculate based on parent-child relationships
      const findParentLevel = (id, level = 0) => {
        const parentId = rows.find(r => r['NodeId'] === id)?.['ParentId'];
        if (!parentId || parentId === 0) return level;
        return findParentLevel(parentId, level + 1);
      };
      indentLevel = findParentLevel(row['NodeId']);
    }
    
    return {
      id: index + 1,
      indentLevel,
      stmtText,
      physicalOp: row['PhysicalOp'] || '',
      logicalOp: row['LogicalOp'] || '',
      estimateRows: row['EstimateRows'] || null,
      estimateCost: row['EstimateCost'] || row['TotalSubtreeCost'] || null,
      actualRows: row['ActualRows'] || null,
      actualCost: row['ActualCost'] || null,
      nodeId: row['NodeId'] || null,
      parentId: row['ParentId'] || null,
      // Include any other relevant columns
      objectName: row['ObjectName'] || '',
      warnings: row['Warnings'] || ''
    };
  });

  // Helper function to get color for operation type
  const getOperationColor = (op) => {
    const opLower = op.toLowerCase();
    if (opLower.includes('scan') && !opLower.includes('index scan')) {
      return 'error'; // Table scans are bad
    } else if (opLower.includes('seek') || opLower.includes('index scan')) {
      return 'success'; // Index seeks are good
    } else if (opLower.includes('sort') || opLower.includes('hash')) {
      return 'warning'; // Sorts and hashes can be expensive
    }
    return 'default';
  };

  return (
    <TableContainer component={Paper} sx={{ maxHeight: 400, overflow: 'auto' }}>
      <Table stickyHeader size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5', width: '5%' }}>
              <Tooltip title="Step number in the execution plan">
                <span>Step</span>
              </Tooltip>
            </TableCell>
            {hasStmtText && (
              <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5', width: '30%' }}>
                <Tooltip title="The SQL statement or operation being performed">
                  <span>Operation</span>
                </Tooltip>
              </TableCell>
            )}
            {hasPhysicalOp && (
              <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5', width: '15%' }}>
                <Tooltip title="The physical operation performed by SQL Server">
                  <span>Physical Op</span>
                </Tooltip>
              </TableCell>
            )}
            {hasLogicalOp && (
              <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5', width: '15%' }}>
                <Tooltip title="The logical operation in the query plan">
                  <span>Logical Op</span>
                </Tooltip>
              </TableCell>
            )}
            {hasEstRows && (
              <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5', width: '10%' }}>
                <Tooltip title="Estimated number of rows this step will produce">
                  <span>Est. Rows</span>
                </Tooltip>
              </TableCell>
            )}
            {hasCost && (
              <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5', width: '10%' }}>
                <Tooltip title="Estimated cost of this operation (as a percentage of the total query cost)">
                  <span>Cost %</span>
                </Tooltip>
              </TableCell>
            )}
            <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5', width: '15%' }}>
              <Tooltip title="Object being accessed (table, index, etc.)">
                <span>Object</span>
              </Tooltip>
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {processedRows.map((row) => (
            <TableRow key={row.id} hover>
              <TableCell>{row.id}</TableCell>
              {hasStmtText && (
                <TableCell>
                  <Box sx={{ 
                    pl: row.indentLevel * 2, 
                    display: 'flex', 
                    alignItems: 'center',
                    fontFamily: 'monospace',
                    fontSize: '0.875rem'
                  }}>
                    {row.indentLevel > 0 && (
                      <Box component="span" sx={{ color: 'text.secondary', mr: 1 }}>
                        └─
                      </Box>
                    )}
                    <Box component="span">
                      {row.stmtText}
                    </Box>
                  </Box>
                </TableCell>
              )}
              {hasPhysicalOp && (
                <TableCell>
                  <Chip 
                    label={row.physicalOp} 
                    size="small" 
                    color={getOperationColor(row.physicalOp)}
                    variant="outlined"
                    sx={{ height: 24, fontSize: '0.75rem' }}
                  />
                </TableCell>
              )}
              {hasLogicalOp && (
                <TableCell>{row.logicalOp}</TableCell>
              )}
              {hasEstRows && (
                <TableCell>
                  {row.estimateRows !== null ? Number(row.estimateRows).toLocaleString() : '-'}
                </TableCell>
              )}
              {hasCost && (
                <TableCell>
                  {row.estimateCost !== null ? 
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center',
                      width: '100%' 
                    }}>
                      <Box 
                        sx={{ 
                          width: `${Math.min(Number(row.estimateCost) * 100, 100)}%`, 
                          height: '6px', 
                          bgcolor: Number(row.estimateCost) > 0.5 ? 'error.main' : 'primary.main',
                          borderRadius: '3px',
                          mr: 1
                        }} 
                      />
                      {(Number(row.estimateCost) * 100).toFixed(1)}%
                    </Box> : 
                    '-'
                  }
                </TableCell>
              )}
              <TableCell>
                {row.objectName || '-'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default SQLServerDecorator;
