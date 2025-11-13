"""
Token Counter Module for Multi-Provider LLM Token Tracking

This module provides a unified interface for tracking token usage across different
LLM providers (Naver, OpenAI, Cerebras, Gemini). It supports both regular and
structured output modes.

Features:
- Provider-agnostic token extraction
- Automatic token tracking with decorators
- Detailed input/output token breakdown
- Session-level aggregation
- Export capabilities for analytics

Usage:
    >>> from llm.token_counter import TokenCounter, track_tokens
    >>> 
    >>> # Method 1: Direct extraction
    >>> counter = TokenCounter(provider="openai")
    >>> usage = counter.extract_usage(response)
    >>> print(f"Tokens used: {usage.total_tokens}")
    >>> 
    >>> # Method 2: With decorator
    >>> @track_tokens(provider="cerebras")
    >>> def my_llm_call(prompt):
    ...     return llm.invoke(prompt)
    >>> 
    >>> # Method 3: Context manager
    >>> with TokenCounter.session(provider="gemini") as session:
    ...     response = llm.invoke("Hello")
    ...     print(session.get_summary())
"""

from typing import Optional, Dict, Any, List, Literal, Union
from dataclasses import dataclass, field, asdict
from datetime import datetime
from functools import wraps
import json


# Type definitions
ProviderType = Literal["naver", "openai", "cerebras", "gemini"]


@dataclass
class TokenUsage:
    """
    Unified token usage data structure
    
    Attributes:
        provider: LLM provider name
        input_tokens: Number of tokens in the prompt/input
        output_tokens: Number of tokens in the completion/output
        total_tokens: Total tokens used (input + output)
        model: Model name used
        timestamp: When the request was made
        metadata: Additional provider-specific metadata
        raw: Raw usage data from provider
    """
    provider: str
    input_tokens: Optional[int] = None
    output_tokens: Optional[int] = None
    total_tokens: Optional[int] = None
    model: Optional[str] = None
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())
    metadata: Dict[str, Any] = field(default_factory=dict)
    raw: Optional[Dict[str, Any]] = None
    
    def __post_init__(self):
        """Calculate total_tokens if not provided"""
        if self.total_tokens is None and self.input_tokens and self.output_tokens:
            self.total_tokens = self.input_tokens + self.output_tokens
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return asdict(self)
    
    def to_json(self) -> str:
        """Convert to JSON string"""
        return json.dumps(self.to_dict(), indent=2)
    
    def __str__(self) -> str:
        """Human-readable string representation"""
        return (
            f"TokenUsage(provider={self.provider}, "
            f"input={self.input_tokens}, output={self.output_tokens}, "
            f"total={self.total_tokens}, model={self.model})"
        )


class TokenExtractor:
    """
    Base class for extracting token usage from provider responses
    
    Each provider has different response metadata structures, so we need
    provider-specific extraction logic.
    """
    
    @staticmethod
    def extract_from_naver(response) -> TokenUsage:
        """
        Extract token usage from Naver HyperCLOVA X response
        
        Naver uses 'token_usage' in response_metadata with:
        - prompt_tokens
        - completion_tokens
        - total_tokens
        """
        md = getattr(response, "response_metadata", {}) or {}
        tu = md.get("token_usage", {})
        
        return TokenUsage(
            provider="naver",
            input_tokens=tu.get("prompt_tokens"),
            output_tokens=tu.get("completion_tokens"),
            total_tokens=tu.get("total_tokens"),
            model=md.get("model_name"),
            raw=tu
        )
    
    @staticmethod
    def extract_from_openai(response) -> TokenUsage:
        """
        Extract token usage from OpenAI response
        
        OpenAI uses 'token_usage' in response_metadata with:
        - prompt_tokens
        - completion_tokens
        - total_tokens
        """
        md = getattr(response, "response_metadata", {}) or {}
        tu = md.get("token_usage", {})
        
        return TokenUsage(
            provider="openai",
            input_tokens=tu.get("prompt_tokens"),
            output_tokens=tu.get("completion_tokens"),
            total_tokens=tu.get("total_tokens"),
            model=md.get("model_name") or md.get("model"),
            raw=tu
        )
    
    @staticmethod
    def extract_from_cerebras(response) -> TokenUsage:
        """
        Extract token usage from Cerebras response
        
        Cerebras may use either 'token_usage' or 'usage_metadata':
        - prompt_tokens / input_tokens
        - completion_tokens / output_tokens
        - total_tokens
        """
        md = getattr(response, "response_metadata", {}) or {}
        
        # Try 'token_usage' first
        tu = md.get("token_usage")
        if isinstance(tu, dict):
            return TokenUsage(
                provider="cerebras",
                input_tokens=tu.get("prompt_tokens"),
                output_tokens=tu.get("completion_tokens"),
                total_tokens=tu.get("total_tokens"),
                model=md.get("model_name") or md.get("model"),
                raw=tu
            )
        
        # Try 'usage_metadata'
        um = md.get("usage_metadata")
        if isinstance(um, dict):
            return TokenUsage(
                provider="cerebras",
                input_tokens=um.get("input_tokens") or um.get("prompt_tokens"),
                output_tokens=um.get("output_tokens") or um.get("completion_tokens"),
                total_tokens=um.get("total_tokens"),
                model=md.get("model_name") or md.get("model"),
                raw=um
            )
        
        # No usage data found
        return TokenUsage(
            provider="cerebras",
            model=md.get("model_name") or md.get("model"),
            raw=None
        )
    
    @staticmethod
    def extract_from_gemini(response) -> TokenUsage:
        """
        Extract token usage from Google Gemini response
        
        Gemini uses 'usage_metadata' in response_metadata with:
        - prompt_token_count
        - candidates_token_count
        - total_token_count
        """
        md = getattr(response, "response_metadata", {}) or {}
        um = md.get("usage_metadata", {})
        
        return TokenUsage(
            provider="gemini",
            input_tokens=um.get("prompt_token_count"),
            output_tokens=um.get("candidates_token_count"),
            total_tokens=um.get("total_token_count"),
            model=md.get("model_name") or md.get("model"),
            raw=um
        )


class TokenCounter:
    """
    Main token counter class for tracking and aggregating token usage
    
    Supports:
    - Single request tracking
    - Session-level aggregation
    - Multiple providers
    - Export to various formats
    
    Example:
        >>> counter = TokenCounter(provider="openai")
        >>> usage = counter.extract_usage(response)
        >>> counter.add_usage(usage)
        >>> print(counter.get_summary())
    """
    
    # Mapping providers to their extraction methods
    EXTRACTORS = {
        "naver": TokenExtractor.extract_from_naver,
        "openai": TokenExtractor.extract_from_openai,
        "cerebras": TokenExtractor.extract_from_cerebras,
        "gemini": TokenExtractor.extract_from_gemini,
    }
    
    def __init__(self, provider: ProviderType = "naver"):
        """
        Initialize token counter
        
        Args:
            provider: LLM provider name
        """
        self.provider = provider
        self.usages: List[TokenUsage] = []
        self._session_active = False
    
    def extract_usage(self, response) -> TokenUsage:
        """
        Extract token usage from a response object
        
        Args:
            response: LLM response object (can be AIMessage or structured output dict)
            
        Returns:
            TokenUsage object with extracted data
            
        Note:
            For structured output with include_raw=True, pass response["raw"]
        """
        # Handle structured output format: {"parsed": ..., "raw": ...}
        if isinstance(response, dict) and "raw" in response:
            response = response["raw"]
        
        extractor = self.EXTRACTORS.get(self.provider)
        if not extractor:
            raise ValueError(f"No extractor found for provider: {self.provider}")
        
        return extractor(response)
    
    def add_usage(self, usage: TokenUsage) -> None:
        """
        Add a token usage record to the counter
        
        Args:
            usage: TokenUsage object to add
        """
        self.usages.append(usage)
    
    def track_response(self, response) -> TokenUsage:
        """
        Extract and add token usage from a response in one call
        
        Args:
            response: LLM response object
            
        Returns:
            Extracted TokenUsage object
        """
        usage = self.extract_usage(response)
        self.add_usage(usage)
        return usage
    
    def get_total_tokens(self) -> int:
        """Get total tokens across all tracked usages"""
        return sum(u.total_tokens or 0 for u in self.usages)
    
    def get_total_input_tokens(self) -> int:
        """Get total input tokens across all tracked usages"""
        return sum(u.input_tokens or 0 for u in self.usages)
    
    def get_total_output_tokens(self) -> int:
        """Get total output tokens across all tracked usages"""
        return sum(u.output_tokens or 0 for u in self.usages)
    
    def get_summary(self) -> Dict[str, Any]:
        """
        Get summary of all tracked token usage
        
        Returns:
            Dictionary with aggregated statistics
        """
        return {
            "provider": self.provider,
            "total_requests": len(self.usages),
            "total_tokens": self.get_total_tokens(),
            "total_input_tokens": self.get_total_input_tokens(),
            "total_output_tokens": self.get_total_output_tokens(),
            "average_tokens_per_request": (
                self.get_total_tokens() / len(self.usages)
                if self.usages else 0
            ),
            "requests": [u.to_dict() for u in self.usages]
        }
    
    def print_summary(self) -> None:
        """Print a formatted summary of token usage"""
        summary = self.get_summary()
        
        print("\n" + "=" * 70)
        print(f"📊 Token Usage Summary - {summary['provider'].upper()}")
        print("=" * 70)
        print(f"Total Requests: {summary['total_requests']}")
        print(f"Total Tokens: {summary['total_tokens']:,}")
        print(f"  └─ Input Tokens: {summary['total_input_tokens']:,}")
        print(f"  └─ Output Tokens: {summary['total_output_tokens']:,}")
        print(f"Average per Request: {summary['average_tokens_per_request']:.1f}")
        print("=" * 70)
        
        if self.usages:
            print("\nDetailed Breakdown:")
            for i, usage in enumerate(self.usages, 1):
                print(f"\n  Request #{i}:")
                print(f"    Model: {usage.model}")
                print(f"    Input: {usage.input_tokens:,} | Output: {usage.output_tokens:,} | Total: {usage.total_tokens:,}")
                print(f"    Timestamp: {usage.timestamp}")
        
        print()
    
    def export_to_json(self, filepath: str) -> None:
        """
        Export token usage data to JSON file
        
        Args:
            filepath: Path to save JSON file
        """
        summary = self.get_summary()
        with open(filepath, 'w') as f:
            json.dump(summary, f, indent=2)
    
    def reset(self) -> None:
        """Clear all tracked usage data"""
        self.usages.clear()
    
    @classmethod
    def session(cls, provider: ProviderType = "naver"):
        """
        Create a token counter as a context manager for session tracking
        
        Args:
            provider: LLM provider name
            
        Returns:
            TokenCounter instance configured as context manager
            
        Example:
            >>> with TokenCounter.session(provider="openai") as counter:
            ...     response = llm.invoke("Hello")
            ...     counter.track_response(response)
            ...     print(counter.get_summary())
        """
        counter = cls(provider=provider)
        counter._session_active = True
        return counter
    
    def __enter__(self):
        """Context manager entry"""
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit - print summary"""
        if self._session_active and self.usages:
            self.print_summary()
        return False


def track_tokens(provider: ProviderType = "naver", auto_print: bool = True):
    """
    Decorator for automatically tracking token usage of LLM function calls
    
    Args:
        provider: LLM provider name
        auto_print: Whether to automatically print usage after function call
        
    Returns:
        Decorated function that tracks tokens
        
    Example:
        >>> @track_tokens(provider="openai")
        >>> def ask_llm(prompt):
        ...     return llm.invoke(prompt)
        >>> 
        >>> result = ask_llm("What is AI?")
        # Automatically prints token usage
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Execute the function
            result = func(*args, **kwargs)
            
            # Extract and print token usage
            counter = TokenCounter(provider=provider)
            usage = counter.extract_usage(result)
            
            if auto_print:
                print(f"\n💡 Token Usage:")
                print(f"   Provider: {usage.provider}")
                print(f"   Model: {usage.model}")
                print(f"   Input: {usage.input_tokens:,} tokens")
                print(f"   Output: {usage.output_tokens:,} tokens")
                print(f"   Total: {usage.total_tokens:,} tokens\n")
            
            # Store usage in result if it's a dict
            if isinstance(result, dict):
                result["_token_usage"] = usage
            
            return result
        
        return wrapper
    return decorator


# Convenience function
def extract_token_usage(response, provider: ProviderType = "naver") -> TokenUsage:
    """
    Quick extraction of token usage from a response
    
    Args:
        response: LLM response object
        provider: LLM provider name
        
    Returns:
        TokenUsage object
        
    Example:
        >>> response = llm.invoke("Hello")
        >>> usage = extract_token_usage(response, provider="openai")
        >>> print(f"Used {usage.total_tokens} tokens")
    """
    counter = TokenCounter(provider=provider)
    return counter.extract_usage(response)
