#!/usr/bin/env python3
"""
Simple test script để test TTS trực tiếp trên Windows
"""
import os
import sys
import time
import subprocess

def test_ffmpeg():
    """Test FFmpeg installation"""
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

def test_openai_tts():
    """Test OpenAI TTS directly"""
    print("\n🔍 Testing OpenAI TTS directly...")
    
    try:
        import openai
        print("✅ OpenAI library imported")
        
        # Check if API key exists
        if not os.environ.get('OPENAI_API_KEY'):
            print("❌ OPENAI_API_KEY not found in environment")
            print("   Please set your OpenAI API key in .env file")
            return False
        
        print("✅ OpenAI API key found")
        
        # Test simple TTS
        client = openai.OpenAI()
        test_text = "Hello, this is a test"
        
        print("🎤 Generating test audio...")
        response = client.audio.speech.create(
            model="tts-1",
            voice="nova",
            input=test_text
        )
        
        # Save to temp file
        temp_file = "test_audio.mp3"
        response.stream_to_file(temp_file)
        
        if os.path.exists(temp_file):
            file_size = os.path.getsize(temp_file)
            print(f"✅ Audio generated: {temp_file} ({file_size} bytes)")
            
            # Test FFmpeg conversion
            if test_ffmpeg_conversion(temp_file):
                print("✅ FFmpeg conversion works")
                result = True
            else:
                print("❌ FFmpeg conversion failed")
                result = False
            
            # Cleanup
            try:
                os.remove(temp_file)
                if os.path.exists("test_audio.wav"):
                    os.remove("test_audio.wav")
            except:
                pass
                
            return result
        else:
            print("❌ Audio file not created")
            return False
            
    except Exception as e:
        print(f"❌ OpenAI TTS error: {e}")
        return False

def test_ffmpeg_conversion(mp3_file):
    """Test MP3 to WAV conversion"""
    try:
        wav_file = "test_audio.wav"
        cmd = [
            'ffmpeg', '-i', mp3_file,
            '-acodec', 'pcm_s16le',
            '-ar', '44100',
            '-ac', '2',
            '-y',
            wav_file
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode == 0 and os.path.exists(wav_file):
            print(f"✅ Converted to WAV: {wav_file}")
            return True
        else:
            print(f"❌ FFmpeg conversion failed: {result.stderr}")
            return False
    except Exception as e:
        print(f"❌ Conversion error: {e}")
        return False

def main():
    """Main test function"""
    print("🧪 Simple TTS Windows Test")
    print("=" * 40)
    
    # Load environment variables
    try:
        from dotenv import load_dotenv
        # Load from emlinh_mng directory where .env file is located
        env_path = os.path.join(os.path.dirname(__file__), 'emlinh_mng', '.env')
        load_dotenv(env_path)
        print(f"✅ Environment variables loaded from: {env_path}")
    except Exception as e:
        print(f"⚠️ python-dotenv not available: {e}")
    
    # Test FFmpeg
    ffmpeg_ok = test_ffmpeg()
    
    # Test OpenAI TTS
    tts_ok = test_openai_tts()
    
    print("\n" + "=" * 40)
    print("📊 Test Results:")
    print(f"   FFmpeg: {'✅' if ffmpeg_ok else '❌'}")
    print(f"   OpenAI TTS: {'✅' if tts_ok else '❌'}")
    
    if all([ffmpeg_ok, tts_ok]):
        print("\n🎉 All tests passed! TTS should work on Windows.")
        return 0
    else:
        print("\n⚠️ Some tests failed. Please check the issues above.")
        return 1

if __name__ == "__main__":
    exit(main())
