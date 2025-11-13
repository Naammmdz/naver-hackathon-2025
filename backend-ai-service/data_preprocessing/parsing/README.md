# Document Parsing Module

Professional document parsing system using Docling and Markdown parsers.

## 🎯 Features

### Supported Formats

- **PDF** - With OCR support for scanned documents
- **DOCX/DOC** - Microsoft Word documents
- **PPTX/PPT** - Microsoft PowerPoint presentations
- **XLSX/XLS** - Microsoft Excel spreadsheets
- **HTML/HTM** - Web pages
- **Images** - JPG, JPEG, PNG (with OCR)
- **Markdown** - .md, .markdown files and raw markdown content
- **Plain Text** - .txt files

### Key Capabilities

✅ **Universal Parsing** - Single interface for all document types  
✅ **OCR Support** - Extract text from scanned documents and images  
✅ **Table Extraction** - Preserve table structure from documents  
✅ **Metadata Extraction** - File info, page count, author, etc.  
✅ **Vietnamese Support** - Full UTF-8 and Vietnamese text handling  
✅ **Configurable** - All settings via `config.yml`  
✅ **Clean Architecture** - Factory pattern, abstract base class  
✅ **Error Handling** - Comprehensive error handling and logging  

## 📦 Installation

```bash
# Install required dependencies
pip install docling docling-core
pip install markdown python-frontmatter
pip install underthesea  # For Vietnamese text processing
```

## 🚀 Quick Start

### Basic Usage

```python
from data_preprocessing.parsing import ParserFactory

# Load config
import yaml
with open('config.yml') as f:
    config = yaml.safe_load(f)

# Auto-detect parser from file extension
parser = ParserFactory.create_parser(config=config, source='document.pdf')
result = parser.parse('document.pdf')

print(f"Text: {result.text[:100]}...")
print(f"Pages: {result.metadata['pages']}")
print(f"Tables: {result.metadata['tables_count']}")
```

### Explicit Parser Type

```python
# Use Docling for PDFs
docling_parser = ParserFactory.create_parser('docling', config)
result = docling_parser.parse('report.pdf')

# Use Markdown parser
md_parser = ParserFactory.create_parser('markdown', config)
result = md_parser.parse('notes.md')
```

### Parse Raw Content

```python
# Parse markdown string
markdown_content = """
# Project Report

## Overview
This is a test document.
"""

parser = ParserFactory.create_parser('markdown', config)
result = parser.parse(markdown_content)
print(result.text)
```

### Parse from Bytes

```python
# Upload file scenario
with open('document.pdf', 'rb') as f:
    file_bytes = f.read()

parser = ParserFactory.create_parser('docling', config)
result = parser.parse(file_bytes)
```

## 🏗️ Architecture

### Class Hierarchy

```
BaseParser (Abstract)
├── DoclingParser - Universal document parser
└── MarkdownParser - Markdown and text parser

ParserFactory - Creates appropriate parser
```

### ParsingResult Structure

```python
@dataclass
class ParsingResult:
    text: str                           # Extracted plain text
    metadata: Dict[str, Any]            # File info, stats, etc.
    paragraphs: List[str]               # List of paragraphs
    headings: List[Dict[str, Any]]      # Document headings
    tables: List[Dict[str, Any]]        # Extracted tables
    images: List[Dict[str, Any]]        # Image references
    raw_data: Optional[Any]             # Raw parser output
    success: bool                       # Parse success status
    error: Optional[str]                # Error message if failed
```

## ⚙️ Configuration

All parsing settings are in `config.yml`:

```yaml
data_preprocessing:
  parsing:
    encoding: "utf-8"
    
    # Docling configuration (universal document parser)
    docling:
      ocr_enabled: true                    # Enable OCR for scanned docs
      table_extraction: true               # Extract tables
      output_format: "markdown"            # Output format
      max_file_size_mb: 50                # Max file size
    
    # Markdown configuration
    markdown:
      extensions:                          # Python-Markdown extensions
        - "extra"
        - "meta"
        - "toc"
        - "tables"
        - "fenced_code"
      parse_frontmatter: true              # Extract YAML frontmatter
      preserve_formatting: true            # Keep markdown formatting
    
    # Text preprocessing
    preprocessing:
      remove_stopwords: false              # Remove stopwords
      lowercase: false                     # Convert to lowercase
      remove_urls: false                   # Remove URLs
      remove_emails: false                 # Remove emails
      min_text_length: 50                  # Minimum text length
```

## 📚 API Reference

### ParserFactory

**Main Methods:**

```python
# Create parser
parser = ParserFactory.create_parser(
    parser_type='docling',  # Optional: 'docling' or 'markdown'
    config=config,          # Required: config dict
    source='file.pdf'       # Optional: for auto-detection
)

# Get parser for specific file
parser = ParserFactory.get_parser_for_file('document.pdf', config)

# Check if file is supported
is_supported = ParserFactory.is_supported('file.pdf')  # True

# Get supported extensions
extensions = ParserFactory.get_supported_extensions()
# {'pdf', 'docx', 'md', 'txt', ...}

# Get available parsers
parsers = ParserFactory.get_available_parsers()
# ['docling', 'markdown']
```

### BaseParser

**Common Interface:**

```python
class BaseParser(ABC):
    def parse(self, source: Union[str, Path, bytes]) -> ParsingResult:
        """Parse document from file, path, or bytes"""
        
    def supports(self, source: Union[str, Path]) -> bool:
        """Check if parser supports this source"""
```

### DoclingParser

**Docling-Specific Features:**

```python
parser = DoclingParser(config)

# Parse any supported document
result = parser.parse('document.pdf')

# Access extracted data
print(result.text)                    # Plain text
print(result.metadata['pages'])       # Page count
print(result.tables)                  # Extracted tables
print(result.images)                  # Image references
```

### MarkdownParser

**Markdown-Specific Features:**

```python
parser = MarkdownParser(config)

# Parse markdown file
result = parser.parse('notes.md')

# Parse markdown string
result = parser.parse('# Title\n\nContent')

# Access structure
print(result.headings)                # Document headings
print(result.paragraphs)              # Paragraphs
print(result.metadata['has_frontmatter'])  # Frontmatter present?
```

## 🔍 Examples

### Example 1: Process Multiple Documents

```python
from pathlib import Path
from data_preprocessing.parsing import ParserFactory

# Load config
import yaml
with open('config.yml') as f:
    config = yaml.safe_load(f)

# Process all documents in a folder
documents_dir = Path('documents')

for file_path in documents_dir.glob('**/*'):
    if file_path.is_file() and ParserFactory.is_supported(file_path):
        try:
            parser = ParserFactory.get_parser_for_file(file_path, config)
            result = parser.parse(file_path)
            
            if result.success:
                print(f"✓ {file_path.name}: {len(result.text)} chars")
            else:
                print(f"✗ {file_path.name}: {result.error}")
        
        except Exception as e:
            print(f"✗ {file_path.name}: {e}")
```

### Example 2: Extract Tables from PDF

```python
from data_preprocessing.parsing import DoclingParser

parser = DoclingParser(config)
result = parser.parse('financial_report.pdf')

# Print extracted tables
for idx, table in enumerate(result.tables):
    print(f"Table {idx + 1}:")
    print(f"  Rows: {table['rows']}")
    print(f"  Columns: {table['cols']}")
    if 'data' in table:
        print(f"  Data: {table['data'][:3]}...")  # First 3 rows
```

### Example 3: Parse User-Written Markdown

```python
from data_preprocessing.parsing import MarkdownParser

parser = MarkdownParser(config)

# Markdown from web editor
user_content = """
---
title: Project Notes
author: User
date: 2025-01-10
---

# Meeting Notes

## Action Items
- [ ] Review code
- [ ] Update documentation

## Code Example
```python
def hello():
    print("Hello, World!")
```
"""

result = parser.parse(user_content)

print(f"Title: {result.metadata.get('title')}")
print(f"Author: {result.metadata.get('author')}")
print(f"Headings: {len(result.headings)}")
print(f"Code blocks: {result.metadata['code_blocks_count']}")
```

### Example 4: Handle Errors Gracefully

```python
from data_preprocessing.parsing import ParserFactory

parser = ParserFactory.create_parser('docling', config)

# Try to parse a file
result = parser.parse('large_file.pdf')

if result.success:
    print(f"Success! Extracted {len(result.text)} characters")
    print(f"Metadata: {result.metadata}")
else:
    print(f"Failed: {result.error}")
    print(f"Error type: {result.metadata.get('error_type')}")
```

## 🧪 Testing

```python
# Run tests
python -m pytest data_preprocessing/parsing/tests/

# Test specific parser
python -m pytest data_preprocessing/parsing/tests/test_docling_parser.py

# Test with coverage
python -m pytest --cov=data_preprocessing.parsing tests/
```

## 🐛 Troubleshooting

### Import Error: docling not found

```bash
pip install docling docling-core
```

### Import Error: markdown not found

```bash
pip install markdown python-frontmatter
```

### Vietnamese Text Issues

```bash
pip install underthesea
```

### OCR Not Working

Docling uses EasyOCR backend. Install:

```bash
pip install easyocr
```

### File Too Large Error

Increase max file size in config:

```yaml
data_preprocessing:
  parsing:
    docling:
      max_file_size_mb: 100  # Increase limit
```

## 📝 Best Practices

1. **Always use ParserFactory** - Don't instantiate parsers directly
2. **Check result.success** - Always verify parsing succeeded
3. **Handle errors gracefully** - Parsing can fail for many reasons
4. **Configure appropriately** - Tune settings in config.yml
5. **Validate file sizes** - Large files can cause memory issues
6. **Use logging** - Enable DEBUG level for troubleshooting

## 🔗 Integration with RAG Pipeline

This parser is designed to integrate seamlessly with the RAG pipeline:

```python
# 1. Parse document
from data_preprocessing.parsing import ParserFactory
parser = ParserFactory.get_parser_for_file('document.pdf', config)
result = parser.parse('document.pdf')

# 2. Chunk text
from data_preprocessing.chunking import ChunkerFactory
chunker = ChunkerFactory.create_chunker('paragraph', config)
chunks = chunker.chunk(result.text)

# 3. Generate embeddings
from data_preprocessing.embedding import EmbeddingFactory
embedder = EmbeddingFactory.create_embedder('huggingface', config)
embeddings = embedder.embed_batch([chunk['text'] for chunk in chunks])

# 4. Store in database
# ... (save to document_chunks table)
```

## 📄 License

Part of the Agentic AI Project Management System.

---

**Status**: ✅ Production Ready  
**Version**: 1.0.0  
**Last Updated**: 2025-01-10
