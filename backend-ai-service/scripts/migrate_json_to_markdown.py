#!/usr/bin/env python3
"""
Migration Script: Convert BlockNote JSON to Markdown

This script finds documents with BlockNote JSON content and converts them to Markdown.
Run this ONCE to clean up any documents that were saved with JSON format.

Usage:
    python scripts/migrate_json_to_markdown.py [--dry-run]
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv
import psycopg2
from psycopg2.extras import RealDictCursor

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from utils.content_parser import detect_content_format, extract_text_from_blocknote_json

# Load environment
load_dotenv()


def migrate_documents(dry_run: bool = True):
    """
    Find and convert BlockNote JSON documents to Markdown.
    
    Args:
        dry_run: If True, only report what would be changed
    """
    db_url = os.getenv('DATABASE_URL')
    if not db_url:
        raise ValueError("DATABASE_URL environment variable not set")
    
    conn = psycopg2.connect(db_url)
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    print("=" * 80)
    print("DOCUMENT CONTENT FORMAT MIGRATION")
    print("=" * 80)
    print(f"Mode: {'DRY-RUN (no changes)' if dry_run else 'LIVE (will update database)'}")
    print()
    
    # Find all documents
    cursor.execute("""
        SELECT id, title, content, workspace_id, user_id
        FROM public.documents
        WHERE content IS NOT NULL AND content != ''
        ORDER BY created_at DESC
    """)
    
    documents = cursor.fetchall()
    print(f"Found {len(documents)} documents with content")
    print()
    
    # Analyze content formats
    stats = {
        'total': len(documents),
        'markdown': 0,
        'json': 0,
        'plain': 0,
        'empty': 0,
        'converted': 0,
        'failed': 0
    }
    
    to_convert = []
    
    for doc in documents:
        content = doc['content']
        
        if not content or not content.strip():
            stats['empty'] += 1
            continue
        
        format_type = detect_content_format(content)
        stats[format_type] += 1
        
        if format_type == 'json':
            to_convert.append(doc)
    
    # Print analysis
    print("Content Format Analysis:")
    print(f"  Markdown:   {stats['markdown']:>5} documents")
    print(f"  JSON:       {stats['json']:>5} documents ⚠️")
    print(f"  Plain text: {stats['plain']:>5} documents")
    print(f"  Empty:      {stats['empty']:>5} documents")
    print()
    
    if not to_convert:
        print("✅ No documents need conversion!")
        cursor.close()
        conn.close()
        return
    
    print(f"Found {len(to_convert)} documents to convert:")
    print()
    
    # Convert each document
    for i, doc in enumerate(to_convert, 1):
        doc_id = doc['id']
        title = doc['title']
        content = doc['content']
        
        print(f"[{i}/{len(to_convert)}] {title} ({doc_id[:8]}...)")
        print(f"  Original length: {len(content)} chars")
        
        try:
            # Convert JSON to plain text
            markdown = extract_text_from_blocknote_json(content)
            print(f"  Converted length: {len(markdown)} chars")
            
            if dry_run:
                print(f"  Preview (first 100 chars): {markdown[:100]}...")
                print(f"  ⏸️  Would update (dry-run mode)")
            else:
                # Update database
                cursor.execute("""
                    UPDATE public.documents
                    SET content = %s, updated_at = NOW()
                    WHERE id = %s
                """, (markdown, doc_id))
                
                print(f"  ✅ Updated successfully")
                stats['converted'] += 1
            
        except Exception as e:
            print(f"  ❌ Failed: {e}")
            stats['failed'] += 1
        
        print()
    
    # Commit changes
    if not dry_run:
        conn.commit()
        print(f"✅ Committed {stats['converted']} document updates")
    else:
        print(f"⏸️  Dry-run complete. Run without --dry-run to apply changes.")
    
    # Print summary
    print()
    print("=" * 80)
    print("MIGRATION SUMMARY")
    print("=" * 80)
    print(f"  Total documents:  {stats['total']}")
    print(f"  To convert:       {len(to_convert)}")
    if not dry_run:
        print(f"  Converted:        {stats['converted']}")
        print(f"  Failed:           {stats['failed']}")
    print()
    
    cursor.close()
    conn.close()


if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Convert BlockNote JSON to Markdown')
    parser.add_argument(
        '--dry-run',
        action='store_true',
        default=True,
        help='Run without making changes (default: True)'
    )
    parser.add_argument(
        '--live',
        action='store_true',
        help='Actually update the database'
    )
    
    args = parser.parse_args()
    
    # If --live flag is used, disable dry-run
    dry_run = not args.live
    
    try:
        migrate_documents(dry_run=dry_run)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        sys.exit(1)
