from typing import Type, Optional
import requests
import time
import json
import os

from crewai.tools import BaseTool
from pydantic import BaseModel, Field

from .video_service import VideoService
from .tts_service import TTSService
from src.app.extensions import db
from src.app.models import Video
from src.app.config import Config


class VideoProductionInput(BaseModel):
    """Input schema cho Video Production Tool."""

    topic: str = Field(..., description="Chủ đề hoặc nội dung của video cần tạo")
    duration: Optional[int] = Field(default=15, description="Thời lượng video (giây), mặc định 15s")
    composition: Optional[str] = Field(default="Scene-Landscape", description="Loại composition: Scene-Landscape hoặc Scene-Portrait")
    background: Optional[str] = Field(default="office", description="Background scene: office hoặc abstract")
    voice: Optional[str] = Field(default="nova", description="Giọng đọc TTS: nova, alloy, echo, fable, onyx, shimmer")


class VideoProductionTool(BaseTool):
    name: str = "Video Production Tool"
    description: str = (
        "Tool này cho phép tạo video AI avatar với lip sync từ chủ đề/nội dung được chỉ định. "
        "Tool sẽ tự động tạo script phù hợp, sử dụng Text-to-Speech để tạo audio, "
        "và render video với avatar 3D có lip sync chính xác. "
        "Sử dụng khi người dùng yêu cầu tạo video về một chủ đề nào đó."
    )
    args_schema: Type[BaseModel] = VideoProductionInput

    def __init__(self):
        super().__init__()
        # Use instance variables instead of class fields để tránh Pydantic issues
        object.__setattr__(self, 'video_service', VideoService())
        object.__setattr__(self, 'tts_service', TTSService())
        print("🎬 VideoProductionTool initialized successfully!")

    def _run(
        self, 
        topic: str, 
        duration: int = 15, 
        composition: str = "Scene-Landscape",
        background: str = "office",
        voice: str = "nova"
    ) -> str:
        """
        Tạo video từ chủ đề được chỉ định
        
        Args:
            topic: Chủ đề hoặc nội dung của video
            duration: Thời lượng video (giây)
            composition: Loại composition
            background: Background scene
            voice: Giọng đọc TTS
        """
        print(f"🎬 VideoProductionTool._run called with topic: {topic}")
        
        # Tạo tên file output ngay từ đầu - sử dụng thư mục output của video service
        timestamp = time.strftime("%Y%m%d_%H%M%S")
        output_name = f"video_{timestamp}_{topic[:20].replace(' ', '_')}.mp4"
        # Sử dụng config để lấy output directory
        video_output_dir = getattr(self.video_service, 'output_dir', Config.WORKSPACE_ROOT)
        output_path = os.path.join(video_output_dir, output_name)
        
        try:
            # Bước 1: Tạo script từ chủ đề
            script = self._generate_script(topic, duration)
            
            # Tạo record video trong database ngay lập tức với status 'rendering'
            video_record = Video(
                title=f"Video về {topic}",
                topic=topic,
                script=script,
                file_path=output_path,
                file_name=output_name,
                duration=duration,
                composition=composition,
                background=background,
                voice=voice,
                status='rendering'
            )
            db.session.add(video_record)
            db.session.commit()
            
            # Bước 2: Tạo speech từ script với timeout rõ ràng
            tts_job_id = self.tts_service.generate_speech(script, voice)
            if not tts_job_id:
                video_record.status = 'failed'
                db.session.commit()
                return f"❌ Lỗi: Không thể tạo speech từ script"
            
            # Chờ TTS hoàn thành với timeout 60s thay vì 30s
            tts_result = None
            timeout_seconds = 60
            poll_interval = 2
            max_attempts = timeout_seconds // poll_interval  # 30 attempts max
            
            for attempt in range(max_attempts):
                status = self.tts_service.get_tts_status(tts_job_id)
                if status and status['status'] == 'completed':
                    tts_result = status
                    break
                elif status and status['status'] == 'failed':
                    break
                
                print(f"TTS attempt {attempt + 1}/{max_attempts} - Status: {status['status'] if status else 'unknown'}")
                time.sleep(poll_interval)
            
            if not tts_result or tts_result['status'] != 'completed':
                video_record.status = 'failed'
                db.session.commit()
                return f"❌ Lỗi: TTS job không hoàn thành sau {timeout_seconds}s"
            
            audio_file = tts_result['filename'] + '.wav'
            
            # Bước 3: Render video với timeout rõ ràng - Loại bỏ tham số camera
            props = {
                "durationInSeconds": duration,
                "audioFileName": audio_file,
                "backgroundScene": background
            }
            
            video_job_id = self.video_service.render_video(composition, props, output_name)
            if not video_job_id:
                video_record.status = 'failed'
                db.session.commit()
                return f"❌ Lỗi: Không thể bắt đầu render video"
            
            # Lưu job_id vào database
            video_record.job_id = video_job_id
            db.session.commit()
            
            # Chờ video render hoàn thành với timeout 180s thay vì 120s
            video_result = None
            video_timeout_seconds = 180
            video_poll_interval = 3
            video_max_attempts = video_timeout_seconds // video_poll_interval  # 60 attempts max
            
            for attempt in range(video_max_attempts):
                status = self.video_service.get_render_status(video_job_id)
                if status and status['status'] == 'completed':
                    video_result = status
                    break
                elif status and status['status'] == 'failed':
                    break
                
                print(f"Video render attempt {attempt + 1}/{video_max_attempts} - Status: {status['status'] if status else 'unknown'}")
                time.sleep(video_poll_interval)
            
            if video_result and video_result['status'] == 'completed':
                # Cập nhật video record với thông tin file
                video_record.status = 'completed'
                try:
                    if os.path.exists(output_path):
                        video_record.file_size = os.path.getsize(output_path)
                except:
                    pass
                db.session.commit()
                
                return f"""✅ **Video đã được tạo thành công!**

📝 **Chủ đề:** {topic}
🎭 **Script:** {script[:100]}...
🎵 **Audio:** {audio_file}
🎬 **Video:** {output_path}
⏱️ **Thời lượng:** {duration}s
🎨 **Background:** {background}
🗣️ **Voice:** {voice}
🆔 **Video ID:** {video_record.id}

Video đã được lưu vào database và có thể truy cập qua web interface tại /videos/{video_record.id}"""
            else:
                video_record.status = 'failed'
                db.session.commit()
                return f"❌ Lỗi: Không thể render video hoàn thành sau {video_timeout_seconds}s"
                
        except Exception as e:
            # Cập nhật status nếu có lỗi
            try:
                if 'video_record' in locals():
                    video_record.status = 'failed'
                    db.session.commit()
            except:
                pass
            
            import traceback
            error_details = traceback.format_exc()
            return f"❌ Lỗi trong quá trình tạo video: {str(e)}\n\nChi tiết lỗi:\n{error_details}"

    def _generate_script(self, topic: str, duration: int) -> str:
        """Tạo script phù hợp cho video dựa trên chủ đề và thời lượng"""
        # Ước tính ~150 từ/phút để tạo script phù hợp
        words_per_minute = 150
        target_words = int((duration / 60) * words_per_minute)
        
        # Template script dựa trên chủ đề
        if "giới thiệu" in topic.lower() or "introduction" in topic.lower():
            script = f"Xin chào! Tôi là em Linh AI. Hôm nay tôi sẽ giới thiệu về {topic}. "
        elif "hướng dẫn" in topic.lower() or "tutorial" in topic.lower():
            script = f"Chào mừng đến với hướng dẫn về {topic}. Hãy cùng tôi tìm hiểu chi tiết. "
        elif "thuyết trình" in topic.lower() or "presentation" in topic.lower():
            script = f"Trong phần thuyết trình này, tôi sẽ trình bày về {topic}. "
        elif "video" in topic.lower():
            # Xử lý khi người dùng nói "tạo video về..." 
            clean_topic = topic.replace("video về", "").replace("video", "").strip()
            script = f"Xin chào! Tôi là em Linh AI và hôm nay chúng ta sẽ nói về {clean_topic}. "
        else:
            script = f"Xin chào! Tôi là em Linh AI và hôm nay chúng ta sẽ nói về {topic}. "
        
        # Mở rộng nội dung dựa trên độ dài mong muốn
        if duration >= 20:
            script += f"Đây là một chủ đề rất thú vị và có nhiều khía cạnh đáng khám phá. "
            script += f"Chúng ta sẽ đi sâu vào các khái niệm cơ bản và những ứng dụng thực tế. "
        
        if duration >= 40:
            script += f"Tôi hy vọng thông qua video này, bạn sẽ có cái nhìn toàn diện và "
            script += f"hiểu rõ hơn về {topic}. Hãy cùng bắt đầu nhé!"
            
        return script 