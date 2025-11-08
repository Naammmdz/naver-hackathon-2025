# 📊 Token Counter Module

Module đếm và theo dõi token usage cho tất cả LLM providers với thiết kế dễ mở rộng và tái sử dụng.

---

## ✨ Tính năng

- ✅ **Multi-provider support**: Naver, OpenAI, Cerebras, Gemini
- ✅ **Tách riêng input/output tokens**: Theo dõi chi tiết token đầu vào và đầu ra
- ✅ **Session tracking**: Tổng hợp token usage qua nhiều requests
- ✅ **Decorator pattern**: Tự động track tokens cho functions
- ✅ **Context manager**: Quản lý session dễ dàng
- ✅ **Export capabilities**: Xuất dữ liệu ra JSON
- ✅ **Scalable design**: Dễ thêm provider mới

---

## 🚀 Quick Start

### 1. Import module

```python
from llm import (
    LLMFactory,
    TokenCounter,
    track_tokens,
    extract_token_usage
)
```

### 2. Cách sử dụng cơ bản

#### **Cách 1: Direct extraction (đơn giản nhất)**

```python
from llm import LLMFactory, extract_token_usage

# Tạo LLM
factory = LLMFactory()
llm = factory.create_llm(provider="openai")

# Gọi LLM
response = llm.invoke("What is artificial intelligence?")

# Extract token usage
usage = extract_token_usage(response, provider="openai")

print(f"Input tokens: {usage.input_tokens}")
print(f"Output tokens: {usage.output_tokens}")
print(f"Total tokens: {usage.total_tokens}")
```

#### **Cách 2: Với TokenCounter (tracking nhiều requests)**

```python
from llm import LLMFactory, TokenCounter

factory = LLMFactory()
llm = factory.create_llm(provider="cerebras")

# Khởi tạo counter
counter = TokenCounter(provider="cerebras")

# Thực hiện nhiều requests
prompts = [
    "What is AI?",
    "Explain machine learning",
    "What is deep learning?"
]

for prompt in prompts:
    response = llm.invoke(prompt)
    counter.track_response(response)  # Tự động extract và add

# In summary
counter.print_summary()
```

Output:
```
======================================================================
📊 Token Usage Summary - CEREBRAS
======================================================================
Total Requests: 3
Total Tokens: 450
  └─ Input Tokens: 120
  └─ Output Tokens: 330
Average per Request: 150.0
======================================================================

Detailed Breakdown:

  Request #1:
    Model: llama3.1-8b
    Input: 35 | Output: 95 | Total: 130
    Timestamp: 2025-11-08T10:30:45.123456

  Request #2:
    Model: llama3.1-8b
    Input: 42 | Output: 118 | Total: 160
    Timestamp: 2025-11-08T10:30:47.234567

  Request #3:
    Model: llama3.1-8b
    Input: 43 | Output: 117 | Total: 160
    Timestamp: 2025-11-08T10:30:49.345678
```

#### **Cách 3: Context Manager (best for sessions)**

```python
from llm import LLMFactory, TokenCounter

factory = LLMFactory()
llm = factory.create_llm(provider="gemini")

# Session tự động print summary khi kết thúc
with TokenCounter.session(provider="gemini") as counter:
    # Multiple LLM calls
    response1 = llm.invoke("Explain quantum computing")
    counter.track_response(response1)
    
    response2 = llm.invoke("What are its applications?")
    counter.track_response(response2)
    
    # Summary tự động in ra khi exit context
```

#### **Cách 4: Decorator (auto-tracking)**

```python
from llm import LLMFactory, track_tokens

factory = LLMFactory()
llm = factory.create_llm(provider="openai")

@track_tokens(provider="openai", auto_print=True)
def ask_question(prompt: str):
    return llm.invoke(prompt)

# Tự động print token usage
result = ask_question("What is the meaning of life?")
```

Output:
```
💡 Token Usage:
   Provider: openai
   Model: gpt-4o-mini
   Input: 45 tokens
   Output: 127 tokens
   Total: 172 tokens
```

---

## 📘 Structured Output Support

### Với `include_raw=True`

```python
from pydantic import BaseModel, Field
from llm import LLMFactory, TokenCounter

# Define schema
class Weather(BaseModel):
    location: str = Field(description="Địa điểm")
    temperature: float = Field(description="Nhiệt độ °C")

# Tạo structured LLM
factory = LLMFactory()
llm = factory.create_llm(provider="cerebras")
structured_llm = llm.with_structured_output(Weather, include_raw=True)

# Invoke
result = structured_llm.invoke("Hà Nội hôm nay 27 độ C")

# Extract token usage
counter = TokenCounter(provider="cerebras")
usage = counter.extract_usage(result["raw"])  # ✅ Pass raw response

print(f"Parsed: {result['parsed']}")
print(f"Tokens: {usage.total_tokens}")
```

### Với method helper trong Factory

**Option 1: Tích hợp vào Factory (recommended)**

```python
# Thêm vào llm_factory.py
def create_structured_llm_with_tracking(
    self,
    schema: type[BaseModel],
    provider: ProviderType = "naver",
    **kwargs
):
    """Create structured LLM with automatic token tracking"""
    provider_instance = self.create_provider(provider, **kwargs)
    base_llm = provider_instance.get_llm()
    
    # Always include raw for token tracking
    return base_llm.with_structured_output(schema, include_raw=True)
```

**Option 2: Wrapper function**

```python
from llm import LLMFactory, TokenCounter

def invoke_with_tracking(llm, prompt, provider="naver"):
    """Helper to invoke and track tokens"""
    response = llm.invoke(prompt)
    
    counter = TokenCounter(provider=provider)
    usage = counter.extract_usage(response)
    
    return {
        "response": response,
        "usage": usage
    }

# Usage
factory = LLMFactory()
llm = factory.create_structured_llm(Weather, provider="openai")
result = invoke_with_tracking(llm, "Weather in Tokyo", provider="openai")

print(result["response"])
print(result["usage"])
```

---

## 🔧 Advanced Features

### 1. Export to JSON

```python
from llm import TokenCounter

counter = TokenCounter(provider="naver")

# ... track multiple responses ...

# Export to file
counter.export_to_json("token_usage_report.json")
```

### 2. Get aggregated statistics

```python
summary = counter.get_summary()

print(f"Total requests: {summary['total_requests']}")
print(f"Total tokens: {summary['total_tokens']}")
print(f"Average per request: {summary['average_tokens_per_request']}")

# Access individual requests
for request in summary['requests']:
    print(request['input_tokens'], request['output_tokens'])
```

### 3. Reset counter

```python
counter.reset()  # Clear all tracked data
```

---

## 🏗️ Architecture

### Class Diagram

```
┌─────────────────┐
│  TokenUsage     │  ← Data model (Pydantic-like dataclass)
└─────────────────┘
        ↑
        │
┌─────────────────┐
│ TokenExtractor  │  ← Provider-specific extraction logic
└─────────────────┘
        ↑
        │
┌─────────────────┐
│  TokenCounter   │  ← Main API & aggregation
└─────────────────┘
        ↑
        │
┌─────────────────┐
│  Decorators &   │  ← Convenience functions
│  Utilities      │
└─────────────────┘
```

### Provider Extraction Mapping

| Provider  | Metadata Key       | Input Field         | Output Field            |
|-----------|--------------------|---------------------|-------------------------|
| Naver     | `token_usage`      | `prompt_tokens`     | `completion_tokens`     |
| OpenAI    | `token_usage`      | `prompt_tokens`     | `completion_tokens`     |
| Cerebras  | `token_usage` or `usage_metadata` | `prompt_tokens`/`input_tokens` | `completion_tokens`/`output_tokens` |
| Gemini    | `usage_metadata`   | `prompt_token_count` | `candidates_token_count` |

---

## ➕ Thêm Provider Mới

### Bước 1: Thêm extraction method vào `TokenExtractor`

```python
# Trong llm/token_counter.py

class TokenExtractor:
    # ... existing methods ...
    
    @staticmethod
    def extract_from_new_provider(response) -> TokenUsage:
        """Extract token usage from NewProvider response"""
        md = getattr(response, "response_metadata", {}) or {}
        usage = md.get("usage_info", {})  # Provider-specific key
        
        return TokenUsage(
            provider="new_provider",
            input_tokens=usage.get("input_count"),  # Provider-specific field
            output_tokens=usage.get("output_count"),
            total_tokens=usage.get("total_count"),
            model=md.get("model"),
            raw=usage
        )
```

### Bước 2: Đăng ký extractor

```python
class TokenCounter:
    EXTRACTORS = {
        "naver": TokenExtractor.extract_from_naver,
        "openai": TokenExtractor.extract_from_openai,
        "cerebras": TokenExtractor.extract_from_cerebras,
        "gemini": TokenExtractor.extract_from_gemini,
        "new_provider": TokenExtractor.extract_from_new_provider,  # ✅ Add here
    }
```

### Bước 3: Sử dụng

```python
counter = TokenCounter(provider="new_provider")
usage = counter.extract_usage(response)
```

**Chỉ cần 2 bước - rất dễ mở rộng! 🚀**

---

## 🧪 Testing

```python
# test/test_token_counter.py
from llm import LLMFactory, TokenCounter, extract_token_usage

def test_token_extraction():
    """Test token extraction across all providers"""
    factory = LLMFactory()
    providers = ["naver", "openai", "cerebras", "gemini"]
    
    for provider in providers:
        if not factory.PROVIDERS[provider].is_available():
            print(f"⚠️ Skipping {provider} - API key not set")
            continue
        
        print(f"\n✅ Testing {provider}...")
        
        llm = factory.create_llm(provider=provider)
        response = llm.invoke("Say hello")
        
        usage = extract_token_usage(response, provider=provider)
        
        assert usage.provider == provider
        assert usage.input_tokens is not None
        assert usage.output_tokens is not None
        assert usage.total_tokens is not None
        
        print(f"   Input: {usage.input_tokens}")
        print(f"   Output: {usage.output_tokens}")
        print(f"   Total: {usage.total_tokens}")

if __name__ == "__main__":
    test_token_extraction()
```

---

## 📊 Use Cases

### 1. Cost Tracking

```python
from llm import TokenCounter

# Track costs per provider
COSTS = {
    "openai": {"input": 0.00015, "output": 0.0006},  # per 1K tokens
    "cerebras": {"input": 0.0001, "output": 0.0004},
}

counter = TokenCounter(provider="openai")

# ... perform requests ...

summary = counter.get_summary()
input_cost = (summary['total_input_tokens'] / 1000) * COSTS["openai"]["input"]
output_cost = (summary['total_output_tokens'] / 1000) * COSTS["openai"]["output"]
total_cost = input_cost + output_cost

print(f"Total cost: ${total_cost:.4f}")
```

### 2. Performance Monitoring

```python
from llm import TokenCounter
import time

counter = TokenCounter(provider="cerebras")

start = time.time()
response = llm.invoke(long_prompt)
duration = time.time() - start

usage = counter.track_response(response)

tokens_per_second = usage.output_tokens / duration
print(f"Speed: {tokens_per_second:.1f} tokens/sec")
```

### 3. A/B Testing

```python
from llm import LLMFactory, TokenCounter

factory = LLMFactory()

# Test 2 providers
counters = {
    "openai": TokenCounter(provider="openai"),
    "cerebras": TokenCounter(provider="cerebras"),
}

for provider, counter in counters.items():
    llm = factory.create_llm(provider=provider)
    response = llm.invoke(test_prompt)
    counter.track_response(response)
    
# Compare
for provider, counter in counters.items():
    summary = counter.get_summary()
    print(f"{provider}: {summary['total_tokens']} tokens")
```

---

## 📝 Best Practices

1. **Luôn dùng `include_raw=True` với structured output**
   ```python
   llm.with_structured_output(Schema, include_raw=True)
   ```

2. **Dùng context manager cho sessions**
   ```python
   with TokenCounter.session(provider="openai") as counter:
       # Your code here
   ```

3. **Export data định kỳ**
   ```python
   counter.export_to_json(f"usage_{datetime.now().isoformat()}.json")
   ```

4. **Reset counter khi cần**
   ```python
   counter.reset()  # Clear data sau mỗi session
   ```

5. **Check availability trước khi test**
   ```python
   if not factory.PROVIDERS[provider].is_available():
       print(f"Skipping {provider}")
   ```

---

## 🎯 Summary

| Feature | Cách sử dụng |
|---------|-------------|
| Quick extraction | `extract_token_usage(response, provider="openai")` |
| Session tracking | `TokenCounter(provider="naver")` |
| Auto-tracking | `@track_tokens(provider="cerebras")` |
| Context manager | `with TokenCounter.session(...) as counter:` |
| Export | `counter.export_to_json("report.json")` |
| Thêm provider | Add method vào `TokenExtractor` + register |

---

✅ **Token counter đã sẵn sàng sử dụng với thiết kế scalable và dễ maintain!**
