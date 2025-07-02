"""
TTS Utilities - Utility functions cho Text-to-Speech processing
"""

import os
import time
import json
from typing import Dict, Any, Optional
from ..app.config import Config


class TTSUtils:
    """Utility class cho TTS operations"""
    
    @staticmethod
    def generate_tts(text: str, voice: str = "fable") -> str:
        """
        Tạo audio từ text sử dụng TTS Service thật và tạo mouthCues JSON
        
        Args:
            text: Text cần chuyển thành audio
            voice: Giọng đọc (fable, nova, etc.)
            
        Returns:
            str: Đường dẫn file audio đã tạo
        """
        try:
            # Import TTS Service
            from ..services.tts_service import TTSService
            
            # Tạo tên file output
            timestamp = time.strftime("%Y%m%d_%H%M%S")
            output_filename = f"audio_{timestamp}_{voice}"
            
            print(f"🎤 Generating TTS với OpenAI API: {output_filename}")
            print(f"   - Text: {text[:100]}...")
            print(f"   - Voice: {voice}")
            
            # Khởi tạo TTS Service
            tts_service = TTSService()
            
            # Tạo speech với TTS Service
            job_id = tts_service.generate_speech(text, output_filename)
            
            # Chờ TTS hoàn thành
            print("⏳ Waiting for TTS to complete...")
            max_wait = 60  # 60 seconds timeout
            wait_interval = 2
            
            for i in range(max_wait // wait_interval):
                status = tts_service.get_tts_status(job_id)
                if status and status['status'] == 'completed':
                    audio_file = status['wav_path']
                    json_file = status['json_path']
                    
                    print(f"✅ TTS completed: {audio_file}")
                    print(f"✅ LipSync JSON: {json_file}")
                    
                    return audio_file
                    
                elif status and status['status'] == 'failed':
                    error = status.get('error', 'Unknown error')
                    raise Exception(f"TTS generation failed: {error}")
                
                print(f"⏳ TTS progress: {status.get('progress', 0)}% - {status.get('status', 'unknown')}")
                time.sleep(wait_interval)
            
            # Timeout
            raise Exception(f"TTS generation timeout after {max_wait} seconds")
            
        except ImportError as e:
            print(f"❌ Cannot import TTS Service: {e}")
            print("🔄 Falling back to dummy audio generation...")
            return TTSUtils._generate_dummy_fallback(text, voice)
            
        except Exception as e:
            print(f"❌ TTS generation failed: {str(e)}")
            print("🔄 Falling back to dummy audio generation...")
            return TTSUtils._generate_dummy_fallback(text, voice)
    
    @staticmethod
    def _generate_dummy_fallback(text: str, voice: str = "fable") -> str:
        """
        Fallback dummy audio generation nếu TTS Service không hoạt động
        
        Args:
            text: Text gốc
            voice: Voice name
            
        Returns:
            str: Đường dẫn file audio dummy
        """
        try:
            # Tạo tên file output
            timestamp = time.strftime("%Y%m%d_%H%M%S")
            output_filename = f"audio_{timestamp}_{voice}.wav"
            
            # Sử dụng config để lấy đường dẫn
            output_dir = Config.AUDIO_OUTPUT_DIR
            output_path = os.path.join(output_dir, output_filename)
            
            # Tạo directory nếu chưa tồn tại
            os.makedirs(output_dir, exist_ok=True)
            
            print(f"🎤 Creating dummy audio (fallback): {output_filename}")
            
            # Tạo dummy WAV file
            duration = TTSUtils._create_dummy_audio(output_path, len(text))
            
            # Tạo mouthCues JSON cho lipsync
            TTSUtils._create_mouthcues_json(output_path, text, duration)
            
            # Tạo metadata file
            TTSUtils._create_audio_metadata(output_path, text, voice, duration)
            
            print(f"✅ Dummy audio created: {output_path}")
            return output_path
            
        except Exception as e:
            print(f"❌ Dummy audio fallback failed: {str(e)}")
            raise
    
    @staticmethod
    def _create_dummy_audio(output_path: str, text_length: int) -> float:
        """
        Tạo dummy audio file để test
        
        Args:
            output_path: Đường dẫn output
            text_length: Độ dài text (để tính duration)
            
        Returns:
            float: Duration thực tế của audio
        """
        try:
            # Tạo WAV file header cơ bản
            sample_rate = 22050
            duration = max(5, text_length // 20)  # Ước tính duration từ text length
            num_samples = sample_rate * duration
            
            # WAV header (44 bytes)
            wav_header = bytearray()
            wav_header.extend(b'RIFF')  # ChunkID
            wav_header.extend((36 + num_samples * 2).to_bytes(4, 'little'))  # ChunkSize
            wav_header.extend(b'WAVE')  # Format
            wav_header.extend(b'fmt ')  # Subchunk1ID
            wav_header.extend((16).to_bytes(4, 'little'))  # Subchunk1Size
            wav_header.extend((1).to_bytes(2, 'little'))  # AudioFormat (PCM)
            wav_header.extend((1).to_bytes(2, 'little'))  # NumChannels (mono)
            wav_header.extend(sample_rate.to_bytes(4, 'little'))  # SampleRate
            wav_header.extend((sample_rate * 2).to_bytes(4, 'little'))  # ByteRate
            wav_header.extend((2).to_bytes(2, 'little'))  # BlockAlign
            wav_header.extend((16).to_bytes(2, 'little'))  # BitsPerSample
            wav_header.extend(b'data')  # Subchunk2ID
            wav_header.extend((num_samples * 2).to_bytes(4, 'little'))  # Subchunk2Size
            
            # Tạo audio data (silence)
            audio_data = bytearray(num_samples * 2)  # 16-bit samples
            
            # Ghi file
            with open(output_path, 'wb') as f:
                f.write(wav_header)
                f.write(audio_data)
            
            return float(duration)
                
        except Exception as e:
            # Fallback: tạo file dummy đơn giản
            with open(output_path, 'wb') as f:
                # WAV header tối thiểu
                f.write(b'RIFF\x24\x08\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00\x22\x56\x00\x00\x44\xac\x00\x00\x02\x00\x10\x00data\x00\x08\x00\x00')
                # Silence data
                f.write(b'\x00' * 2048)
            return 5.0  # Default duration
    
    @staticmethod
    def _create_mouthcues_json(audio_path: str, text: str, duration: float):
        """
        Tạo mouthCues JSON file cho lipsync
        
        Args:
            audio_path: Đường dẫn file audio
            text: Text gốc
            duration: Duration thực tế của audio
        """
        try:
            # Tạo đường dẫn file JSON
            json_path = audio_path.replace('.wav', '.json')
            
            # Tạo mouthCues dựa trên text và duration
            mouth_cues = TTSUtils._generate_mouth_cues_from_text(text, duration)
            
            # Tạo metadata theo format chuẩn
            metadata = {
                "metadata": {
                    "soundFile": audio_path,
                    "duration": duration
                },
                "mouthCues": mouth_cues
            }
            
            # Ghi file JSON
            with open(json_path, 'w', encoding='utf-8') as f:
                json.dump(metadata, f, indent=2, ensure_ascii=False)
            
            print(f"✅ Created mouthCues JSON: {json_path}")
            
        except Exception as e:
            print(f"⚠️ Could not create mouthCues JSON: {str(e)}")
    
    @staticmethod
    def _generate_mouth_cues_from_text(text: str, duration: float) -> list:
        """
        Tạo mouthCues từ text và duration
        
        Args:
            text: Text gốc
            duration: Duration audio
            
        Returns:
            list: Danh sách mouthCues
        """
        mouth_cues = []
        
        # Visemes mapping cho tiếng Việt
        visemes = ['X', 'B', 'C', 'E', 'A', 'D', 'G', 'F', 'H']
        
        # Tính số lượng cues dựa trên text length
        text_length = len(text.replace(" ", ""))  # Loại bỏ space
        num_cues = max(10, min(text_length // 3, int(duration * 10)))  # 3-10 cues per second
        
        # Tạo time intervals
        cue_duration = duration / num_cues
        
        for i in range(num_cues):
            start_time = i * cue_duration
            end_time = min((i + 1) * cue_duration, duration)
            
            # Chọn viseme dựa trên vị trí trong text
            viseme_index = i % len(visemes)
            
            # Thêm một số random để tạo tính tự nhiên
            if i % 3 == 0:  # Pause periods
                viseme = 'X'
            elif i % 5 == 0:  # Vowel sounds
                viseme = visemes[viseme_index % 4]  # A, B, C, E
            else:
                viseme = visemes[viseme_index]
            
            mouth_cues.append({
                "start": round(start_time, 2),
                "end": round(end_time, 2),
                "value": viseme
            })
        
        return mouth_cues
    
    @staticmethod
    def _create_audio_metadata(audio_path: str, text: str, voice: str, duration: float):
        """
        Tạo metadata file cho audio
        
        Args:
            audio_path: Đường dẫn audio file
            text: Text gốc
            voice: Giọng đọc
            duration: Duration thực tế
        """
        try:
            # Tạo metadata file riêng biệt
            metadata_path = audio_path.replace('.wav', '_metadata.json')
            
            metadata = {
                "text": text,
                "voice": voice,
                "audio_file": os.path.basename(audio_path),
                "duration": duration,
                "created_at": time.strftime("%Y-%m-%d %H:%M:%S"),
                "sample_rate": 22050,
                "format": "wav"
            }
            
            with open(metadata_path, 'w', encoding='utf-8') as f:
                json.dump(metadata, f, indent=2, ensure_ascii=False)
                
        except Exception as e:
            print(f"⚠️ Could not create metadata: {str(e)}")
    
    @staticmethod
    def get_audio_info(audio_path: str) -> Dict[str, Any]:
        """
        Lấy thông tin audio file
        
        Args:
            audio_path: Đường dẫn audio
            
        Returns:
            Dict: Thông tin audio
        """
        try:
            if not os.path.exists(audio_path):
                return {"error": "File not found"}
            
            file_size = os.path.getsize(audio_path)
            
            # Thử đọc metadata nếu có
            metadata_path = audio_path.replace('.wav', '_metadata.json')
            metadata = {}
            if os.path.exists(metadata_path):
                try:
                    with open(metadata_path, 'r', encoding='utf-8') as f:
                        metadata = json.load(f)
                except:
                    pass
            
            # Thử đọc mouthCues nếu có
            mouthcues_path = audio_path.replace('.wav', '.json')
            mouthcues = {}
            if os.path.exists(mouthcues_path):
                try:
                    with open(mouthcues_path, 'r', encoding='utf-8') as f:
                        mouthcues = json.load(f)
                except:
                    pass
            
            return {
                "path": audio_path,
                "size": file_size,
                "exists": True,
                "metadata": metadata,
                "mouthcues": mouthcues
            }
            
        except Exception as e:
            return {"error": str(e)}
    
    @staticmethod
    def get_available_voices() -> list:
        """
        Lấy danh sách voices có sẵn
        
        Returns:
            list: Danh sách voices
        """
        return [
            {"id": "fable", "name": "Fable", "description": "Giọng nữ dịu dàng"},
            {"id": "nova", "name": "Nova", "description": "Giọng nữ hiện đại"},
            {"id": "alloy", "name": "Alloy", "description": "Giọng nam trẻ trung"},
            {"id": "echo", "name": "Echo", "description": "Giọng nam ấm áp"},
            {"id": "onyx", "name": "Onyx", "description": "Giọng nam trầm ấm"},
            {"id": "shimmer", "name": "Shimmer", "description": "Giọng nữ sôi động"}
        ]
    
    @staticmethod
    def cleanup_audio_files(file_paths: list):
        """
        Dọn dẹp các audio files và metadata
        
        Args:
            file_paths: Danh sách đường dẫn file cần xóa
        """
        for file_path in file_paths:
            try:
                # Xóa audio file
                if os.path.exists(file_path):
                    os.remove(file_path)
                    print(f"🗑️ Cleaned up audio: {file_path}")
                
                # Xóa metadata file
                metadata_path = file_path.replace('.wav', '_metadata.json')
                if os.path.exists(metadata_path):
                    os.remove(metadata_path)
                    print(f"🗑️ Cleaned up metadata: {metadata_path}")
                
                # Xóa mouthCues file
                mouthcues_path = file_path.replace('.wav', '.json')
                if os.path.exists(mouthcues_path):
                    os.remove(mouthcues_path)
                    print(f"🗑️ Cleaned up mouthCues: {mouthcues_path}")
                    
            except Exception as e:
                print(f"⚠️ Could not clean up {file_path}: {str(e)}") 