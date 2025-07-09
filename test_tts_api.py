#!/usr/bin/env python3
"""
Test TTS API endpoint
"""
import requests
import time
import json

def test_tts_api():
    """Test TTS API endpoint"""
    base_url = "http://localhost:5000"
    
    print("🧪 Testing TTS API endpoint...")
    
    # Test data
    test_data = {
        "text": "Xin chào! Đây là test TTS API trên Windows.",
        "filename": "test_api_windows"
    }
    
    try:
        # Test TTS generation
        print("🎤 Calling TTS API...")
        response = requests.post(
            f"{base_url}/api/tts/generate",
            json=test_data,
            timeout=10
        )
        
        if response.status_code == 200:
            result = response.json()
            if result.get('success'):
                job_id = result.get('job_id')
                print(f"✅ TTS job started: {job_id}")
                
                # Poll for status
                for i in range(30):  # 30 seconds timeout
                    status_response = requests.get(
                        f"{base_url}/api/tts/status/{job_id}",
                        timeout=5
                    )
                    
                    if status_response.status_code == 200:
                        status_data = status_response.json()
                        status = status_data.get('status', 'unknown')
                        progress = status_data.get('progress', 0)
                        
                        print(f"⏳ Status: {status} ({progress}%)")
                        
                        if status == 'completed':
                            print(f"✅ TTS completed!")
                            print(f"   WAV: {status_data.get('wav_path')}")
                            print(f"   JSON: {status_data.get('json_path')}")
                            return True
                        elif status == 'failed':
                            print(f"❌ TTS failed: {status_data.get('error')}")
                            return False
                    
                    time.sleep(1)
                
                print("❌ TTS timeout")
                return False
            else:
                print(f"❌ TTS API error: {result.get('message')}")
                return False
        else:
            print(f"❌ HTTP error: {response.status_code} - {response.text}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to Flask app. Is it running on http://localhost:5000?")
        return False
    except Exception as e:
        print(f"❌ API test error: {e}")
        return False

def main():
    """Main function"""
    print("🧪 TTS API Test")
    print("=" * 30)
    
    success = test_tts_api()
    
    print("\n" + "=" * 30)
    if success:
        print("🎉 TTS API test passed!")
    else:
        print("❌ TTS API test failed.")
    
    return 0 if success else 1

if __name__ == "__main__":
    exit(main())
