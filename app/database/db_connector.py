"""
Database connector module for SQLGenAI
Provides direct database connections without requiring OpenMetadata
"""
import logging
import time
from typing import Dict, Any, List, Optional, Tuple
from urllib.parse import quote_plus
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.engine import Engine, Connection
from sqlalchemy.exc import SQLAlchemyError

# Import database-specific connectors
from app.database.db_connectors import (
    BaseDBConnector, MySQLConnector, PostgreSQLConnector,
    SQLServerConnector, OracleConnector, get_connector
)

logger = logging.getLogger(__name__)

class DatabaseConnector:
    """Base class for database connectors"""
    
    def __init__(self):
        """Initialize the database connector"""
        self.engines = {}  # Cache for database engines
    
    def get_engine(self, db_type: str, connection_config: Dict[str, Any]) -> Engine:
        """Get a SQLAlchemy engine for the specified database type and configuration"""
        connection_key = f"{db_type}:{connection_config.get('hostPort')}:{connection_config.get('databaseName')}"
        
        if connection_key in self.engines:
            return self.engines[connection_key]
        
        engine = self._create_engine(db_type, connection_config)
        self.engines[connection_key] = engine
        return engine
    
    def _create_engine(self, db_type: str, connection_config: Dict[str, Any]) -> Engine:
        """Create a SQLAlchemy engine for the specified database type and configuration"""
        username = connection_config.get('username')
        password = connection_config.get('password')
        host_port = connection_config.get('hostPort', '')
        database_name = connection_config.get('databaseName', '')
        service_name = connection_config.get('serviceName', '')
        
        if ':' in host_port:
            host, port = host_port.split(':')
        else:
            host = host_port
            port = self._get_default_port(db_type)
        
        # Print connection parameters for debugging
        print(f"\n[DEBUG] Connection Parameters:")
        print(f"  DB Type: {db_type}")
        print(f"  Host: {host}")
        print(f"  Port: {port}")
        print(f"  Database Name: {database_name}")
        print(f"  Service Name: {service_name if service_name else 'Not provided'}")
        print(f"  Username: {username}")
            
        connection_url = self._get_connection_url(
            db_type, username, password, host, port, database_name, service_name
        )
        
        # Print the connection URL (without password)
        masked_url = connection_url.replace(password, '********') if password else connection_url
        print(f"  Connection URL: {masked_url}\n")
        
        return create_engine(connection_url)
    
    def _get_connection_url(self, db_type: str, username: str, password: str, host: str, port: str, database_name: str, service_name: str = None) -> str:
        """Get a connection URL for the specified database type and configuration"""
        db_type = db_type.lower()
        
        if db_type in ['mysql', 'mariadb']:
            return f"mysql+pymysql://{username}:{quote_plus(password)}@{host}:{port}/{database_name}"
        elif db_type in ['postgresql', 'postgres']:
            return f"postgresql://{username}:{quote_plus(password)}@{host}:{port}/{database_name}"
        elif db_type in ['sqlserver', 'mssql']:
            return f"mssql+pyodbc://{username}:{quote_plus(password)}@{host}:{port}/{database_name}?driver=ODBC+Driver+17+for+SQL+Server"
        elif db_type in ['oracle']:
            # Use service_name if provided, otherwise use database_name as SID
            if service_name:
                # Format for service name: host:port/?service_name=service_name
                return f"oracle+cx_oracle://{username}:{quote_plus(password)}@{host}:{port}/?service_name={service_name}"
            else:
                # Format for SID: host:port/database_name
                return f"oracle+cx_oracle://{username}:{quote_plus(password)}@{host}:{port}/{database_name}"
        else:
            raise ValueError(f"Unsupported database type: {db_type}")
    
    def _get_default_port(self, db_type: str) -> str:
        """Get the default port for the specified database type"""
        db_type = db_type.lower()
        
        if db_type in ['mysql', 'mariadb']:
            return '3306'
        elif db_type in ['postgresql', 'postgres']:
            return '5432'
        elif db_type in ['sqlserver', 'mssql']:
            return '1433'
        elif db_type in ['oracle']:
            return '1521'
        else:
            return '5432'  # Default to PostgreSQL port
    
    def test_connection(self, db_type: str, connection_config: Dict[str, Any]) -> Dict[str, Any]:
        """Test the database connection"""
        try:
            print(f"\n[DEBUG] Testing connection for {db_type}:")
            print(f"  Connection config: {connection_config}")
            
            engine = self.get_engine(db_type, connection_config)
            connection = engine.connect()
            connection.close()
            print(f"  Connection test result: SUCCESS\n")
            return {"success": True, "message": "Connection successful"}
        
        except SQLAlchemyError as e:
            error_msg = str(e)
            print(f"  Connection test result: FAILED (SQLAlchemyError)")
            print(f"  Error: {error_msg}\n")
            logger.error(f"Error testing connection: {error_msg}")
            return {"success": False, "message": error_msg}
        
        except Exception as e:
            error_msg = str(e)
            print(f"  Connection test result: FAILED (Unexpected error)")
            print(f"  Error: {error_msg}\n")
            logger.error(f"Unexpected error testing connection: {error_msg}")
            return {"success": False, "message": f"Unexpected error: {error_msg}"}
    
    def get_database_schema(self, db_type: str, connection_config: Dict[str, Any]) -> Dict[str, Any]:
        """Get the database schema using the appropriate database-specific connector"""
        # Direct print statement that will show up regardless of any other code
        print("\n\n**** MAIN GET_DATABASE_SCHEMA METHOD CALLED ****\n\n")
        try:
            # Get the database engine
            engine = self.get_engine(db_type, connection_config)
            
            # Get the database-specific connector
            db_connector = get_connector(db_type, engine)
            
            # Use the database-specific get_schema method
            return db_connector.get_schema(connection_config)
            
        except Exception as e:
            logger.error(f"Error getting database schema: {str(e)}")
            return {'error': str(e)}
    
    def explain_query(self, db_type: str, connection_config: Dict[str, Any], sql_query: str, model_type: str = 'openai') -> Dict[str, Any]:
        """Get the execution plan for a SQL query"""
        try:
            # Debug logging for Oracle connections
            if db_type.lower() == 'oracle':
                print(f"\n[EXPLAIN QUERY] Oracle connection config before: {connection_config}\n")
                # Make sure service_name is included for Oracle connections
                if 'serviceName' in connection_config and connection_config['serviceName']:
                    print(f"\n[EXPLAIN QUERY] Using Oracle service_name: {connection_config['serviceName']}\n")
                else:
                    print(f"\n[EXPLAIN QUERY] WARNING: No service_name provided for Oracle connection\n")
            
            # Get the appropriate database engine
            engine = self.get_engine(db_type, connection_config)
            
            # Get the database-specific connector
            db_connector = get_connector(db_type, engine)
            
            with engine.connect() as connection:
                # Generate the appropriate EXPLAIN query for the database type
                explain_query = db_connector.get_explain_query(sql_query)
                
                # Execute the EXPLAIN query
                result = connection.execute(text(explain_query))
                
                # Get column names and rows
                columns = list(result.keys())
                rows = []
                for row in result.fetchall():
                    # Convert each row to a dict with string keys for JSON serialization
                    row_dict = {}
                    for i, col in enumerate(columns):
                        # Handle non-serializable types
                        value = row[i]
                        # Convert any non-serializable types to strings
                        if not isinstance(value, (str, int, float, bool, type(None), list, dict)):
                            value = str(value)
                        row_dict[col] = value
                    rows.append(row_dict)
                
                # Parse the explain result using the database-specific connector
                explain_data = db_connector.parse_explain_result(columns, rows)
                
                # Analyze the explain plan
                analysis = self._analyze_explain_plan(db_type, columns, rows, sql_query, model_type)
                
                return {
                    "success": True,
                    "columns": columns,
                    "rows": rows,
                    "explain_data": explain_data,
                    "performance_analysis": analysis
                }
        except Exception as e:
            logger.error(f"Error getting query execution plan: {str(e)}")
            return {"success": False, "error": str(e)}
        
    def execute_query(self, db_type: str, connection_config: Dict[str, Any], 
                     sql_query: str, limit: int = 1000, offset: int = 0) -> Dict[str, Any]:
        """Execute a SQL query and return the results"""
        try:
            # Get the appropriate database engine
            engine = self.get_engine(db_type, connection_config)
            
            # Get the database-specific connector
            db_connector = get_connector(db_type, engine)
            
            # Use the connector to execute the query
            start_time = time.time()
            result = db_connector.execute_query(sql_query, limit, offset)
            end_time = time.time()
            
            # Add execution time to the result
            if result.get('success', False):
                result['execution_time'] = end_time - start_time
            
            return result
        
        except Exception as e:
            logger.error(f"Error executing query: {str(e)}")
            return {"success": False, "error": str(e)}
            
    def get_db_config(self, db_type: str, connection_config: Dict[str, Any]) -> Dict[str, Any]:
        """Get database configuration settings including flags and SQL modes
        
        Args:
            db_type: Database type (mysql, postgresql, sqlserver, oracle)
            connection_config: Connection configuration
            
        Returns:
            Dictionary with database configuration settings
        """
        try:
            # Get the appropriate database engine
            engine = self.get_engine(db_type, connection_config)
            
            # Get the database-specific connector
            db_connector = get_connector(db_type, engine)
            
            # Get database configuration
            config = db_connector.get_db_config()
            
            # Add database type to the configuration
            config['db_type'] = db_type
            
            return {
                "success": True,
                "config": config
            }
        except Exception as e:
            logger.error(f"Error getting database configuration: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "config": {
                    'db_type': db_type,
                    'flags': [],
                    'settings': {},
                    'sql_mode': '',
                    'version': ''
                }
            }
    
    def _analyze_explain_plan(self, db_type: str, columns, rows, sql_query: str = None, model_type: str = 'openai') -> Dict[str, Any]:
        """Analyze the explain plan for potential performance issues"""
        issues = []
        warnings = []
        recommendations = []
        
        try:
            # Convert rows to a string for pattern matching
            plan_str = str(rows)
            
            # Different analysis based on database type
            if db_type.lower() in ['mysql', 'mariadb']:
                self._analyze_mysql_explain(rows, columns, issues, warnings, recommendations)
                    
            elif db_type.lower() in ['postgresql', 'postgres']:
                self._analyze_postgresql_explain(rows, columns, issues, warnings, recommendations)
                
            elif db_type.lower() in ['sqlserver', 'mssql']:
                self._analyze_sqlserver_explain(rows, columns, issues, warnings, recommendations)
                
            elif db_type.lower() in ['oracle']:
                self._analyze_oracle_explain(rows, columns, issues, warnings, recommendations)
                
            # Add general analysis for any database type
            self._analyze_general_patterns(plan_str, issues, warnings, recommendations)
            
            # Use AI model for additional recommendations if SQL query is provided
            if sql_query:
                try:
                    from flask import current_app
                    from app.models import AIModelFactory
                    import re
                    from sqlalchemy import inspect
                    
                    # Try to import sqlparse, but make it optional
                    try:
                        import sqlparse
                        has_sqlparse = True
                    except ImportError:
                        has_sqlparse = False
                        logger.warning("sqlparse module not found. SQL parsing will be limited.")
                    
                    # Use the model type passed from the API request
                    # If not provided, fall back to the configured default
                    ai_model_type = model_type or current_app.config.get('AI_MODEL', 'deepseek')
                    
                    print(f"[EXPLAIN] Using AI model type: {ai_model_type} for explain plan analysis")
                    
                    # Create an instance of the AI model
                    ai_model = AIModelFactory.get_model(ai_model_type)
                    
                    # Extract table names from the SQL query
                    table_names = set()
                    try:
                        # Extract table names using regex patterns
                        # This is a simple approach and might not catch all cases
                        # Look for table names in FROM and JOIN clauses
                        from_pattern = re.compile(r'\bFROM\s+[`"]?([\w\d_]+)[`"]?', re.IGNORECASE)
                        join_pattern = re.compile(r'\bJOIN\s+[`"]?([\w\d_]+)[`"]?', re.IGNORECASE)
                        update_pattern = re.compile(r'\bUPDATE\s+[`"]?([\w\d_]+)[`"]?', re.IGNORECASE)
                        insert_pattern = re.compile(r'\bINSERT\s+INTO\s+[`"]?([\w\d_]+)[`"]?', re.IGNORECASE)
                        
                        # Find all matches
                        table_names.update(from_pattern.findall(sql_query))
                        table_names.update(join_pattern.findall(sql_query))
                        table_names.update(update_pattern.findall(sql_query))
                        table_names.update(insert_pattern.findall(sql_query))
                        
                        logger.info(f"Extracted table names from query: {table_names}")
                    except Exception as e:
                        logger.warning(f"Error extracting table names from query: {str(e)}")
                    
                    # Get schema information for the extracted tables
                    table_schemas = []
                    try:
                        # Get the engine from the connection config used in explain_query
                        connection_config = current_app.config.get('LAST_CONNECTION_CONFIG', {})
                        if connection_config:
                            engine = self.get_engine(db_type, connection_config)
                            inspector = inspect(engine)
                            
                            for table_name in table_names:
                                table_info = {
                                    'name': table_name,
                                    'columns': []
                                }
                                
                                try:
                                    # Get columns for the table
                                    for column in inspector.get_columns(table_name):
                                        column_info = {
                                            'name': column['name'],
                                            'dataType': str(column['type']),
                                            'nullable': column.get('nullable', True)
                                        }
                                        
                                        # Get primary key information
                                        pk_constraint = inspector.get_pk_constraint(table_name)
                                        if pk_constraint and 'constrained_columns' in pk_constraint:
                                            column_info['isPrimaryKey'] = column['name'] in pk_constraint['constrained_columns']
                                        
                                        # Get index information
                                        column_info['indexes'] = []
                                        for index in inspector.get_indexes(table_name):
                                            if column['name'] in index['column_names']:
                                                column_info['indexes'].append({
                                                    'name': index['name'],
                                                    'unique': index['unique']
                                                })
                                        
                                        table_info['columns'].append(column_info)
                                    
                                    table_schemas.append(table_info)
                                except Exception as e:
                                    logger.warning(f"Error getting schema for table {table_name}: {str(e)}")
                    except Exception as e:
                        logger.warning(f"Error getting table schemas: {str(e)}")
                    
                    # Prepare explain data for AI analysis
                    explain_data = {
                        'columns': columns,
                        'rows': rows,
                        'issues_detected': issues,
                        'warnings_detected': warnings,
                        'table_schemas': table_schemas
                    }
                    
                    # Get AI-generated recommendations
                    ai_result = ai_model.analyze_explain_plan(explain_data, db_type, sql_query)
                    
                    if ai_result.get('success', False):
                        # Add AI-generated recommendations
                        ai_recommendations = ai_result.get('recommendations', [])
                        if ai_recommendations:
                            # Clear existing hardcoded recommendations if we have AI ones
                            recommendations = ai_recommendations
                            logger.info(f"Using AI-generated recommendations from {ai_model_type} model")
                            
                        # Store additional information if available
                        additional_info = ai_result.get('additional_info')
                        if additional_info:
                            logger.info(f"Additional information available from {ai_model_type} model")
                except Exception as e:
                    logger.warning(f"Error getting AI recommendations: {str(e)}")
                    # Continue with hardcoded recommendations if AI fails
            
            # General analysis for all database types
            result = {}
            
            if not issues and not warnings:
                result = {
                    "status": "good",
                    "message": "No performance issues detected in the query execution plan",
                    "issues": [],
                    "warnings": [],
                    "recommendations": ["The query appears to be using efficient access methods and execution strategies."]
                }
            elif issues:
                result = {
                    "status": "poor",
                    "message": "Performance issues detected in the query execution plan",
                    "issues": issues,
                    "warnings": warnings,
                    "recommendations": recommendations
                }
            else:
                result = {
                    "status": "warning",
                    "message": "Potential performance concerns identified in the query execution plan",
                    "issues": issues,
                    "warnings": warnings,
                    "recommendations": recommendations
                }
                
            # Include additional information if available from AI model
            if 'additional_info' in locals() and additional_info:
                result["additional_info"] = additional_info
                
            return result
                
        except Exception as e:
            logger.warning(f"Error analyzing explain plan: {str(e)}")
            result = {
                "status": "unknown",
                "message": "Unable to analyze query performance",
                "issues": [],
                "warnings": [f"Analysis error: {str(e)}"],
                "recommendations": ["Consider reviewing the query execution plan manually", "Check for missing indexes or table statistics"]
            }
            
            # Include additional information if available from AI model
            if 'additional_info' in locals() and additional_info:
                result["additional_info"] = additional_info
                
            return result
            
    def _analyze_mysql_explain(self, rows, columns, issues, warnings, recommendations):
        """Analyze MySQL/MariaDB explain plan"""
        plan_str = str(rows)
        
        # Check for specific operations in MySQL explain plan
        if 'table scan' in plan_str.lower() or 'full scan' in plan_str.lower():
            issues.append('Full table scan detected - scanning all rows in the table instead of using an index')
            
            # Extract table name if possible
            table_name = self._extract_table_name_from_plan(plan_str)
            if table_name:
                recommendations.append(f'Create an index on the columns used in WHERE clauses for table `{table_name}`')
            else:
                recommendations.append('Create indexes on columns used in WHERE clauses and JOIN conditions')
        
        if 'filesort' in plan_str.lower():
            issues.append('Filesort operation detected - MySQL is performing an expensive sort operation')
            recommendations.append('Add an index that matches your ORDER BY clause to avoid sorting')
        
        if 'temporary table' in plan_str.lower() or 'using temporary' in plan_str.lower():
            warnings.append('Query uses temporary tables - this requires additional memory and disk I/O')
            recommendations.append('Simplify complex GROUP BY clauses or subqueries that might be causing temporary tables')
        
        # Check for inefficient joins
        if 'join buffer' in plan_str.lower():
            warnings.append('Join buffer used - indicates a less efficient join method')
            recommendations.append('Ensure proper indexes exist on join columns on both tables')
            
        # Check for low key_len values which might indicate partial index usage
        if 'key_len' in plan_str.lower():
            try:
                key_len_parts = plan_str.lower().split('key_len')[1].split(',')
                key_len = int(''.join(filter(str.isdigit, key_len_parts[0])))
                if key_len < 8 and 'where' in plan_str.lower():
                    warnings.append(f'Potentially inefficient index usage (key_len={key_len})')
                    recommendations.append('Consider creating a composite index that covers all filtered columns')
            except:
                pass
                
    def _analyze_postgresql_explain(self, rows, columns, issues, warnings, recommendations):
        """Analyze PostgreSQL explain plan"""
        plan_str = str(rows)
        
        # Check for sequential scans
        if 'seq scan' in plan_str.lower():
            table_name = self._extract_table_name_from_plan(plan_str, 'seq scan on')
            if table_name:
                issues.append(f'Sequential scan on table `{table_name}` - reading all rows instead of using an index')
                recommendations.append(f'Create an index on the columns used in WHERE clauses for table `{table_name}`')
            else:
                issues.append('Sequential scan detected - reading all rows instead of using an index')
                recommendations.append('Create indexes on columns used in WHERE clauses')
        
        # Check for hash joins (might indicate missing indexes)
        if 'hash join' in plan_str.lower():
            warnings.append('Hash join detected - can be memory intensive for large datasets')
            recommendations.append('Create indexes on join columns to enable more efficient merge joins')
        
        # Check for high cost operations
        if 'cost=' in plan_str.lower():
            try:
                cost_parts = plan_str.lower().split('cost=')[1].split(' ')
                cost_range = cost_parts[0].strip()
                max_cost = float(cost_range.split('..')[1])
                if max_cost > 10000:
                    issues.append(f'Very high cost operation detected: {max_cost}')
                    recommendations.append('Consider rewriting the query or adding appropriate indexes')
                elif max_cost > 1000:
                    warnings.append(f'High cost operation detected: {max_cost}')
                    recommendations.append('Review query complexity and consider additional indexes')
            except:
                pass
                
        # Check for bitmap scans (might be inefficient for small result sets)
        if 'bitmap' in plan_str.lower() and 'rows=' in plan_str.lower():
            try:
                rows_parts = plan_str.lower().split('rows=')[1].split(' ')
                row_count = int(''.join(filter(str.isdigit, rows_parts[0])))
                if row_count < 100:
                    warnings.append(f'Bitmap scan used for small result set ({row_count} rows)')
                    recommendations.append('Consider using an index-only scan by creating a covering index')
            except:
                pass
                
    def _analyze_sqlserver_explain(self, rows, columns, issues, warnings, recommendations):
        """Analyze SQL Server explain plan"""
        plan_str = str(rows)
        
        # Check for table scans
        if 'table scan' in plan_str.lower():
            issues.append('Table scan detected - reading all rows instead of using an index')
            recommendations.append('Create indexes on columns used in WHERE clauses and JOIN conditions')
        
        # Check for key lookups (bookmark lookups)
        if 'key lookup' in plan_str.lower() or 'bookmark lookup' in plan_str.lower():
            warnings.append('Key lookup operation detected - requires additional I/O operations')
            recommendations.append('Create a covering index that includes all columns needed by the query')
        
        # Check for hash matches (might indicate missing indexes)
        if 'hash match' in plan_str.lower():
            warnings.append('Hash match join detected - can be memory intensive')
            recommendations.append('Create indexes on join columns to enable more efficient nested loops or merge joins')
            
        # Check for sorts
        if 'sort' in plan_str.lower():
            warnings.append('Sort operation detected - consuming memory and CPU resources')
            recommendations.append('Create an index that matches your ORDER BY clause to avoid sorting')
            
    def _analyze_oracle_explain(self, rows, columns, issues, warnings, recommendations):
        """Analyze Oracle explain plan"""
        plan_str = str(rows)
        
        # Check for full table scans
        if 'full' in plan_str.lower() and 'table scan' in plan_str.lower():
            issues.append('Full table scan detected - reading all rows instead of using an index')
            recommendations.append('Create indexes on columns used in WHERE clauses')
        
        # Check for cartesian joins
        if 'cartesian' in plan_str.lower():
            issues.append('Cartesian join detected - extremely inefficient for large tables')
            recommendations.append('Add proper join conditions to eliminate cartesian product')
        
        # Check for NESTED LOOPS with high iterations
        if 'nested loops' in plan_str.lower() and 'rows=' in plan_str.lower():
            try:
                rows_parts = plan_str.lower().split('rows=')[1].split(' ')
                row_count = int(''.join(filter(str.isdigit, rows_parts[0])))
                if row_count > 10000:
                    warnings.append(f'Nested loops join with large row count ({row_count})')
                    recommendations.append('Consider adding indexes on join columns or restructuring the query')
            except:
                pass
                
    def _analyze_general_patterns(self, plan_str, issues, warnings, recommendations):
        """Analyze patterns common to all database types"""
        # Check for large result sets
        if 'rows=' in plan_str.lower():
            try:
                rows_parts = [part.split('rows=')[1].split(' ')[0] for part in plan_str.lower().split('rows=')[1:]]
                for row_part in rows_parts:
                    row_count = int(''.join(filter(str.isdigit, row_part)))
                    if row_count > 100000:
                        warnings.append(f'Large result set detected ({row_count} rows)')
                        recommendations.append('Consider adding LIMIT/TOP clause or pagination to reduce result set size')
                        break
            except:
                pass
                
        # Check for multiple joins
        join_count = plan_str.lower().count('join')
        if join_count > 5:
            warnings.append(f'Complex query with {join_count} joins detected')
            recommendations.append('Consider simplifying the query or breaking it into smaller queries')
            
        # Check for subqueries
        if 'subquery' in plan_str.lower():
            warnings.append('Subquery detected - may cause performance issues if correlated')
            recommendations.append('Consider rewriting using JOINs instead of subqueries where possible')
            
    def _extract_table_name_from_plan(self, plan_str, prefix=''):
        """Extract table name from explain plan string"""
        try:
            if prefix:
                parts = plan_str.lower().split(prefix.lower())[1].split(' ')
                return parts[1].strip('"`,\\[](){}').strip()
            else:
                # Try to find table name in various formats
                table_patterns = ['table=', 'table:', 'table ', 'from ']
                for pattern in table_patterns:
                    if pattern in plan_str.lower():
                        parts = plan_str.lower().split(pattern)[1].split(' ')
                        return parts[0].strip('"`,\\[](){}').strip()
            return None
        except:
            return None
