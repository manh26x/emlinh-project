#!/usr/bin/env python3
"""
Test TTS Service với Flask context
"""
import os
import sys
import time

# Add src to path
current_dir = os.path.dirname(os.path.abspath(__file__))
src_dir = os.path.join(current_dir, 'src')
sys.path.insert(0, src_dir)

# Load environment
from dotenv import load_dotenv
load_dotenv()

def test_tts_with_flask_context():
    """Test TTS với Flask application context"""
    try:
        # Import Flask app to setup context
        from app.app import create_app
        from services.tts_service import TTSService
        
        app = create_app()
        
        with app.app_context():
            print("🧪 Testing TTS Service with Flask context...")
            
            # Initialize TTS service
            tts_service = TTSService()
            print(f"✅ TTS Service initialized")
            print(f"   Audio directory: {tts_service.audio_dir}")
            
            # Test TTS generation
            test_text = "Xin chào! Đây là test TTS trên Windows."
            print(f"🎤 Generating speech for: {test_text}")
            
            job_id = tts_service.generate_speech(test_text, "test_windows_tts")
            print(f"✅ TTS job started: {job_id}")
            
            # Wait for completion
            max_wait = 30
            for i in range(max_wait):
                status = tts_service.get_tts_status(job_id)
                if status:
                    progress = status.get('progress', 0)
                    current_status = status.get('status', 'unknown')
                    print(f"⏳ Progress: {progress}% - Status: {current_status}")
                    
                    if status['status'] == 'completed':
                        print(f"✅ TTS completed successfully!")
                        print(f"   WAV file: {status.get('wav_path')}")
                        print(f"   JSON file: {status.get('json_path')}")
                        print(f"   Duration: {status.get('actual_duration', 'unknown')}s")
                        
                        # Verify files exist
                        wav_path = status.get('wav_path')
                        json_path = status.get('json_path')
                        
                        if wav_path and os.path.exists(wav_path):
                            file_size = os.path.getsize(wav_path)
                            print(f"   ✅ WAV file exists: {file_size} bytes")
                        else:
                            print(f"   ❌ WAV file not found: {wav_path}")
                        
                        if json_path and os.path.exists(json_path):
                            file_size = os.path.getsize(json_path)
                            print(f"   ✅ JSON file exists: {file_size} bytes")
                        else:
                            print(f"   ❌ JSON file not found: {json_path}")
                        
                        return True
                        
                    elif status['status'] == 'failed':
                        print(f"❌ TTS failed: {status.get('error')}")
                        return False
                
                time.sleep(1)
            
            print("❌ TTS timeout")
            return False
            
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Main function"""
    print("🧪 TTS Service Test with Flask Context")
    print("=" * 50)
    
    success = test_tts_with_flask_context()
    
    print("\n" + "=" * 50)
    if success:
        print("🎉 TTS test passed! The Windows TTS issue should be fixed.")
    else:
        print("❌ TTS test failed. Please check the errors above.")
    
    return 0 if success else 1

if __name__ == "__main__":
    exit(main())
