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
        Có fallback mechanism nếu Remotion không available
        
        Args:
            audio_file: Đường dẫn file audio
            duration: Thời lượng video (giây)
            composition: Loại composition
            background: Background scene
            topic: Chủ đề video (để tạo tên file)
            
        Returns:
            str: Đường dẫn file video đã render hoặc placeholder
        """
        try:
            # Tạo tên file output
            timestamp = time.strftime("%Y%m%d_%H%M%S")
            safe_topic = topic.replace(" ", "_").replace("/", "_")[:20]
            output_filename = f"video_{timestamp}_{safe_topic}.mp4"
            
            # Sử dụng config để lấy đường dẫn
            output_dir = Config.WORKSPACE_ROOT or '/tmp'
            output_path = os.path.join(output_dir, output_filename)
            
            # Đường dẫn Remotion project
            remotion_path = Config.REMOTION_PATH or ''
            
            # Tạo directory nếu chưa tồn tại và có quyền
            try:
                parent_dir = os.path.dirname(output_dir or '')
                if os.path.exists(parent_dir) and os.access(parent_dir, os.W_OK):
                    os.makedirs(output_dir, exist_ok=True)
                else:
                    print(f"Warning: Cannot create output directory {output_dir} - no write permission")
                    # Fallback to temp directory
                    output_dir = "/tmp"
                    output_path = os.path.join(output_dir, output_filename)
            except (OSError, PermissionError) as e:
                print(f"Warning: Cannot create output directory {output_dir}: {e}")
                # Fallback to temp directory
                output_dir = "/tmp"
                output_path = os.path.join(output_dir, output_filename)
            
            print(f"🎬 Rendering video với Remotion: {output_filename}")
            print(f"   - Audio: {audio_file}")
            print(f"   - Duration: {duration}s")
            print(f"   - Composition: {composition}")
            print(f"   - Background: {background}")
            
            # Kiểm tra Remotion availability trước khi render
            if not VideoUtils._check_remotion_availability(remotion_path):
                print("⚠️ Remotion not available, creating placeholder video...")
                return VideoUtils._create_placeholder_video(output_path, duration, topic)
            
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
                print("⚠️ Remotion render failed, creating placeholder video...")
                return VideoUtils._create_placeholder_video(output_path, duration, topic)
                
        except Exception as e:
            print(f"❌ Video rendering failed: {str(e)}")
            print("⚠️ Creating placeholder video as fallback...")
            
            # Fallback: create placeholder
            try:
                timestamp = time.strftime("%Y%m%d_%H%M%S")
                safe_topic = topic.replace(" ", "_").replace("/", "_")[:20]
                output_filename = f"video_{timestamp}_{safe_topic}.mp4"
                output_path = os.path.join("/tmp", output_filename)
                return VideoUtils._create_placeholder_video(output_path, duration, topic)
            except Exception as fallback_error:
                print(f"❌ Fallback creation failed: {fallback_error}")
                raise Exception("Both Remotion render and fallback creation failed")
    
    @staticmethod
    def _check_remotion_availability(remotion_path: str) -> bool:
        """Check if Remotion is available and working"""
        import platform
        try:
            # Check basic requirements
            if not os.path.exists(remotion_path):
                print(f"⚠️ Remotion path not found: {remotion_path}")
                return False
            
            package_json = os.path.join(remotion_path, 'package.json')
            if not os.path.exists(package_json):
                print(f"⚠️ Package.json not found: {package_json}")
                return False
            
            node_modules = os.path.join(remotion_path, 'node_modules')
            if not os.path.exists(node_modules):
                print(f"⚠️ Node modules not found: {node_modules}")
                return False
            
            # Quick npx test with short timeout
            try:
                if os.name == 'nt':
                    # Windows: use shell=True and string command
                    result = subprocess.run(
                        "npx remotion --version",
                        cwd=remotion_path,
                        capture_output=True,
                        text=True,
                        shell=True,
                        timeout=10
                    )
                else:
                    # Linux/Mac: use list
                    result = subprocess.run(
                        ["npx", "remotion", "--version"],
                        cwd=remotion_path,
                        capture_output=True,
                        text=True,
                        timeout=10
                    )
                if result.returncode == 0 or ("remotion" in result.stdout.lower() or "@remotion/cli" in result.stdout.lower()):
                    print("✅ Remotion CLI available")
                    return True
                else:
                    print(f"⚠️ Remotion CLI test failed: {result.stderr[:100]}")
                    return False
            except Exception as e:
                print(f"⚠️ Remotion CLI test error: {str(e)}")
                return False
            
        except Exception as e:
            print(f"⚠️ Remotion availability check failed: {str(e)}")
            return False
    
    @staticmethod
    def _create_placeholder_video(output_path: str, duration: int, topic: str) -> str:
        """Create a simple placeholder video when Remotion is not available"""
        try:
            print(f"🎥 Creating placeholder video: {output_path}")
            
            # Create a simple text file as placeholder for now
            # In production, this could be replaced with ffmpeg-generated video
            placeholder_content = f"""
# Placeholder Video
Topic: {topic}
Duration: {duration} seconds
Created: {time.strftime("%Y-%m-%d %H:%M:%S")}

This is a placeholder because Remotion rendering is not available.
The actual video would contain animated avatar content.
"""
            
            # Create placeholder file
            placeholder_path = output_path.replace('.mp4', '_placeholder.txt')
            with open(placeholder_path, 'w', encoding='utf-8') as f:
                f.write(placeholder_content)
            
            print(f"✅ Placeholder created: {placeholder_path}")
            print("ℹ️ In production, implement ffmpeg fallback for actual video")
            
            return placeholder_path
            
        except Exception as e:
            print(f"❌ Placeholder creation failed: {str(e)}")
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
        import platform
        try:
            # Chuẩn bị command
            props_json = json.dumps(props)
            if os.name == 'nt':
                # Windows: ghi props ra file tạm
                import tempfile
                with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False, encoding='utf-8') as f:
                    f.write(props_json)
                    props_file = f.name
                cmd = f'npx remotion render {composition} {output_path} --props={props_file} --concurrency 1'
                print(f"🔧 Running Remotion command (Windows): {cmd}")
                result = subprocess.run(
                    cmd,
                    cwd=remotion_path,
                    capture_output=True,
                    text=True,
                    shell=True,
                    timeout=300
                )
                # Xóa file tạm sau khi render
                try:
                    os.remove(props_file)
                except Exception as e:
                    print(f"⚠️ Could not remove temp props file: {e}")
            else:
                # Linux/Mac: dùng list như cũ
                cmd = [
                    "npx", "remotion", "render",
                    composition,
                    output_path,
                    "--props", props_json,
                    "--concurrency", "1"
                ]
                print(f"🔧 Running Remotion command (Linux/Mac): {' '.join(cmd)}")
                result = subprocess.run(
                    cmd,
                    cwd=remotion_path,
                    capture_output=True,
                    text=True,
                    timeout=300
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