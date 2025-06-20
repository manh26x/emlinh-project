"""
Idea management logic for content planning and organization.

This module contains the business logic for creating, managing,
and organizing ideas from chat conversations.
"""

import logging
from typing import Dict, Optional
from datetime import datetime

logger = logging.getLogger(__name__)


class IdeaManager:
    """Handles idea creation and management logic"""
    
    def __init__(self, db_session=None):
        self.db_session = db_session
    
    def try_create_idea_from_chat(self, user_message: str, ai_response: str, chat_id: int) -> Optional[Dict]:
        """
        Thử tạo idea từ cuộc hội thoại planning/brainstorm
        
        Args:
            user_message (str): Tin nhắn từ người dùng
            ai_response (str): Phản hồi từ AI
            chat_id (int): ID của chat
            
        Returns:
            Optional[Dict]: Thông tin idea được tạo hoặc None
        """
        try:
            # Import here to avoid circular imports
            from ...app.models import Idea
            
            # Extract potential idea từ AI response
            if self._should_create_idea(user_message):
                # Tạo title từ user message (đơn giản hóa)
                title = self._extract_title_from_message(user_message)
                content_type = self._determine_content_type(user_message)
                category = self._determine_category(user_message)
                priority = self._determine_priority(user_message, ai_response)
                
                idea = Idea(
                    title=title,
                    description=ai_response,
                    content_type=content_type,
                    category=category,
                    status='draft',
                    priority=priority,
                    related_chat_id=chat_id,
                    notes=f"Auto-created from chat conversation at {datetime.utcnow().isoformat()}"
                )
                
                if self.db_session:
                    self.db_session.add(idea)
                    self.db_session.commit()
                    return idea.to_dict()
                
        except Exception as e:
            logger.error(f"Error creating idea: {str(e)}")
        
        return None
    
    def _should_create_idea(self, user_message: str) -> bool:
        """Determine if an idea should be created based on the user message"""
        keywords = [
            'video', 'post', 'content', 'ý tưởng', 'idea', 'kế hoạch', 'plan',
            'tạo', 'create', 'viết', 'write', 'làm', 'make', 'brainstorm',
            'campaign', 'chiến dịch', 'series', 'tutorial', 'hướng dẫn'
        ]
        
        user_lower = user_message.lower()
        return any(keyword in user_lower for keyword in keywords)
    
    def _extract_title_from_message(self, user_message: str) -> str:
        """Extract a title from the user message"""
        # Clean and truncate the message for title
        title = user_message.strip()
        if len(title) <= 100:
            return title
        return title[:97] + "..."
    
    def _determine_content_type(self, user_message: str) -> str:
        """Determine content type based on user message"""
        user_lower = user_message.lower()
        
        if any(word in user_lower for word in ['video', 'youtube', 'tiktok', 'reel']):
            return 'video'
        elif any(word in user_lower for word in ['post', 'instagram', 'facebook']):
            return 'social_post'
        elif any(word in user_lower for word in ['blog', 'article', 'bài viết']):
            return 'article'
        elif any(word in user_lower for word in ['campaign', 'chiến dịch']):
            return 'campaign'
        else:
            return 'general'
    
    def _determine_category(self, user_message: str) -> str:
        """Determine category based on user message"""
        user_lower = user_message.lower()
        
        if any(word in user_lower for word in ['kế hoạch', 'plan', 'strategy']):
            return 'planning'
        elif any(word in user_lower for word in ['brainstorm', 'ý tưởng', 'idea']):
            return 'brainstorm'
        elif any(word in user_lower for word in ['tutorial', 'hướng dẫn', 'education']):
            return 'educational'
        elif any(word in user_lower for word in ['entertainment', 'fun', 'vui']):
            return 'entertainment'
        else:
            return 'general'
    
    def _determine_priority(self, user_message: str, ai_response: str) -> int:
        """Determine priority based on message content and AI response"""
        user_lower = user_message.lower()
        ai_lower = ai_response.lower()
        
        # High priority indicators
        high_priority_words = ['urgent', 'gấp', 'quan trọng', 'important', 'deadline', 'asap']
        if any(word in user_lower or word in ai_lower for word in high_priority_words):
            return 5
        
        # Medium-high priority
        medium_high_words = ['soon', 'sớm', 'priority', 'ưu tiên']
        if any(word in user_lower or word in ai_lower for word in medium_high_words):
            return 4
        
        # Default medium priority
        return 3
    
    def categorize_ideas_by_type(self, ideas: list) -> Dict[str, list]:
        """Categorize a list of ideas by their content type"""
        categorized = {
            'video': [],
            'social_post': [],
            'article': [],
            'campaign': [],
            'general': []
        }
        
        for idea in ideas:
            content_type = idea.get('content_type', 'general')
            if content_type in categorized:
                categorized[content_type].append(idea)
            else:
                categorized['general'].append(idea)
        
        return categorized
    
    def get_ideas_by_priority(self, ideas: list) -> Dict[str, list]:
        """Group ideas by priority level"""
        priority_groups = {
            'high': [],      # Priority 4-5
            'medium': [],    # Priority 3
            'low': []        # Priority 1-2
        }
        
        for idea in ideas:
            priority = idea.get('priority', 3)
            if priority >= 4:
                priority_groups['high'].append(idea)
            elif priority == 3:
                priority_groups['medium'].append(idea)
            else:
                priority_groups['low'].append(idea)
        
        return priority_groups