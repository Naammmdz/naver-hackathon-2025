"""
Demo: Chunking and Embedding

This script demonstrates how to use the chunking and embedding modules
to process documents for RAG (Retrieval-Augmented Generation).

Usage:
    python data_preprocessing/demo_chunking_embedding.py
"""

import os
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from data_preprocessing.chunking import ChunkerFactory
from data_preprocessing.embedding import EmbeddingFactory


def demo_chunking():
    """Demonstrate different chunking strategies"""
    
    print("=" * 80)
    print("DEMO: Text Chunking")
    print("=" * 80)
    
    # Sample text
    sample_text = """
Agentic AI là một hệ thống trí tuệ nhân tạo có khả năng tự chủ ra quyết định và hành động 
để đạt được mục tiêu đã định. Khác với AI truyền thống chỉ đơn thuần xử lý dữ liệu đầu vào 
và trả về kết quả, Agentic AI có khả năng lập kế hoạch, suy luận và tương tác với môi trường.

Các đặc điểm chính của Agentic AI:

1. Tự chủ (Autonomy): AI có thể tự đưa ra quyết định mà không cần can thiệp liên tục từ con người.

2. Lập kế hoạch (Planning): Hệ thống có khả năng phân tích vấn đề phức tạp, chia nhỏ thành 
các bước và lập kế hoạch thực hiện tuần tự.

3. Sử dụng công cụ (Tool Use): AI có thể sử dụng các công cụ bên ngoài như tìm kiếm web, 
truy vấn database, gọi API để thu thập thông tin cần thiết.

4. Bộ nhớ (Memory): Hệ thống ghi nhớ ngữ cảnh và học hỏi từ các tương tác trước đó để 
cải thiện hiệu suất.

5. Phản hồi và điều chỉnh (Feedback & Adaptation): AI có thể đánh giá kết quả của hành động 
và điều chỉnh chiến lược khi cần thiết.
"""
    
    print(f"\nSample text length: {len(sample_text)} characters")
    print("\n" + "-" * 80)
    
    # 1. Paragraph Chunker (RECOMMENDED)
    print("\n1. PARAGRAPH CHUNKER (Recommended)")
    print("-" * 80)
    
    para_chunker = ChunkerFactory.create_chunker(
        method="paragraph",
        chunk_size=300,
        overlap=50
    )
    
    para_chunks = para_chunker.chunk(sample_text)
    
    print(f"Generated {len(para_chunks)} chunks\n")
    for chunk in para_chunks:
        print(f"  {chunk}")
        print(f"  Preview: {chunk.text[:100]}...")
        print()
    
    # 2. Fixed-size Chunker
    print("\n2. FIXED-SIZE CHUNKER")
    print("-" * 80)
    
    fixed_chunker = ChunkerFactory.create_chunker(
        method="fixed",
        chunk_size=200,
        overlap=30
    )
    
    fixed_chunks = fixed_chunker.chunk(sample_text)
    
    print(f"Generated {len(fixed_chunks)} chunks\n")
    for i, chunk in enumerate(fixed_chunks[:3]):  # Show first 3
        print(f"  Chunk {i}: {len(chunk)} chars")
    
    # 3. From config
    print("\n3. FROM CONFIG FILE")
    print("-" * 80)
    
    try:
        config_chunker = ChunkerFactory.from_config()
        config_chunks = config_chunker.chunk(sample_text)
        print(f"Config method: {type(config_chunker).__name__}")
        print(f"Generated {len(config_chunks)} chunks")
    except Exception as e:
        print(f"Error loading from config: {e}")


def demo_embedding():
    """Demonstrate embedding generation"""
    
    print("\n\n" + "=" * 80)
    print("DEMO: Embedding Generation")
    print("=" * 80)
    
    # Sample texts
    texts = [
        "Agentic AI có khả năng tự chủ ra quyết định",
        "Hệ thống AI này có thể lập kế hoạch và suy luận",
        "Multi-agent systems work together to solve complex problems",
    ]
    
    print(f"\nSample texts ({len(texts)} texts):")
    for i, text in enumerate(texts):
        print(f"  {i+1}. {text}")
    
    # HuggingFace Embedder
    print("\n1. HUGGINGFACE EMBEDDER")
    print("-" * 80)
    
    try:
        hf_embedder = EmbeddingFactory.create_embedder(
            provider="huggingface",
            model_name="sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
            batch_size=8,
            device="cpu"
        )
        
        print(f"Model: {hf_embedder.model_name}")
        print(f"Loading model (this may take a while)...")
        
        result = hf_embedder.embed_batch(texts)
        
        print(f"\nEmbedding Results:")
        print(f"  - Number of embeddings: {len(result)}")
        print(f"  - Embedding dimensions: {result.dimensions}")
        print(f"  - Metadata: {result.metadata}")
        print(f"\nFirst embedding shape: {result.embeddings[0].shape}")
        print(f"First 10 values: {result.embeddings[0][:10]}")
        
    except ImportError:
        print("⚠️  sentence-transformers not installed")
        print("   Install with: pip install sentence-transformers")
    except Exception as e:
        print(f"Error: {e}")
    
    # Naver Embedder
    print("\n\n2. NAVER CLOVA EMBEDDER")
    print("-" * 80)
    
    try:
        naver_embedder = EmbeddingFactory.create_embedder(
            provider="naver",
            model_name="clir-emb-dolphin"
        )
        result = naver_embedder.embed_batch(texts)
        print("Success!")
    except NotImplementedError as e:
        print(f"⚠️  {e}")
    except Exception as e:
        print(f"Error: {e}")


def demo_full_pipeline():
    """Demonstrate full pipeline: chunk + embed"""
    
    print("\n\n" + "=" * 80)
    print("DEMO: Full Pipeline (Chunk + Embed)")
    print("=" * 80)
    
    document = """
Multi-Agent System là một hệ thống bao gồm nhiều agent độc lập làm việc cùng nhau 
để giải quyết các vấn đề phức tạp. Mỗi agent có vai trò và khả năng riêng biệt.

Trong hệ thống quản lý dự án với Agentic AI, chúng ta có:
- Orchestrator Agent: Điều phối các agent khác
- Task Agent: Phân tích công việc và rủi ro
- Document Agent: Trả lời câu hỏi từ tài liệu
- Board Agent: Tạo biểu đồ trực quan
"""
    
    print(f"Document: {len(document)} characters\n")
    
    try:
        # Step 1: Chunk
        print("Step 1: Chunking...")
        chunker = ChunkerFactory.create_chunker(
            method="paragraph",
            chunk_size=200,
            overlap=30
        )
        chunks = chunker.chunk(document)
        print(f"  → Generated {len(chunks)} chunks")
        
        # Step 2: Embed
        print("\nStep 2: Embedding...")
        embedder = EmbeddingFactory.create_embedder(
            provider="huggingface",
            model_name="sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
            device="cpu"
        )
        
        chunk_texts = [chunk.text for chunk in chunks]
        result = embedder.embed_batch(chunk_texts)
        print(f"  → Generated {len(result)} embeddings")
        print(f"  → Dimensions: {result.dimensions}")
        
        # Step 3: Show results
        print("\nResults:")
        for i, (chunk, embedding) in enumerate(zip(chunks, result.embeddings)):
            print(f"\n  Chunk {i}:")
            print(f"    Text: {chunk.text[:80]}...")
            print(f"    Embedding shape: {embedding.shape}")
            print(f"    Token count: {chunk.token_count}")
        
        print("\n✅ Pipeline completed successfully!")
        
    except ImportError:
        print("⚠️  Required packages not installed")
        print("   Install with: pip install sentence-transformers")
    except Exception as e:
        print(f"❌ Error: {e}")


def main():
    """Run all demos"""
    
    print("\n" + "🚀 " * 20)
    print("CHUNKING & EMBEDDING DEMO")
    print("🚀 " * 20)
    
    # Run demos
    demo_chunking()
    demo_embedding()
    demo_full_pipeline()
    
    print("\n" + "=" * 80)
    print("Demo completed!")
    print("=" * 80)


if __name__ == "__main__":
    main()
