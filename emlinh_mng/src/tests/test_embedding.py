#!/usr/bin/env python3
"""
Test script để kiểm tra kết nối với Ollama embedding service
"""

import sys
import os

# Thêm thư mục gốc vào Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.services.embedding_service import OllamaEmbeddingService

def test_ollama_embedding():
    """Test kết nối và tạo embedding với Ollama"""
    
    print("🔧 Khởi tạo Ollama Embedding Service...")
    service = OllamaEmbeddingService(
        base_url="http://192.168.1.10:11434",
        model="nomic-embed-text"
    )
    
    print(f"📡 Endpoint: {service.embed_endpoint}")
    print(f"🤖 Model: {service.model}")
    
    # Test kết nối
    print("\n🔍 Kiểm tra kết nối...")
    if service.test_connection():
        print("✅ Kết nối thành công!")
    else:
        print("❌ Không thể kết nối đến Ollama API")
        return False
    
    # Test tạo embedding cho một câu
    test_text = "Hello World, this is a test for Vietnamese AI assistant"
    print(f"\n📝 Tạo embedding cho text: '{test_text}'")
    
    embedding = service.get_embedding(test_text)
    
    if embedding:
        print(f"✅ Tạo embedding thành công!")
        print(f"📏 Dimension: {len(embedding)}")
        print(f"📊 Embedding preview (first 10 values): {embedding[:10]}")
        
        # Verify dimension
        if len(embedding) == 768:
            print("✅ Dimension chính xác (768)")
        else:
            print(f"⚠️  Dimension không đúng: {len(embedding)} (expected: 768)")
            
    else:
        print("❌ Không thể tạo embedding")
        return False
    
    # Test batch embedding
    print(f"\n📝 Test batch embedding...")
    test_texts = [
        "Tôi muốn tạo video về công nghệ AI",
        "Ý tưởng làm content về du lịch Việt Nam",
        "Kế hoạch marketing cho sản phẩm mới"
    ]
    
    embeddings = service.get_embeddings_batch(test_texts)
    successful_embeddings = [e for e in embeddings if e is not None]
    
    print(f"✅ Tạo thành công {len(successful_embeddings)}/{len(test_texts)} embeddings")
    
    return True

if __name__ == "__main__":
    print("🚀 Bắt đầu test Ollama Embedding Service")
    print("=" * 50)
    
    try:
        success = test_ollama_embedding()
        if success:
            print("\n🎉 Tất cả test đều thành công!")
        else:
            print("\n💥 Có lỗi xảy ra trong quá trình test")
            sys.exit(1)
    except Exception as e:
        print(f"\n💥 Lỗi không mong đợi: {str(e)}")
        sys.exit(1)