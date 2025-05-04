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
  Divider
} from '@mui/material';

/**
 * PostgreSQLDecorator - A specialized component for rendering PostgreSQL explain plans
 * 
 * @param {Object} props - Component props
 * @param {Object} props.explainData - The PostgreSQL explain plan data
 * @returns {JSX.Element} Rendered component
 */
const PostgreSQLDecorator = ({ explainData }) => {
  if (!explainData || !explainData.rows || explainData.rows.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No PostgreSQL explain plan data available
      </Typography>
    );
  }

  /**
   * Renders a PostgreSQL explain plan in JSON format
   * @param {Object} explainData - The explain data
   * @returns {JSX.Element} The rendered component
   */
  const renderJsonExplainPlan = (explainData) => {
    // Extract the plan data
    let planData = null;
    
    if (explainData.explain_data && explainData.explain_data.data && explainData.explain_data.data.length > 0) {
      const queryPlan = explainData.explain_data.data[0]['QUERY PLAN'];
      if (Array.isArray(queryPlan) && queryPlan.length > 0 && queryPlan[0].Plan) {
        planData = queryPlan[0];
      }
    } else if (explainData.rows && explainData.rows.length > 0) {
      const queryPlan = explainData.rows[0]['QUERY PLAN'];
      if (Array.isArray(queryPlan) && queryPlan.length > 0 && queryPlan[0].Plan) {
        planData = queryPlan[0];
      }
    }
    
    if (!planData || !planData.Plan) {
      return (
        <Typography variant="body2" color="text.secondary">
          Unable to parse PostgreSQL JSON explain plan data
        </Typography>
      );
    }
    
    // Extract execution statistics
    const executionTime = planData['Execution Time'] || null;
    const planningTime = planData['Planning Time'] || null;
    
    // Process the plan nodes recursively
    const processedNodes = [];
    
    const processNode = (node, level = 0, parentNode = null) => {
      const nodeInfo = {
        id: processedNodes.length + 1,
        level,
        nodeType: node['Node Type'] || '',
        relation: node['Relation Name'] || '',
        alias: node['Alias'] || '',
        startupCost: node['Startup Cost'] || null,
        totalCost: node['Total Cost'] || null,
        planRows: node['Plan Rows'] || null,
        planWidth: node['Plan Width'] || null,
        actualStartupTime: node['Actual Startup Time'] || null,
        actualTotalTime: node['Actual Total Time'] || null,
        actualRows: node['Actual Rows'] || null,
        actualLoops: node['Actual Loops'] || null,
        parentRelationship: node['Parent Relationship'] || '',
        joinType: node['Join Type'] || '',
        indexName: node['Index Name'] || '',
        indexCond: node['Index Cond'] || '',
        filterCond: node['Filter'] || '',
        scanDirection: node['Scan Direction'] || '',
        sharedHitBlocks: node['Shared Hit Blocks'] || null,
        sharedReadBlocks: node['Shared Read Blocks'] || null,
        parentNode
      };
      
      processedNodes.push(nodeInfo);
      
      // Process child nodes
      if (node.Plans && Array.isArray(node.Plans)) {
        node.Plans.forEach(childNode => {
          processNode(childNode, level + 1, nodeInfo);
        });
      }
      
      return nodeInfo;
    };
    
    // Start processing from the root node
    processNode(planData.Plan);
    
    // Get color for node type
    const getNodeTypeColor = (nodeType) => {
      const type = nodeType.toLowerCase();
      if (type.includes('scan') && !type.includes('index scan')) {
        return 'error'; // Sequential scans are generally bad
      } else if (type.includes('index') || type.includes('seek')) {
        return 'success'; // Index operations are generally good
      } else if (type.includes('sort') || type.includes('hash')) {
        return 'warning'; // Sorts and hashes can be expensive
      } else if (type.includes('aggregate') || type.includes('join')) {
        return 'info'; // Aggregates and joins are normal operations
      }
      return 'default';
    };
    
    return (
      <Box>
        {/* Summary statistics */}
        <Box sx={{ mb: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Typography variant="subtitle2">Execution Statistics:</Typography>
            {executionTime !== null && (
              <Chip 
                label={`Execution: ${executionTime.toFixed(3)} ms`} 
                color="primary" 
                size="small" 
                variant="outlined" 
              />
            )}
            {planningTime !== null && (
              <Chip 
                label={`Planning: ${planningTime.toFixed(3)} ms`} 
                color="secondary" 
                size="small" 
                variant="outlined" 
              />
            )}
          </Box>
        </Box>
        
        <Divider sx={{ mb: 2 }} />
        
        {/* Plan nodes table */}
        <TableContainer component={Paper} sx={{ maxHeight: 500, overflow: 'auto' }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5', width: '5%' }}>
                  <Tooltip title="Step number in the execution plan">
                    <span>Step</span>
                  </Tooltip>
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5', width: '25%' }}>
                  <Tooltip title="The operation being performed">
                    <span>Operation</span>
                  </Tooltip>
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5', width: '15%' }}>
                  <Tooltip title="The object being accessed (table, index)">
                    <span>Object</span>
                  </Tooltip>
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5', width: '15%' }}>
                  <Tooltip title="Estimated cost (startup..total)">
                    <span>Est. Cost</span>
                  </Tooltip>
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5', width: '10%' }}>
                  <Tooltip title="Estimated number of rows">
                    <span>Est. Rows</span>
                  </Tooltip>
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5', width: '15%' }}>
                  <Tooltip title="Actual execution time (startup..total)">
                    <span>Actual Time</span>
                  </Tooltip>
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5', width: '10%' }}>
                  <Tooltip title="Actual number of rows">
                    <span>Actual Rows</span>
                  </Tooltip>
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5', width: '5%' }}>
                  <Tooltip title="Number of times this node was executed">
                    <span>Loops</span>
                  </Tooltip>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {processedNodes.map((node) => (
                <TableRow key={node.id} hover>
                  <TableCell>{node.id}</TableCell>
                  <TableCell>
                    <Box sx={{ 
                      pl: node.level * 2, 
                      display: 'flex', 
                      alignItems: 'center',
                      fontFamily: 'monospace',
                      fontSize: '0.875rem'
                    }}>
                      {node.level > 0 && (
                        <Box component="span" sx={{ color: 'text.secondary', mr: 1 }}>
                          └─
                        </Box>
                      )}
                      <Chip 
                        label={node.nodeType} 
                        size="small" 
                        color={getNodeTypeColor(node.nodeType)}
                        variant="outlined"
                        sx={{ height: 24, fontSize: '0.75rem' }}
                      />
                      {node.joinType && (
                        <Typography variant="caption" sx={{ ml: 1 }}>
                          ({node.joinType} Join)
                        </Typography>
                      )}
                      {node.parentRelationship && (
                        <Typography variant="caption" sx={{ ml: 1, color: 'text.secondary' }}>
                          [{node.parentRelationship}]
                        </Typography>
                      )}
                    </Box>
                    {node.indexCond && (
                      <Box sx={{ pl: (node.level * 2) + 4, mt: 0.5, fontSize: '0.75rem', color: 'text.secondary' }}>
                        Condition: {node.indexCond}
                      </Box>
                    )}
                    {node.filterCond && (
                      <Box sx={{ pl: (node.level * 2) + 4, mt: 0.5, fontSize: '0.75rem', color: 'text.secondary' }}>
                        Filter: {node.filterCond}
                      </Box>
                    )}
                  </TableCell>
                  <TableCell>
                    {node.relation && (
                      <Box sx={{ fontWeight: 'medium', color: 'primary.main' }}>
                        {node.relation}
                        {node.alias && node.alias !== node.relation && (
                          <Typography variant="caption" sx={{ ml: 0.5, color: 'text.secondary' }}>
                            ({node.alias})
                          </Typography>
                        )}
                      </Box>
                    )}
                    {node.indexName && (
                      <Box sx={{ color: 'secondary.main', fontSize: '0.875rem' }}>
                        {node.indexName}
                      </Box>
                    )}
                  </TableCell>
                  <TableCell>
                    {node.startupCost !== null && node.totalCost !== null ? (
                      <Box>
                        <Typography variant="body2">
                          {node.startupCost.toFixed(2)} → {node.totalCost.toFixed(2)}
                        </Typography>
                      </Box>
                    ) : '-'}
                  </TableCell>
                  <TableCell>
                    {node.planRows !== null ? node.planRows.toLocaleString() : '-'}
                  </TableCell>
                  <TableCell>
                    {node.actualStartupTime !== null && node.actualTotalTime !== null ? (
                      <Box>
                        <Typography variant="body2">
                          {node.actualStartupTime.toFixed(3)} → {node.actualTotalTime.toFixed(3)}
                        </Typography>
                      </Box>
                    ) : '-'}
                  </TableCell>
                  <TableCell>
                    {node.actualRows !== null ? node.actualRows.toLocaleString() : '-'}
                  </TableCell>
                  <TableCell>
                    {node.actualLoops !== null ? node.actualLoops : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    );
  };
  
  // Check if we have JSON format explain data
  const hasJsonFormat = explainData.explain_data && 
                       explainData.explain_data.format === 'postgresql' && 
                       explainData.explain_data.data && 
                       explainData.explain_data.data.length > 0;
  
  // If we have JSON format, use that
  if (hasJsonFormat) {
    return renderJsonExplainPlan(explainData);
  }
  
  // Otherwise, check if we have JSON in rows
  const rows = explainData.rows || [];
  if (rows.length > 0 && rows[0]['QUERY PLAN'] && typeof rows[0]['QUERY PLAN'] === 'object') {
    return renderJsonExplainPlan(explainData);
  }
  
  // Fallback to text format
  const columns = explainData.columns || [];
  const planColumn = columns.find(col => col === 'QUERY PLAN') || 
                    columns.find(col => col.toLowerCase().includes('plan')) || 
                    columns[0];
  
  // Process the plan data to extract structured information for text format
  const processedRows = rows.map((row, index) => {
    // Ensure planText is a string and handle different data types
    let planText = '';
    if (row[planColumn] !== undefined && row[planColumn] !== null) {
      if (typeof row[planColumn] === 'string') {
        planText = row[planColumn];
      } else if (typeof row[planColumn] === 'object') {
        // If it's an object, try to convert it to a string representation
        try {
          planText = JSON.stringify(row[planColumn]);
        } catch (e) {
          console.error('Error converting plan object to string:', e);
          planText = String(row[planColumn]);
        }
      } else {
        // For other types (number, boolean, etc.), convert to string
        planText = String(row[planColumn]);
      }
    }
    
    // Calculate indentation level based on leading spaces
    let indentLevel = 0;
    let cleanText = planText;
    
    try {
      const indentMatch = planText.match(/^(\s*)/);
      indentLevel = indentMatch ? indentMatch[0].length / 2 : 0;
      
      // Remove leading spaces for display
      cleanText = planText.trimStart();
    } catch (e) {
      console.error('Error processing plan text:', e);
    }
    
    // Initialize variables with default values
    let costMatch = null;
    let rowsMatch = null;
    let widthMatch = null;
    let actualTimeMatch = null;
    let actualRowsMatch = null;
    let loopsMatch = null;
    let operationTypeMatch = null;
    let tableNameMatch = null;
    let indexNameMatch = null;
    let filterMatch = null;
    
    try {
      // Extract cost and rows information using regex
      costMatch = cleanText.match(/\(cost=([\d\.]+)\.\.([\d\.]+)/);
      rowsMatch = cleanText.match(/rows=([\d]+)/);
      widthMatch = cleanText.match(/width=([\d]+)/);
      actualTimeMatch = cleanText.match(/actual time=([\d\.]+)\.\.([\d\.]+)/);
      actualRowsMatch = cleanText.match(/actual rows=([\d]+)/);
      loopsMatch = cleanText.match(/loops=([\d]+)/);
      
      // Extract operation type (e.g., "Seq Scan", "Index Scan", etc.)
      operationTypeMatch = cleanText.match(/^([A-Za-z\s]+)(?:\son|:|\()/);
      
      // Extract table name if present
      tableNameMatch = cleanText.match(/on\s+([^\s]+)/);
      
      // Extract index name if present
      indexNameMatch = cleanText.match(/using\s+([^\s]+)/i);
      
      // Extract filter conditions
      filterMatch = cleanText.match(/Filter:\s+(.+?)(?:\s+\(|$)/);
    } catch (e) {
      console.error('Error extracting information from plan text:', e);
    }
    
    const operationType = operationTypeMatch ? operationTypeMatch[1].trim() : '';
    const tableName = tableNameMatch ? tableNameMatch[1] : '';
    const indexName = indexNameMatch ? indexNameMatch[1] : '';
    const filter = filterMatch ? filterMatch[1] : '';
    
    // Build a structured object with all the extracted information
    return {
      id: index + 1,
      indentLevel,
      rawText: cleanText,
      operationType,
      tableName,
      indexName,
      filter,
      startCost: costMatch ? parseFloat(costMatch[1]) : null,
      totalCost: costMatch ? parseFloat(costMatch[2]) : null,
      estimatedRows: rowsMatch ? parseInt(rowsMatch[1]) : null,
      width: widthMatch ? parseInt(widthMatch[1]) : null,
      actualStartTime: actualTimeMatch ? parseFloat(actualTimeMatch[1]) : null,
      actualTotalTime: actualTimeMatch ? parseFloat(actualTimeMatch[2]) : null,
      actualRows: actualRowsMatch ? parseInt(actualRowsMatch[1]) : null,
      loops: loopsMatch ? parseInt(loopsMatch[1]) : null
    };
  });

  // Determine if we have actual execution statistics
  const hasActualStats = processedRows.some(row => row.actualRows !== null);

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
            <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5', width: '40%' }}>
              <Tooltip title="The operation being performed">
                <span>Operation</span>
              </Tooltip>
            </TableCell>
            <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5', width: '15%' }}>
              <Tooltip title="Estimated cost (startup..total)">
                <span>Cost</span>
              </Tooltip>
            </TableCell>
            <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5', width: '10%' }}>
              <Tooltip title="Estimated number of rows this step will produce">
                <span>Est. Rows</span>
              </Tooltip>
            </TableCell>
            {hasActualStats && (
              <>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5', width: '15%' }}>
                  <Tooltip title="Actual execution time (startup..total)">
                    <span>Actual Time</span>
                  </Tooltip>
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5', width: '10%' }}>
                  <Tooltip title="Actual number of rows this step produced">
                    <span>Actual Rows</span>
                  </Tooltip>
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5', width: '5%' }}>
                  <Tooltip title="Number of times this node was executed">
                    <span>Loops</span>
                  </Tooltip>
                </TableCell>
              </>
            )}
          </TableRow>
        </TableHead>
        <TableBody>
          {processedRows.map((row) => (
            <TableRow key={row.id} hover>
              <TableCell>{row.id}</TableCell>
              <TableCell>
                <Box sx={{ 
                  pl: row.indentLevel * 2.5, 
                  display: 'flex',
                  alignItems: 'center',
                  fontFamily: 'monospace',
                  fontSize: '0.875rem',
                  lineHeight: '1.5'
                }}>
                  {row.indentLevel > 0 && (
                    <Box component="span" sx={{ 
                      color: 'text.secondary',
                      mr: 1,
                      fontSize: '1.2rem',
                      lineHeight: 1
                    }}>
                      └─
                    </Box>
                  )}
                  <Box>
                    <Box component="span" sx={{ fontWeight: 'bold' }}>
                      {row.operationType}
                    </Box>
                    {row.tableName && (
                      <Box component="span">
                        {' on '}
                        <Box component="span" sx={{ color: 'primary.main' }}>
                          {row.tableName}
                        </Box>
                      </Box>
                    )}
                    {row.indexName && (
                      <Box component="span">
                        {' using '}
                        <Box component="span" sx={{ color: 'secondary.main' }}>
                          {row.indexName}
                        </Box>
                      </Box>
                    )}
                    {row.filter && (
                      <Box sx={{ mt: 0.5, fontSize: '0.8rem', color: 'text.secondary' }}>
                        Filter: {row.filter}
                      </Box>
                    )}
                  </Box>
                </Box>
              </TableCell>
              <TableCell>
                {row.startCost !== null && row.totalCost !== null ? (
                  <Tooltip title="Startup cost..Total cost">
                    <span>{row.startCost.toFixed(2)} → {row.totalCost.toFixed(2)}</span>
                  </Tooltip>
                ) : '-'}
              </TableCell>
              <TableCell>
                {row.estimatedRows !== null ? row.estimatedRows.toLocaleString() : '-'}
              </TableCell>
              {hasActualStats && (
                <>
                  <TableCell>
                    {row.actualStartTime !== null && row.actualTotalTime !== null ? (
                      <Tooltip title="Actual startup time..Total time (ms)">
                        <span>{row.actualStartTime.toFixed(3)} → {row.actualTotalTime.toFixed(3)}</span>
                      </Tooltip>
                    ) : '-'}
                  </TableCell>
                  <TableCell>
                    {row.actualRows !== null ? row.actualRows.toLocaleString() : '-'}
                  </TableCell>
                  <TableCell>
                    {row.loops !== null ? row.loops : '-'}
                  </TableCell>
                </>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default PostgreSQLDecorator;
