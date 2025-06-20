import requests
import json
import logging
from typing import List, Optional
from flask import current_app

logger = logging.getLogger(__name__)

class OllamaEmbeddingService:
    """Service để tương tác với Ollama API cho embedding"""
    
    def __init__(self, base_url: str = None, model: str = None):
        self.base_url = base_url or current_app.config.get('OLLAMA_BASE_URL', 'http://192.168.1.10:11434')
        self.model = model or current_app.config.get('OLLAMA_EMBED_MODEL', 'nomic-embed-text')
        self.embed_endpoint = f"{self.base_url}/api/embed"
        
    def get_embedding(self, text: str) -> Optional[List[float]]:
        """
        Lấy embedding vector cho một đoạn text
        
        Args:
            text (str): Text cần tạo embedding
            
        Returns:
            List[float]: Vector embedding hoặc None nếu có lỗi
        """
        try:
            payload = {
                "model": self.model,
                "input": text
            }
            
            response = requests.post(
                self.embed_endpoint,
                json=payload,
                headers={'Content-Type': 'application/json'},
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                # Ollama API trả về embedding trong trường 'embeddings'
                embeddings = result.get('embeddings', [])
                if embeddings and len(embeddings) > 0:
                    return embeddings[0]  # Lấy embedding đầu tiên
                else:
                    logger.error(f"No embeddings found in response: {result}")
                    return None
            else:
                logger.error(f"Ollama API error: {response.status_code} - {response.text}")
                return None
                
        except requests.exceptions.RequestException as e:
            logger.error(f"Request error when calling Ollama API: {str(e)}")
            return None
        except json.JSONDecodeError as e:
            logger.error(f"JSON decode error: {str(e)}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error in get_embedding: {str(e)}")
            return None
    
    def get_embeddings_batch(self, texts: List[str]) -> List[Optional[List[float]]]:
        """
        Lấy embedding cho nhiều text cùng lúc
        
        Args:
            texts (List[str]): Danh sách các text cần tạo embedding
            
        Returns:
            List[Optional[List[float]]]: Danh sách các vector embedding
        """
        embeddings = []
        for text in texts:
            embedding = self.get_embedding(text)
            embeddings.append(embedding)
        return embeddings
    
    def test_connection(self) -> bool:
        """
        Test kết nối với Ollama API
        
        Returns:
            bool: True nếu kết nối thành công
        """
        try:
            test_embedding = self.get_embedding("test connection")
            return test_embedding is not None
        except Exception as e:
            logger.error(f"Connection test failed: {str(e)}")
            return False

# Singleton instance
_embedding_service = None

def get_embedding_service() -> OllamaEmbeddingService:
    """
    Lấy instance của embedding service (singleton pattern)
    
    Returns:
        OllamaEmbeddingService: Instance của service
    """
    global _embedding_service
    if _embedding_service is None:
        _embedding_service = OllamaEmbeddingService()
    return _embedding_service