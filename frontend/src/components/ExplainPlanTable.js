import React, { useState } from 'react';
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
  Button,
  Tooltip,
  IconButton,
  Tabs,
  Tab
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import { 
  detectDatabaseType, 
  getDecoratorForDbType
} from './explainDecorators';
import { getHelpPanelForDbType } from './explainHelp';

const ExplainPlanTable = ({ explainData, title }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showHelp, setShowHelp] = useState(() => {
    // Try to get the saved state from localStorage
    const savedState = localStorage.getItem('explainPlanShowHelp');
    return savedState === 'true';
  });
  const [viewMode, setViewMode] = useState('decorated'); // 'decorated', 'json'
  
  // Detect database type
  const dbType = detectDatabaseType(explainData);
  const DecoratorComponent = getDecoratorForDbType(dbType);

  if (!explainData || !explainData.columns || !explainData.rows) {
    return (
      <Typography variant="body2" color="text.secondary">
        No explain plan data available
      </Typography>
    );
  }

  const { columns, rows } = explainData;

  // Help panel for explain plan information
  const renderHelpPanel = () => {
    if (!showHelp) return null;
    
    // Get the appropriate help panel component based on database type
    const HelpPanelComponent = getHelpPanelForDbType(dbType);
    return <HelpPanelComponent />;
  };

  // Function to export as JSON
  const exportAsJson = () => {
    const jsonData = JSON.stringify(explainData, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'explain_plan.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Function to export as CSV
  const exportAsCsv = () => {
    // Handle special case for MySQL EXPLAIN which often has a single column with JSON
    if (columns.length === 1 && columns[0] === 'EXPLAIN' && rows.length > 0) {
      try {
        // Try to parse the EXPLAIN JSON if it's a string
        const firstRow = rows[0];
        const explainContent = firstRow['EXPLAIN'];
        
        if (typeof explainContent === 'string') {
          try {
            // Try to parse the JSON string
            const parsedExplain = JSON.parse(explainContent);
            
            // Extract fields from the parsed JSON to create a flattened CSV
            const flattenedData = flattenExplainJson(parsedExplain);
            if (flattenedData.length > 0) {
              // Get all unique keys from the flattened data
              const allKeys = new Set();
              flattenedData.forEach(item => {
                Object.keys(item).forEach(key => allKeys.add(key));
              });
              
              const csvColumns = Array.from(allKeys);
              let csv = csvColumns.join(',') + '\n';
              
              // Add rows
              flattenedData.forEach(item => {
                const rowValues = csvColumns.map(col => {
                  const value = item[col] !== undefined && item[col] !== null ? 
                    item[col].toString() : '';
                  return value.includes(',') ? `"${value}"` : value;
                });
                csv += rowValues.join(',') + '\n';
              });
              
              // Create and download the CSV file
              const blob = new Blob([csv], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = 'explain_plan.csv';
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              return;
            }
          } catch (e) {
            console.error('Error parsing EXPLAIN JSON:', e);
            // Fall back to standard CSV export if JSON parsing fails
          }
        }
      } catch (e) {
        console.error('Error processing EXPLAIN data:', e);
      }
    }
    
    // Standard CSV export for regular tabular data
    let csv = columns.join(',') + '\n';
    
    // Add rows
    rows.forEach(row => {
      const rowValues = columns.map(col => {
        // Handle values with commas by quoting them
        const value = row[col] !== null && row[col] !== undefined ? 
          row[col].toString() : '';
        // Escape quotes in the value and wrap with quotes if it contains commas or quotes
        const needsQuotes = value.includes(',') || value.includes('"') || value.includes('\n');
        const escapedValue = value.replace(/"/g, '""');
        return needsQuotes ? `"${escapedValue}"` : value;
      });
      csv += rowValues.join(',') + '\n';
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'explain_plan.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper function to flatten nested JSON for CSV export
  const flattenExplainJson = (explainData) => {
    if (!explainData) return [];
    
    // Handle different explain plan formats
    if (Array.isArray(explainData)) {
      return explainData;
    }
    
    // Handle MySQL JSON format which often has a query_block
    if (explainData.query_block) {
      const result = [];
      const processBlock = (block, parentPrefix = '') => {
        const flatItem = {};
        
        // Process simple properties
        Object.entries(block).forEach(([key, value]) => {
          if (typeof value !== 'object' || value === null) {
            flatItem[`${parentPrefix}${key}`] = value;
          }
        });
        
        result.push(flatItem);
        
        // Process nested blocks like nested_loop, table, etc.
        Object.entries(block).forEach(([key, value]) => {
          if (typeof value === 'object' && value !== null) {
            if (Array.isArray(value)) {
              value.forEach((item, index) => {
                processBlock(item, `${parentPrefix}${key}_${index}_`);
              });
            } else if (key !== 'cost_info') { // Skip cost_info to avoid too much nesting
              processBlock(value, `${parentPrefix}${key}_`);
            }
          }
        });
      };
      
      processBlock(explainData.query_block);
      return result;
    }
    
    // Default case - just return the object as a single row
    return [explainData];
  };

  // Function to format cell content for display
  const formatCellContent = (content) => {
    if (content === null || content === undefined) {
      return '-';
    }
    
    if (typeof content === 'object') {
      return JSON.stringify(content);
    }
    
    return content.toString();
  };

  // Render decorated view using the appropriate decorator
  const renderDecoratedView = () => {
    if (DecoratorComponent) {
      return <DecoratorComponent explainData={explainData} />;
    } else {
      return (
        <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
          No specialized decorator available for {dbType} database type. Using raw table view instead.
        </Typography>
      );
    }
  };
  
  // Render raw table view
  const renderRawTable = () => {
    if (!explainData || !explainData.columns || !explainData.rows) {
      return (
        <Typography variant="body2" color="text.secondary">
          No explain plan data available
        </Typography>
      );
    }
    
    const { columns, rows } = explainData;
    
    if (rows.length === 0) {
      return (
        <Typography variant="body2" color="text.secondary">
          No rows in explain plan data
        </Typography>
      );
    }
    
    // Default table rendering for regular tabular data
    return (
      <TableContainer component={Paper} sx={{ maxHeight: 400, overflow: 'auto' }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              {columns.map((column, index) => (
                <TableCell key={index} sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>
                  {column}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, rowIndex) => (
              <TableRow key={rowIndex} hover>
                {columns.map((column, colIndex) => (
                  <TableCell key={`${rowIndex}-${colIndex}`}>
                    {formatCellContent(row[column])}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  // Render a structured table for PostgreSQL EXPLAIN output
  const renderPostgreSQLExplainTable = (rows, columns) => {
    // PostgreSQL EXPLAIN typically has a 'QUERY PLAN' column with indented text
    const planColumn = columns.find(col => col === 'QUERY PLAN') || 
                      columns.find(col => col.toLowerCase().includes('plan')) || 
                      columns[0];
    
    return (
      <TableContainer component={Paper} sx={{ maxHeight: 400, overflow: 'auto' }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>Step</TableCell>
              <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>Operation</TableCell>
              <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>Estimated Cost</TableCell>
              <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>Estimated Rows</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, index) => {
              const planText = row[planColumn] || '';
              // Calculate indentation level based on leading spaces
              const indentMatch = planText.match(/^(\s*)/);
              const indentLevel = indentMatch ? indentMatch[0].length / 2 : 0;
              // Remove leading spaces for display
              const cleanText = planText.trimStart();
              
              // Extract cost and rows information using regex
              const costMatch = cleanText.match(/\(cost=([\d\.]+)\.\.([\d\.]+)/);
              const rowsMatch = cleanText.match(/rows=([\d]+)/);
              
              const startCost = costMatch ? costMatch[1] : '-';
              const totalCost = costMatch ? costMatch[2] : '-';
              const estimatedRows = rowsMatch ? rowsMatch[1] : '-';
              
              // Remove cost and rows info from the operation text for cleaner display
              let operationText = cleanText;
              if (costMatch) {
                operationText = operationText.replace(/\(cost=[\d\.]+\.\.([\d\.]+)[^\)]*\)/, '');
              }

              return (
                <TableRow key={index} hover>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>
                    <div style={{ 
                      paddingLeft: `${indentLevel * 20}px`,
                      fontFamily: 'monospace',
                      display: 'flex',
                      alignItems: 'center'
                    }}>
                      {indentLevel > 0 && '└─ '}
                      {operationText.trim()}
                    </div>
                  </TableCell>
                  <TableCell>{startCost} → {totalCost}</TableCell>
                  <TableCell>{estimatedRows}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  // Render a structured table for SQL Server execution plan format
  const renderSQLServerExplainTable = (rows, columns) => {
    // Determine which columns to display based on what's available
    const hasStmtText = columns.includes('StmtText');
    const hasPhysicalOp = columns.includes('PhysicalOp');
    const hasLogicalOp = columns.includes('LogicalOp');
    const hasEstRows = columns.includes('EstimateRows');
    const hasCost = columns.includes('EstimateCost') || columns.includes('TotalSubtreeCost');
    
    return (
      <TableContainer component={Paper} sx={{ maxHeight: 400, overflow: 'auto' }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>Step</TableCell>
              {hasStmtText && (
                <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>Operation</TableCell>
              )}
              {hasPhysicalOp && (
                <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>Physical Op</TableCell>
              )}
              {hasLogicalOp && (
                <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>Logical Op</TableCell>
              )}
              {hasEstRows && (
                <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>Est. Rows</TableCell>
              )}
              {hasCost && (
                <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>Cost</TableCell>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, index) => {
              // Calculate indentation for StmtText if available
              let indentLevel = 0;
              let stmtText = '';
              
              if (hasStmtText) {
                stmtText = row['StmtText'] || '';
                const indentMatch = stmtText.match(/^(\|\-+)+/);
                indentLevel = indentMatch ? indentMatch[0].length / 2 : 0;
                stmtText = stmtText.replace(/^(\|\-+)+/, '').trim();
              }
              
              return (
                <TableRow key={index} hover>
                  <TableCell>{index + 1}</TableCell>
                  {hasStmtText && (
                    <TableCell>
                      <div style={{ 
                        paddingLeft: `${indentLevel * 15}px`,
                        fontFamily: 'monospace',
                        display: 'flex',
                        alignItems: 'center'
                      }}>
                        {indentLevel > 0 && '└─ '}
                        {stmtText}
                      </div>
                    </TableCell>
                  )}
                  {hasPhysicalOp && (
                    <TableCell>{row['PhysicalOp'] || '-'}</TableCell>
                  )}
                  {hasLogicalOp && (
                    <TableCell>{row['LogicalOp'] || '-'}</TableCell>
                  )}
                  {hasEstRows && (
                    <TableCell>{row['EstimateRows'] || '-'}</TableCell>
                  )}
                  {hasCost && (
                    <TableCell>
                      {row['EstimateCost'] || row['TotalSubtreeCost'] || '-'}
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  // Render a structured table specifically for MySQL EXPLAIN output
  const renderMySQLExplainTable = (parsedExplain) => {
    // Handle the case where parsedExplain might be a string
    if (typeof parsedExplain === 'string') {
      try {
        parsedExplain = JSON.parse(parsedExplain);
      } catch (e) {
        console.error('Error parsing MySQL EXPLAIN JSON string:', e);
        return (
          <Typography variant="body2" color="text.secondary">
            Unable to parse MySQL EXPLAIN data (invalid JSON string)
          </Typography>
        );
      }
    }

    if (!parsedExplain || !parsedExplain.query_block) {
      return (
        <Typography variant="body2" color="text.secondary">
          Unable to parse MySQL EXPLAIN data (missing query_block)
        </Typography>
      );
    }
    
    // For MySQL EXPLAIN, we'll create a more structured view with the most important columns
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
            
            // Add join type information if available
            if (nestedItem.table.access_type === 'ref') {
              nestedStep.extra.push(`Join type: ${nestedItem.table.ref || 'ref'}`);
            }
            
            steps.push(nestedStep);
          }
        });
      }
      
      return steps;
    };
    
    const executionSteps = extractSteps(parsedExplain.query_block);
    
    if (executionSteps.length === 0) {
      return (
        <Typography variant="body2" color="text.secondary">
          No execution steps found in the EXPLAIN plan
        </Typography>
      );
    }
    
    return (
      <TableContainer component={Paper} sx={{ maxHeight: 400, overflow: 'auto' }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5', width: '5%' }}>
                <Tooltip title="Unique identifier for each step in the execution plan">
                  <span style={{ cursor: 'help' }}>ID</span>
                </Tooltip>
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5', width: '15%' }}>
                <Tooltip title="The table being accessed in this step">
                  <span style={{ cursor: 'help' }}>Table</span>
                </Tooltip>
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5', width: '10%' }}>
                <Tooltip title="Access type indicates how MySQL accesses the table. 'ALL' means full table scan (worst), 'eq_ref' and 'const' are best.">
                  <span style={{ cursor: 'help' }}>Type</span>
                </Tooltip>
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5', width: '10%' }}>
                <Tooltip title="The index being used for table access">
                  <span style={{ cursor: 'help' }}>Access</span>
                </Tooltip>
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5', width: '10%' }}>
                <Tooltip title="Estimated number of rows MySQL will examine">
                  <span style={{ cursor: 'help' }}>Rows</span>
                </Tooltip>
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5', width: '10%' }}>
                <Tooltip title="Percentage of rows that will be kept after filtering">
                  <span style={{ cursor: 'help' }}>Filtered %</span>
                </Tooltip>
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5', width: '10%' }}>
                <Tooltip title="Estimated cost of the operation (lower is better)">
                  <span style={{ cursor: 'help' }}>Cost</span>
                </Tooltip>
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5', width: '30%' }}>
                <Tooltip title="Additional information about how MySQL executes the query">
                  <span style={{ cursor: 'help' }}>Extra</span>
                </Tooltip>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {executionSteps.map((step) => (
              <TableRow key={step.id} hover>
                <TableCell>{step.id}</TableCell>
                <TableCell>
                  <div style={{ paddingLeft: `${step.level * 20}px`, display: 'flex', alignItems: 'center' }}>
                    {step.level > 0 && '└─ '}
                    {step.table}
                  </div>
                </TableCell>
                <TableCell>{step.type}</TableCell>
                <TableCell>{step.access}</TableCell>
                <TableCell>{step.rows}</TableCell>
                <TableCell>{step.filtered}</TableCell>
                <TableCell>{step.cost}</TableCell>
                <TableCell>{step.extra.join(', ')}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };
  
  // Render a structured table for Oracle EXPLAIN PLAN output
  const renderOracleExplainTable = (rows, columns) => {
    // Determine which columns to display based on what's available
    const hasOperation = columns.includes('OPERATION');
    const hasObjectName = columns.includes('OBJECT_NAME');
    const hasOptions = columns.includes('OPTIONS');
    const hasCost = columns.includes('COST');
    const hasCardinality = columns.includes('CARDINALITY');
    const hasId = columns.includes('ID');
    const hasParentId = columns.includes('PARENT_ID');
    
    return (
      <TableContainer component={Paper} sx={{ maxHeight: 400, overflow: 'auto' }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>Step</TableCell>
              {hasId && (
                <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>ID</TableCell>
              )}
              {hasOperation && (
                <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>Operation</TableCell>
              )}
              {hasObjectName && (
                <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>Object Name</TableCell>
              )}
              {hasOptions && (
                <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>Options</TableCell>
              )}
              {hasCardinality && (
                <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>Rows</TableCell>
              )}
              {hasCost && (
                <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>Cost</TableCell>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, index) => {
              // Calculate indentation level based on parent-child relationships if available
              let indentLevel = 0;
              if (hasId && hasParentId) {
                const findParentLevel = (id, level = 0) => {
                  const parentId = rows.find(r => r['ID'] === id)?.['PARENT_ID'];
                  if (!parentId) return level;
                  return findParentLevel(parentId, level + 1);
                };
                indentLevel = findParentLevel(row['ID']);
              }
              
              return (
                <TableRow key={index} hover>
                  <TableCell>{index + 1}</TableCell>
                  {hasId && (
                    <TableCell>{row['ID'] || '-'}</TableCell>
                  )}
                  {hasOperation && (
                    <TableCell>
                      <div style={{ 
                        paddingLeft: `${indentLevel * 20}px`,
                        display: 'flex',
                        alignItems: 'center'
                      }}>
                        {indentLevel > 0 && '└─ '}
                        {row['OPERATION'] || '-'}
                      </div>
                    </TableCell>
                  )}
                  {hasObjectName && (
                    <TableCell>{row['OBJECT_NAME'] || '-'}</TableCell>
                  )}
                  {hasOptions && (
                    <TableCell>{row['OPTIONS'] || '-'}</TableCell>
                  )}
                  {hasCardinality && (
                    <TableCell>{row['CARDINALITY'] || '-'}</TableCell>
                  )}
                  {hasCost && (
                    <TableCell>
                      {row['COST'] || '-'}
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  // Handle fullscreen toggle
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Handle export
  const handleExport = (format) => {
    if (format === 'json') {
      exportAsJson();
    } else if (format === 'csv') {
      exportAsCsv();
    }
  };

  // Render JSON view of the explain plan
  const renderJsonView = () => {
    const jsonString = JSON.stringify(explainData, null, 2);
    return (
      <Box sx={{ 
        maxHeight: 400, 
        overflow: 'auto', 
        bgcolor: '#f5f5f5',
        p: 2,
        borderRadius: 1,
        fontFamily: 'monospace',
        fontSize: '0.875rem',
        whiteSpace: 'pre-wrap'
      }}>
        {jsonString}
      </Box>
    );
  };

  // Default table rendering for regular tabular data
  const renderDefaultTable = () => {
    const { columns, rows } = explainData;
    
    return (
      <TableContainer component={Paper} sx={{ maxHeight: 400, overflow: 'auto' }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              {columns.map((column, index) => (
                <TableCell key={index} sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>
                  {column}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, rowIndex) => (
              <TableRow key={rowIndex} hover>
                {columns.map((column, colIndex) => (
                  <TableCell key={`${rowIndex}-${colIndex}`}>
                    {formatCellContent(row[column])}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  // Main content renderer based on view mode
  const renderContent = () => {
    if (!explainData || !explainData.columns || !explainData.rows) {
      return (
        <Typography variant="body2" color="text.secondary">
          No explain plan data available
        </Typography>
      );
    }
    
    if (explainData.rows.length === 0) {
      return (
        <Typography variant="body2" color="text.secondary">
          No rows in explain plan data
        </Typography>
      );
    }
    
    switch (viewMode) {
      case 'decorated':
        return renderDecoratedView();
      case 'json':
        return renderJsonView();
      default:
        return renderDecoratedView();
    }
  };

  return (
    <Box sx={{
      mt: 2,
      ...(isFullscreen ? {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1300,
        backgroundColor: 'white',
        padding: 3,
        overflow: 'auto'
      } : {})
    }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography variant="h6">{title || 'Explain Plan Details'}</Typography>
          <Typography 
            variant="caption" 
            sx={{ 
              ml: 2, 
              bgcolor: 'primary.main', 
              color: 'white', 
              px: 1, 
              py: 0.5, 
              borderRadius: 1,
              textTransform: 'uppercase',
              fontWeight: 'bold'
            }}
          >
            {dbType}
          </Typography>
          <Button 
            variant="text" 
            color="info" 
            size="small"
            onClick={() => {
              const newState = !showHelp;
              setShowHelp(newState);
              // Save the state to localStorage
              localStorage.setItem('explainPlanShowHelp', newState);
            }}
            sx={{ ml: 2 }}
          >
            Need help?
          </Button>
        </Box>
        <Box>
          <Tooltip title="Export as JSON">
            <IconButton onClick={() => handleExport('json')} size="small">
              <DownloadIcon fontSize="small" />
              <Typography variant="caption" sx={{ ml: 0.5 }}>JSON</Typography>
            </IconButton>
          </Tooltip>
          <Tooltip title="Export as CSV">
            <IconButton onClick={() => handleExport('csv')} size="small" sx={{ ml: 1 }}>
              <DownloadIcon fontSize="small" />
              <Typography variant="caption" sx={{ ml: 0.5 }}>CSV</Typography>
            </IconButton>
          </Tooltip>
          <Tooltip title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}>
            <IconButton onClick={toggleFullscreen} size="small" sx={{ ml: 1 }}>
              {isFullscreen ? <FullscreenExitIcon fontSize="small" /> : <FullscreenIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      
      {renderHelpPanel()}
      
      <Box sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Tabs 
          value={viewMode} 
          onChange={(e, newValue) => setViewMode(newValue)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="Decorated View" value="decorated" disabled={!DecoratorComponent} />
          <Tab label="JSON" value="json" />
        </Tabs>
      </Box>
      
      {renderContent()}
    </Box>
  );
};

export default ExplainPlanTable;
