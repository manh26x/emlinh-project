"""
Video Utilities - Utility functions cho video rendering và processing
"""

import os
import time
import subprocess
import json
from typing import Dict, Any, Optional
from ..app.config import Config


class VideoUtils:
    """Utility class cho video operations"""
    
    @staticmethod
    def render_video(
        audio_file: str,
        duration: int,
        composition: str = "Scene-Portrait",
        background: str = "abstract",
        topic: str = ""
    ) -> str:
        """
        Render video với audio và thông số đã cho sử dụng Remotion
        
        Args:
            audio_file: Đường dẫn file audio
            duration: Thời lượng video (giây)
            composition: Loại composition
            background: Background scene
            topic: Chủ đề video (để tạo tên file)
            
        Returns:
            str: Đường dẫn file video đã render
        """
        try:
            # Tạo tên file output
            timestamp = time.strftime("%Y%m%d_%H%M%S")
            safe_topic = topic.replace(" ", "_").replace("/", "_")[:20]
            output_filename = f"video_{timestamp}_{safe_topic}.mp4"
            
            # Sử dụng config để lấy đường dẫn
            output_dir = Config.WORKSPACE_ROOT
            output_path = os.path.join(output_dir, output_filename)
            
            # Đường dẫn Remotion project
            remotion_path = Config.REMOTION_PATH
            
            # Tạo directory nếu chưa tồn tại và có quyền
            try:
                parent_dir = os.path.dirname(output_dir)
                if os.path.exists(parent_dir) and os.access(parent_dir, os.W_OK):
                    os.makedirs(output_dir, exist_ok=True)
                else:
                    print(f"Warning: Cannot create output directory {output_dir} - no write permission")
            except (OSError, PermissionError) as e:
                print(f"Warning: Cannot create output directory {output_dir}: {e}")
            
            print(f"🎬 Rendering video với Remotion: {output_filename}")
            print(f"   - Audio: {audio_file}")
            print(f"   - Duration: {duration}s")
            print(f"   - Composition: {composition}")
            print(f"   - Background: {background}")
            
            # Chuẩn bị props cho Remotion
            # Lấy tên file audio (không có đường dẫn)
            audio_filename = os.path.basename(audio_file)
            
            # Props cho Remotion
            props = {
                "durationInSeconds": duration,
                "audioFileName": audio_filename,
                "backgroundScene": background
            }
            
            # Chạy Remotion render
            result = VideoUtils._render_with_remotion(
                remotion_path, composition, output_path, props
            )
            
            if result:
                print(f"✅ Video rendered successfully: {output_path}")
                return output_path
            else:
                raise Exception("Remotion render failed")
                
        except Exception as e:
            print(f"❌ Video rendering failed: {str(e)}")
            raise
    
    @staticmethod
    def _render_with_remotion(
        remotion_path: str,
        composition: str,
        output_path: str,
        props: Dict[str, Any]
    ) -> bool:
        """
        Render video sử dụng Remotion CLI
        
        Args:
            remotion_path: Đường dẫn project Remotion
            composition: ID composition
            output_path: Đường dẫn file output
            props: Properties cho composition
            
        Returns:
            bool: True nếu thành công
        """
        try:
            # Chuẩn bị command
            props_json = json.dumps(props)
            
            cmd = [
                "npx", "remotion", "render",
                composition,
                output_path,
                "--props", props_json,
                "--concurrency", "1"
            ]
            
            print(f"🔧 Running Remotion command: {' '.join(cmd)}")
            print(f"🔧 Props: {props_json}")
            
            # Chạy command
            result = subprocess.run(
                cmd,
                cwd=remotion_path,
                capture_output=True,
                text=True,
                timeout=300  # 5 phút timeout
            )
            
            if result.returncode == 0:
                print("✅ Remotion render completed successfully")
                return True
            else:
                print(f"❌ Remotion render failed:")
                print(f"stdout: {result.stdout}")
                print(f"stderr: {result.stderr}")
                return False
                
        except subprocess.TimeoutExpired:
            print("❌ Remotion render timeout (5 minutes)")
            return False
        except Exception as e:
            print(f"❌ Remotion render error: {str(e)}")
            return False
    
    @staticmethod
    def get_video_info(video_path: str) -> Dict[str, Any]:
        """
        Lấy thông tin video
        
        Args:
            video_path: Đường dẫn video
            
        Returns:
            Dict: Thông tin video
        """
        try:
            if not os.path.exists(video_path):
                return {"error": "File not found"}
            
            file_size = os.path.getsize(video_path)
            
            # Thử lấy thông tin chi tiết bằng ffprobe
            try:
                cmd = [
                    "ffprobe", "-v", "quiet", "-print_format", "json",
                    "-show_format", "-show_streams", video_path
                ]
                result = subprocess.run(cmd, capture_output=True, text=True)
                
                if result.returncode == 0:
                    probe_data = json.loads(result.stdout)
                    return {
                        "path": video_path,
                        "size": file_size,
                        "exists": True,
                        "probe_data": probe_data
                    }
            except:
                pass
            
            return {
                "path": video_path,
                "size": file_size,
                "exists": True
            }
            
        except Exception as e:
            return {"error": str(e)}
    
    @staticmethod
    def cleanup_temp_files(file_paths: list):
        """
        Dọn dẹp các file tạm
        
        Args:
            file_paths: Danh sách đường dẫn file cần xóa
        """
        for file_path in file_paths:
            try:
                if os.path.exists(file_path):
                    os.remove(file_path)
                    print(f"🗑️ Cleaned up: {file_path}")
            except Exception as e:
                print(f"⚠️ Could not clean up {file_path}: {str(e)}")
    
    @staticmethod
    def create_mouthcues_json(audio_file: str, text: str) -> str:
        """
        Tạo file JSON mouthCues cho lipsync từ audio file
        
        Args:
            audio_file: Đường dẫn file audio
            text: Text gốc
            
        Returns:
            str: Đường dẫn file JSON mouthCues
        """
        try:
            # Tạo đường dẫn file JSON
            json_path = audio_file.replace('.wav', '.json')
            
            # Tính toán duration từ text (ước tính)
            estimated_duration = max(5, len(text) // 20)
            
            # Tạo mouthCues đơn giản dựa trên duration
            mouth_cues = VideoUtils._generate_simple_mouth_cues(estimated_duration)
            
            # Tạo metadata
            metadata = {
                "metadata": {
                    "soundFile": audio_file,
                    "duration": estimated_duration
                },
                "mouthCues": mouth_cues
            }
            
            # Ghi file JSON
            with open(json_path, 'w', encoding='utf-8') as f:
                json.dump(metadata, f, indent=2, ensure_ascii=False)
            
            print(f"✅ Created mouthCues JSON: {json_path}")
            return json_path
            
        except Exception as e:
            print(f"❌ Failed to create mouthCues JSON: {str(e)}")
            raise
    
    @staticmethod
    def _generate_simple_mouth_cues(duration: float) -> list:
        """
        Tạo mouthCues đơn giản cho duration cho trước
        
        Args:
            duration: Thời lượng audio (giây)
            
        Returns:
            list: Danh sách mouthCues
        """
        mouth_cues = []
        
        # Tạo cues đơn giản với pattern lặp lại
        visemes = ['X', 'B', 'C', 'E', 'A', 'D', 'G']
        cue_duration = 0.1  # Mỗi cue 0.1 giây
        
        current_time = 0.0
        viseme_index = 0
        
        while current_time < duration:
            end_time = min(current_time + cue_duration, duration)
            
            mouth_cues.append({
                "start": round(current_time, 2),
                "end": round(end_time, 2),
                "value": visemes[viseme_index % len(visemes)]
            })
            
            current_time = end_time
            viseme_index += 1
        
        return mouth_cues 