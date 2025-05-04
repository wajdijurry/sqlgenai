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
  Chip,
  Divider,
  Card,
  CardContent,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import TableChartIcon from '@mui/icons-material/TableChart';
import IndexIcon from '@mui/icons-material/Bookmark';
import RecommendationIcon from '@mui/icons-material/Lightbulb';

/**
 * OracleDecorator - A specialized component for rendering Oracle explain plans
 * 
 * @param {Object} props - Component props
 * @param {Object} props.explainData - The Oracle explain plan data
 * @returns {JSX.Element} Rendered component
 */
const OracleDecorator = ({ explainData }) => {
  if (!explainData || !explainData.rows || explainData.rows.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No Oracle explain plan data available
      </Typography>
    );
  }

  const { columns, rows } = explainData;
  
  /**
   * Renders the new table statistics view
   * 
   * @param {Array} statRows - The rows containing table statistics data
   * @returns {JSX.Element} Rendered component
   */
  const renderTableStatisticsView = (statRows) => {
    // Group rows by section
    const sections = {};
    statRows.forEach(row => {
      const { section, info_type, details } = row;
      if (!sections[section]) {
        sections[section] = [];
      }
      sections[section].push({ info_type, details });
    });

    // Get the original query if available
    const queryAnalysis = sections['QUERY ANALYSIS'] || [];
    const originalQuery = queryAnalysis.find(item => item.info_type === 'Original Query')?.details || '';

    // Get table statistics
    const tableStats = sections['TABLE STATISTICS'] || [];
    
    // Get index information
    const indexInfo = sections['INDEX INFORMATION'] || [];
    
    // Get recommendations
    const recommendations = sections['RECOMMENDATIONS'] || [];

    return (
      <Box sx={{ width: '100%' }}>
        {/* Original Query */}
        {originalQuery && (
          <Card sx={{ mb: 2, bgcolor: '#f8f9fa' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <InfoIcon sx={{ mr: 1, verticalAlign: 'middle', color: 'primary.main' }} />
                Query Analysis
              </Typography>
              <Typography variant="body2" component="pre" sx={{ 
                whiteSpace: 'pre-wrap', 
                bgcolor: '#f5f5f5', 
                p: 2, 
                borderRadius: 1,
                fontFamily: 'monospace'
              }}>
                {originalQuery}
              </Typography>
            </CardContent>
          </Card>
        )}

        <Grid container spacing={2}>
          {/* Table Statistics */}
          {tableStats.length > 0 && (
            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    <TableChartIcon sx={{ mr: 1, verticalAlign: 'middle', color: 'primary.main' }} />
                    Table Statistics
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 'bold' }}>Table</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>Statistics</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {tableStats.map((stat, index) => (
                          <TableRow key={index}>
                            <TableCell sx={{ fontWeight: 'medium' }}>{stat.info_type}</TableCell>
                            <TableCell>{stat.details}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Index Information */}
          {indexInfo.length > 0 && (
            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    <IndexIcon sx={{ mr: 1, verticalAlign: 'middle', color: 'primary.main' }} />
                    Index Information
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 'bold' }}>Index</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>Details</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {indexInfo.map((idx, index) => (
                          <TableRow key={index}>
                            <TableCell sx={{ fontWeight: 'medium' }}>{idx.info_type}</TableCell>
                            <TableCell>{idx.details}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <Card sx={{ mt: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <RecommendationIcon sx={{ mr: 1, verticalAlign: 'middle', color: 'warning.main' }} />
                Recommendations
              </Typography>
              <List>
                {recommendations.map((rec, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <RecommendationIcon color="warning" />
                    </ListItemIcon>
                    <ListItemText 
                      primary={rec.info_type} 
                      secondary={rec.details} 
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        )}
      </Box>
    );
  };
  
  // Check if we have the new table statistics format
  const hasTableStatisticsFormat = columns.includes('section') && 
                                  columns.includes('info_type') && 
                                  columns.includes('details');

  // If we have the new format, render the statistics view
  if (hasTableStatisticsFormat) {
    return renderTableStatisticsView(rows);
  }
  
  // Otherwise, continue with the traditional execution plan view
  // Determine which columns to display based on what's available
  const hasOperation = columns.includes('OPERATION');
  const hasObjectName = columns.includes('OBJECT_NAME');
  const hasOptions = columns.includes('OPTIONS');
  const hasCost = columns.includes('COST');
  const hasCardinality = columns.includes('CARDINALITY');
  const hasId = columns.includes('ID');
  const hasParentId = columns.includes('PARENT_ID');
  const hasCpuCost = columns.includes('CPU_COST');
  const hasIoCost = columns.includes('IO_COST');
  const hasBytes = columns.includes('BYTES');
  const hasTimeEstimate = columns.includes('TIME');
  
  // Process the rows to extract indentation and structure
  const processedRows = rows.map((row, index) => {
    // Calculate indentation level based on parent-child relationships if available
    let indentLevel = 0;
    
    if (hasId && hasParentId) {
      const findParentLevel = (id, level = 0) => {
        if (!id) return level;
        const parentId = rows.find(r => r['ID'] === id)?.['PARENT_ID'];
        if (!parentId) return level;
        return findParentLevel(parentId, level + 1);
      };
      
      indentLevel = findParentLevel(row['ID']);
    }
    
    return {
      id: index + 1,
      rowId: row['ID'] || null,
      parentId: row['PARENT_ID'] || null,
      indentLevel,
      operation: row['OPERATION'] || '',
      objectName: row['OBJECT_NAME'] || '',
      options: row['OPTIONS'] || '',
      cost: row['COST'] || null,
      cardinality: row['CARDINALITY'] || null,
      cpuCost: row['CPU_COST'] || null,
      ioCost: row['IO_COST'] || null,
      bytes: row['BYTES'] || null,
      timeEstimate: row['TIME'] || null
    };
  });

  // Helper function to get color for operation type
  const getOperationColor = (op) => {
    const opLower = op.toLowerCase();
    if (opLower.includes('full') && opLower.includes('scan')) {
      return 'error'; // Full table scans are generally bad
    } else if (opLower.includes('index') && opLower.includes('scan')) {
      return 'success'; // Index scans are good
    } else if (opLower.includes('sort') || opLower.includes('hash')) {
      return 'warning'; // Sorts and hashes can be expensive
    }
    return 'default';
  };



  // Traditional execution plan view
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
            {hasId && (
              <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5', width: '5%' }}>
                <Tooltip title="ID in the execution plan">
                  <span>ID</span>
                </Tooltip>
              </TableCell>
            )}
            {hasOperation && (
              <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5', width: '20%' }}>
                <Tooltip title="The operation being performed">
                  <span>Operation</span>
                </Tooltip>
              </TableCell>
            )}
            {hasObjectName && (
              <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5', width: '15%' }}>
                <Tooltip title="The object being accessed (table, index, etc.)">
                  <span>Object</span>
                </Tooltip>
              </TableCell>
            )}
            {hasOptions && (
              <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5', width: '15%' }}>
                <Tooltip title="Additional options for the operation">
                  <span>Options</span>
                </Tooltip>
              </TableCell>
            )}
            {hasCardinality && (
              <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5', width: '10%' }}>
                <Tooltip title="Estimated number of rows this step will produce">
                  <span>Rows</span>
                </Tooltip>
              </TableCell>
            )}
            {hasCost && (
              <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5', width: '10%' }}>
                <Tooltip title="Estimated cost of this operation">
                  <span>Cost</span>
                </Tooltip>
              </TableCell>
            )}
            {(hasCpuCost || hasIoCost) && (
              <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5', width: '10%' }}>
                <Tooltip title="CPU and IO cost breakdown">
                  <span>CPU/IO</span>
                </Tooltip>
              </TableCell>
            )}
            {hasTimeEstimate && (
              <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5', width: '10%' }}>
                <Tooltip title="Estimated time for this operation">
                  <span>Time</span>
                </Tooltip>
              </TableCell>
            )}
          </TableRow>
        </TableHead>
        <TableBody>
          {processedRows.map((row) => (
            <TableRow key={row.id} hover>
              <TableCell>{row.id}</TableCell>
              {hasId && (
                <TableCell>{row.rowId}</TableCell>
              )}
              {hasOperation && (
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
                    <Chip 
                      label={row.operation} 
                      size="small" 
                      color={getOperationColor(row.operation)}
                      variant="outlined"
                      sx={{ height: 24, fontSize: '0.75rem' }}
                    />
                  </Box>
                </TableCell>
              )}
              {hasObjectName && (
                <TableCell>
                  <Typography variant="body2" sx={{ fontWeight: row.objectName ? 'medium' : 'normal' }}>
                    {row.objectName || '-'}
                  </Typography>
                </TableCell>
              )}
              {hasOptions && (
                <TableCell>{row.options || '-'}</TableCell>
              )}
              {hasCardinality && (
                <TableCell>
                  {row.cardinality !== null ? Number(row.cardinality).toLocaleString() : '-'}
                </TableCell>
              )}
              {hasCost && (
                <TableCell>
                  {row.cost !== null ? Number(row.cost).toLocaleString() : '-'}
                </TableCell>
              )}
              {(hasCpuCost || hasIoCost) && (
                <TableCell>
                  <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                    {row.cpuCost !== null && (
                      <Typography variant="caption">CPU: {Number(row.cpuCost).toLocaleString()}</Typography>
                    )}
                    {row.ioCost !== null && (
                      <Typography variant="caption">IO: {Number(row.ioCost).toLocaleString()}</Typography>
                    )}
                  </Box>
                </TableCell>
              )}
              {hasTimeEstimate && (
                <TableCell>
                  {row.timeEstimate !== null ? `${row.timeEstimate}s` : '-'}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default OracleDecorator;
