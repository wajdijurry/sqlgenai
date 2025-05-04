import logging
from typing import Dict, Any, Optional, List
from flask import current_app
import json
import requests
import logging
from app.models.ai_model_base import AIModelBase
from app.utils.redis_cache import with_redis_query_cache, with_redis_explain_cache

logger = logging.getLogger(__name__)

class DeepSeekModel(AIModelBase):
    """DeepSeek model for SQL generation using direct API calls"""
    
    model_type = 'deepseek'
    
    def __init__(self):
        """Initialize the DeepSeek model with direct HTTP requests"""
        super().__init__()
        self.api_key = current_app.config.get('DEEPSEEK_API_KEY')
        self.model = current_app.config.get('DEEPSEEK_MODEL', 'deepseek-chat')
        self.api_url = "https://api.deepseek.com/v1/chat/completions"
        self.initialized = False
        
        # Check if API key is configured
        if not self.api_key:
            logger.warning("DeepSeek API key not configured. Please set DEEPSEEK_API_KEY in your environment variables.")
            return
            
        # Initialize with requests library
        try:
            self.requests = requests
            self.initialized = True
            logger.info("DeepSeek API integration initialized successfully using direct HTTP requests")
        except Exception as e:
            logger.warning(f"Error initializing DeepSeek API integration: {str(e)}")
    
    def _format_schema_for_prompt(self, schema_data: Dict[str, Any]) -> str:
        """Format the schema data for the prompt"""
        formatted_schema = []
        
        # Check if schema_data is in the expected format
        if not schema_data:
            return "No schema data available"
            
        # Handle different schema formats
        tables = schema_data.get('tables', [])
        
        # If tables is a list (new format)
        if isinstance(tables, list):
            for table in tables:
                table_name = table.get('name', 'Unknown')
                columns = table.get('columns', [])
                
                formatted_schema.append(f"Table: {table_name}")
                formatted_schema.append("Columns:")
                
                for column in columns:
                    column_name = column.get('name', 'Unknown')
                    data_type = column.get('dataType', 'unknown')
                    constraints = []
                    
                    formatted_schema.append(f"  {column_name} {data_type}")
                
                formatted_schema.append("")
            
            return "\n".join(formatted_schema)
        
        # Original format (dictionary-based)
        for table_name, table_info in schema_data.get('tables', {}).items():
            columns = table_info.get('columns', {})
            formatted_columns = []
            
            for column_name, column_info in columns.items():
                data_type = column_info.get('data_type', 'unknown')
                is_nullable = column_info.get('is_nullable', True)
                is_primary = column_info.get('is_primary_key', False)
                is_foreign = column_info.get('is_foreign_key', False)
                
                constraints = []
                if is_primary:
                    constraints.append("PRIMARY KEY")
                if is_foreign:
                    ref_table = column_info.get('references', {}).get('table')
                    ref_column = column_info.get('references', {}).get('column')
                    if ref_table and ref_column:
                        constraints.append(f"FOREIGN KEY REFERENCES {ref_table}({ref_column})")
                if not is_nullable:
                    constraints.append("NOT NULL")
                
                constraints_str = ", ".join(constraints)
                if constraints_str:
                    formatted_columns.append(f"  {column_name} {data_type} ({constraints_str})")
                else:
                    formatted_columns.append(f"  {column_name} {data_type}")
            
            formatted_schema.append(f"Table: {table_name}")
            formatted_schema.append("Columns:")
            formatted_schema.extend(formatted_columns)
            
            # Add indexes if available
            if 'indexes' in table_info and table_info['indexes']:
                formatted_schema.append("Indexes:")
                for index_name, index_info in table_info['indexes'].items():
                    columns_str = ", ".join(index_info.get('columns', []))
                    is_unique = index_info.get('is_unique', False)
                    index_type = "UNIQUE INDEX" if is_unique else "INDEX"
                    formatted_schema.append(f"  {index_name} ({index_type} on {columns_str})")
            
            formatted_schema.append("")  # Add empty line between tables
        
        # Add relationships if available
        if 'relationships' in schema_data and schema_data['relationships']:
            formatted_schema.append("Relationships:")
            for rel in schema_data['relationships']:
                from_table = rel.get('from_table')
                from_column = rel.get('from_column')
                to_table = rel.get('to_table')
                to_column = rel.get('to_column')
                rel_type = rel.get('type', 'unknown')
                
                formatted_schema.append(f"  {from_table}.{from_column} -> {to_table}.{to_column} ({rel_type})")
            
            formatted_schema.append("")  # Add empty line after relationships
        
        return "\n".join(formatted_schema)
    
    @with_redis_query_cache()
    def generate_sql(self, prompt: str, schema_data: Dict[str, Any], db_type: str, db_config: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Generate SQL query using DeepSeek API with direct HTTP requests"""
        if not self.initialized:
            return {
                'success': False,
                'error': "DeepSeek API not properly initialized",
                'model': self.model_type
            }
        
        # Format schema data for the prompt
        formatted_schema = self._format_schema_for_prompt(schema_data)
        
        # Prepare DB config information
        db_config_info = ""
        if db_config:
            db_config_info = "Database Configuration:\n"
            for key, value in db_config.items():
                db_config_info += f"- {key}: {value}\n"
        
        # Construct the system message
        system_message = f"""You are an expert SQL developer specializing in {db_type} databases.
Your task is to convert natural language requests into correct and efficient SQL queries.
Follow these guidelines:
1. Generate only valid {db_type} SQL syntax.
2. Focus on writing efficient queries with proper joins and conditions.
3. CAUTION: Return ONLY the SQL query without explanations or markdown formatting.
4. If you cannot generate a valid query, explain why.
5. Use appropriate table aliases for readability.
6. Consider performance implications of your query design.
7. Respect the database schema provided."""

        # Construct the user message with the prompt and schema
        user_message = f"""Database Type: {db_type}

Database Schema:
{formatted_schema}

{db_config_info}

Generate a SQL query for the following request:
{prompt}"""

        # Prepare the API request
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}"
        }
        
        data = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_message},
                {"role": "user", "content": user_message}
            ],
            "temperature": 0.1
        }
        
        try:
            # Make the API request
            response = self.requests.post(
                self.api_url,
                headers=headers,
                json=data
            )
            
            # Check if the request was successful
            if response.status_code == 200:
                result = response.json()
                
                # Extract the generated SQL query from the response
                sql_query = result.get('choices', [{}])[0].get('message', {}).get('content', '').strip()
                
                # Check if the response contains a valid SQL query
                if sql_query and not sql_query.lower().startswith(('i cannot', 'i\'m sorry', 'sorry,')):
                    # Return the successful result
                    return {
                        'success': True,
                        'sql_query': sql_query,
                        'model': f"{self.model_type} ({self.model})",
                        'http_success': True  # HTTP request was successful
                    }
                else:
                    # Return failure with the error message
                    return {
                        'success': False,
                        'error': sql_query or "Failed to generate SQL query",
                        'model': f"{self.model_type} ({self.model})",
                        'http_success': True  # HTTP request was successful even though content indicates failure
                    }
            else:
                # Handle API error
                error_message = f"DeepSeek API error: {response.status_code} - {response.text}"
                logger.error(error_message)
                return {
                    'success': False,
                    'error': error_message,
                    'model': self.model_type,
                    'http_success': False  # HTTP request failed
                }
        except Exception as e:
            # Handle exceptions
            logger.error(f"Error generating SQL with DeepSeek: {str(e)}")
            return {
                'success': False,
                'error': f"Failed to generate SQL query: {str(e)}",
                'model': self.model_type,
                'http_success': False  # Exception indicates HTTP request failed
            }
    
    @with_redis_explain_cache()
    def analyze_explain_plan(self, explain_data: Dict[str, Any], db_type: str, sql_query: str) -> Dict[str, Any]:
        """Analyze database explain plan and provide recommendations using DeepSeek API"""
        if not self.initialized:
            return {
                'success': False,
                'error': "DeepSeek API not properly initialized",
                'recommendations': []
            }
        
        # Convert explain data to string format
        explain_text = json.dumps(explain_data, indent=2)
        
        # Construct the system message
        system_message = f"""You are an expert database performance analyst specializing in {db_type} databases.
Your task is to analyze the execution plan of a SQL query and provide recommendations for optimization.
Follow these guidelines:
1. Focus on identifying performance bottlenecks in the execution plan.
2. Provide specific, actionable recommendations to improve query performance.
3. Consider indexes, join methods, table scans, and other relevant factors.
4. Explain why each recommendation would improve performance.
5. Rate the overall efficiency of the query on a scale of 1-10.
6. Structure your analysis in a clear, organized manner."""

        # Construct the user message with the SQL query and explain plan
        user_message = f"""Database Type: {db_type}

SQL Query:
{sql_query}

Execution Plan:
{explain_text}

Please analyze this execution plan and provide:
1. A summary of how the query is being executed
2. Identification of any performance bottlenecks
3. Specific recommendations for optimization
4. An overall efficiency rating (1-10)"""

        # Prepare the API request
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}"
        }
        
        data = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_message},
                {"role": "user", "content": user_message}
            ],
            "temperature": 0.1
        }
        
        try:
            # Make the API request
            response = self.requests.post(
                self.api_url,
                headers=headers,
                json=data
            )
            
            # Check if the request was successful
            if response.status_code == 200:
                result = response.json()
                
                # Extract the analysis from the response
                analysis_text = result.get('choices', [{}])[0].get('message', {}).get('content', '').strip()
                
                # Parse the analysis to extract recommendations
                recommendations = []
                efficiency_rating = 0
                
                # Simple parsing of the analysis text
                lines = analysis_text.split('\n')
                current_section = None
                current_recommendation = None
                
                for line in lines:
                    line = line.strip()
                    
                    # Try to extract efficiency rating
                    if "rating" in line.lower() and ":" in line and any(str(i) in line for i in range(1, 11)):
                        try:
                            # Extract the number from the line
                            rating_text = line.split(":")[-1].strip()
                            for word in rating_text.split():
                                if word.strip('.,').isdigit():
                                    efficiency_rating = int(word.strip('.,'))
                                    break
                        except:
                            pass
                    
                    # Check for recommendation sections
                    if line.lower().startswith(("recommendation", "recommendations", "suggested", "optimization")):
                        current_section = "recommendations"
                        continue
                    
                    # Process recommendations
                    if current_section == "recommendations":
                        if line and (line[0].isdigit() and ". " in line[:5]):
                            # This looks like a numbered recommendation
                            if current_recommendation:
                                recommendations.append(current_recommendation)
                            current_recommendation = line
                        elif current_recommendation and line:
                            # Continue the current recommendation
                            current_recommendation += " " + line
                
                # Add the last recommendation if there is one
                if current_recommendation:
                    recommendations.append(current_recommendation)
                
                # If we couldn't parse specific recommendations, use the whole analysis
                if not recommendations:
                    recommendations = [analysis_text]
                
                # Return the successful result
                return {
                    'success': True,
                    'performance_analysis': analysis_text,
                    'recommendations': recommendations,
                    'efficiency_rating': efficiency_rating,
                    'model': f"{self.model_type} ({self.model})"
                }
            else:
                # Handle API error
                error_message = f"DeepSeek API error: {response.status_code} - {response.text}"
                logger.error(error_message)
                return {
                    'success': False,
                    'error': error_message,
                    'recommendations': []
                }
        except Exception as e:
            # Handle exceptions
            logger.error(f"Error analyzing explain plan with DeepSeek: {str(e)}")
            return {
                'success': False,
                'error': f"Failed to analyze explain plan: {str(e)}",
                'recommendations': []
            }
