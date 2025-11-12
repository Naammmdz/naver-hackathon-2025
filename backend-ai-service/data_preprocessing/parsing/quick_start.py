"""
Quick Start Guide - Document Parsing Module

This is a minimal example to get you started with the parsing module.
"""

import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

import yaml
from data_preprocessing.parsing import ParserFactory

# 1. Load configuration
with open('config.yml', 'r', encoding='utf-8') as f:
    config = yaml.safe_load(f)

# 2. Example 1: Parse a PDF file (auto-detect parser)
print("="*60)
print("Example 1: Parse PDF file")
print("="*60)

# Create parser (will auto-detect based on file extension)
parser = ParserFactory.get_parser_for_file('document.pdf', config)
# result = parser.parse('document.pdf')  # Uncomment when you have a PDF

# if result.success:
#     print(f"✅ Success!")
#     print(f"Text length: {len(result.text)} chars")
#     print(f"Pages: {result.metadata.get('pages', 0)}")
#     print(f"Tables: {result.metadata.get('tables_count', 0)}")
# else:
#     print(f"❌ Error: {result.error}")

# 3. Example 2: Parse markdown string (from web editor)
print("\n" + "="*60)
print("Example 2: Parse Markdown Content")
print("="*60)

markdown_content = """
# Project Meeting Notes

## Action Items
- Review Phase 2 implementation
- Test document parsing
- Update documentation

## Next Steps
1. Implement chunking module
2. Implement embedding module
3. Build RAG pipeline
"""

# Create markdown parser
md_parser = ParserFactory.create_parser('markdown', config)
result = md_parser.parse(markdown_content)

if result.success:
    print(f"✅ Success!")
    print(f"Text length: {len(result.text)} chars")
    print(f"Headings: {result.metadata['headings_count']}")
    print(f"Paragraphs: {result.metadata['paragraphs_count']}")
    print(f"\nExtracted headings:")
    for heading in result.headings:
        indent = "  " * (heading['level'] - 1)
        print(f"{indent}• {heading['text']}")
else:
    print(f"❌ Error: {result.error}")

# 4. Example 3: Check supported formats
print("\n" + "="*60)
print("Example 3: Supported File Formats")
print("="*60)

extensions = ParserFactory.get_supported_extensions()
print(f"Total supported formats: {len(extensions)}")
print(f"Extensions: {', '.join(sorted(extensions))}")

# 5. Example 4: Error handling
print("\n" + "="*60)
print("Example 4: Error Handling")
print("="*60)

# Try to parse non-existent file
parser = ParserFactory.create_parser('docling', config)
result = parser.parse('nonexistent.pdf')

if not result.success:
    print(f"✅ Error handled gracefully")
    print(f"Error message: {result.error}")
    print(f"Error type: {result.metadata.get('error_type')}")

print("\n" + "="*60)
print("Quick Start Complete!")
print("="*60)
print("\nFor more examples, run: python data_preprocessing/parsing/demo_parsing.py")
print("For documentation, see: data_preprocessing/parsing/README.md")
