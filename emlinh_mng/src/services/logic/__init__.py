"""
Logic package for complex business logic components.

This package contains specialized business logic classes that can be used
by the main service classes for handling complex operations like:
- Content analysis and processing
- AI response generation strategies
- Data transformation and validation
- Algorithm implementations
"""

from .response_generator import ResponseGenerator
from .idea_manager import IdeaManager

__all__ = [
    'ResponseGenerator',
    'IdeaManager'
]