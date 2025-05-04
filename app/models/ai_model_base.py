import logging
from typing import Dict, Any, Optional, List

logger = logging.getLogger(__name__)

class AIModelBase:
    """Base class for AI models"""
    
    # Default model type
    model_type = 'base'
    
    def __init__(self):
        """Initialize the AI model"""
        pass
    
    def generate_sql(self, prompt: str, schema_data: Dict[str, Any], db_type: str, db_config: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Generate SQL query from natural language prompt
        
        Args:
            prompt: Natural language prompt
            schema_data: Database schema data
            db_type: Database type (mysql, postgresql, sqlserver, oracle)
            db_config: Optional database configuration settings
            
        Returns:
            Dictionary with generated SQL query and metadata
        """
        raise NotImplementedError("Subclasses must implement this method")
        
    def analyze_explain_plan(self, explain_data: Dict[str, Any], db_type: str, sql_query: str) -> Dict[str, Any]:
        """Analyze database explain plan and provide recommendations"""
        raise NotImplementedError("Subclasses must implement this method")
        
    def validate_sql_generation(self, result: Dict[str, Any]) -> Dict[str, Any]:
        """Validate SQL query generation results
        
        This method checks if the generated SQL is valid or if it contains
        patterns that indicate a failure to generate a proper query despite
        the model returning a success status.
        
        Args:
            result: The result dictionary from the AI model
            
        Returns:
            Updated result dictionary with corrected success status if needed
        """
        # If already marked as failure, no need to validate
        if not result.get('success', False):
            return result
            
        sql_query = result.get('sql_query', '').strip().lower()
        
        # Check for common failure patterns
        failure_indicators = [
            "i'm sorry",
            "i cannot",
            "i apologize",
            "unable to",
            "can't generate",
            "cannot generate",
            "sorry, but",
            "sorry i cannot",
            "i don't have",
            "i don't know",
            "not able to"
        ]
        
        # Check if the SQL query starts with any of the failure indicators
        for indicator in failure_indicators:
            if sql_query.startswith(indicator):
                # Extract the error message from the generated text
                error_message = result.get('sql_query', 'Failed to generate a valid SQL query')
                
                # Update the result to indicate failure
                result['success'] = False
                result['error'] = error_message
                result['sql_query'] = ""
                return result
                
        # Check if the SQL query is empty or too short to be valid
        if not sql_query or len(sql_query) < 10:
            result['success'] = False
            result['error'] = "Generated SQL query is empty or too short to be valid"
            result['sql_query'] = ""
            return result
            
        # Check if the SQL query contains actual SQL keywords
        sql_keywords = ['select', 'from', 'where', 'join', 'group by', 'order by', 'having', 'limit']
        has_sql_keywords = any(keyword in sql_query for keyword in sql_keywords)
        
        if not has_sql_keywords:
            result['success'] = False
            result['error'] = "Generated text does not appear to be a valid SQL query"
            result['sql_query'] = ""
            return result
            
        return result
