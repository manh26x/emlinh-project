import json
import logging
from datetime import datetime
from typing import Dict, List, Optional
from flask import current_app
from ..app.models import Chat, ChatSession, Idea, Vector, generate_session_id
from ..app.extensions import db
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
            
            # Tự động tạo hoặc cập nhật ChatSession
            self._ensure_chat_session_exists(session_id, user_message)
            
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
    
    def _ensure_chat_session_exists(self, session_id: str, user_message: str):
        """Tự động tạo ChatSession nếu chưa tồn tại"""
        try:
            # Kiểm tra xem session đã tồn tại chưa
            existing_session = ChatSession.query.filter_by(session_id=session_id).first()
            
            if not existing_session:
                # Tạo title từ tin nhắn đầu tiên
                title = self._generate_session_title(user_message)
                
                # Tạo session mới
                session = ChatSession(
                    session_id=session_id,
                    title=title,
                    description=f"Cuộc hội thoại bắt đầu với: {user_message[:100]}...",
                    message_count=1,
                    last_message_at=datetime.utcnow()
                )
                db.session.add(session)
                db.session.commit()
                
                logger.info(f"Auto-created ChatSession: {session_id} with title: {title}")
                
        except Exception as e:
            logger.error(f"Error ensuring chat session exists: {str(e)}")
            # Không fail toàn bộ flow nếu có lỗi tạo session
    
    def _generate_session_title(self, user_message: str) -> str:
        """Tự động tạo tiêu đề từ tin nhắn đầu tiên"""
        # Loại bỏ ký tự đặc biệt và cắt ngắn
        message = user_message.strip()
        
        # Các từ khóa để tạo tiêu đề phù hợp
        if any(keyword in message.lower() for keyword in ['video', 'tạo video', 'làm video']):
            return f"🎬 Tạo video - {message[:30]}..."
        elif any(keyword in message.lower() for keyword in ['kế hoạch', 'plan', 'chiến lược']):
            return f"📋 Kế hoạch - {message[:30]}..."
        elif any(keyword in message.lower() for keyword in ['ý tưởng', 'idea', 'brainstorm']):
            return f"💡 Ý tưởng - {message[:30]}..."
        elif any(keyword in message.lower() for keyword in ['hỏi', 'tư vấn', 'giúp']):
            return f"❓ Tư vấn - {message[:30]}..."
        else:
            return f"💬 {message[:40]}..." if len(message) > 40 else f"💬 {message}"
    
    def save_progress_message(self, session_id: str, message: str, step: str = "progress", data: dict = None) -> Dict:
        """
        Lưu progress message vào database để hiển thị trong lịch sử chat
        
        Args:
            session_id (str): ID session chat
            message (str): Nội dung message
            step (str): Tên bước (progress, completed, error, etc.)
            data (dict): Data bổ sung của step
            
        Returns:
            Dict: Kết quả lưu message
        """
        try:
            # Tự động tạo session nếu chưa có
            self._ensure_chat_session_exists(session_id, "Video creation progress")
            
            # Lưu progress message như AI response với user_message rỗng
            chat = Chat(
                session_id=session_id,
                user_message="",  # Empty user message for progress
                ai_response=message,
                message_type="progress",
                timestamp=datetime.utcnow()
            )
            db.session.add(chat)
            db.session.commit()
            
            logger.info(f"Saved progress message for session {session_id}: {step}")
            
            return {
                'success': True,
                'chat_id': chat.id,
                'session_id': session_id,
                'message': message,
                'step': step,
                'timestamp': chat.timestamp.isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error saving progress message: {str(e)}")
            db.session.rollback()
            return {
                'success': False,
                'error': str(e)
            }
    
    # === ChatSession Management Methods ===
    
    def get_chat_sessions(self, limit: int = 50, archived: bool = False) -> List[Dict]:
        """
        Lấy danh sách các chat sessions
        
        Args:
            limit (int): Số lượng session tối đa
            archived (bool): Lấy session đã lưu trữ hay không
            
        Returns:
            List[Dict]: Danh sách chat sessions
        """
        try:
            query = ChatSession.query.filter_by(is_archived=archived)\
                                    .order_by(ChatSession.last_message_at.desc())\
                                    .limit(limit)
            
            sessions = query.all()
            return [session.to_dict() for session in sessions]
            
        except Exception as e:
            logger.error(f"Error in get_chat_sessions: {str(e)}")
            return []
    
    def get_chat_session(self, session_id: str) -> Optional[Dict]:
        """
        Lấy thông tin một chat session
        
        Args:
            session_id (str): ID của session
            
        Returns:
            Optional[Dict]: Thông tin session hoặc None
        """
        try:
            session = ChatSession.query.filter_by(session_id=session_id).first()
            return session.to_dict() if session else None
            
        except Exception as e:
            logger.error(f"Error in get_chat_session: {str(e)}")
            return None
    
    def create_chat_session(self, session_id: str, title: str = None, description: str = None) -> Dict:
        """
        Tạo một chat session mới
        
        Args:
            session_id (str): ID của session
            title (str): Tiêu đề của session
            description (str): Mô tả của session
            
        Returns:
            Dict: Thông tin session đã tạo
        """
        try:
            # Kiểm tra xem session đã tồn tại chưa
            existing_session = ChatSession.query.filter_by(session_id=session_id).first()
            if existing_session:
                return existing_session.to_dict()
            
            # Tạo session mới
            session = ChatSession(
                session_id=session_id,
                title=title or 'Cuộc hội thoại mới',
                description=description
            )
            db.session.add(session)
            db.session.commit()
            
            return session.to_dict()
            
        except Exception as e:
            logger.error(f"Error in create_chat_session: {str(e)}")
            db.session.rollback()
            return {}
    
    def update_chat_session(self, session_id: str, title: str = None, description: str = None,
                           is_archived: bool = None, is_favorite: bool = None, tags: List[str] = None) -> Dict:
        """
        Cập nhật thông tin chat session
        
        Args:
            session_id (str): ID của session
            title (str): Tiêu đề mới
            description (str): Mô tả mới
            is_archived (bool): Trạng thái lưu trữ
            is_favorite (bool): Trạng thái yêu thích
            tags (List[str]): Danh sách tags
            
        Returns:
            Dict: Thông tin session đã cập nhật
        """
        try:
            session = ChatSession.query.filter_by(session_id=session_id).first()
            if not session:
                return {'success': False, 'message': 'Session không tồn tại'}
            
            # Cập nhật các trường được cung cấp
            if title is not None:
                session.title = title
            if description is not None:
                session.description = description
            if is_archived is not None:
                session.is_archived = is_archived
            if is_favorite is not None:
                session.is_favorite = is_favorite
            if tags is not None:
                session.tags = tags
            
            db.session.commit()
            return {'success': True, 'session': session.to_dict()}
            
        except Exception as e:
            logger.error(f"Error in update_chat_session: {str(e)}")
            db.session.rollback()
            return {'success': False, 'message': str(e)}
    
    def delete_chat_session(self, session_id: str) -> Dict:
        """
        Xóa một chat session và tất cả tin nhắn liên quan
        
        Args:
            session_id (str): ID của session
            
        Returns:
            Dict: Kết quả xóa
        """
        try:
            # Xóa tất cả tin nhắn trong session
            Chat.query.filter_by(session_id=session_id).delete()
            
            # Xóa session
            ChatSession.query.filter_by(session_id=session_id).delete()
            
            db.session.commit()
            return {'success': True, 'message': 'Session đã được xóa'}
            
        except Exception as e:
            logger.error(f"Error in delete_chat_session: {str(e)}")
            db.session.rollback()
            return {'success': False, 'message': str(e)}
    
    def search_chat_sessions(self, query: str, limit: int = 20) -> List[Dict]:
        """
        Tìm kiếm chat sessions theo từ khóa
        
        Args:
            query (str): Từ khóa tìm kiếm
            limit (int): Số lượng kết quả tối đa
            
        Returns:
            List[Dict]: Danh sách sessions phù hợp
        """
        try:
            # Tìm kiếm theo title, description
            sessions = ChatSession.query.filter(
                db.or_(
                    ChatSession.title.ilike(f'%{query}%'),
                    ChatSession.description.ilike(f'%{query}%')
                )
            ).order_by(ChatSession.last_message_at.desc()).limit(limit).all()
            
            return [session.to_dict() for session in sessions]
            
        except Exception as e:
            logger.error(f"Error in search_chat_sessions: {str(e)}")
            return []


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