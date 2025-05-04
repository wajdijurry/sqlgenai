import logging
from typing import Dict, Any, Optional, List
from app.models.ai_model_base import AIModelBase

logger = logging.getLogger(__name__)

class AIModelFactory:
    """Factory class for creating AI models"""
    
    @staticmethod
    def get_model(model_type: str) -> AIModelBase:
        """Get an AI model instance by type"""
        if model_type.lower() == 'openai':
            from app.models.openai_model import OpenAIModel
            return OpenAIModel()
        elif model_type.lower() == 'deepseek':
            from app.models.deepseek_model import DeepSeekModel
            return DeepSeekModel()
        elif model_type.lower() == 'claude':
            from app.models.claude_model import ClaudeModel
            return ClaudeModel()
        else:
            raise ValueError(f"Unsupported model type: {model_type}")
