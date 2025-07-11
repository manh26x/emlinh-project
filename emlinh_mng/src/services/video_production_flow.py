#!/usr/bin/env python3
"""
Video Production Flow - Sử dụng CrewAI Flow để tối ưu quy trình sản xuất video
"""

from typing import Dict, Any, Optional
from pydantic import BaseModel, Field
from crewai.flow.flow import Flow, listen, start, router
from crewai import Agent, LLM
import time
import os
import asyncio
import json
from datetime import datetime

from .video_service import VideoService
from .tts_service import TTSService
from src.app.extensions import db
from src.app.models import Video
from src.utils.video_utils import VideoUtils
from src.utils.tts_utils import TTSUtils


class VideoProductionState(BaseModel):
    """State model for video production workflow"""
    # Input parameters
    topic: str = ""
    duration: int = 30
    composition: str = "Scene-Portrait"
    background: str = "abstract"
    voice: str = "fable"
    
    # Processing state
    script: str = ""
    video_id: Optional[int] = None
    audio_file: str = ""
    video_file: str = ""
    actual_duration: Optional[float] = None  # Duration thực tế từ audio file
    
    # Status tracking
    current_step: str = "initialized"
    progress: float = 0.0
    error_message: str = ""
    
    # Final result
    result: Dict[str, Any] = {}


class VideoProductionResponse(BaseModel):
    """Structured response for video production"""
    success: bool = Field(description="Whether the video production was successful")
    message: str = Field(description="Human-readable message about the result")
    video_id: Optional[int] = Field(description="Database ID of the created video")
    video_url: Optional[str] = Field(description="URL to access the video")
    video_path: Optional[str] = Field(description="File path of the video")
    script: Optional[str] = Field(description="Generated script content")
    duration: Optional[int] = Field(description="Video duration in seconds")
    composition: Optional[str] = Field(description="Video composition type")
    background: Optional[str] = Field(description="Background type used")
    voice: Optional[str] = Field(description="Voice type used for TTS")
    error: Optional[str] = Field(description="Error message if failed")


class VideoProductionFlow(Flow[VideoProductionState]):
    """
    Advanced video production workflow using CrewAI Flow
    
    This Flow orchestrates the complete video production process:
    1. Initialize → 2. Generate Script → 3. Create DB Record → 4. Start TTS 
    → 5. Monitor TTS → 6. Start Video Render → 7. Monitor Video → 8. Finalize
    """
    
    def __init__(self):
        super().__init__()
        self.video_service = VideoService()
        self.tts_service = TTSService()
        self.script_agent = self._create_script_agent()
    
    def _create_script_agent(self) -> Agent:
        """Tạo agent chuyên về việc tạo script cho video"""
        return Agent(
            role='Video Script Writer',
            goal='Tạo script hấp dẫn và phù hợp cho video AI avatar',
            backstory="""Bạn là một chuyên gia viết script cho video có kinh nghiệm nhiều năm. 
            Bạn biết cách tạo nội dung hấp dẫn, dễ hiểu và phù hợp với thời lượng video được yêu cầu.
            
            Nguyên tắc viết script:
            - Nội dung phải súc tích và thu hút người xem
            - Sử dụng ngôn ngữ tự nhiên, dễ hiểu
            - Tốc độ đọc khoảng 150 từ/phút
            - Bắt đầu với lời chào thân thiện
            - Kết thúc bằng lời cảm ơn hoặc kêu gọi hành động
            """,
            verbose=True,
            allow_delegation=False
        )
    
    @start()
    def initialize_production(self) -> Dict[str, Any]:
        """
        Initialize the video production workflow
        
        Returns:
            Dict containing initial state information
        """
        try:
            print(f"🎬 Starting video production for topic: {self.state.topic}")
            self.state.current_step = "initializing"
            self.state.progress = 10.0
            
            # Validate input parameters
            if not self.state.topic:
                raise ValueError("Topic is required")
            
            if self.state.duration < 5 or self.state.duration > 300:
                raise ValueError("Duration must be between 5 and 300 seconds")
            
            print(f"✅ Parameters validated - Duration: {self.state.duration}s, Voice: {self.state.voice}")
            
            return {
                "topic": self.state.topic,
                "duration": self.state.duration,
                "composition": self.state.composition,
                "background": self.state.background,
                "voice": self.state.voice,
                "status": "initialized"
            }
            
        except Exception as e:
            self.state.error_message = str(e)
            self.state.current_step = "failed"
            print(f"❌ Initialization failed: {e}")
            raise
    
    @listen(initialize_production)
    def generate_script(self, init_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate script content using LLM
        
        Args:
            init_data: Data from initialization step
            
        Returns:
            Dict containing script and metadata
        """
        try:
            print("📝 Generating script...")
            self.state.current_step = "generating_script"
            self.state.progress = 25.0
            
            # Initialize LLM for script generation
            llm = LLM(model="openai/gpt-4o-mini")
            
            # Create script generation prompt - CHỈ TẠO BÀI NÓI ĐƠN GIẢN
            messages = [
                {
                    "role": "system", 
                    "content": """Bạn là một chuyên gia viết nội dung. Nhiệm vụ của bạn là tạo ra một BÀI NÓI ngắn gọn và súc tích.

QUAN TRỌNG: 
- CHỈ viết nội dung BÀI NÓI, KHÔNG viết kịch bản
- KHÔNG đề cập đến âm nhạc, hình ảnh, người dẫn chương trình
- KHÔNG sử dụng format kịch bản như **[Mở đầu]**, **Người dẫn:**
- CHỈ viết văn bản thuần túy như một bài nói tự nhiên
- Sử dụng ngôn ngữ thân thiện, dễ hiểu
- Nội dung phù hợp với thời lượng được yêu cầu"""
                },
                {
                    "role": "user", 
                    "content": f"""
                    Hãy viết một bài nói ngắn về chủ đề: {self.state.topic}
                    
                    Yêu cầu:
                    - Thời lượng: {self.state.duration} giây (khoảng {self.state.duration * 3} từ)
                    - Bắt đầu với lời chào đơn giản
                    - Nội dung chính súc tích về chủ đề
                    - Kết thúc tích cực
                    - Chỉ viết văn bản nói, không format kịch bản
                    - Sử dụng tiếng Việt tự nhiên
                    
                    Ví dụ format mong muốn:
                    "Xin chào các bạn! Hôm nay tôi muốn chia sẻ về [chủ đề]. [Nội dung chính 2-3 câu]. Cảm ơn các bạn đã lắng nghe!"
                    """
                }
            ]
            
            # Generate script
            response = llm.call(messages=messages)
            script_content = response.strip()
            
            # Làm sạch script - loại bỏ các format không mong muốn
            script_content = self._clean_script_content(script_content)
            
            # Store script in state
            self.state.script = script_content
            
            print(f"✅ Bài nói generated ({len(script_content)} characters)")
            print(f"📝 Content preview: {script_content[:100]}...")
            
            return {
                "script": script_content,
                "topic": self.state.topic,
                "duration": self.state.duration,
                "status": "script_generated"
            }
            
        except Exception as e:
            self.state.error_message = str(e)
            self.state.current_step = "failed"
            print(f"❌ Script generation failed: {e}")
            raise
    
    def _clean_script_content(self, script: str) -> str:
        """
        Làm sạch script content, loại bỏ format kịch bản không mong muốn
        
        Args:
            script: Script gốc từ LLM
            
        Returns:
            str: Script đã được làm sạch
        """
        # Loại bỏ các dấu hiệu format kịch bản
        lines_to_remove = [
            "**Kịch bản", "**[", "**Người", "**Hình ảnh", 
            "*(Hình ảnh", "*(Âm nhạc", "*Về hình ảnh",
            "---", "# ", "## ", "### "
        ]
        
        lines = script.split('\n')
        clean_lines = []
        
        for line in lines:
            line = line.strip()
            
            # Bỏ qua dòng trống
            if not line:
                continue
                
            # Bỏ qua các dòng có format kịch bản
            should_skip = False
            for pattern in lines_to_remove:
                if pattern in line:
                    should_skip = True
                    break
            
            if should_skip:
                continue
                
            # Loại bỏ các ký tự format
            line = line.replace("**", "").replace("*", "")
            line = line.replace("[", "").replace("]", "")
            
            # Bỏ qua các dòng quá ngắn (có thể là stage direction)
            if len(line) < 10:
                continue
                
            clean_lines.append(line)
        
        # Nối các dòng lại thành một đoạn văn
        clean_script = " ".join(clean_lines)
        
        # Làm sạch khoảng trắng thừa
        clean_script = " ".join(clean_script.split())
        
        return clean_script
    
    @listen(generate_script)
    def create_database_record(self, script_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create video record in database
        
        Args:
            script_data: Data from script generation step
            
        Returns:
            Dict containing video record information
        """
        try:
            print("💾 Creating database record...")
            self.state.current_step = "creating_record"
            self.state.progress = 35.0
            
            # Import Flask app để có application context
            from flask import current_app
            
            # Sử dụng application context nếu có
            try:
                # Kiểm tra xem có app context không
                current_app._get_current_object()
                app_context = None
            except RuntimeError:
                # Tạo app context mới
                from ..app.app import create_app
                app = create_app()  # create_app returns app only
                app_context = app.app_context()
                app_context.push()
            
            try:
                # Create video record với temporary file path
                video = Video(
                    title=f"Video về {self.state.topic}",
                    topic=self.state.topic,
                    script=self.state.script,
                    duration=self.state.duration,
                    composition=self.state.composition,
                    background=self.state.background,
                    voice=self.state.voice,
                    status='processing',
                    file_path='',  # Temporary empty string, sẽ cập nhật sau
                    file_name=f"video_{self.state.topic.replace(' ', '_')}.mp4"
                )
                
                db.session.add(video)
                db.session.commit()
                
                # Store video ID in state
                self.state.video_id = video.id
                
                print(f"✅ Database record created with ID: {video.id}")
                
                return {
                    "video_id": video.id,
                    "script": self.state.script,
                    "topic": self.state.topic,
                    "status": "record_created"
                }
                
            finally:
                # Cleanup app context nếu đã tạo
                if app_context:
                    app_context.pop()
            
        except Exception as e:
            self.state.error_message = str(e)
            self.state.current_step = "failed"
            print(f"❌ Database record creation failed: {e}")
            raise
    
    @listen(create_database_record)
    def start_tts_generation(self, record_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Start Text-to-Speech generation using TTSService with duration tracking
        
        Args:
            record_data: Data from database creation step
            
        Returns:
            Dict containing TTS job information with actual duration
        """
        try:
            print("🎤 Starting TTS generation...")
            self.state.current_step = "starting_tts"
            self.state.progress = 45.0
            
            # Import TTSService
            from ..services.tts_service import get_tts_service
            tts_service = get_tts_service()
            
            # Generate TTS with job tracking
            tts_job_id = tts_service.generate_speech(
                text=self.state.script,
                filename=f"video_{self.state.video_id}_audio"
            )
            
            # Wait for TTS completion and get actual duration
            import time
            max_wait = 60  # Maximum wait time in seconds
            wait_time = 0
            
            while wait_time < max_wait:
                tts_status = tts_service.get_tts_status(tts_job_id)
                
                if tts_status['status'] == 'completed':
                    # TTS completed successfully
                    audio_file = tts_status['wav_path']
                    actual_duration = tts_status.get('actual_duration', self.state.duration)
                    
                    # Update state with actual duration
                    self.state.audio_file = audio_file
                    self.state.actual_duration = actual_duration
                    self.state.duration = int(actual_duration)  # Update duration với actual value
                    
                    print(f"✅ TTS generated: {audio_file}")
                    print(f"📊 Actual duration: {actual_duration}s (was {self.state.duration}s)")
                    
                    # Kiểm tra mouthCues JSON
                    json_path = tts_status['json_path']
                    if os.path.exists(json_path):
                        print(f"✅ MouthCues JSON created: {json_path}")
                    else:
                        print(f"⚠️ MouthCues JSON not found: {json_path}")
                    
                    return {
                        "audio_file": audio_file,
                        "actual_duration": actual_duration,
                        "video_id": self.state.video_id,
                        "tts_job_id": tts_job_id,
                        "status": "tts_completed"
                    }
                    
                elif tts_status['status'] == 'failed':
                    raise Exception(f"TTS generation failed: {tts_status.get('error', 'Unknown error')}")
                
                # Wait a bit before checking again
                time.sleep(1)
                wait_time += 1
            
            # Timeout
            raise Exception(f"TTS generation timeout after {max_wait} seconds")
            
        except Exception as e:
            self.state.error_message = str(e)
            self.state.current_step = "failed"
            print(f"❌ TTS generation failed: {e}")
            raise
    
    @listen(start_tts_generation)
    def start_video_render(self, tts_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Start video rendering process với fallback support
        
        Args:
            tts_data: Data from TTS generation step
            
        Returns:
            Dict containing render job information
        """
        try:
            print("🎬 Starting video render...")
            self.state.current_step = "starting_render"
            self.state.progress = 65.0
            
            # Sử dụng actual duration nếu có, fallback to original duration
            render_duration = self.state.actual_duration if self.state.actual_duration else self.state.duration
            
            print(f"🎬 Rendering video with actual duration: {render_duration}s")
            
            # Start video rendering sử dụng VideoUtils đã cải thiện
            video_file = VideoUtils.render_video(
                audio_file=self.state.audio_file,
                duration=render_duration,
                composition=self.state.composition,
                background=self.state.background,
                topic=self.state.topic
            )
            
            # Store video file path
            self.state.video_file = video_file
            
            # Check if it's a placeholder file
            if video_file.endswith('_placeholder.txt'):
                print(f"⚠️ Placeholder video created: {video_file}")
                print("   Video rendering not available, but flow continues")
            else:
                print(f"✅ Video rendered: {video_file}")
            
            return {
                "video_file": video_file,
                "audio_file": self.state.audio_file,
                "video_id": self.state.video_id,
                "status": "render_completed"
            }
            
        except Exception as e:
            self.state.error_message = str(e)
            self.state.current_step = "failed"
            print(f"❌ Video rendering failed: {e}")
            raise
    
    @listen(start_video_render)
    def finalize_production(self, render_data: Dict[str, Any]) -> VideoProductionResponse:
        """
        Finalize video production and return structured response
        
        Args:
            render_data: Data from video rendering step
            
        Returns:
            VideoProductionResponse: Structured response with all video information
        """
        try:
            print("🎯 Finalizing production...")
            self.state.current_step = "finalizing"
            self.state.progress = 90.0
            
            # Update database record với application context
            from flask import current_app
            
            # Sử dụng application context nếu có
            try:
                current_app._get_current_object()
                app_context = None
            except RuntimeError:
                from ..app.app import create_app
                app = create_app()  # create_app returns app only
                app_context = app.app_context()
                app_context.push()
            
            try:
                video = Video.query.get(self.state.video_id)
                if video:
                    video.file_path = self.state.video_file
                    video.file_name = self.state.video_file.split('/')[-1]
                    
                    # Handle placeholder files
                    if self.state.video_file.endswith('_placeholder.txt'):
                        video.status = 'placeholder'
                        video.error_message = 'Video rendering not available - placeholder created'
                        print("ℹ️ Database updated with placeholder status")
                    else:
                        video.status = 'completed'
                    
                    # Update duration với actual duration từ audio
                    if self.state.actual_duration:
                        video.duration = int(self.state.actual_duration)
                    
                    # Get file size
                    if os.path.exists(self.state.video_file):
                        video.file_size = os.path.getsize(self.state.video_file)
                    
                    db.session.commit()
                    
                    print(f"✅ Database updated for video ID: {video.id}")
            finally:
                if app_context:
                    app_context.pop()
            
            # Create structured response with actual duration
            final_duration = int(self.state.actual_duration) if self.state.actual_duration else self.state.duration
            response = VideoProductionResponse(
                success=True,
                message=f"Video về '{self.state.topic}' đã được tạo thành công! (Thời lượng: {final_duration}s)",
                video_id=self.state.video_id,
                video_url=f"/api/videos/{self.state.video_id}/file",
                video_path=self.state.video_file,
                script=self.state.script,
                duration=final_duration,
                composition=self.state.composition,
                background=self.state.background,
                voice=self.state.voice,
                error=None
            )
            
            # Store final result in state
            self.state.result = response.dict()
            self.state.current_step = "completed"
            self.state.progress = 100.0
            
            print("🎉 Video production completed successfully!")
            
            return response
            
        except Exception as e:
            self.state.error_message = str(e)
            self.state.current_step = "failed"
            print(f"❌ Production finalization failed: {e}")
            
            # Return error response
            return VideoProductionResponse(
                success=False,
                message=f"Có lỗi xảy ra khi tạo video: {str(e)}",
                video_id=self.state.video_id,
                video_url=None,
                video_path=None,
                script=self.state.script,
                duration=self.state.duration,
                composition=self.state.composition,
                background=self.state.background,
                voice=self.state.voice,
                error=str(e)
            )
    
    def get_production_summary(self) -> Dict[str, Any]:
        """Lấy tóm tắt kết quả sản xuất video"""
        return {
            "success": self.state.current_step == "completed",
            "video_id": self.state.video_id,
            "topic": self.state.topic,
            "script": self.state.script,
            "audio_file": self.state.audio_file,
            "video_path": self.state.video_file,
            "duration": self.state.duration,
            "actual_duration": self.state.actual_duration,  # Thêm actual duration
            "composition": self.state.composition,
            "background": self.state.background,
            "voice": self.state.voice,
            "current_step": self.state.current_step,
            "progress": self.state.progress,
            "error_message": self.state.error_message
        }


def create_video_from_topic(
    topic: str,
    duration: int = 15,
    composition: str = "Scene-Landscape", 
    background: str = "office",
    voice: str = "nova"
) -> Dict[str, Any]:
    """
    Hàm tiện ích để tạo video từ chủ đề sử dụng Flow
    
    Args:
        topic: Chủ đề của video
        duration: Thời lượng video (giây)
        composition: Loại composition
        background: Background scene
        voice: Giọng đọc TTS
        
    Returns:
        Dict chứa thông tin kết quả và trạng thái
    """
    
    # Khởi tạo flow với state ban đầu
    flow = VideoProductionFlow()
    flow.state.topic = topic
    flow.state.duration = duration
    flow.state.composition = composition
    flow.state.background = background
    flow.state.voice = voice
    
    try:
        # Chạy flow
        print(f"🚀 [MAIN] Bắt đầu sản xuất video với Flow")
        print(f"🚀 [MAIN] Chủ đề: {topic}")
        
        result = flow.kickoff()
        summary = flow.get_production_summary()
        
        print(f"🏁 [MAIN] Kết thúc Flow - Trạng thái: {summary['current_step']}")
        
        return summary
        
    except Exception as e:
        print(f"🚨 [MAIN] Lỗi nghiêm trọng trong Flow: {str(e)}")
        return {
            "success": False,
            "error_message": f"Flow execution error: {str(e)}",
            "current_step": "flow_failed"
        }


# Test function để demo flow
def demo_video_production():
    """Demo function để test Video Production Flow"""
    print("🎬 Demo Video Production Flow")
    print("=" * 50)
    
    result = create_video_from_topic(
        topic="Trí tuệ nhân tạo trong tương lai",
        duration=10,
        composition="Scene-Landscape",
        background="office", 
        voice="nova"
    )
    
    print("\n📊 Kết quả Demo:")
    print(f"- Thành công: {result['success']}")
    print(f"- Bước hiện tại: {result['current_step']}")
    if result.get('video_id'):
        print(f"- Video ID: {result['video_id']}")
    if result.get('error_message'):
        print(f"- Lỗi: {result['error_message']}")


def create_video_from_topic_realtime(
    topic: str,
    duration: int = 15,
    composition: str = "Scene-Landscape", 
    background: str = "office",
    voice: str = "nova",
    job_id: str = "",
    app_instance=None  # Flask app instance parameter
) -> Dict[str, Any]:
    """
    Hàm tạo video với realtime updates qua Server-Sent Events
    
    Args:
        topic: Chủ đề của video
        duration: Thời lượng video (giây)
        composition: Loại composition
        background: Background scene
        voice: Giọng đọc TTS
        job_id: Job ID để tracking
        app_instance: Flask app instance để access progress store
        
    Returns:
        Dict chứa thông tin kết quả và trạng thái
    """
    
    def store_progress(step: str, message: str, progress: int, data: dict = None):
        """Helper function để store progress events cho SSE"""
        try:
            event_data = {
                'job_id': job_id,
                'step': step,
                'message': message,
                'progress': progress,
                'data': data or {},
                'timestamp': datetime.now().isoformat()
            }
            
            print(f"📡 [SSE] Storing progress event: {step} ({progress}%)")
            print(f"📡 [SSE] Job ID: {job_id}")
            print(f"📡 [SSE] Event data: {event_data}")
            
            # Use app_instance instead of current_app
            if app_instance:
                if not hasattr(app_instance, 'video_progress_store'):
                    from collections import defaultdict
                    app_instance.video_progress_store = defaultdict(list)
                
                app_instance.video_progress_store[job_id].append(event_data)
                print(f"✅ [SSE] Event stored successfully")
            else:
                print(f"⚠️ [SSE] No app instance provided - cannot store progress")
            
        except Exception as e:
            print(f"⚠️ [SSE] Error storing progress: {str(e)}")
    
    try:
        # Step 1: Khởi tạo flow
        store_progress('initializing', 'Đang khởi tạo quy trình tạo video...', 10)
        
        flow = VideoProductionFlow()
        flow.state.topic = topic
        flow.state.duration = duration
        flow.state.composition = composition
        flow.state.background = background
        flow.state.voice = voice
        
        # Step 2: Bắt đầu tạo script
        store_progress('generating_script', 'Đang tạo bài thuyết trình...', 20)
        
        # Initialize production
        init_result = flow.initialize_production()
        
        # Generate script
        script_result = flow.generate_script(init_result)
        store_progress('script_completed', 
                     f'Đã hoàn thành bài thuyết trình có độ dài {len(script_result["script"])} ký tự',
                     35,
                     {'script_preview': script_result["script"][:200] + "..." if len(script_result["script"]) > 200 else script_result["script"]})
        
        # Step 3: Tạo database record
        store_progress('creating_record', 'Đang tạo bản ghi video trong database...', 40)
        
        record_result = flow.create_database_record(script_result)
        store_progress('record_created', 
                     f'Đã tạo bản ghi video với ID: {record_result["video_id"]}',
                     45)
        
        # Step 4: Tạo file âm thanh
        store_progress('generating_audio', 
                     f'Đang tạo file âm thanh với giọng đọc {voice}...',
                     50)
        
        tts_result = flow.start_tts_generation(record_result)
        
        # Lấy actual duration từ TTS result
        actual_duration = tts_result.get('actual_duration', duration)
        actual_duration_str = f"{actual_duration:.1f}" if isinstance(actual_duration, float) else str(actual_duration)
        
        store_progress('audio_completed', 
                     f'Đã tạo xong file âm thanh có thời lượng thực tế {actual_duration_str} giây với giọng đọc {voice}',
                     70,
                     {
                         'audio_file': tts_result.get('audio_file', ''),
                         'actual_duration': actual_duration,
                         'original_duration': duration
                     })
        
        # Step 5: Render video
        store_progress('rendering_video', 
                     f'Đang render video có thời lượng thực tế {actual_duration_str} giây, background: {background}, composition: {composition}...',
                     75,
                     {
                         'actual_duration': actual_duration,
                         'background': background,
                         'composition': composition
                     })
        
        render_result = flow.start_video_render(tts_result)
        store_progress('video_rendering', 
                     f'Video đang được render với composition {composition} và thời lượng {actual_duration_str}s...',
                     85)
        
        # Step 6: Finalize
        store_progress('finalizing', 'Đang hoàn thiện và lưu video...', 95)
        
        final_result = flow.finalize_production(render_result)
        
        # Tạo summary với actual duration information
        summary = flow.get_production_summary()
        
        # Store final completion event với thông tin chi tiết
        if summary.get('success'):
            final_actual_duration = summary.get('actual_duration') or actual_duration
            final_duration_str = f"{final_actual_duration:.1f}" if isinstance(final_actual_duration, float) else str(final_actual_duration)
            
            completion_message = f'Video đã được tạo thành công! Thời lượng thực tế: {final_duration_str}s (dự kiến: {duration}s)'
            store_progress('completed', completion_message, 100, {
                'video_id': summary.get('video_id'),
                'actual_duration': final_actual_duration,
                'original_duration': duration,
                'topic': topic,
                'final_result': summary
            })
        
        return summary
        
    except Exception as e:
        store_progress('failed', f'Lỗi trong quá trình tạo video: {str(e)}', 0)
        print(f"🚨 [REALTIME] Lỗi nghiêm trọng trong Flow: {str(e)}")
        return {
            "success": False,
            "error_message": f"Flow execution error: {str(e)}",
            "current_step": "flow_failed"
        }


if __name__ == "__main__":
    demo_video_production() 