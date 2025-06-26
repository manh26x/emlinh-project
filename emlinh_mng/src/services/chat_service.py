import json
import logging
from datetime import datetime
from typing import Dict, List, Optional
from flask import current_app
from ..app.models import Chat, Idea, Vector, generate_session_id, db
from .embedding_service import get_embedding_service
from .flow_service import flow_service
from .logic.response_generator import ResponseGenerator
from .logic.idea_manager import IdeaManager

logger = logging.getLogger(__name__)

class ChatService:
    """Service để xử lý chat logic và tích hợp với AI"""
    
    def __init__(self):
        self.embedding_service = get_embedding_service()
        self.response_generator = ResponseGenerator(flow_service)
        self.idea_manager = IdeaManager(db.session)
    
    def send_message(self, user_message: str, session_id: str = None, message_type: str = 'conversation') -> Dict:
        """
        Gửi tin nhắn và nhận phản hồi từ AI
        
        Args:
            user_message (str): Tin nhắn từ người dùng
            session_id (str): ID session chat (tạo mới nếu None)
            message_type (str): Loại tin nhắn ('conversation', 'planning', 'brainstorm')
            
        Returns:
            Dict: Kết quả chứa phản hồi AI và thông tin chat
        """
        try:
            # Tạo session_id mới nếu chưa có
            if not session_id:
                session_id = generate_session_id()
            
            # Tìm context từ lịch sử chat và similar content
            context = self._get_context(user_message, session_id)
            
            # Tạo phản hồi AI dựa trên message_type
            ai_response = self._generate_ai_response(user_message, context, message_type)
            
            # Lưu chat vào database
            chat = Chat(
                session_id=session_id,
                user_message=user_message,
                ai_response=ai_response,
                message_type=message_type,
                timestamp=datetime.utcnow()
            )
            db.session.add(chat)
            db.session.commit()
            
            # Tạo và lưu embeddings
            self._create_embeddings(chat)
            
            # Nếu là loại planning/brainstorm, có thể tạo idea
            idea_created = None
            if message_type in ['planning', 'brainstorm']:
                idea_created = self.idea_manager.try_create_idea_from_chat(
                    user_message, ai_response, chat.id
                )
            
            return {
                'success': True,
                'chat_id': chat.id,
                'session_id': session_id,
                'user_message': user_message,
                'ai_response': ai_response,
                'message_type': message_type,
                'timestamp': chat.timestamp.isoformat(),
                'idea_created': idea_created
            }
            
        except Exception as e:
            logger.error(f"Error in send_message: {str(e)}")
            db.session.rollback()
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_chat_history(self, session_id: str, limit: int = 50) -> List[Dict]:
        """
        Lấy lịch sử chat theo session_id
        
        Args:
            session_id (str): ID session chat
            limit (int): Số lượng tin nhắn tối đa
            
        Returns:
            List[Dict]: Danh sách lịch sử chat
        """
        try:
            chats = Chat.query.filter_by(session_id=session_id)\
                             .order_by(Chat.timestamp.desc())\
                             .limit(limit)\
                             .all()
            
            return [chat.to_dict() for chat in reversed(chats)]
            
        except Exception as e:
            logger.error(f"Error in get_chat_history: {str(e)}")
            return []
    
    def search_similar_conversations(self, query: str, limit: int = 5) -> List[Dict]:
        """
        Tìm kiếm các cuộc hội thoại tương tự
        
        Args:
            query (str): Câu truy vấn
            limit (int): Số lượng kết quả tối đa
            
        Returns:
            List[Dict]: Danh sách cuộc hội thoại tương tự
        """
        try:
            # Tạo embedding cho query
            query_embedding = self.embedding_service.get_embedding(query)
            if not query_embedding:
                return []
            
            # Tìm kiếm trong vectors table (cần implement function search tương tự)
            # Tạm thời trả về empty, sẽ implement sau khi có pgvector
            return []
            
        except Exception as e:
            logger.error(f"Error in search_similar_conversations: {str(e)}")
            return []
    
    def _get_context(self, user_message: str, session_id: str) -> str:
        """Lấy context từ lịch sử chat và similar content"""
        try:
            # Lấy lịch sử chat gần đây
            recent_chats = self.get_chat_history(session_id, limit=5)
            
            # Tạo context từ lịch sử
            context_parts = []
            if recent_chats:
                context_parts.append("Lịch sử cuộc hội thoại gần đây:")
                for chat in recent_chats[-3:]:  # Lấy 3 tin nhắn gần nhất
                    context_parts.append(f"User: {chat['user_message']}")
                    context_parts.append(f"AI: {chat['ai_response']}")
            
            return "\n".join(context_parts)
            
        except Exception as e:
            logger.error(f"Error in _get_context: {str(e)}")
            return ""
    
    def _generate_ai_response(self, user_message: str, context: str, message_type: str) -> str:
        """Tạo phản hồi AI dựa trên loại tin nhắn"""
        try:
            if message_type == 'planning':
                return self.response_generator.generate_planning_response(user_message)
            elif message_type == 'brainstorm':
                return self.response_generator.generate_brainstorm_response(user_message)
            else:
                return self.response_generator.generate_conversation_response(user_message, context)
            
        except Exception as e:
            logger.error(f"Error in _generate_ai_response: {str(e)}")
            return "Xin lỗi, có lỗi xảy ra khi tạo phản hồi. Vui lòng thử lại."
    
    def _create_embeddings(self, chat: Chat):
        """Tạo và lưu embeddings cho chat"""
        try:
            # Tạo embedding cho user message
            user_embedding = self.embedding_service.get_embedding(chat.user_message)
            if user_embedding:
                user_vector = Vector(
                    content_id=chat.id,
                    content_type='chat_user',
                    content_text=chat.user_message,
                    embedding=user_embedding,  # Lưu trực tiếp list thay vì JSON string
                    meta_data={'session_id': chat.session_id, 'message_type': chat.message_type}
                )
                db.session.add(user_vector)
            
            # Tạo embedding cho AI response
            ai_embedding = self.embedding_service.get_embedding(chat.ai_response)
            if ai_embedding:
                ai_vector = Vector(
                    content_id=chat.id,
                    content_type='chat_ai',
                    content_text=chat.ai_response,
                    embedding=ai_embedding,  # Lưu trực tiếp list thay vì JSON string
                    meta_data={'session_id': chat.session_id, 'message_type': chat.message_type}
                )
                db.session.add(ai_vector)
            
            db.session.commit()
            
        except Exception as e:
            logger.error(f"Error creating embeddings: {str(e)}")
            # Không rollback vì chat đã được lưu thành công


# Singleton instance
_chat_service = None

def get_chat_service() -> ChatService:
    """
    Lấy instance của chat service (singleton pattern)
    
    Returns:
        ChatService: Instance của service
    """
    global _chat_service
    if _chat_service is None:
        _chat_service = ChatService()
    return _chat_service