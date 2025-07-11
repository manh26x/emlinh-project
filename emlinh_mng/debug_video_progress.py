#!/usr/bin/env python3
"""
Debug script để test video progress events và session management
"""

import requests
import time
import uuid
import json
from datetime import datetime

BASE_URL = "http://localhost:5000"

def test_video_creation():
    """Test tạo video và theo dõi progress"""
    
    print("🔧 [DEBUG] Testing video creation and progress events...")
    
    # 1. Tạo session ID
    session_id = f"debug_session_{int(datetime.now().timestamp())}_{uuid.uuid4().hex[:8]}"
    print(f"📋 [DEBUG] Session ID: {session_id}")
    
    # 2. Gửi request tạo video
    video_data = {
        'topic': 'Test video creation debug',
        'duration': 10,
        'composition': 'Scene-Landscape',
        'background': 'office',
        'voice': 'nova',
        'session_id': session_id
    }
    
    print(f"🎬 [DEBUG] Sending video creation request...")
    try:
        response = requests.post(
            f"{BASE_URL}/api/chat/create-video",
            json=video_data,
            headers={'Content-Type': 'application/json'}
        )
        
        print(f"📊 [DEBUG] Response status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ [DEBUG] Video creation initiated successfully:")
            print(f"   - Success: {result.get('success')}")
            print(f"   - Job ID: {result.get('job_id')}")
            print(f"   - Session ID: {result.get('session_id')}")
            print(f"   - Message: {result.get('message')}")
            return result.get('job_id')
        else:
            print(f"❌ [DEBUG] Video creation failed:")
            print(f"   Response: {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ [DEBUG] Request failed: {str(e)}")
        return None

def check_video_status():
    """Kiểm tra trạng thái video hiện tại"""
    try:
        response = requests.get(f"{BASE_URL}/api/videos")
        if response.status_code == 200:
            data = response.json()
            if data.get('success') and data.get('videos'):
                latest_video = data['videos'][0]  # Video mới nhất
                print(f"📺 [DEBUG] Latest video:")
                print(f"   - ID: {latest_video.get('id')}")
                print(f"   - Title: {latest_video.get('title')}")
                print(f"   - Status: {latest_video.get('status')}")
                print(f"   - Created: {latest_video.get('created_at')}")
                return latest_video
        return None
    except Exception as e:
        print(f"❌ [DEBUG] Failed to check video status: {str(e)}")
        return None

def debug_backend_logs():
    """Hướng dẫn kiểm tra backend logs"""
    print("\n🔍 [DEBUG] To check backend logs, run in another terminal:")
    print("   cd emlinh_mng")
    print("   python -m src.app.run")
    print("   # Then watch the console output when creating video")

def main():
    print("🚀 [DEBUG] Starting video creation debug...")
    print("=" * 60)
    
    # Test video creation
    job_id = test_video_creation()
    
    if job_id:
        print(f"\n⏳ [DEBUG] Waiting for video to complete...")
        print("💡 [DEBUG] Tips:")
        print("   1. Check browser console for SocketIO events")
        print("   2. Check backend logs for emit events")
        print("   3. Verify session_id matches between frontend and backend")
        
        # Wait and check status
        for i in range(12):  # Check every 10 seconds for 2 minutes
            time.sleep(10)
            print(f"\n🔄 [DEBUG] Check #{i+1}/12...")
            video = check_video_status()
            if video and video.get('status') == 'completed':
                print(f"✅ [DEBUG] Video completed! ID: {video.get('id')}")
                break
    
    debug_backend_logs()
    print("\n🏁 [DEBUG] Debug session completed.")

if __name__ == "__main__":
    main() 