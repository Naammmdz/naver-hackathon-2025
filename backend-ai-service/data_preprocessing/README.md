# 📊 Data Preprocessing Module

Complete pipeline for processing documents for RAG (Retrieval-Augmented Generation).

## 🏗️ Architecture

```
data_preprocessing/
├── parsing/          ✅ Document parsing (PDF, DOCX, Markdown)
├── chunking/         ✅ Text chunking strategies
├── embedding/        ✅ Embedding generation
└── demo_chunking_embedding.py  ✅ Demo script
```

---

## 📦 Modules

### 1. Parsing (Already Implemented)

See `parsing/README.md` for details.

**Supported formats**: PDF, DOCX, PPTX, Markdown, HTML, TXT, Images (with OCR)

### 2. Chunking (NEW)

Split documents into smaller chunks for better retrieval.

**Available strategies**:

| Strategy | Description | Use Case | Status |
|----------|-------------|----------|--------|
| `paragraph` | Split by paragraphs | **Recommended** - Natural structure | ✅ |
| `fixed` | Fixed-size chunks | Uniform sizes needed | ✅ |
| `semantic` | Similarity-based | Semantic coherence critical | ⚠️ Placeholder |
| `hierarchical` | Parent-child chunks | Structured documents | ⚠️ Placeholder |

**Usage**:

```python
from data_preprocessing.chunking import ChunkerFactory

# From config
chunker = ChunkerFactory.from_config()

# Or programmatically
chunker = ChunkerFactory.create_chunker(
    method="paragraph",
    chunk_size=768,
    overlap=50
)

chunks = chunker.chunk(document_text)
```

### 3. Embedding (NEW)

Generate vector embeddings for semantic search.

**Available providers**:

| Provider | Model | Dimensions | Status |
|----------|-------|------------|--------|
| `huggingface` | Qwen3-Embedding-0.6B | 768 | ✅ |
| `huggingface` | paraphrase-multilingual-MiniLM | 384 | ✅ |
| `naver` | clir-emb-dolphin | 768 | ⚠️ Placeholder |

**Usage**:

```python
from data_preprocessing.embedding import EmbeddingFactory

# From config
embedder = EmbeddingFactory.from_config()

# Or programmatically
embedder = EmbeddingFactory.create_embedder(
    provider="huggingface",
    model_name="Qwen/Qwen3-Embedding-0.6B",
    batch_size=16,
    device="cpu"  # or "cuda" for GPU
)

result = embedder.embed_batch(texts)
# result.embeddings: List[np.ndarray]
# result.dimensions: int
```

---

## 🚀 Quick Start

### Installation

```bash
# Core dependencies (already in requirements.txt)
pip install PyYAML numpy

# For HuggingFace embeddings
pip install sentence-transformers torch

# For better performance (optional)
pip install faiss-cpu  # Vector search
```

### Basic Usage

```python
from data_preprocessing.chunking import ChunkerFactory
from data_preprocessing.embedding import EmbeddingFactory

# 1. Chunk document
chunker = ChunkerFactory.from_config()
chunks = chunker.chunk(document_text)

# 2. Generate embeddings
embedder = EmbeddingFactory.from_config()
chunk_texts = [chunk.text for chunk in chunks]
result = embedder.embed_batch(chunk_texts)

# 3. Use embeddings
for chunk, embedding in zip(chunks, result.embeddings):
    print(f"Chunk: {chunk.text[:50]}...")
    print(f"Embedding: {embedding.shape}")
```

### Run Demo

```bash
python data_preprocessing/demo_chunking_embedding.py
```

---

## ⚙️ Configuration

Edit `config.yml`:

```yaml
data_preprocessing:
  chunking:
    method: "paragraph"       # paragraph | fixed | semantic | hierarchical
    chunk_size: 768           # Target chunk size (characters)
    overlap: 50               # Overlap between chunks
  
  embedding:
    provider: huggingface     # huggingface | naver
    huggingface:
      model: "Qwen/Qwen3-Embedding-0.6B"
      batch_size: 16
    naver:
      model: "clir-emb-dolphin"
      batch_size: 16
```

---

## 📊 Complete Pipeline Example

```python
from data_preprocessing.parsing import ParserFactory
from data_preprocessing.chunking import ChunkerFactory
from data_preprocessing.embedding import EmbeddingFactory

# 1. Parse document
parser = ParserFactory.create_parser("docling")
parse_result = parser.parse("document.pdf")

# 2. Chunk text
chunker = ChunkerFactory.create_chunker(
    method="paragraph",
    chunk_size=768,
    overlap=50
)
chunks = chunker.chunk(parse_result.text)

# 3. Generate embeddings
embedder = EmbeddingFactory.create_embedder(
    provider="huggingface",
    model_name="Qwen/Qwen3-Embedding-0.6B"
)
chunk_texts = [chunk.text for chunk in chunks]
embeddings = embedder.embed_batch(chunk_texts)

# 4. Store to database (next step)
# for chunk, embedding in zip(chunks, embeddings.embeddings):
#     save_to_database(chunk, embedding)
```

---

## 🧪 Testing

```bash
# Test chunking
python -c "
from data_preprocessing.chunking import ChunkerFactory
chunker = ChunkerFactory.create_chunker('paragraph', chunk_size=500)
chunks = chunker.chunk('Sample text here...')
print(f'Generated {len(chunks)} chunks')
"

# Test embedding
python -c "
from data_preprocessing.embedding import EmbeddingFactory
embedder = EmbeddingFactory.create_embedder('huggingface')
result = embedder.embed_batch(['Text 1', 'Text 2'])
print(f'Generated {len(result)} embeddings, dimension: {result.dimensions}')
"
```

---

## 📈 Performance Tips

### Chunking
- **Use `paragraph` method** for most documents (preserves structure)
- Set `chunk_size` based on your embedding model's max tokens
- Use 10-15% overlap for better context preservation

### Embedding
- **Batch processing**: Process multiple chunks at once
- **GPU acceleration**: Use `device="cuda"` if you have GPU
- **Model selection**:
  - Fast: `paraphrase-multilingual-MiniLM-L12-v2` (384 dim)
  - Balanced: `Qwen/Qwen3-Embedding-0.6B` (768 dim)
  - High quality: `intfloat/multilingual-e5-large` (1024 dim)

---

## 🔄 Integration with RAG Pipeline

```
┌─────────────┐
│  Document   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Parsing   │  (parsing/)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Chunking   │  (chunking/)  ← YOU ARE HERE
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Embedding  │  (embedding/) ← YOU ARE HERE
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Store DB   │  (database/models/)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Vector Index│  (agents/tools/retrieval/)
└─────────────┘
```

---

## 🚧 Roadmap

### ✅ Completed
- [x] Base chunker interface
- [x] Paragraph chunker (recommended)
- [x] Fixed-size chunker
- [x] Base embedder interface
- [x] HuggingFace embedder
- [x] Factory patterns
- [x] Configuration support
- [x] Demo script

### ⚠️ In Progress
- [ ] Semantic chunker (needs sentence tokenizer)
- [ ] Hierarchical chunker (needs document structure analysis)
- [ ] Naver CLOVA embedder (needs API integration)

### 📋 Planned
- [ ] Caching layer for embeddings
- [ ] Batch database insertion
- [ ] Async processing for large documents
- [ ] Progress tracking for long operations
- [ ] Metrics and monitoring

---

## 🐛 Troubleshooting

### Import errors
```bash
# Install sentence-transformers
pip install sentence-transformers

# Install numpy
pip install numpy
```

### Out of memory
```python
# Reduce batch size
embedder = EmbeddingFactory.create_embedder(
    provider="huggingface",
    batch_size=8  # Smaller batch
)
```

### Slow embedding
```python
# Use GPU if available
embedder = EmbeddingFactory.create_embedder(
    provider="huggingface",
    device="cuda"  # Use GPU
)

# Or use smaller model
embedder = EmbeddingFactory.create_embedder(
    provider="huggingface",
    model_name="sentence-transformers/all-MiniLM-L6-v2"  # Faster
)
```

---

## 📚 References

- **Chunking strategies**: [LangChain Text Splitters](https://python.langchain.com/docs/modules/data_connection/document_transformers/)
- **Embedding models**: [MTEB Leaderboard](https://huggingface.co/spaces/mteb/leaderboard)
- **RAG best practices**: [Pinecone RAG Guide](https://www.pinecone.io/learn/retrieval-augmented-generation/)

---

**Last Updated**: November 12, 2025  
**Status**: ✅ Chunking & Embedding implemented  
**Next Step**: Database integration (store chunks + embeddings)
