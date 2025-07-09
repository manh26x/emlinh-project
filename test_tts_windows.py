#!/usr/bin/env python3
"""
Test script để kiểm tra TTS functionality trên Windows
"""
import os
import sys
import time

# Add the src directory to Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
src_dir = os.path.join(current_dir, 'emlinh_mng', 'src')
sys.path.insert(0, src_dir)

def test_ffmpeg():
    """Test FFmpeg installation"""
    import subprocess
    print("🔍 Testing FFmpeg installation...")
    
    ffmpeg_commands = ['ffmpeg', 'ffmpeg.exe']
    for cmd in ffmpeg_commands:
        try:
            result = subprocess.run([cmd, '-version'], 
                                  capture_output=True, text=True, timeout=10)
            if result.returncode == 0:
                print(f"✅ {cmd} is working")
                return True
        except (FileNotFoundError, subprocess.TimeoutExpired):
            print(f"❌ {cmd} not found")
            continue
    
    print("❌ FFmpeg not found. Please install FFmpeg:")
    print("   - Download from: https://ffmpeg.org/download.html")
    print("   - Or use chocolatey: choco install ffmpeg")
    return False

def test_config():
    """Test configuration"""
    print("\n🔍 Testing configuration...")
    
    try:
        from app.config import Config
        print(f"✅ WORKSPACE_ROOT: {Config.WORKSPACE_ROOT}")
        print(f"✅ AUDIO_OUTPUT_DIR: {Config.AUDIO_OUTPUT_DIR}")
        print(f"✅ REMOTION_PATH: {Config.REMOTION_PATH}")
        
        # Test directory creation
        success = Config.ensure_directories()
        if success:
            print("✅ All directories created successfully")
        else:
            print("⚠️ Some directories could not be created")
        
        return True
    except Exception as e:
        print(f"❌ Config error: {e}")
        return False

def test_tts_service():
    """Test TTS Service"""
    print("\n🔍 Testing TTS Service...")
    
    try:
        from services.tts_service import TTSService
        tts_service = TTSService()
        print(f"✅ TTS Service initialized")
        print(f"✅ Audio directory: {tts_service.audio_dir}")
        
        # Test basic TTS
        print("\n🎤 Testing TTS generation...")
        test_text = "Hello, this is a test of the TTS system."
        job_id = tts_service.generate_speech(test_text, "test_tts")
        
        print(f"✅ TTS job started: {job_id}")
        
        # Wait for completion
        max_wait = 30
        for i in range(max_wait):
            status = tts_service.get_tts_status(job_id)
            if status:
                print(f"⏳ TTS Status: {status['status']} ({status.get('progress', 0)}%)")
                if status['status'] == 'completed':
                    print(f"✅ TTS completed!")
                    print(f"   Audio file: {status.get('wav_path')}")
                    print(f"   JSON file: {status.get('json_path')}")
                    return True
                elif status['status'] == 'failed':
                    print(f"❌ TTS failed: {status.get('error')}")
                    return False
            time.sleep(1)
        
        print("❌ TTS timeout")
        return False
        
    except Exception as e:
        print(f"❌ TTS Service error: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Main test function"""
    print("🧪 TTS Windows Compatibility Test")
    print("=" * 50)
    
    # Test FFmpeg
    ffmpeg_ok = test_ffmpeg()
    
    # Test config
    config_ok = test_config()
    
    # Test TTS service
    tts_ok = test_tts_service()
    
    print("\n" + "=" * 50)
    print("📊 Test Results:")
    print(f"   FFmpeg: {'✅' if ffmpeg_ok else '❌'}")
    print(f"   Config: {'✅' if config_ok else '❌'}")
    print(f"   TTS Service: {'✅' if tts_ok else '❌'}")
    
    if all([ffmpeg_ok, config_ok, tts_ok]):
        print("\n🎉 All tests passed! TTS should work on Windows.")
        return 0
    else:
        print("\n⚠️ Some tests failed. Please check the issues above.")
        return 1

if __name__ == "__main__":
    exit(main())
