"""
Services package for managing business logic and external integrations.

This package contains:
- Core service classes for handling business operations
- Logic subfolder for complex business logic components
- External service integrations (AI, embeddings, etc.)
"""

from .chat_service import ChatService, get_chat_service
from .crewai_service import CrewAIService, crewai_service
from .embedding_service import OllamaEmbeddingService, get_embedding_service

__all__ = [
    'ChatService', 'get_chat_service',
    'CrewAIService', 'crewai_service', 
    'OllamaEmbeddingService', 'get_embedding_service'
]