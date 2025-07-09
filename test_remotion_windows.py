#!/usr/bin/env python3
"""
Test script để kiểm tra Remotion CLI trên Windows
"""
import os
import sys
import subprocess
import time

# Add the src directory to Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
src_dir = os.path.join(current_dir, 'emlinh_mng', 'src')
sys.path.insert(0, src_dir)

def test_remotion_cli():
    """Test Remotion CLI availability"""
    print("🔍 Testing Remotion CLI on Windows...")
    
    # Import config
    from app.config import Config
    
    remotion_path = Config.REMOTION_PATH
    print(f"📁 Remotion path: {remotion_path}")
    
    if not os.path.exists(remotion_path):
        print(f"❌ Remotion path not found: {remotion_path}")
        return False
    
    # Test 1: Check PATH
    print("\n🔧 Test 1: Check PATH for npx")
    try:
        result = subprocess.run(
            "where npx",
            capture_output=True,
            text=True,
            shell=True,
            timeout=10
        )
        if result.returncode == 0:
            print(f"✅ npx found at: {result.stdout.strip()}")
        else:
            print(f"❌ npx not found in PATH: {result.stderr}")
    except Exception as e:
        print(f"❌ Exception checking PATH: {str(e)}")
    
    # Test 2: Basic npx command with shell=True
    print("\n🔧 Test 2: npx remotion --version with shell=True")
    try:
        result = subprocess.run(
            "npx remotion --version",
            cwd=remotion_path,
            capture_output=True,
            text=True,
            shell=True,
            timeout=30
        )
        if result.returncode == 0:
            print(f"✅ Success with shell=True: {result.stdout.strip()}")
        else:
            print(f"❌ Failed with shell=True: {result.stderr}")
            return False
    except Exception as e:
        print(f"❌ Exception with shell=True: {str(e)}")
        return False
    
    # Test 3: List compositions with shell=True
    print("\n🔧 Test 3: List compositions with shell=True")
    try:
        result = subprocess.run(
            "npx remotion compositions",
            cwd=remotion_path,
            capture_output=True,
            text=True,
            shell=True,
            timeout=60
        )
        if result.returncode == 0:
            print("✅ Compositions listed successfully")
            print(f"Output: {result.stdout[:200]}...")
        else:
            print(f"❌ Failed to list compositions: {result.stderr}")
    except Exception as e:
        print(f"❌ Exception listing compositions: {str(e)}")
    
    return True

def test_video_utils():
    """Test VideoUtils class"""
    print("\n🔍 Testing VideoUtils class...")
    
    try:
        from utils.video_utils import VideoUtils
        from app.config import Config
        
        remotion_path = Config.REMOTION_PATH
        print(f"📁 Testing with path: {remotion_path}")
        
        # Test availability check
        is_available = VideoUtils._check_remotion_availability(remotion_path)
        print(f"✅ Remotion available: {is_available}")
        
        return is_available
        
    except Exception as e:
        print(f"❌ VideoUtils test failed: {str(e)}")
        return False

if __name__ == "__main__":
    print("🚀 REMOTION WINDOWS TEST")
    print("=" * 50)
    
    success1 = test_remotion_cli()
    success2 = test_video_utils()
    
    print("\n" + "=" * 50)
    print("📊 RESULTS:")
    print(f"   CLI Test: {'✅ PASS' if success1 else '❌ FAIL'}")
    print(f"   VideoUtils Test: {'✅ PASS' if success2 else '❌ FAIL'}")
    
    if success1 and success2:
        print("\n🎉 All tests passed! Remotion should work correctly.")
    else:
        print("\n⚠️ Some tests failed. Check the output above for details.") 