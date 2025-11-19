# Phân tích Code Backend AI Service

## 📋 Tổng quan

**Backend AI Service** là một hệ thống RAG (Retrieval-Augmented Generation) được xây dựng bằng Python, sử dụng FastAPI để cung cấp REST API cho việc quản lý documents và trả lời câu hỏi dựa trên documents.

### Thông tin cơ bản:
- **Framework**: FastAPI
- **Database**: PostgreSQL với pgvector extension
- **Architecture Pattern**: Layered Architecture + Factory Pattern
- **AI Framework**: LangGraph, LangChain
- **Vector Search**: pgvector (PostgreSQL native)

---

## 🏗️ Kiến trúc tổng thể

### 1. Cấu trúc thư mục

```
backend-ai-service/
├── api/                    # FastAPI application layer
│   ├── main.py            # Entry point, app configuration
│   └── routes/            # API endpoints
│       ├── health.py      # Health check endpoints
│       ├── workspaces.py  # Workspace management
│       ├── documents.py   # Document management
│       └── query.py       # RAG query endpoints
│
├── agents/                # AI Agent layer
│   ├── document_agent.py # Main RAG agent
│   ├── graphs/           # LangGraph workflows
│   │   └── document_graph/
│   │       ├── nodes.py  # Workflow nodes
│   │       ├── edges.py  # Workflow edges
│   │       └── state.py  # State management
│   ├── memory/           # Memory management
│   │   ├── conversation_memory.py
│   │   ├── fact_extractor.py
│   │   └── memory_retrieval.py
│   ├── tools/            # Agent tools
│   │   └── retrieval/   # Retrieval tools
│   │       ├── vector_similarity/
│   │       ├── bm25/
│   │       ├── hybrid/
│   │       └── reranking/
│   └── prompts/          # Prompt templates
│
├── database/             # Data access layer
│   ├── connection.py     # DB connection & pooling
│   ├── models/           # SQLAlchemy models
│   │   ├── base.py
│   │   ├── workspace.py
│   │   ├── document.py
│   │   └── ai_models.py  # RAG-specific models
│   ├── repositories/     # Repository pattern
│   │   ├── base.py
│   │   ├── workspace.py
│   │   ├── document.py
│   │   └── ai_repository.py
│   └── migrations/       # Database migrations
│
├── data_preprocessing/    # Document processing pipeline
│   ├── parsing/          # Document parsers
│   │   ├── parser_factory.py
│   │   ├── docling_parser.py
│   │   └── markdown_parser.py
│   ├── chunking/         # Text chunking strategies
│   │   ├── chunker_factory.py
│   │   ├── paragraph_chunker.py
│   │   ├── fixed_size_chunker.py
│   │   ├── semantic_chunker.py
│   │   └── hierarchical_chunker.py
│   └── embedding/       # Embedding generation
│       ├── embedding_factory.py
│       ├── huggingface_embedder.py
│       └── naver_embedder.py
│
├── llm/                  # LLM abstraction layer
│   ├── llm_factory.py   # Factory for LLM providers
│   └── providers/       # LLM provider implementations
│       ├── clova.py     # Naver HyperCLOVA X
│       ├── openai.py    # OpenAI GPT
│       ├── cerebras.py  # Cerebras
│       └── gemini.py    # Google Gemini
│
├── scripts/              # Utility scripts
│   └── ingest_documents.py
│
└── utils/                # Utilities
    └── logger.py
```

---

## 🔑 Các thành phần chính

### 1. API Layer (`api/`)

#### FastAPI Application (`api/main.py`)
- **Chức năng**: Entry point của ứng dụng
- **Tính năng**:
  - CORS middleware cho cross-origin requests
  - Lifespan management (startup/shutdown)
  - Router registration với prefix `/api/v1`
  - Auto-generated API documentation (Swagger/ReDoc)

#### API Routes:
1. **Health Routes** (`health.py`):
   - `/health` - Health check với database và LLM status
   - `/ready` - Readiness check
   - `/liveness` - Liveness probe

2. **Workspace Routes** (`workspaces.py`):
   - CRUD operations cho workspaces
   - Workspace isolation cho documents

3. **Document Routes** (`documents.py`):
   - Upload và ingest documents
   - List, get, delete documents
   - Document statistics

4. **Query Routes** (`query.py`):
   - RAG query endpoint
   - Session management
   - Conversation history

---

### 2. Agent Layer (`agents/`)

#### Document Agent (`document_agent.py`)
**Kiến trúc**: LangGraph workflow

**Workflow Steps**:
1. **Query Reformulation**: Chuyển đổi câu hỏi follow-up thành standalone question
2. **Retrieval**: Hybrid search (vector + BM25)
3. **Reranking**: Sắp xếp lại kết quả theo relevance
4. **Generation**: Tạo câu trả lời với citations
5. **Fallback**: Xử lý khi không tìm thấy relevant documents

**Features**:
- Multi-step reasoning với LangGraph
- Conversation memory integration
- Citation extraction
- Confidence scoring

#### Graph Nodes (`agents/graphs/document_graph/nodes.py`)
- `reformulate_query_node`: Reformulate queries với context
- `retrieve_node`: Hybrid search
- `rerank_node`: Relevance reranking
- `generate_answer_node`: LLM generation với citations
- `fallback_node`: Handle no results case

#### Memory System (`agents/memory/`)
- **Conversation Memory**: Short-term memory cho conversations
- **Fact Extractor**: Extract facts từ Q&A pairs
- **Memory Retrieval**: Retrieve relevant context từ memory

#### Retrieval Tools (`agents/tools/retrieval/`)
- **Vector Similarity Search**: Semantic search với embeddings
- **BM25 Search**: Keyword-based search (disabled by default)
- **Hybrid Search**: Kết hợp vector + BM25
- **Reranker**: Cross-encoder reranking model

---

### 3. Data Access Layer (`database/`)

#### Database Connection (`connection.py`)
- **Connection Pooling**: QueuePool với 10 connections, max 20 overflow
- **Session Management**: Context manager pattern
- **Connection Health**: Pool pre-ping, auto-recycle

#### Models (`database/models/`)
**Core Models**:
- `Workspace`: Workspace isolation
- `Document`: Document metadata
- `Task`: Task management (from core service)

**AI Models** (`ai_models.py`):
- `DocumentChunk`: Chunks với vector embeddings (1024-dim)
- `Conversation`: Chat history
- `LongTermMemory`: Learned knowledge
- `AgentAction`: Agent action logs
- `HITLFeedback`: Human-in-the-loop feedback

#### Repository Pattern (`database/repositories/`)
- **BaseRepository**: Generic CRUD operations
- **Specialized Repositories**:
  - `DocumentChunkRepository`: Vector search queries
  - `ConversationRepository`: Session management
  - `LongTermMemoryRepository`: Memory retrieval
  - `AgentActionRepository`: Action logging

---

### 4. Data Preprocessing Pipeline (`data_preprocessing/`)

#### Document Parsing (`parsing/`)
**Parser Factory Pattern**:
- **DoclingParser**: Universal parser (PDF, DOCX, PPTX, images)
  - OCR support
  - Table extraction
  - Markdown output
- **MarkdownParser**: Markdown-specific parsing
  - Frontmatter extraction
  - Code blocks
  - Tables

#### Text Chunking (`chunking/`)
**Chunking Strategies**:
1. **Paragraph Chunker** (default): Chunk theo paragraphs
2. **Fixed Size Chunker**: Fixed-size chunks với overlap
3. **Semantic Chunker**: Chunk dựa trên semantic similarity
4. **Hierarchical Chunker**: Multi-level chunking

**Configuration**:
- Chunk size: 2000 chars
- Overlap: 50 chars
- Method: paragraph (configurable)

#### Embedding Generation (`embedding/`)
**Embedding Providers**:
- **Naver Embedder** (default): `bge-m3` model (1024 dimensions)
- **HuggingFace Embedder**: `Qwen/Qwen3-Embedding-0.6B`

**Features**:
- Batch processing
- Configurable batch size
- Model metadata tracking

---

### 5. LLM Layer (`llm/`)

#### LLM Factory (`llm_factory.py`)
**Factory Pattern** cho multi-provider support:

**Supported Providers**:
1. **Naver HyperCLOVA X** (default)
   - Model: HCX-007
   - Vietnamese language support
2. **OpenAI**
   - Model: gpt-4o-mini
3. **Cerebras**
   - Model: qwen-3-32b
4. **Google Gemini**
   - Model: gemini-2.0-flash-lite

**Features**:
- Structured output support
- Token counting
- Provider abstraction
- Config-based initialization

---

## 🔄 Data Flow

### Document Ingestion Flow:
```
1. Upload Document (API)
   ↓
2. Parse Document (DoclingParser/MarkdownParser)
   ↓
3. Chunk Text (Paragraph/Fixed/Semantic Chunker)
   ↓
4. Generate Embeddings (Naver/HuggingFace Embedder)
   ↓
5. Store in Database
   - Document record
   - DocumentChunk records với embeddings
```

### Query Flow (RAG):
```
1. User Query (API)
   ↓
2. Query Reformulation (nếu có conversation history)
   ↓
3. Hybrid Retrieval
   - Vector similarity search
   - BM25 search (optional)
   - Combine results
   ↓
4. Reranking
   - Cross-encoder reranker
   ↓
5. Context Retrieval
   - Conversation memory
   - Long-term memory
   ↓
6. LLM Generation
   - Prompt với retrieved chunks
   - Generate answer với citations
   ↓
7. Store Conversation
   - User question
   - Assistant answer
   - Extract facts
```

---

## 🎯 Design Patterns

### 1. Factory Pattern
- **LLM Factory**: Tạo LLM instances từ multiple providers
- **Parser Factory**: Tạo parsers dựa trên file type
- **Chunker Factory**: Tạo chunkers dựa trên strategy
- **Embedding Factory**: Tạo embedders dựa trên provider

### 2. Repository Pattern
- **BaseRepository**: Generic CRUD operations
- **Specialized Repositories**: Domain-specific queries
- **Abstraction**: Tách biệt data access logic

### 3. Strategy Pattern
- **Chunking Strategies**: Multiple chunking algorithms
- **Retrieval Strategies**: Vector, BM25, Hybrid
- **LLM Providers**: Swappable LLM backends

### 4. Workflow Pattern (LangGraph)
- **State-based workflow**: DocumentGraphState
- **Node-based processing**: Mỗi node là một step
- **Conditional routing**: Dựa trên state

---

## 🔧 Configuration

### Config File (`config.yml`)
**Sections**:
1. **Data Preprocessing**:
   - Parsing config (OCR, table extraction)
   - Chunking config (method, size, overlap)
   - Embedding config (provider, model, batch size)

2. **LLM**:
   - Default provider
   - Provider-specific configs
   - Model, temperature, max_tokens

3. **Retrieval**:
   - Vector similarity settings
   - BM25 settings (disabled by default)
   - Reranker config

### Environment Variables (`.env`)
- `NEONDB`: PostgreSQL connection string
- `NAVER_CLIENT_ID`: Naver API credentials
- `NAVER_CLIENT_SECRET`: Naver API credentials
- `OPENAI_API_KEY`: OpenAI API key
- `GOOGLE_API_KEY`: Google API key
- `CEREBRAS_API_KEY`: Cerebras API key

---

## 📊 Database Schema

### Core Tables:
- `workspaces`: Workspace isolation
- `documents`: Document metadata
- `tasks`: Task management

### RAG Tables:
- `document_chunks`: 
  - Vector embeddings (pgvector)
  - Chunk text và metadata
  - Indexes cho fast retrieval
  
- `conversations`:
  - Chat history
  - Session management
  - Confidence scores
  
- `long_term_memory`:
  - Learned knowledge
  - Confidence tracking
  - Access patterns
  
- `agent_actions`:
  - Action logging
  - Debugging support
  
- `hitl_feedback`:
  - Human feedback
  - Quality improvement

---

## 🚀 Key Features

### 1. Multi-Provider Support
- **LLM**: 4 providers (Naver, OpenAI, Cerebras, Gemini)
- **Embedding**: 2 providers (Naver, HuggingFace)
- **Easy switching**: Config-based

### 2. Advanced Retrieval
- **Hybrid Search**: Vector + BM25
- **Reranking**: Cross-encoder model
- **Multi-strategy**: Configurable

### 3. Memory System
- **Short-term**: Conversation history
- **Long-term**: Learned facts
- **Context-aware**: Query reformulation

### 4. Document Processing
- **Universal Parser**: Docling (PDF, DOCX, PPTX, images)
- **Multiple Chunking**: 4 strategies
- **Vietnamese Support**: underthesea tokenizer

### 5. Production Ready
- **Connection Pooling**: Database optimization
- **Error Handling**: Comprehensive error handling
- **Logging**: Structured logging
- **Health Checks**: Monitoring endpoints

---

## 🔍 Code Quality

### Strengths:
✅ **Clean Architecture**: Clear separation of concerns
✅ **Design Patterns**: Factory, Repository, Strategy
✅ **Type Safety**: Type hints throughout
✅ **Documentation**: Docstrings và comments
✅ **Modularity**: Easy to extend
✅ **Configuration**: YAML-based config
✅ **Error Handling**: Try-catch blocks
✅ **Logging**: Structured logging

### Areas for Improvement:
⚠️ **Testing**: No test files visible
⚠️ **Validation**: Could use Pydantic models more extensively
⚠️ **Async**: Some operations could be async
⚠️ **Caching**: No caching layer visible
⚠️ **Rate Limiting**: No rate limiting
⚠️ **Authentication**: No auth middleware

---

## 📈 Performance Considerations

### Optimizations:
1. **Connection Pooling**: Database connections reused
2. **Batch Processing**: Embeddings generated in batches
3. **Vector Indexes**: pgvector indexes for fast search
4. **Query Optimization**: Indexed columns

### Potential Bottlenecks:
1. **Embedding Generation**: CPU/GPU intensive
2. **LLM Calls**: Network latency
3. **Vector Search**: Large datasets
4. **Document Parsing**: Large files

---

## 🔐 Security Considerations

### Current State:
- ✅ CORS configured
- ✅ SQL injection protection (SQLAlchemy ORM)
- ⚠️ No authentication
- ⚠️ No rate limiting
- ⚠️ API keys in environment (good)

### Recommendations:
- Add authentication middleware
- Implement rate limiting
- Add input validation
- Sanitize file uploads
- Add audit logging

---

## 📝 Dependencies

### Core:
- FastAPI: Web framework
- SQLAlchemy: ORM
- pgvector: Vector search
- LangGraph: Agent workflows
- LangChain: LLM abstraction

### AI/ML:
- sentence-transformers: Embeddings
- transformers: HuggingFace models
- docling: Document parsing
- underthesea: Vietnamese NLP

### LLM Providers:
- langchain-naver
- langchain-openai
- langchain-cerebras
- langchain-google-genai

---

## 🎓 Learning Points

1. **RAG Architecture**: Complete RAG pipeline implementation
2. **LangGraph**: State-based agent workflows
3. **Vector Search**: pgvector integration
4. **Multi-Provider**: Abstraction pattern
5. **Factory Pattern**: Extensibility
6. **Repository Pattern**: Data access abstraction

---

## 📚 Tài liệu tham khảo

- API Documentation: http://localhost:8000/docs
- Code structure: Xem các file README trong từng module
- Config: `config.yml`
- Setup: `README_SETUP.md`, `QUICKSTART.md`

---

## 🔄 Workflow Diagram

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ HTTP Request
       ▼
┌─────────────────┐
│  FastAPI Routes │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│ Document Agent  │
│  (LangGraph)    │
└──────┬──────────┘
       │
       ├──► Retrieval ──► Vector Search ──► Database
       │
       ├──► Reranking ──► Cross-encoder
       │
       ├──► Memory ──► Conversation/Long-term
       │
       └──► Generation ──► LLM ──► Answer + Citations
```

---

**Tóm lại**: Đây là một hệ thống RAG được thiết kế tốt với kiến trúc rõ ràng, hỗ trợ multi-provider, và có khả năng mở rộng cao. Code quality tốt với việc sử dụng design patterns phù hợp.

