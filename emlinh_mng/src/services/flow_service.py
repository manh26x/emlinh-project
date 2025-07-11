#!/usr/bin/env python3
"""
Flow Service - Quản lý và điều phối các Flow trong hệ thống EmLinh AI

Service này cung cấp interface để:
1. Tạo và quản lý video production flows
2. Theo dõi tiến trình và trạng thái flows
3. Xử lý kết quả và trả về JSON responses
4. Tích hợp với hệ thống chat và database
"""

from typing import Dict, Any, Optional
import json
import asyncio
from datetime import datetime
import re
from crewai import LLM

from .video_production_flow import VideoProductionFlow, VideoProductionResponse


class FlowService:
    """
    Service quản lý CrewAI Flows cho hệ thống EmLinh AI
    
    Đây là service chính để tương tác với các Flow workflows,
    thay thế cho crew-based approach truyền thống.
    """
    
    def __init__(self):
        """Khởi tạo FlowService"""
        self.active_flows = {}  # Theo dõi các flow đang chạy
    
    def create_video_with_flow(
        self, 
        topic: str, 
        duration: int = 30,
        composition: str = "Scene-Portrait",
        background: str = "abstract", 
        voice: str = "fable"
    ) -> Dict[str, Any]:
        """
        Tạo video sử dụng VideoProductionFlow
        
        Args:
            topic: Chủ đề video
            duration: Thời lượng video (giây)
            composition: Loại composition
            background: Background scene
            voice: Giọng TTS
            
        Returns:
            Dict: JSON response với thông tin video đã tạo
        """
        try:
            print(f"🚀 [FLOW] Starting video production flow for topic: {topic}")
            
            # Đảm bảo có Flask application context
            from flask import current_app
            
            try:
                current_app._get_current_object()
                app_context = None
            except RuntimeError:
                from ..app.app import create_app
                app = create_app()  # create_app returns app only
                app_context = app.app_context()
                app_context.push()
            
            try:
                # Tạo và cấu hình flow
                flow = VideoProductionFlow()
                flow.state.topic = topic
                flow.state.duration = duration
                flow.state.composition = composition
                flow.state.background = background
                flow.state.voice = voice
                
                # Lưu flow vào active flows để tracking
                flow_id = f"video_{topic}_{len(self.active_flows)}"
                self.active_flows[flow_id] = flow
                
                # Chạy flow và lấy kết quả
                print(f"▶️ [FLOW] Executing flow: {flow_id}")
                result = flow.kickoff()
                
                # Xử lý kết quả
                if isinstance(result, VideoProductionResponse):
                    response_dict = result.dict()
                    print(f"✅ [FLOW] Flow completed successfully")
                    
                    # Thêm metadata
                    response_dict["flow_id"] = flow_id
                    response_dict["flow_type"] = "video_production"
                    response_dict["timestamp"] = flow.state.result.get("timestamp", "")
                    
                    return response_dict
                else:
                    # Fallback nếu result không phải VideoProductionResponse
                    print(f"⚠️ [FLOW] Unexpected result type: {type(result)}")
                    return {
                        "success": False,
                        "message": "Flow completed but returned unexpected result format",
                        "error": f"Expected VideoProductionResponse, got {type(result)}",
                        "flow_id": flow_id,
                        "raw_result": str(result)
                    }
                    
            finally:
                if app_context:
                    app_context.pop()
                
        except Exception as e:
            print(f"❌ [FLOW] Video production flow failed: {str(e)}")
            return {
                "success": False,
                "message": f"Có lỗi xảy ra khi tạo video: {str(e)}",
                "error": str(e),
                "video_id": None,
                "video_url": None,
                "video_path": None,
                "script": None,
                "duration": duration,
                "composition": composition,
                "background": background,
                "voice": voice
            }
    
    async def create_video_with_flow_async(
        self,
        topic: str,
        duration: int = 30,
        composition: str = "Scene-Portrait", 
        background: str = "abstract",
        voice: str = "fable"
    ) -> Dict[str, Any]:
        """
        Async version của create_video_with_flow
        
        Args:
            topic: Chủ đề video
            duration: Thời lượng video (giây)
            composition: Loại composition
            background: Background scene
            voice: Giọng TTS
            
        Returns:
            Dict: JSON response với thông tin video đã tạo
        """
        # Chạy sync method trong thread pool
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None,
            self.create_video_with_flow,
            topic, duration, composition, background, voice
        )
    
    async def process_message_async(self, user_message: str, session_id: str) -> str:
        """
        Xử lý tin nhắn từ người dùng và quyết định hành động
        
        Args:
            user_message: Tin nhắn từ người dùng
            session_id: ID session chat
            
        Returns:
            str: JSON response hoặc text response
        """
        try:
            print(f"🤖 [FLOW] Processing message: {user_message}")
            
            # Phân tích tin nhắn để xác định intent
            intent = self._analyze_message_intent(user_message)
            
            if intent["type"] == "create_video":
                # Redirect đến endpoint realtime để có progress updates
                return json.dumps({
                    "type": "redirect_video_creation",
                    "message": f"Đang khởi tạo tạo video về: {intent['topic']}",
                    "video_request": {
                        "topic": intent["topic"],
                        "duration": intent.get("duration", 30),
                        "composition": intent.get("composition", "Scene-Portrait"),
                        "background": intent.get("background", "abstract"),
                        "voice": intent.get("voice", "fable")
                    }
                })
                

            
            else:
                # Xử lý tin nhắn thường bằng LLM
                return await self._process_general_message(user_message, session_id)
                
        except Exception as e:
            print(f"❌ [FLOW] Error processing message: {str(e)}")
            return json.dumps({
                "type": "error",
                "message": f"Có lỗi xảy ra khi xử lý tin nhắn: {str(e)}",
                "error": str(e)
            })
    
    def _analyze_message_intent(self, message: str) -> Dict[str, Any]:
        """
        Phân tích intent của tin nhắn người dùng
        
        Args:
            message: Tin nhắn cần phân tích
            
        Returns:
            Dict: Thông tin intent và parameters
        """
        message_lower = message.lower()
        
        # Patterns để nhận diện yêu cầu tạo video
        video_patterns = [
            r"tạo.*video.*về\s+(.+)",
            r"làm.*video.*về\s+(.+)",
            r"video.*về\s+(.+)",
            r"hãy.*tạo.*video.*về\s+(.+)",
            r"tạo.*video.*(.+)",
            r"video.*dài\s+(\d+)\s*s.*về\s+(.+)",
            r"video.*(\d+)\s*giây.*về\s+(.+)"
        ]
        
        for pattern in video_patterns:
            match = re.search(pattern, message_lower)
            if match:
                if "dài" in pattern or "giây" in pattern:
                    # Pattern có duration
                    duration = int(match.group(1))
                    topic = match.group(2).strip()
                else:
                    # Pattern chỉ có topic
                    topic = match.group(1).strip()
                    duration = 30  # default
                
                # Trích xuất thêm thông tin nếu có
                composition = "Scene-Portrait"
                background = "abstract"
                voice = "fable"
                
                # Tìm duration nếu chưa có
                if "dài" not in pattern:
                    duration_match = re.search(r"(\d+)\s*giây", message_lower)
                    if duration_match:
                        duration = int(duration_match.group(1))
                
                return {
                    "type": "create_video",
                    "topic": topic,
                    "duration": duration,
                    "composition": composition,
                    "background": background,
                    "voice": voice
                }
        
        # Không phải yêu cầu tạo video
        return {
            "type": "general_chat",
            "message": message
        }
    
    async def _process_general_message(self, message: str, session_id: str) -> str:
        """
        Xử lý tin nhắn chat thường bằng LLM
        
        Args:
            message: Tin nhắn người dùng
            session_id: ID session
            
        Returns:
            str: Phản hồi từ AI
        """
        try:
            # Sử dụng LLM để trả lời
            llm = LLM(model="openai/gpt-4o-mini")
            
            messages = [
                {
                    "role": "system",
                    "content": """Bạn là Em Linh AI, một trợ lý thông minh và thân thiện. 
                    Bạn có thể giúp người dùng tạo video, trò chuyện và hỗ trợ các tác vụ khác.
                    
                    Khi người dùng muốn tạo video, hãy hướng dẫn họ sử dụng cú pháp như:
                    - "tạo video về [chủ đề]"
                    - "video dài [số] giây về [chủ đề]"
                    
                    Hãy trả lời một cách tự nhiên, thân thiện và hữu ích."""
                },
                {
                    "role": "user",
                    "content": message
                }
            ]
            
            response = llm.call(messages=messages)
            return response.strip()
            
        except Exception as e:
            print(f"❌ [FLOW] Error in general message processing: {str(e)}")
            return f"Xin lỗi, tôi gặp lỗi khi xử lý tin nhắn của bạn: {str(e)}"
    
    def get_flow_status(self, flow_id: str) -> Dict[str, Any]:
        """
        Lấy trạng thái của một flow
        
        Args:
            flow_id: ID của flow
            
        Returns:
            Dict: Thông tin trạng thái flow
        """
        if flow_id not in self.active_flows:
            return {
                "success": False,
                "message": "Flow not found",
                "flow_id": flow_id
            }
        
        flow = self.active_flows[flow_id]
        
        return {
            "success": True,
            "flow_id": flow_id,
            "current_step": flow.state.current_step,
            "progress": flow.state.progress,
            "topic": flow.state.topic,
            "duration": flow.state.duration,
            "error_message": flow.state.error_message
        }
    
    def list_active_flows(self) -> Dict[str, Any]:
        """
        Liệt kê tất cả flows đang hoạt động
        
        Returns:
            Dict: Danh sách flows và trạng thái
        """
        flows_info = {}
        
        for flow_id, flow in self.active_flows.items():
            flows_info[flow_id] = {
                "current_step": flow.state.current_step,
                "progress": flow.state.progress,
                "topic": flow.state.topic,
                "duration": flow.state.duration,
                "error_message": flow.state.error_message
            }
        
        return {
            "success": True,
            "active_flows_count": len(self.active_flows),
            "flows": flows_info
        }
    
    def cleanup_completed_flows(self) -> Dict[str, Any]:
        """
        Dọn dẹp các flows đã hoàn thành
        
        Returns:
            Dict: Thông tin về việc dọn dẹp
        """
        completed_flows = []
        
        for flow_id, flow in list(self.active_flows.items()):
            if flow.state.current_step in ["completed", "failed"]:
                completed_flows.append(flow_id)
                del self.active_flows[flow_id]
        
        return {
            "success": True,
            "message": f"Cleaned up {len(completed_flows)} completed flows",
            "cleaned_flows": completed_flows,
            "remaining_flows": len(self.active_flows)
        }
    
    def demonstrate_flow_capabilities(self) -> Dict[str, Any]:
        """
        Demo các khả năng của Flow system
        
        Returns:
            Dict: Thông tin demo về Flow capabilities
        """
        return {
            "success": True,
            "message": "CrewAI Flow System Capabilities",
            "features": {
                "event_driven_architecture": {
                    "description": "Flows sử dụng @start(), @listen(), @router() để tạo event-driven workflows",
                    "benefits": ["Rõ ràng về flow control", "Dễ debug", "Scalable"]
                },
                "state_management": {
                    "description": "Pydantic-based state management với type safety",
                    "benefits": ["Type safety", "Data validation", "Clear state tracking"]
                },
                "structured_outputs": {
                    "description": "Trả về structured JSON responses thay vì plain text",
                    "benefits": ["API integration", "Frontend display", "Data consistency"]
                },
                "error_handling": {
                    "description": "Comprehensive error handling với detailed error messages",
                    "benefits": ["Better debugging", "User feedback", "System reliability"]
                },
                "progress_tracking": {
                    "description": "Real-time progress tracking cho long-running workflows",
                    "benefits": ["User experience", "Monitoring", "Timeout management"]
                }
            },
            "video_production_workflow": {
                "steps": [
                    "1. Initialize → Validate parameters",
                    "2. Generate Script → LLM-based script creation", 
                    "3. Create DB Record → Database persistence",
                    "4. Start TTS → Text-to-speech conversion",
                    "5. Start Video Render → Video generation",
                    "6. Finalize → Update database and return response"
                ],
                "output_format": "VideoProductionResponse (JSON)",
                "key_advantages": [
                    "Visibility into each step",
                    "Structured JSON response for frontend",
                    "Error handling at each step",
                    "Progress tracking",
                    "Database integration"
                ]
            },
            "comparison_with_crew": {
                "crew_approach": {
                    "pros": ["Good for agent collaboration", "Built-in agent tools"],
                    "cons": ["Black box execution", "Limited flow control", "Text-only output"]
                },
                "flow_approach": {
                    "pros": [
                        "Clear step-by-step execution",
                        "Structured JSON outputs", 
                        "Better error handling",
                        "Progress tracking",
                        "Event-driven architecture"
                    ],
                    "cons": ["More setup required", "Learning curve"]
                },
                "recommendation": "Use Flows for structured workflows, Crews for agent collaboration"
            }
        }


# Global FlowService instance
flow_service = FlowService() 