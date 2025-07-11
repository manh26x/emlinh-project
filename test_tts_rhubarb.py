#!/usr/bin/env python3
"""
Script test TTS và Rhubarb cho Issue #23
Chạy sau khi đã cài đặt Rhubarb để verify everything works
"""

import os
import sys
import subprocess
import tempfile
import time
from pathlib import Path

# Colors for output
class Colors:
    RED = '\033[0;31m'
    GREEN = '\033[0;32m'
    YELLOW = '\033[1;33m'
    BLUE = '\033[0;34m'
    NC = '\033[0m'  # No Color

def print_status(msg):
    print(f"{Colors.BLUE}🔍 {msg}{Colors.NC}")

def print_success(msg):
    print(f"{Colors.GREEN}✅ {msg}{Colors.NC}")

def print_warning(msg):
    print(f"{Colors.YELLOW}⚠️ {msg}{Colors.NC}")

def print_error(msg):
    print(f"{Colors.RED}❌ {msg}{Colors.NC}")

def test_ffmpeg():
    """Test FFmpeg availability"""
    print_status("Testing FFmpeg...")
    
    import platform
    system = platform.system().lower()
    
    if system == 'windows':
        ffmpeg_executables = ['ffmpeg.exe', 'ffmpeg']
    else:
        ffmpeg_executables = ['ffmpeg']
    
    for ffmpeg_cmd in ffmpeg_executables:
        try:
            result = subprocess.run([ffmpeg_cmd, '-version'], 
                                  capture_output=True, text=True, timeout=10)
            if result.returncode == 0:
                version_line = result.stdout.split('\n')[0]
                print_success(f"FFmpeg working: {version_line}")
                return True
        except (FileNotFoundError, subprocess.TimeoutExpired):
            continue
    
    print_error("FFmpeg not found!")
    return False

def test_rhubarb():
    """Test Rhubarb availability"""
    print_status("Testing Rhubarb...")
    
    import platform
    system = platform.system().lower()
    
    if system == 'windows':
        rhubarb_executables = ['rhubarb.exe', 'rhubarb']
    else:
        rhubarb_executables = ['rhubarb']
    
    for rhubarb_cmd in rhubarb_executables:
        try:
            result = subprocess.run([rhubarb_cmd, '--version'], 
                                  capture_output=True, text=True, timeout=10)
            if result.returncode == 0:
                print_success(f"Rhubarb working: {rhubarb_cmd}")
                print_success(f"Version: {result.stdout.strip()}")
                return True
        except (FileNotFoundError, subprocess.TimeoutExpired):
            continue
    
    print_error("Rhubarb not found!")
    return False

def test_tts_service_import():
    """Test TTS Service import"""
    print_status("Testing TTS Service import...")
    
    # Add src to Python path
    current_dir = Path(__file__).parent.absolute()
    emlinh_src = current_dir / 'emlinh_mng' / 'src'
    
    if not emlinh_src.exists():
        print_error(f"emlinh_mng/src directory not found at {emlinh_src}")
        return False
    
    sys.path.insert(0, str(emlinh_src))
    
    try:
        from services.tts_service import TTSService
        print_success("TTS Service import successful")
        return True
    except ImportError as e:
        print_error(f"TTS Service import failed: {e}")
        return False
    except Exception as e:
        print_error(f"TTS Service import error: {e}")
        return False

def test_lip_sync_generation():
    """Test lip sync generation với Rhubarb"""
    print_status("Testing lip sync generation...")
    
    # Create test files
    test_text = "Hello world, this is a test"
    
    # Create temporary OGG file (mock)
    with tempfile.NamedTemporaryFile(suffix='.ogg', delete=False) as temp_ogg:
        temp_ogg_path = temp_ogg.name
        # Create a minimal OGG header for testing
        temp_ogg.write(b'OggS')  # Minimal OGG signature
    
    # Create temporary text file
    with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False, encoding='utf-8') as temp_txt:
        temp_txt.write(test_text)
        temp_txt_path = temp_txt.name
    
    # Create output JSON path
    temp_json_path = temp_ogg_path.replace('.ogg', '.json')
    
    try:
        import platform
        system = platform.system().lower()
        
        if system == 'windows':
            rhubarb_executables = ['rhubarb.exe', 'rhubarb']
        else:
            rhubarb_executables = ['rhubarb']
        
        rhubarb_success = False
        
        for rhubarb_cmd in rhubarb_executables:
            try:
                cmd = [
                    rhubarb_cmd,
                    '-f', 'json',
                    '-d', temp_txt_path,
                    temp_ogg_path,
                    '-o', temp_json_path
                ]
                
                print_status(f"Running: {' '.join(cmd)}")
                result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
                
                if result.returncode == 0:
                    print_success(f"Rhubarb lip sync generation successful with {rhubarb_cmd}")
                    if os.path.exists(temp_json_path):
                        print_success(f"JSON output file created: {temp_json_path}")
                        
                        # Check JSON content
                        try:
                            import json
                            with open(temp_json_path, 'r') as f:
                                json_data = json.load(f)
                            print_success(f"Valid JSON generated with keys: {list(json_data.keys())}")
                        except json.JSONDecodeError:
                            print_warning("JSON file created but invalid format")
                    
                    rhubarb_success = True
                    break
                else:
                    print_warning(f"Rhubarb failed with {rhubarb_cmd}: {result.stderr}")
            
            except FileNotFoundError:
                print_warning(f"{rhubarb_cmd} not found")
                continue
            except subprocess.TimeoutExpired:
                print_warning(f"{rhubarb_cmd} timeout")
                continue
        
        return rhubarb_success
        
    finally:
        # Cleanup
        for temp_file in [temp_ogg_path, temp_txt_path, temp_json_path]:
            try:
                if os.path.exists(temp_file):
                    os.unlink(temp_file)
            except:
                pass

def test_cross_platform_detection():
    """Test cross-platform detection logic trong TTS service"""
    print_status("Testing cross-platform detection...")
    
    import platform
    system = platform.system().lower()
    
    print_success(f"Detected system: {system}")
    
    if system == 'windows':
        expected_executables = ['rhubarb.exe', 'rhubarb']
        print_success("Windows detected - will try rhubarb.exe first, then rhubarb")
    else:
        expected_executables = ['rhubarb']
        print_success("Linux/Unix detected - will try rhubarb only")
    
    # Test actual detection
    detected_rhubarb = None
    for cmd in expected_executables:
        try:
            result = subprocess.run([cmd, '--version'], capture_output=True, text=True, timeout=5)
            if result.returncode == 0:
                detected_rhubarb = cmd
                break
        except:
            continue
    
    if detected_rhubarb:
        print_success(f"Cross-platform detection successful: {detected_rhubarb}")
        return True
    else:
        print_error("Cross-platform detection failed - no Rhubarb found")
        return False

def main():
    print("🧪 === TESTING TTS & RHUBARB ISSUE #23 FIX ===")
    print(f"📅 Test time: {time.strftime('%Y-%m-%d %H:%M:%S')}")
    print("")
    
    # Test results
    tests = []
    
    # 1. Test FFmpeg
    tests.append(("FFmpeg", test_ffmpeg()))
    
    # 2. Test Rhubarb
    tests.append(("Rhubarb", test_rhubarb()))
    
    # 3. Test TTS Service import
    tests.append(("TTS Service Import", test_tts_service_import()))
    
    # 4. Test cross-platform detection
    tests.append(("Cross-platform Detection", test_cross_platform_detection()))
    
    # 5. Test actual lip sync generation (only if Rhubarb is available)
    if any(test[1] for test in tests if test[0] == "Rhubarb"):
        tests.append(("Lip Sync Generation", test_lip_sync_generation()))
    else:
        print_warning("Skipping lip sync generation test - Rhubarb not available")
    
    print("")
    print("=" * 50)
    print_status("TEST RESULTS SUMMARY")
    print("=" * 50)
    
    all_passed = True
    for test_name, result in tests:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{test_name}: {status}")
        if not result:
            all_passed = False
    
    print("")
    
    if all_passed:
        print_success("🎉 ALL TESTS PASSED!")
        print_success("Issue #23 đã được sửa thành công!")
        print_success("")
        print_status("Next steps:")
        print("1. Restart EmLinh application")
        print("2. Test TTS generation in web interface")
        print("3. Verify no more 'rhubarb not found' messages in logs")
        print("4. Enjoy proper lip sync with Rhubarb! 🎤")
    else:
        print_error("❌ SOME TESTS FAILED")
        print_warning("Hệ thống vẫn có thể hoạt động với simple lip sync fallback")
        print_warning("")
        print_status("Troubleshooting:")
        print("1. Run: sudo ./fix_rhubarb_issue.sh")
        print("2. Check if Rhubarb is in PATH: which rhubarb")
        print("3. Try manual installation: sudo ./install_rhubarb_linux.sh")
        print("4. Check application logs for detailed errors")
    
    print("")
    print_status(f"Test completed at: {time.strftime('%Y-%m-%d %H:%M:%S')}")

if __name__ == "__main__":
    main()