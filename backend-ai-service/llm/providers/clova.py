"""
Provider implementation for Naver HyperCLOVA X
"""
import os
from typing import Optional, Dict, Any
from pydantic import BaseModel
from langchain_naver import ChatClovaX
from langchain_core.language_models.chat_models import BaseChatModel


class ClovaProvider:
    """HyperCLOVA X Provider with structured output support"""
    
    def __init__(
        self,
        model: str = "HCX-007",
        temperature: float = 0.1,
        max_tokens: int = 2000,
        api_key: Optional[str] = None,
        **kwargs
    ):
        """
        Initialize HyperCLOVA X provider
        
        Args:
            model: Model name (e.g., "HCX-007", "HCX-003")
            temperature: Temperature for generation
            max_tokens: Maximum tokens to generate
            api_key: Naver API key (falls back to CLOVASTUDIO_API_KEY env var)
            **kwargs: Additional arguments
        """
        self.model = model
        self.temperature = temperature
        self.max_tokens = max_tokens
        self.api_key = api_key or os.getenv("CLOVASTUDIO_API_KEY")
        self.kwargs = kwargs
        
        if not self.api_key:
            raise ValueError(
                "Naver API key not found. Set CLOVASTUDIO_API_KEY environment variable "
                "or pass api_key parameter."
            )
        
        # Set API key in environment for ChatClovaX to use
        if self.api_key:
            os.environ["CLOVASTUDIO_API_KEY"] = self.api_key
    
    def get_llm(self) -> BaseChatModel:
        """
        Get base LLM instance
        
        Note: ChatClovaX reads CLOVASTUDIO_API_KEY from environment.
        The API key is set in __init__ method.
        """
        return ChatClovaX(
            model=self.model,
            temperature=self.temperature,
            max_tokens=self.max_tokens,
            # REQUIRED for structured output with Naver
            thinking={"effort": "none"},
            disabled_params={"parallel_tool_calls": None},
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
        return base_llm.with_structured_output(schema)
    
    def get_config(self) -> Dict[str, Any]:
        """Get current configuration"""
        return {
            "provider": "naver",
            "model": self.model,
            "temperature": self.temperature,
            "max_tokens": self.max_tokens,
            "has_api_key": bool(self.api_key)
        }
    
    @staticmethod
    def is_available() -> bool:
        """Check if provider is available (API key exists)"""
        return bool(os.getenv("CLOVASTUDIO_API_KEY"))
