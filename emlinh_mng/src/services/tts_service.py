import os
import subprocess
import tempfile
import shutil
import time
from datetime import datetime
from typing import Dict, Any, Optional
import openai
from pathlib import Path
from ..app.config import Config


class TTSService:
    def __init__(self):
        # Sử dụng config để lấy đường dẫn
        self.remotion_path = Config.REMOTION_PATH
        self.audio_dir = Config.AUDIO_OUTPUT_DIR
        
        # Đảm bảo thư mục audio tồn tại với error handling
        try:
            # Sử dụng method từ Config để tạo directories
            Config.ensure_directories()
            # Kiểm tra xem audio_dir có write permission không
            if not os.access(self.audio_dir, os.W_OK):
                raise PermissionError(f"No write permission to {self.audio_dir}")
        except Exception as e:
            print(f"Warning: Could not create audio directory {self.audio_dir}: {e}")
            # Fallback to multiple possible locations based on OS
            if os.name == 'nt':  # Windows
                fallback_dirs = [
                    os.path.join(os.path.expanduser('~'), 'AppData', 'Local', 'emlinh_audio'),
                    os.path.join(os.path.expanduser('~'), 'emlinh_audio'),
                    os.path.join(os.getcwd(), 'temp_audio'),
                    os.path.join('C:', 'temp', 'emlinh_audio'),
                ]
            else:  # Unix/Linux
                fallback_dirs = [
                    '/tmp/emlinh_audio',
                    f'/tmp/emlinh_audio_{os.getpid()}',  # Use PID for uniqueness
                    f'/tmp/emlinh_audio_{int(time.time())}',  # Use timestamp for uniqueness
                    os.path.expanduser('~/tmp/emlinh_audio')  # User home directory
                ]
            
            for fallback_dir in fallback_dirs:
                try:
                    os.makedirs(fallback_dir, exist_ok=True)
                    if os.access(fallback_dir, os.W_OK):
                        self.audio_dir = fallback_dir
                        print(f"✅ Using fallback audio directory: {self.audio_dir}")
                        break
                except (OSError, PermissionError):
                    continue
            else:
                # Nếu tất cả fallback đều fail, sử dụng thư mục hiện tại
                self.audio_dir = os.path.join(os.getcwd(), 'temp_audio')
                try:
                    os.makedirs(self.audio_dir, exist_ok=True)
                    print(f"⚠️ Using current directory fallback: {self.audio_dir}")
                except:
                    print(f"❌ Critical: Cannot create any audio directory")
        
        # OpenAI client
        self.client = openai.OpenAI()
        
        # Lưu trữ trạng thái TTS jobs
        self.tts_jobs = {}
        
    def generate_speech(self, text: str, filename: Optional[str] = None, job_id: Optional[str] = None) -> str:
        """Tạo speech từ text và convert sang format phù hợp"""
        
        # Tạo job ID (hoặc sử dụng job_id được truyền vào)
        if not job_id:
            job_id = f"tts_{int(datetime.now().timestamp())}"
        
        # Tạo filename nếu không có
        if not filename:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"tts_speech_{timestamp}"
        
        # Đảm bảo filename không có extension
        filename = os.path.splitext(filename)[0]
        
        # Khởi tạo job status
        self.tts_jobs[job_id] = {
            'status': 'starting',
            'progress': 0,
            'text': text,
            'filename': filename,
            'start_time': datetime.now(),
            'error': None,
            'wav_path': None,
            'json_path': None
        }
        
        try:
            self.tts_jobs[job_id]['status'] = 'generating_speech'
            self.tts_jobs[job_id]['progress'] = 20
            
            # Gọi OpenAI TTS API
            response = self.client.audio.speech.create(
                model="tts-1",  # hoặc tts-1-hd cho chất lượng cao hơn
                voice="nova",
                input=text,
                speed=1.0  # Có thể điều chỉnh tốc độ nói
            )
            
            self.tts_jobs[job_id]['progress'] = 50
            
            # Lưu file MP3 tạm
            temp_mp3 = os.path.join(self.audio_dir, f"{filename}_temp.mp3")
            response.stream_to_file(temp_mp3)
            
            self.tts_jobs[job_id]['status'] = 'converting_to_wav'
            self.tts_jobs[job_id]['progress'] = 60
            
            # Convert MP3 to WAV
            wav_path = os.path.join(self.audio_dir, f"{filename}.wav")
            self._convert_mp3_to_wav(temp_mp3, wav_path)
            
            # Xóa file MP3 tạm
            os.remove(temp_mp3)
            
            self.tts_jobs[job_id]['wav_path'] = wav_path
            self.tts_jobs[job_id]['progress'] = 70
            
            # Convert WAV to OGG và sau đó tạo JSON với Rhubarb
            self.tts_jobs[job_id]['status'] = 'converting_to_ogg'
            ogg_path = os.path.join(self.audio_dir, f"{filename}.ogg")
            self._convert_wav_to_ogg(wav_path, ogg_path)
            
            self.tts_jobs[job_id]['progress'] = 80
            
            # Tạo JSON với Rhubarb
            self.tts_jobs[job_id]['status'] = 'generating_lip_sync'
            json_path = os.path.join(self.audio_dir, f"{filename}.json")
            self._generate_lip_sync_json(ogg_path, text, json_path)
            
            # Xóa file OGG tạm
            os.remove(ogg_path)
            
            self.tts_jobs[job_id]['json_path'] = json_path
            
            # Lấy duration thực tế của file audio
            actual_duration = self._get_audio_duration(wav_path)
            self.tts_jobs[job_id]['actual_duration'] = actual_duration
            
            self.tts_jobs[job_id]['status'] = 'completed'
            self.tts_jobs[job_id]['progress'] = 100
            self.tts_jobs[job_id]['end_time'] = datetime.now()
            
            return job_id
            
        except Exception as e:
            self.tts_jobs[job_id]['status'] = 'failed'
            self.tts_jobs[job_id]['error'] = str(e)
            raise e
    
    def _convert_mp3_to_wav(self, mp3_path: str, wav_path: str):
        """Convert MP3 to WAV using ffmpeg with Windows compatibility"""
        # Try different ffmpeg executable names for Windows compatibility
        ffmpeg_executables = ['ffmpeg', 'ffmpeg.exe']
        
        for ffmpeg_cmd in ffmpeg_executables:
            try:
                cmd = [
                    ffmpeg_cmd, '-i', mp3_path,
                    '-acodec', 'pcm_s16le',
                    '-ar', '44100',
                    '-ac', '2',
                    '-y',  # Overwrite output files
                    wav_path
                ]
                
                result = subprocess.run(cmd, capture_output=True, text=True)
                if result.returncode == 0:
                    return  # Success
                else:
                    print(f"❌ FFmpeg conversion failed with {ffmpeg_cmd}: {result.stderr}")
            except FileNotFoundError:
                print(f"⚠️ {ffmpeg_cmd} not found, trying next option...")
                continue
        
        # If all ffmpeg attempts fail, use fallback
        raise Exception(f"FFmpeg not found or conversion failed. Please install FFmpeg: https://ffmpeg.org/download.html")
    
    def _convert_wav_to_ogg(self, wav_path: str, ogg_path: str):
        """Convert WAV to OGG using ffmpeg with Windows compatibility"""
        # Try different ffmpeg executable names for Windows compatibility
        ffmpeg_executables = ['ffmpeg', 'ffmpeg.exe']
        
        for ffmpeg_cmd in ffmpeg_executables:
            try:
                cmd = [
                    ffmpeg_cmd, '-i', wav_path,
                    '-c:a', 'libvorbis',
                    '-q:a', '4',  # Quality level
                    '-y',  # Overwrite output files
                    ogg_path
                ]
                
                result = subprocess.run(cmd, capture_output=True, text=True)
                if result.returncode == 0:
                    return  # Success
                else:
                    print(f"❌ WAV to OGG conversion failed with {ffmpeg_cmd}: {result.stderr}")
            except FileNotFoundError:
                print(f"⚠️ {ffmpeg_cmd} not found, trying next option...")
                continue
        
        # If all ffmpeg attempts fail, use fallback
        raise Exception(f"FFmpeg not found or WAV to OGG conversion failed. Please install FFmpeg: https://ffmpeg.org/download.html")
    
    def _generate_lip_sync_json(self, ogg_path: str, text: str, json_path: str):
        """Generate lip sync JSON using Rhubarb with Windows compatibility"""
        try:
            # Tạo file text tạm
            with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False, encoding='utf-8') as f:
                f.write(text)
                text_file = f.name
            
            # Try different rhubarb executable names for Windows compatibility
            rhubarb_executables = ['rhubarb', 'rhubarb.exe']
            rhubarb_success = False
            
            for rhubarb_cmd in rhubarb_executables:
                try:
                    # Chạy Rhubarb (nếu đã cài đặt)
                    cmd = [
                        rhubarb_cmd,
                        '-f', 'json',
                        '-d', text_file,
                        ogg_path,
                        '-o', json_path
                    ]
                    
                    result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
                    
                    if result.returncode == 0:
                        print(f"✅ Rhubarb lip sync generated successfully with {rhubarb_cmd}")
                        rhubarb_success = True
                        break
                    else:
                        print(f"⚠️ Rhubarb failed with {rhubarb_cmd}: {result.stderr}")
                
                except FileNotFoundError:
                    print(f"⚠️ {rhubarb_cmd} not found, trying next option...")
                    continue
                except subprocess.TimeoutExpired:
                    print(f"⚠️ {rhubarb_cmd} timeout, trying fallback...")
                    continue
            
            # Cleanup text file
            try:
                os.unlink(text_file)
            except:
                pass
            
            if not rhubarb_success:
                print("⚠️ Rhubarb not available or failed, using simple lip sync fallback")
                # Nếu Rhubarb không có, tạo JSON đơn giản
                self._create_simple_lip_sync_json(json_path, ogg_path)
                
        except Exception as e:
            print(f"⚠️ Lip sync generation error: {e}")
            # Fallback: tạo JSON đơn giản nếu Rhubarb không hoạt động
            self._create_simple_lip_sync_json(json_path, ogg_path)
    
    def _create_simple_lip_sync_json(self, json_path: str, audio_path: str):
        """Tạo JSON lip sync đơn giản nếu Rhubarb không có"""
        import json
        
        # Lấy thời lượng audio
        duration = self._get_audio_duration(audio_path)
        
        # Tạo simple lip sync data
        simple_data = {
            "metadata": {
                "soundFile": os.path.basename(audio_path),
                "duration": duration
            },
            "mouthCues": [
                {"start": 0.0, "end": duration, "value": "A"}
            ]
        }
        
        with open(json_path, 'w') as f:
            json.dump(simple_data, f, indent=2)
    
    def _get_audio_duration(self, audio_path: str) -> float:
        """Lấy thời lượng audio bằng ffprobe with Windows compatibility"""
        # Try different ffprobe executable names for Windows compatibility
        ffprobe_executables = ['ffprobe', 'ffprobe.exe']
        
        for ffprobe_cmd in ffprobe_executables:
            try:
                cmd = [
                    ffprobe_cmd, '-v', 'quiet',
                    '-show_entries', 'format=duration',
                    '-of', 'csv=p=0',
                    audio_path
                ]
                result = subprocess.run(cmd, capture_output=True, text=True)
                if result.returncode == 0:
                    duration = float(result.stdout.strip())
                    return duration
                else:
                    print(f"⚠️ ffprobe failed with {ffprobe_cmd}: {result.stderr}")
            except (FileNotFoundError, ValueError):
                print(f"⚠️ {ffprobe_cmd} not found or invalid output, trying next option...")
                continue
        
        # Fallback: estimate duration based on file size (rough approximation)
        try:
            file_size = os.path.getsize(audio_path)
            # Rough estimation: assume ~44100 Hz, 16-bit, stereo = ~176KB per second
            estimated_duration = file_size / (44100 * 2 * 2)
            print(f"⚠️ Using estimated duration: {estimated_duration:.2f}s")
            return max(estimated_duration, 1.0)  # At least 1 second
        except:
            print("⚠️ Using default duration: 5.0s")
            return 5.0  # Default duration
    
    def get_tts_status(self, job_id: str) -> Optional[Dict[str, Any]]:
        """Lấy trạng thái TTS job"""
        return self.tts_jobs.get(job_id)
    
    def get_all_tts_jobs(self) -> Dict[str, Dict[str, Any]]:
        """Lấy tất cả TTS jobs"""
        return self.tts_jobs
    
    def get_available_voices(self) -> list:
        """Lấy danh sách voices có sẵn"""
        return ["alloy", "echo", "fable", "onyx", "nova", "shimmer"]


# Singleton instance
tts_service = TTSService()


def get_tts_service() -> TTSService:
    """Lấy instance của TTSService"""
    return tts_service 