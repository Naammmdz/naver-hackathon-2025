# LLM Module - Multi-Provider Support với Structured Output

Module LLM hỗ trợ nhiều providers khác nhau với khả năng structured output (trích xuất dữ liệu có cấu trúc).

## 🚀 Providers được hỗ trợ

- ✅ **Naver HyperCLOVA X** - Model tiếng Việt mạnh mẽ
- ✅ **OpenAI** - GPT-4o, GPT-4o-mini, GPT-3.5-turbo
- ✅ **Cerebras** - Llama 3.1 với tốc độ cực nhanh
- ✅ **Google Gemini** - Gemini 1.5 Flash/Pro

## 📦 Cài đặt

```bash
pip install -r requirements.txt
```

## 🔑 Cấu hình API Keys

Tạo file `.env` với các API keys:

```properties
# Naver HyperCLOVA X
CLOVASTUDIO_API_KEY=your_naver_api_key

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Cerebras
CEREBRAS_API_KEY=your_cerebras_api_key

# Google Gemini
GEMINI_API_KEY=your_gemini_api_key
```

## ⚙️ Cấu hình Models

Chỉnh sửa `config.yml` để cấu hình các models:

```yaml
llm:
  default_provider: "naver"
  
  providers:
    naver:
      model: "HCX-007"
      temperature: 0.1
      max_tokens: 2000
      system_prompt: "Bạn là một trợ lý AI..."
    
    openai:
      model: "gpt-4o-mini"
      temperature: 0.1
      max_tokens: 2000
      system_prompt: "You are a helpful assistant..."
```

## 💻 Sử dụng

### 1. Sử dụng cơ bản

```python
from llm import LLMFactory
from langchain_core.messages import HumanMessage

# Khởi tạo factory
factory = LLMFactory()

# Tạo LLM với provider mặc định (Naver)
llm = factory.create_llm()

# Hoặc chọn provider cụ thể
llm_openai = factory.create_llm("openai")
llm_cerebras = factory.create_llm("cerebras")
llm_gemini = factory.create_llm("gemini")

# Sử dụng
response = llm.invoke([HumanMessage(content="Hello!")])
print(response.content)
```

### 2. Structured Output (Trích xuất dữ liệu có cấu trúc)

```python
from llm import LLMFactory
from pydantic import BaseModel, Field
from typing import List
from langchain_core.messages import HumanMessage, SystemMessage

# Định nghĩa schema với Pydantic
class Person(BaseModel):
    """Thông tin về một người"""
    name: str = Field(description="Tên đầy đủ")
    age: int = Field(description="Tuổi")
    occupation: str = Field(description="Nghề nghiệp")

class PeopleList(BaseModel):
    """Danh sách người"""
    people: List[Person] = Field(description="Danh sách các người")
    total: int = Field(description="Tổng số người")

# Khởi tạo
factory = LLMFactory()

# Tạo structured LLM
llm = factory.create_structured_llm(
    schema=PeopleList,
    provider="naver"  # hoặc "openai", "cerebras", "gemini"
)

# Sử dụng
text = "John là kỹ sư 30 tuổi. Mary là bác sĩ 28 tuổi."
messages = [
    SystemMessage(content="Bạn là trợ lý AI."),
    HumanMessage(content=f"Trích xuất thông tin từ: {text}")
]

result = llm.invoke(messages)

# Truy cập dữ liệu structured
print(f"Tổng số người: {result.total}")
for person in result.people:
    print(f"- {person.name}, {person.age} tuổi, nghề {person.occupation}")
```

### 3. So sánh nhiều Providers

```python
from llm import LLMFactory

factory = LLMFactory()

# Test cùng một schema với nhiều providers
providers = ["naver", "openai", "cerebras", "gemini"]

for provider in providers:
    try:
        llm = factory.create_structured_llm(MySchema, provider)
        result = llm.invoke(messages)
        print(f"{provider}: {result}")
    except Exception as e:
        print(f"{provider} failed: {e}")
```

### 4. Kiểm tra Providers có sẵn

```python
from llm import LLMFactory

factory = LLMFactory()

# Liệt kê tất cả providers
factory.list_providers()

# Kiểm tra providers có API key
available = factory.get_available_providers()
print(available)
# {'naver': True, 'openai': True, 'cerebras': False, 'gemini': True}
```

### 5. Override Configuration

```python
from llm import LLMFactory

factory = LLMFactory()

# Override model và temperature
llm = factory.create_llm(
    provider="openai",
    model="gpt-4o",  # Thay vì gpt-4o-mini
    temperature=0.5,  # Thay vì 0.1
    max_tokens=4000
)
```

## 🎯 Ví dụ thực tế

### Trích xuất thông tin nhân viên

```python
from llm import LLMFactory
from pydantic import BaseModel, Field
from typing import List
from langchain_core.messages import HumanMessage

class Employee(BaseModel):
    name: str = Field(description="Tên nhân viên")
    position: str = Field(description="Chức vụ")
    experience_years: int = Field(description="Số năm kinh nghiệm")

class EmployeeList(BaseModel):
    employees: List[Employee] = Field(description="Danh sách nhân viên")
    count: int = Field(description="Tổng số nhân viên")

# Khởi tạo
factory = LLMFactory()
llm = factory.create_structured_llm(EmployeeList, "naver")

# Text cần trích xuất
text = """
Công ty vừa tuyển anh Nguyễn Văn A, 5 năm kinh nghiệm làm Backend Developer.
Chị Trần Thị B, 10 năm kinh nghiệm, là Project Manager.
"""

# Trích xuất
result = llm.invoke([HumanMessage(content=f"Trích xuất: {text}")])

# Sử dụng kết quả
import json
print(json.dumps(result.model_dump(), indent=2, ensure_ascii=False))
```

### Phân tích cảm xúc

```python
from enum import Enum

class Sentiment(str, Enum):
    POSITIVE = "positive"
    NEGATIVE = "negative"
    NEUTRAL = "neutral"

class SentimentAnalysis(BaseModel):
    text: str = Field(description="Text gốc")
    sentiment: Sentiment = Field(description="Cảm xúc")
    confidence: float = Field(description="Độ tin cậy (0-1)")
    reason: str = Field(description="Lý do phân tích")

factory = LLMFactory()
llm = factory.create_structured_llm(SentimentAnalysis, "openai")

result = llm.invoke([
    HumanMessage(content="Phân tích: Sản phẩm tuyệt vời, tôi rất hài lòng!")
])

print(f"Cảm xúc: {result.sentiment}")
print(f"Độ tin cậy: {result.confidence}")
print(f"Lý do: {result.reason}")
```

## 🧪 Testing

Chạy demo để test tất cả providers:

```bash
python demo_llm_factory.py
```

Test một provider cụ thể:

```bash
python test_naver_quick.py
```

Test với file test.py gốc:

```bash
python test.py
```

## 📁 Cấu trúc thư mục

```
llm/
├── __init__.py              # Module exports
├── llm_factory.py           # Factory chính
└── providers/
    ├── __init__.py
    ├── clova.py            # Naver HyperCLOVA X
    ├── openai.py           # OpenAI GPT models
    ├── cerebras.py         # Cerebras Llama models
    └── gemini.py           # Google Gemini
```

## 🔧 API Reference

### LLMFactory

#### Methods:

- `create_llm(provider, **kwargs)` - Tạo LLM instance
- `create_structured_llm(schema, provider, **kwargs)` - Tạo structured LLM
- `create_provider(provider, **kwargs)` - Tạo provider instance
- `get_available_providers()` - Danh sách providers có sẵn
- `list_providers()` - In thông tin tất cả providers
- `get_system_prompt(provider)` - Lấy system prompt của provider

### Provider Classes

Mỗi provider (ClovaProvider, OpenAIProvider, etc.) có:

- `__init__(model, temperature, max_tokens, api_key, **kwargs)` - Khởi tạo
- `get_llm()` - Lấy base LLM
- `get_structured_llm(schema)` - Lấy structured LLM
- `get_config()` - Lấy cấu hình hiện tại
- `is_available()` - Kiểm tra provider có sẵn không (static method)

## ⚠️ Lưu ý quan trọng

### Naver HyperCLOVA X

- **BẮT BUỘC** phải có: `thinking={"effort": "none"}` và `disabled_params={"parallel_tool_calls": None}`
- API key được đọc từ environment variable `CLOVASTUDIO_API_KEY`
- Pydantic fields **PHẢI** có `description` để tránh lỗi API

### OpenAI

- Hỗ trợ đầy đủ structured output với function calling
- Models: gpt-4o, gpt-4o-mini, gpt-3.5-turbo, etc.

### Cerebras

- Cực nhanh cho inference
- Models: llama3.1-8b, llama3.1-70b

### Gemini

- Hỗ trợ tốt structured output
- Models: gemini-1.5-flash, gemini-1.5-pro, gemini-2.0-flash-lite

## 🐛 Troubleshooting

### Lỗi: "API key not found"

Kiểm tra file `.env` có chứa API key đúng format không.

### Lỗi: "Invalid parameter: tools[].function.description" (Naver)

Đảm bảo tất cả Pydantic Fields có `description`:

```python
# ❌ Sai
class MyModel(BaseModel):
    name: str = Field()

# ✅ Đúng
class MyModel(BaseModel):
    name: str = Field(description="Tên")
```

### Lỗi: "model validation error"

Kiểm tra schema Pydantic có hợp lệ không, đặc biệt các type hints.

## 📄 License

MIT License

## 👥 Contributors

- Your Team

---

**Happy coding! 🎉**
