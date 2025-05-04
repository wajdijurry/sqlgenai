import MySQLDecorator from './MySQLDecorator';
import PostgreSQLDecorator from './PostgreSQLDecorator';
import SQLServerDecorator from './SQLServerDecorator';
import OracleDecorator from './OracleDecorator';

export {
  MySQLDecorator,
  PostgreSQLDecorator,
  SQLServerDecorator,
  OracleDecorator
};

/**
 * Detects the database type from explain plan data
 * 
 * @param {Object} explainData - The explain plan data
 * @returns {string} - The detected database type ('mysql', 'postgresql', 'sqlserver', 'oracle', or 'unknown')
 */
export const detectDatabaseType = (explainData) => {
  if (!explainData) return 'unknown';

  // First check the format property in explain_data if available
  if (explainData.explain_data && explainData.explain_data.format) {
    const format = explainData.explain_data.format.toLowerCase();
    if (format === 'mysql') return 'mysql';
    if (format === 'postgresql') return 'postgresql';
    if (format === 'sqlserver') return 'sqlserver';
    if (format === 'oracle') return 'oracle';
  }

  // Check for MySQL query_block structure
  if (typeof explainData === 'object' && explainData.query_block) {
    return 'mysql';
  }

  // Check for rows and columns structure
  if (explainData.rows && explainData.columns) {
    const columns = explainData.columns;
    
    // Check for Oracle EXPLAIN PLAN format
    // Oracle typically has columns like 'PLAN_TABLE_OUTPUT' or 'ID', 'OPERATION', 'OBJECT_NAME'
    if (columns.some(col => col === 'PLAN_TABLE_OUTPUT') || 
        columns.some(col => col === 'ID' && explainData.rows.some(row => row.OPERATION)) ||
        columns.some(col => col === 'OPERATION') ||
        columns.some(col => col === 'OBJECT_NAME')) {
      return 'oracle';
    }
    
    // Check for PostgreSQL EXPLAIN format
    if (columns.some(col => col === 'QUERY PLAN') || 
        columns.some(col => col.toLowerCase().includes('plan'))) {
      return 'postgresql';
    }
    
    // Check for SQL Server execution plan format
    if (columns.some(col => col === 'StmtText') || 
        columns.some(col => col === 'PhysicalOp')) {
      return 'sqlserver';
    }
    
    // Check for MySQL tabular format
    if (columns.some(col => col === 'id') && 
        columns.some(col => col === 'select_type') && 
        columns.some(col => col === 'table')) {
      return 'mysql';
    }
  }

  // Check for single column EXPLAIN with JSON
  if (explainData.columns && 
      explainData.columns.length === 1 && 
      explainData.columns[0] === 'EXPLAIN' && 
      explainData.rows && 
      explainData.rows.length > 0) {
    
    const explainContent = explainData.rows[0]['EXPLAIN'];
    
    if (typeof explainContent === 'string') {
      try {
        // Try to parse as JSON to check for MySQL format
        const parsed = JSON.parse(explainContent);
        if (parsed && parsed.query_block) {
          return 'mysql';
        }
      } catch (e) {
        // Not JSON, could be PostgreSQL text format
        if (explainContent.includes('QUERY PLAN') || 
            explainContent.includes('cost=') || 
            explainContent.includes('rows=')) {
          return 'postgresql';
        }
      }
    }
  }

  return 'unknown';
};

/**
 * Gets the appropriate decorator component for the database type
 * 
 * @param {string} dbType - The database type
 * @returns {React.ComponentType} - The decorator component
 */
export const getDecoratorForDbType = (dbType) => {
  switch (dbType.toLowerCase()) {
    case 'mysql':
      return MySQLDecorator;
    case 'postgresql':
      return PostgreSQLDecorator;
    case 'sqlserver':
      return SQLServerDecorator;
    case 'oracle':
      return OracleDecorator;
    default:
      return null;
  }
};
