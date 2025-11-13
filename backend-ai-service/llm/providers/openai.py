"""
Provider implementation for OpenAI
"""
import os
from typing import Optional, Dict, Any
from pydantic import BaseModel
from langchain_openai import ChatOpenAI
from langchain_core.language_models.chat_models import BaseChatModel


class OpenAIProvider:
    """OpenAI Provider with structured output support"""
    
    def __init__(
        self,
        model: str = "gpt-4o-mini",
        temperature: float = 0.1,
        max_tokens: int = 2000,
        api_key: Optional[str] = None,
        **kwargs
    ):
        """
        Initialize OpenAI provider
        
        Args:
            model: Model name (e.g., "gpt-4o-mini", "gpt-4o", "gpt-3.5-turbo")
            temperature: Temperature for generation
            max_tokens: Maximum tokens to generate
            api_key: OpenAI API key (falls back to OPENAI_API_KEY env var)
            **kwargs: Additional arguments
        """
        self.model = model
        self.temperature = temperature
        self.max_tokens = max_tokens
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        self.kwargs = kwargs
        
        if not self.api_key:
            raise ValueError(
                "OpenAI API key not found. Set OPENAI_API_KEY environment variable "
                "or pass api_key parameter."
            )
    
    def get_llm(self) -> BaseChatModel:
        """Get base LLM instance"""
        return ChatOpenAI(
            model=self.model,
            temperature=self.temperature,
            max_tokens=self.max_tokens,
            openai_api_key=self.api_key,
            **self.kwargs
        )
    
    def get_structured_llm(self, schema: type[BaseModel]) -> BaseChatModel:
        """
        Get LLM configured for structured output
        
        Args:
            schema: Pydantic model class defining the output structure
            
        Returns:
            LLM instance configured for structured output
        """
        base_llm = self.get_llm()
        # OpenAI supports structured output natively via function calling
        return base_llm.with_structured_output(schema)
    
    def get_config(self) -> Dict[str, Any]:
        """Get current configuration"""
        return {
            "provider": "openai",
            "model": self.model,
            "temperature": self.temperature,
            "max_tokens": self.max_tokens,
            "has_api_key": bool(self.api_key)
        }
    
    @staticmethod
    def is_available() -> bool:
        """Check if provider is available (API key exists)"""
        return bool(os.getenv("OPENAI_API_KEY"))
