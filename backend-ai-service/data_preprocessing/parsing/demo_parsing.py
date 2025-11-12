"""
Demo Script for Document Parsing Module

This script demonstrates the usage of the parsing module with various document types.
Run this to test the parsing functionality.

Usage:
    python data_preprocessing/parsing/demo_parsing.py
"""

import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

import yaml
import logging
from data_preprocessing.parsing import ParserFactory

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def load_config():
    """Load configuration from config.yml"""
    config_path = project_root / 'config.yml'
    
    if not config_path.exists():
        logger.error(f"Config file not found: {config_path}")
        return None
    
    with open(config_path, 'r', encoding='utf-8') as f:
        config = yaml.safe_load(f)
    
    logger.info(f"Loaded config from {config_path}")
    return config


def demo_markdown_parsing(config):
    """Demonstrate markdown parsing"""
    print("\n" + "="*80)
    print("DEMO 1: Markdown Parsing")
    print("="*80)
    
    # Sample markdown content
    markdown_content = """---
title: Project Meeting Notes
author: Team Lead
date: 2025-01-10
tags: [meeting, planning, ai]
---

# Project Meeting Notes

## 📋 Agenda

1. Review current progress
2. Discuss next sprint planning
3. Address blockers

## 🎯 Action Items

### High Priority
- [ ] Complete database migrations
- [ ] Implement RAG pipeline
- [ ] Set up CI/CD pipeline

### Medium Priority
- [ ] Update documentation
- [ ] Code review
- [ ] Performance testing

## 📊 Data Analysis

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| Test Coverage | 75% | 90% | 🟡 In Progress |
| Response Time | 250ms | 200ms | 🔴 Needs Work |
| Uptime | 99.5% | 99.9% | 🟢 Good |

## 💻 Code Example

```python
def process_document(file_path):
    parser = ParserFactory.create_parser(config=config)
    result = parser.parse(file_path)
    return result
```

## 🔗 References

- [Project Repo](https://github.com/example/project)
- [Documentation](https://docs.example.com)
- [API Docs](https://api.example.com)

## Notes

Remember to update the **changelog** and notify the team via Slack.
"""
    
    # Parse markdown
    parser = ParserFactory.create_parser('markdown', config)
    result = parser.parse(markdown_content)
    
    if result.success:
        print(f"✅ Parsing successful!")
        print(f"\n📊 Statistics:")
        print(f"  - Text length: {len(result.text)} characters")
        print(f"  - Paragraphs: {result.metadata['paragraphs_count']}")
        print(f"  - Headings: {result.metadata['headings_count']}")
        print(f"  - Code blocks: {result.metadata['code_blocks_count']}")
        print(f"  - Tables: {result.metadata['tables_count']}")
        print(f"  - Links: {result.metadata['links_count']}")
        print(f"  - Has frontmatter: {result.metadata['has_frontmatter']}")
        
        if result.metadata.get('has_frontmatter'):
            print(f"\n📝 Frontmatter:")
            print(f"  - Title: {result.metadata.get('title')}")
            print(f"  - Author: {result.metadata.get('author')}")
            print(f"  - Date: {result.metadata.get('date')}")
            print(f"  - Tags: {result.metadata.get('tags')}")
        
        print(f"\n📑 Headings:")
        for heading in result.headings[:5]:  # Show first 5
            indent = "  " * heading['level']
            print(f"{indent}{'#' * heading['level']} {heading['text']}")
        
        print(f"\n📄 First Paragraph:")
        if result.paragraphs:
            print(f"  {result.paragraphs[0][:200]}...")
    else:
        print(f"❌ Parsing failed: {result.error}")


def demo_file_detection(config):
    """Demonstrate auto-detection of file types"""
    print("\n" + "="*80)
    print("DEMO 2: File Type Auto-Detection")
    print("="*80)
    
    test_cases = [
        'document.pdf',
        'presentation.pptx',
        'notes.md',
        'report.docx',
        'data.xlsx',
        'page.html',
        'image.jpg',
    ]
    
    print("\n🔍 Testing file type detection:")
    for filename in test_cases:
        is_supported = ParserFactory.is_supported(filename)
        
        if is_supported:
            try:
                parser = ParserFactory.create_parser(config=config, source=filename)
                print(f"  ✅ {filename:20} → {parser.__class__.__name__}")
            except Exception as e:
                print(f"  ⚠️  {filename:20} → Error: {e}")
        else:
            print(f"  ❌ {filename:20} → Not supported")


def demo_supported_formats(config):
    """Show all supported formats"""
    print("\n" + "="*80)
    print("DEMO 3: Supported File Formats")
    print("="*80)
    
    extensions = ParserFactory.get_supported_extensions()
    parsers = ParserFactory.get_available_parsers()
    
    print(f"\n📦 Available Parsers: {', '.join(parsers)}")
    print(f"\n📄 Supported Extensions ({len(extensions)} total):")
    
    # Group by parser type
    docling_exts = []
    markdown_exts = []
    
    for ext in sorted(extensions):
        # Create a dummy path to detect parser
        parser = ParserFactory.create_parser(config=config, source=f"file.{ext}")
        if isinstance(parser, type) and parser.__name__ == 'DoclingParser':
            docling_exts.append(ext)
        else:
            markdown_exts.append(ext)
    
    # Simpler approach - just list all
    print("\n  Supported formats:")
    for ext in sorted(extensions):
        print(f"    - .{ext}")


def demo_error_handling(config):
    """Demonstrate error handling"""
    print("\n" + "="*80)
    print("DEMO 4: Error Handling")
    print("="*80)
    
    # Test 1: Invalid parser type
    print("\n🧪 Test 1: Invalid parser type")
    try:
        parser = ParserFactory.create_parser('invalid_parser', config)
        print("  ❌ Should have raised ValueError")
    except ValueError as e:
        print(f"  ✅ Caught expected error: {e}")
    
    # Test 2: Empty content
    print("\n🧪 Test 2: Empty content")
    parser = ParserFactory.create_parser('markdown', config)
    result = parser.parse("")
    if not result.success:
        print(f"  ✅ Handled empty content: {result.error}")
    
    # Test 3: Non-existent file
    print("\n🧪 Test 3: Non-existent file")
    parser = ParserFactory.create_parser('docling', config)
    result = parser.parse('nonexistent_file.pdf')
    if not result.success:
        print(f"  ✅ Handled missing file: {result.error}")


def demo_preprocessing(config):
    """Demonstrate text preprocessing"""
    print("\n" + "="*80)
    print("DEMO 5: Text Preprocessing")
    print("="*80)
    
    # Original markdown
    markdown_with_formatting = """
# Contact Information

Email me at test@example.com or visit https://example.com for more info.

This is a **BOLD** statement with some *ITALIC* text.
"""
    
    print("\n📝 Original content:")
    print(markdown_with_formatting)
    
    # Test with different preprocessing settings
    test_configs = [
        {
            'name': 'Default (no preprocessing)',
            'config': {
                'parsing': {
                    'encoding': 'utf-8',
                    'markdown': config['data_preprocessing']['parsing']['markdown'],
                    'preprocessing': {
                        'remove_urls': False,
                        'remove_emails': False,
                        'lowercase': False,
                    }
                }
            }
        },
        {
            'name': 'Remove URLs and emails',
            'config': {
                'parsing': {
                    'encoding': 'utf-8',
                    'markdown': config['data_preprocessing']['parsing']['markdown'],
                    'preprocessing': {
                        'remove_urls': True,
                        'remove_emails': True,
                        'lowercase': False,
                    }
                }
            }
        },
        {
            'name': 'Lowercase everything',
            'config': {
                'parsing': {
                    'encoding': 'utf-8',
                    'markdown': config['data_preprocessing']['parsing']['markdown'],
                    'preprocessing': {
                        'remove_urls': False,
                        'remove_emails': False,
                        'lowercase': True,
                    }
                }
            }
        },
    ]
    
    for test in test_configs:
        print(f"\n🔧 {test['name']}:")
        parser = ParserFactory.create_parser('markdown', test['config'])
        result = parser.parse(markdown_with_formatting)
        print(f"  Result: {result.text[:100]}...")


def main():
    """Run all demos"""
    print("="*80)
    print("Document Parsing Module - Demo Script")
    print("="*80)
    
    # Load config
    config = load_config()
    if config is None:
        print("❌ Failed to load config. Exiting.")
        return
    
    print(f"\n✅ Config loaded successfully")
    print(f"   Encoding: {config['data_preprocessing']['parsing']['encoding']}")
    print(f"   Docling OCR: {config['data_preprocessing']['parsing']['docling']['ocr_enabled']}")
    print(f"   Markdown extensions: {len(config['data_preprocessing']['parsing']['markdown']['extensions'])}")
    
    # Run demos
    try:
        demo_markdown_parsing(config)
        demo_file_detection(config)
        demo_supported_formats(config)
        demo_error_handling(config)
        demo_preprocessing(config)
        
        print("\n" + "="*80)
        print("✅ All demos completed successfully!")
        print("="*80)
    
    except Exception as e:
        logger.error(f"Demo failed: {e}", exc_info=True)
        print(f"\n❌ Demo failed: {e}")
        return 1
    
    return 0


if __name__ == '__main__':
    exit(main())
