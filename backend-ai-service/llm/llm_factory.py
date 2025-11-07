"""
LLM Factory for managing multiple LLM providers with structured output support
"""
import os
import yaml
from typing import Optional, Dict, Any, Literal, Union
from pydantic import BaseModel
from dotenv import load_dotenv

from .providers.clova import ClovaProvider
from .providers.openai import OpenAIProvider
from .providers.cerebras import CerebrasProvider
from .providers.gemini import GeminiProvider

# Load environment variables
load_dotenv()

# Type definitions
ProviderType = Literal["naver", "openai", "cerebras", "gemini"]
ProviderClass = Union[ClovaProvider, OpenAIProvider, CerebrasProvider, GeminiProvider]


class LLMFactory:
    """
    Factory class for creating and managing LLM instances across different providers
    
    Supports:
    - Naver HyperCLOVA X
    - OpenAI (GPT-4, GPT-3.5, etc.)
    - Cerebras (Llama models)
    - Google Gemini
    
    Example:
        >>> factory = LLMFactory()
        >>> llm = factory.create_llm("openai")
        >>> structured_llm = factory.create_structured_llm("naver", schema=MySchema)
    """
    
    # Mapping provider names to their classes
    PROVIDERS = {
        "naver": ClovaProvider,
        "openai": OpenAIProvider,
        "cerebras": CerebrasProvider,
        "gemini": GeminiProvider,
    }
    
    def __init__(self, config_path: str = "config.yml"):
        """
        Initialize the factory
        
        Args:
            config_path: Path to configuration file
        """
        self.config_path = config_path
        self.config = self._load_config()
    
    def _load_config(self) -> Dict[str, Any]:
        """Load configuration from YAML file"""
        try:
            with open(self.config_path, "r") as f:
                config = yaml.safe_load(f)
            return config.get("llm", {})
        except Exception as e:
            print(f"⚠️ Warning: Could not load config from {self.config_path}: {e}")
            return {}
    
    def _get_provider_config(self, provider: ProviderType) -> Dict[str, Any]:
        """Get configuration for a specific provider"""
        providers_config = self.config.get("providers", {})
        return providers_config.get(provider, {})
    
    def create_provider(
        self,
        provider: ProviderType = "naver",
        model: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        **kwargs
    ) -> ProviderClass:
        """
        Create a provider instance
        
        Args:
            provider: Provider name ("naver", "openai", "cerebras", "gemini")
            model: Model name (overrides config)
            temperature: Temperature (overrides config)
            max_tokens: Max tokens (overrides config)
            **kwargs: Additional provider-specific arguments
            
        Returns:
            Provider instance
            
        Raises:
            ValueError: If provider is not supported or unavailable
        """
        if provider not in self.PROVIDERS:
            available = ", ".join(self.PROVIDERS.keys())
            raise ValueError(
                f"Provider '{provider}' not supported. Available providers: {available}"
            )
        
        provider_class = self.PROVIDERS[provider]
        
        # Check if provider is available (has API key)
        if not provider_class.is_available():
            raise ValueError(
                f"Provider '{provider}' is not available. "
                f"Please set the required API key in your .env file."
            )
        
        # Get config and merge with overrides
        config = self._get_provider_config(provider)
        final_config = {
            "model": model or config.get("model"),
            "temperature": temperature if temperature is not None else config.get("temperature", 0.1),
            "max_tokens": max_tokens or config.get("max_tokens", 2000),
            **kwargs
        }
        
        return provider_class(**final_config)
    
    def create_llm(
        self,
        provider: ProviderType = "naver",
        **kwargs
    ):
        """
        Create a base LLM instance
        
        Args:
            provider: Provider name
            **kwargs: Configuration overrides
            
        Returns:
            LLM instance
        """
        provider_instance = self.create_provider(provider, **kwargs)
        return provider_instance.get_llm()
    
    def create_structured_llm(
        self,
        schema: type[BaseModel],
        provider: ProviderType = "naver",
        **kwargs
    ):
        """
        Create an LLM instance configured for structured output
        
        Args:
            schema: Pydantic model class defining the output structure
            provider: Provider name
            **kwargs: Configuration overrides
            
        Returns:
            LLM instance configured for structured output
            
        Example:
            >>> class Person(BaseModel):
            ...     name: str
            ...     age: int
            >>> 
            >>> factory = LLMFactory()
            >>> llm = factory.create_structured_llm(Person, provider="openai")
            >>> result = llm.invoke("Extract: John is 30 years old")
            >>> print(result.name, result.age)  # John 30
        """
        provider_instance = self.create_provider(provider, **kwargs)
        return provider_instance.get_structured_llm(schema)
    
    def get_available_providers(self) -> Dict[str, bool]:
        """
        Get list of available providers (those with API keys configured)
        
        Returns:
            Dictionary mapping provider names to availability status
        """
        return {
            name: provider_class.is_available()
            for name, provider_class in self.PROVIDERS.items()
        }
    
    def get_default_provider(self) -> ProviderType:
        """Get the default provider from config"""
        return self.config.get("default_provider", "naver")
    
    def get_system_prompt(self, provider: ProviderType) -> Optional[str]:
        """Get system prompt for a provider"""
        config = self._get_provider_config(provider)
        return config.get("system_prompt")
    
    def list_providers(self) -> None:
        """Print information about all providers"""
        print("\n" + "="*60)
        print("📋 Available LLM Providers")
        print("="*60)
        
        availability = self.get_available_providers()
        default = self.get_default_provider()
        
        for provider, is_available in availability.items():
            status = "✅" if is_available else "❌"
            default_tag = " (default)" if provider == default else ""
            
            print(f"\n{status} {provider.upper()}{default_tag}")
            
            if is_available:
                config = self._get_provider_config(provider)
                print(f"   Model: {config.get('model', 'N/A')}")
                print(f"   Temperature: {config.get('temperature', 'N/A')}")
                print(f"   Max Tokens: {config.get('max_tokens', 'N/A')}")
            else:
                print(f"   Status: API key not configured")
        
        print("\n" + "="*60)


# Convenience function
def create_llm_factory(config_path: str = "config.yml") -> LLMFactory:
    """
    Create an LLM factory instance
    
    Args:
        config_path: Path to configuration file
        
    Returns:
        LLMFactory instance
    """
    return LLMFactory(config_path)
