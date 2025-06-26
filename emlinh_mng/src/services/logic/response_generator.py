"""
Response generation logic for different types of AI interactions.

This module contains the business logic for generating AI responses
based on different message types and contexts.
"""

import logging
from typing import Dict, Optional

logger = logging.getLogger(__name__)


class ResponseGenerator:
    """Handles AI response generation for different message types"""
    
    def __init__(self, flow_service=None):
        self.flow_service = flow_service
    
    def generate_planning_response(self, user_message: str) -> str:
        """Tạo phản hồi cho planning mode"""
        try:
            # Sử dụng FlowService cho planning
            if self.flow_service:
                import asyncio
                try:
                    loop = asyncio.get_event_loop()
                except RuntimeError:
                    loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(loop)
                
                result = loop.run_until_complete(
                    self.flow_service._process_general_message(
                        f"Lập kế hoạch cho: {user_message}. Hãy đưa ra kế hoạch cụ thể và chi tiết.",
                        "planning_session"
                    )
                )
                return result
        except Exception as e:
            logger.warning(f"FlowService planning failed, using fallback: {str(e)}")
        
        # Fallback response cho planning
        return f"""📋 **Kế hoạch Content: {user_message}**

🎯 **Mục tiêu:**
- Xác định target audience và message chính
- Tạo nội dung hấp dẫn và có giá trị
- Tối ưu hóa engagement và reach

📝 **Các bước thực hiện:**
1. **Research & Planning** (1-2 ngày)
   - Nghiên cứu xu hướng và đối thủ
   - Xác định góc độ độc đáo
   
2. **Content Creation** (2-3 ngày)
   - Viết script/outline
   - Chuẩn bị visual assets
   
3. **Production** (1-2 ngày)
   - Quay/thiết kế content
   - Edit và post-production
   
4. **Publishing & Promotion** (1 ngày)
   - Đăng theo lịch tối ưu
   - Cross-platform promotion

💡 **Gợi ý:**
- Sử dụng trending hashtags phù hợp
- Tạo hook mạnh trong 3 giây đầu
- Call-to-action rõ ràng
- Theo dõi metrics và optimize

Bạn có muốn tôi elaborate thêm về bước nào không?"""
    
    def generate_brainstorm_response(self, user_message: str) -> str:
        """Tạo phản hồi cho brainstorm mode"""
        try:
            # Sử dụng FlowService cho brainstorm
            if self.flow_service:
                import asyncio
                try:
                    loop = asyncio.get_event_loop()
                except RuntimeError:
                    loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(loop)
                
                result = loop.run_until_complete(
                    self.flow_service._process_general_message(
                        f"Brainstorm ý tưởng về: {user_message}. Hãy đưa ra nhiều ý tưởng sáng tạo và đa dạng.",
                        "brainstorm_session"
                    )
                )
                return result
        except Exception as e:
            logger.warning(f"FlowService brainstorm failed, using fallback: {str(e)}")
        
        # Fallback response cho brainstorm
        return f"""💡 **Brainstorm Ideas cho: {user_message}**

🎬 **Video Content Ideas:**
1. **Tutorial/How-to**: Hướng dẫn step-by-step
2. **Behind-the-scenes**: Hậu trường quá trình làm việc
3. **Q&A Session**: Trả lời câu hỏi từ audience
4. **Trending Challenge**: Tham gia hoặc tạo challenge mới
5. **Collaboration**: Hợp tác với influencer/brand khác

📱 **Social Media Posts:**
1. **Carousel Posts**: Chia sẻ tips/insights qua nhiều slides
2. **Story Series**: Câu chuyện dài qua stories
3. **User-Generated Content**: Encourage audience tạo content
4. **Live Session**: Tương tác trực tiếp với followers
5. **Polls & Questions**: Tăng engagement

📝 **Content Formats:**
- Infographic summarizing key points
- Quote cards với insights hay
- Before/After comparisons
- Mini-series với multiple parts
- Interactive content (quiz, polls)

🎯 **Angles to explore:**
- Personal experience/story
- Industry expert perspective  
- Beginner-friendly approach
- Advanced tips & tricks
- Common mistakes to avoid

Bạn muốn tôi phát triển ý tưởng nào cụ thể hơn?"""
    
    def generate_conversation_response(self, user_message: str, context: str = "") -> str:
        """Tạo phản hồi cho conversation mode"""
        try:
            # Sử dụng FlowService cho conversation
            if self.flow_service:
                import asyncio
                try:
                    loop = asyncio.get_event_loop()
                except RuntimeError:
                    loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(loop)
                
                result = loop.run_until_complete(
                    self.flow_service._process_general_message(user_message, "conversation_session")
                )
                return result
        except Exception as e:
            logger.warning(f"FlowService conversation failed, using fallback: {str(e)}")
        
        return self._generate_fallback_conversation_response(user_message)
    
    def _generate_fallback_conversation_response(self, user_message: str) -> str:
        """Generate fallback conversation responses"""
        user_lower = user_message.lower()
        
        if any(word in user_lower for word in ['xin chào', 'hello', 'hi', 'chào']):
            return """👋 Xin chào! Tôi là AI Assistant của bạn, chuyên hỗ trợ quản lý content và tạo ý tưởng.

Tôi có thể giúp bạn:
• 💬 **Thảo luận ý tưởng** - Brainstorm và phát triển concepts
• 📋 **Lập kế hoạch content** - Tạo timeline và strategy
• 🎯 **Tối ưu nội dung** - Gợi ý cải thiện engagement
• 📊 **Phân tích trends** - Insights về xu hướng mới

Bạn muốn bắt đầu với điều gì? Có thể thử các quick actions bên cạnh! ✨"""
        
        elif any(word in user_lower for word in ['video', 'youtube', 'tiktok', 'reel']):
            return """🎬 **Video Content Strategy**

Tôi thấy bạn quan tâm đến video content! Đây là một số gợi ý:

**Trending Formats:**
• Short-form content (15-60s) đang rất hot
• Educational content với quick tips
• Behind-the-scenes footage
• React videos và commentary

**Optimization Tips:**
• Hook viewer trong 3 giây đầu
• Sử dụng captions để accessibility
• Optimize cho mobile viewing
• Strong call-to-action cuối video

Bạn muốn tạo video về chủ đề gì? Tôi có thể giúp brainstorm ideas cụ thể! 💡"""
        
        elif any(word in user_lower for word in ['post', 'instagram', 'facebook', 'content']):
            return """📱 **Social Media Content Ideas**

**High-Engagement Formats:**
• Carousel posts (2-10 slides)
• Story highlights với tutorials
• User-generated content campaigns
• Interactive posts (polls, questions)

**Content Pillars để follow:**
• Educational (60%) - Tips, tutorials, insights
• Entertainment (20%) - Memes, trends, fun content  
• Promotional (20%) - Products, services, announcements

**Best Practices:**
• Consistent visual branding
• Engage trong comments ngay sau khi post
• Cross-promote across platforms
• Track metrics và adjust strategy

Bạn đang plan content cho platform nào? 🚀"""
        
        else:
            return f"""Cảm ơn bạn đã chia sẻ! 

Về "{user_message}" - đây là một chủ đề thú vị. Tôi có thể giúp bạn:

🎯 **Phát triển ý tưởng này thành:**
• Video content với multiple angles
• Series posts trên social media  
• Educational content để share knowledge
• Interactive campaign với audience

💡 **Các bước tiếp theo:**
1. Xác định target audience chính
2. Choose platform phù hợp nhất
3. Brainstorm specific content ideas
4. Create content calendar

Bạn muốn explore direction nào trước? Hoặc có thể switch sang **Brainstorm mode** để tôi generate nhiều ideas hơn! ✨"""