# Services Directory

This directory contains all service classes for handling business logic and external integrations.

## Structure

```
src/services/
├── __init__.py                 # Main services package
├── README.md                   # This documentation
├── chat_service.py            # Chat management service
├── crewai_service.py          # CrewAI integration service
├── embedding_service.py       # Ollama embedding service
└── logic/                     # Business logic components
    ├── __init__.py
    ├── response_generator.py   # AI response generation logic
    └── idea_manager.py         # Content idea management logic
```

## Services Overview

### Core Services

#### `ChatService`
- **Purpose**: Manages chat conversations and AI interactions
- **Key Features**:
  - Send/receive messages with AI
  - Maintain chat history
  - Handle different message types (conversation, planning, brainstorm)
  - Automatic idea creation from conversations
- **Dependencies**: `EmbeddingService`, `CrewAIService`, business logic components

#### `CrewAIService`
- **Purpose**: Handles AI agent orchestration using CrewAI framework
- **Key Features**:
  - Content creation workflows
  - Research and analysis tasks
  - Multi-agent collaboration
- **Use Cases**: Planning mode responses, brainstorming, content analysis

#### `OllamaEmbeddingService`
- **Purpose**: Manages text embeddings using Ollama API
- **Key Features**:
  - Generate embeddings for text content
  - Batch processing support
  - Connection testing and error handling
- **Use Cases**: Semantic search, content similarity, vector storage

### Business Logic Components (`logic/`)

The `logic` subfolder contains specialized business logic classes that handle complex operations:

#### `ResponseGenerator`
- **Purpose**: Generates AI responses for different interaction types
- **Key Features**:
  - Planning response generation
  - Brainstorming content creation
  - Conversational responses
  - Fallback handling when AI services are unavailable
- **Benefits**: Separates response logic from service orchestration

#### `IdeaManager`
- **Purpose**: Handles content idea creation and management
- **Key Features**:
  - Automatic idea extraction from conversations
  - Content type classification
  - Priority determination
  - Idea categorization and organization
- **Benefits**: Centralized idea management logic, extensible for future features

## Design Principles

### Separation of Concerns
- **Service Layer**: Handles external integrations and high-level orchestration
- **Logic Layer**: Contains pure business logic and algorithms
- **Model Layer**: Data persistence and database operations

### Dependency Injection
Services accept dependencies through constructor parameters, making them testable and flexible.

### Singleton Pattern
Service instances are managed as singletons through factory functions (`get_*_service()`).

### Error Handling
All services implement comprehensive error handling with logging and graceful fallbacks.

## Usage Examples

### Basic Chat Service Usage
```python
from src.services import get_chat_service

chat_service = get_chat_service()
response = chat_service.send_message(
    user_message="I want to create a video about AI",
    message_type="planning"
)
```

### Direct Logic Component Usage
```python
from src.services.logic import ResponseGenerator, IdeaManager
from src.services import crewai_service

# Use response generator independently
generator = ResponseGenerator(crewai_service)
response = generator.generate_brainstorm_response("Content ideas for tech blog")

# Use idea manager independently
idea_manager = IdeaManager()
idea = idea_manager.try_create_idea_from_chat(user_msg, ai_response, chat_id)
```

## Future Extensions

The modular structure supports easy extension:

1. **New Service Types**: Add new service files for additional integrations
2. **Logic Components**: Add new specialized logic classes in the `logic/` folder
3. **Service Composition**: Combine services for more complex workflows
4. **Testing**: Logic components can be unit tested independently

## Migration Notes

This structure replaces the previous flat organization where service files were located directly in `src/app/`. The new structure provides:

- Better organization and maintainability
- Separation of business logic from service coordination
- Easier testing and development
- Scalability for future growth
- Clear responsibility boundaries

All import statements have been updated to reflect the new structure:
- `from src.app.chat_service import ...` → `from src.services.chat_service import ...`
- `from src.app.crewai_service import ...` → `from src.services.crewai_service import ...`
- `from src.app.embedding_service import ...` → `from src.services.embedding_service import ...`