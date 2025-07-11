#!/bin/bash
# Script kiểm tra và sửa lỗi Rhubarb cho Issue #23
# Chạy với: sudo ./fix_rhubarb_issue.sh

set -e

echo "🔧 === FIX RHUBARB ISSUE #23 ==="
echo "📅 Thời gian: $(date)"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}🔍 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# 1. Kiểm tra hệ điều hành
print_status "Kiểm tra hệ điều hành..."
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    print_success "Hệ điều hành: Linux"
    OS="linux"
elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    print_success "Hệ điều hành: Windows"
    OS="windows"
else
    print_warning "Hệ điều hành không được hỗ trợ đầy đủ: $OSTYPE"
    OS="other"
fi
echo ""

# 2. Kiểm tra quyền root (chỉ cần trên Linux)
if [[ "$OS" == "linux" ]]; then
    print_status "Kiểm tra quyền root..."
    if [[ $EUID -ne 0 ]]; then
        print_error "Script này cần quyền root trên Linux"
        print_warning "Chạy lại với: sudo ./fix_rhubarb_issue.sh"
        exit 1
    fi
    print_success "Quyền root: OK"
    echo ""
fi

# 3. Kiểm tra FFmpeg
print_status "Kiểm tra FFmpeg..."
if command -v ffmpeg &> /dev/null; then
    ffmpeg_version=$(ffmpeg -version 2>/dev/null | head -n1 | cut -d' ' -f3)
    print_success "FFmpeg đã cài đặt: $ffmpeg_version"
    print_success "Đường dẫn: $(which ffmpeg)"
else
    print_error "FFmpeg chưa được cài đặt"
    if [[ "$OS" == "linux" ]]; then
        print_status "Đang cài đặt FFmpeg..."
        apt-get update
        apt-get install -y ffmpeg
        print_success "FFmpeg đã được cài đặt"
    else
        print_warning "Vui lòng cài đặt FFmpeg từ: https://ffmpeg.org/download.html"
    fi
fi

# Kiểm tra FFprobe
if command -v ffprobe &> /dev/null; then
    print_success "FFprobe có sẵn: $(which ffprobe)"
else
    print_warning "FFprobe không tìm thấy - có thể ảnh hưởng đến audio duration detection"
fi
echo ""

# 4. Kiểm tra Rhubarb - QUAN TRỌNG NHẤT
print_status "Kiểm tra Rhubarb Lip Sync..."

# Kiểm tra các đường dẫn có thể có của Rhubarb
rhubarb_found=false
rhubarb_paths=(
    "/usr/local/bin/rhubarb"
    "/usr/bin/rhubarb"
    "/opt/rhubarb/rhubarb"
    "$(which rhubarb 2>/dev/null || echo '')"
)

for path in "${rhubarb_paths[@]}"; do
    if [[ -n "$path" && -f "$path" && -x "$path" ]]; then
        print_success "Rhubarb tìm thấy tại: $path"
        if [[ -x "$path" ]]; then
            version_output=$($path --version 2>/dev/null || echo "unknown version")
            print_success "Phiên bản: $version_output"
            rhubarb_found=true
            break
        else
            print_warning "File tồn tại nhưng không có quyền thực thi: $path"
        fi
    fi
done

if [[ "$rhubarb_found" == false ]]; then
    print_error "Rhubarb chưa được cài đặt hoặc không trong PATH"
    
    if [[ "$OS" == "linux" ]]; then
        print_status "Đang cài đặt Rhubarb Lip Sync..."
        
        # Install dependencies
        print_status "Cài đặt dependencies..."
        apt-get update
        apt-get install -y wget unzip
        
        # Download and install Rhubarb
        cd /tmp
        
        # Clean up any existing files first
        rm -rf rhubarb-lip-sync-* || true
        
        print_status "Downloading Rhubarb Lip Sync v1.13.0..."
        wget -q --show-progress https://github.com/DanielSWolf/rhubarb-lip-sync/releases/download/v1.13.0/rhubarb-lip-sync-1.13.0-linux.zip
        
        print_status "Extracting Rhubarb..."
        unzip -q rhubarb-lip-sync-1.13.0-linux.zip
        
        print_status "Tìm kiếm Rhubarb executable..."
        # Find the rhubarb executable in the extracted files
        rhubarb_exec=$(find . -name "rhubarb" -type f 2>/dev/null | head -1)
        
        if [[ -n "$rhubarb_exec" ]]; then
            print_success "Tìm thấy Rhubarb executable: $rhubarb_exec"
            
            # Make it executable
            chmod +x "$rhubarb_exec"
            
            # Copy to /usr/local/bin
            cp "$rhubarb_exec" /usr/local/bin/rhubarb
            
            # Verify installation
            if command -v rhubarb &> /dev/null; then
                print_success "Rhubarb đã được cài đặt thành công!"
                print_success "Đường dẫn: $(which rhubarb)"
                version_output=$(rhubarb --version 2>/dev/null || echo "version info not available")
                print_success "Phiên bản: $version_output"
                rhubarb_found=true
            else
                print_error "Lỗi: Rhubarb đã copy nhưng vẫn không trong PATH"
            fi
        else
            print_error "Không tìm thấy Rhubarb executable trong file tải xuống"
            print_status "Nội dung thư mục /tmp:"
            ls -la /tmp/rhubarb* || true
        fi
        
        # Cleanup
        print_status "Dọn dẹp file tạm..."
        rm -rf rhubarb-lip-sync-* || true
        
    else
        print_warning "Trên Windows, vui lòng cài đặt Rhubarb thủ công từ:"
        print_warning "https://github.com/DanielSWolf/rhubarb-lip-sync/releases"
    fi
fi
echo ""

# 5. Kiểm tra PATH environment
print_status "Kiểm tra PATH environment..."
echo "Current PATH:"
echo "$PATH" | tr ':' '\n' | sed 's/^/  /'

if [[ "$PATH" == *"/usr/local/bin"* ]]; then
    print_success "/usr/local/bin có trong PATH"
else
    print_warning "/usr/local/bin không có trong PATH"
    print_status "Thêm /usr/local/bin vào PATH..."
    export PATH="/usr/local/bin:$PATH"
    print_success "PATH đã được cập nhật"
fi
echo ""

# 6. Test thực tế TTS Service nếu có thể
print_status "Kiểm tra TTS Service..."
if [[ -d "emlinh_mng" ]]; then
    cd emlinh_mng
    
    if [[ -f "src/services/tts_service.py" ]]; then
        print_success "TTS Service file tồn tại"
        
        # Test import nếu có Python environment
        if [[ -d "venv" ]]; then
            print_status "Testing TTS Service import..."
            source venv/bin/activate 2>/dev/null || true
            
            python3 -c "
import sys
sys.path.insert(0, 'src')
try:
    from services.tts_service import TTSService
    print('✅ TTS Service import thành công')
    
    # Test Rhubarb detection trong code
    import subprocess
    import platform
    system = platform.system().lower()
    
    if system == 'windows':
        rhubarb_executables = ['rhubarb.exe', 'rhubarb']
    else:
        rhubarb_executables = ['rhubarb']
    
    rhubarb_detected = False
    for cmd in rhubarb_executables:
        try:
            result = subprocess.run([cmd, '--version'], capture_output=True, text=True, timeout=5)
            if result.returncode == 0:
                print(f'✅ Rhubarb detected trong Python: {cmd}')
                rhubarb_detected = True
                break
        except:
            continue
    
    if not rhubarb_detected:
        print('⚠️ Rhubarb không detect được từ Python code')
    
except Exception as e:
    print(f'❌ TTS Service import failed: {e}')
" 2>/dev/null || print_warning "Không thể test Python import"
            
            deactivate 2>/dev/null || true
        else
            print_warning "Virtual environment không tồn tại"
        fi
    else
        print_warning "TTS Service file không tồn tại"
    fi
    
    cd ..
else
    print_warning "emlinh_mng directory không tồn tại"
fi
echo ""

# 7. Tổng kết và khuyến nghị
echo "========================================"
print_status "TỔNG KẾT KIỂM TRA"
echo "========================================"

# Kiểm tra lại tất cả tools
tools_status=()

if command -v ffmpeg &> /dev/null; then
    tools_status+=("FFmpeg: ✅")
else
    tools_status+=("FFmpeg: ❌")
fi

if command -v ffprobe &> /dev/null; then
    tools_status+=("FFprobe: ✅")
else
    tools_status+=("FFprobe: ❌")
fi

if command -v rhubarb &> /dev/null; then
    tools_status+=("Rhubarb: ✅")
else
    tools_status+=("Rhubarb: ❌")
fi

for status in "${tools_status[@]}"; do
    echo "$status"
done

echo ""

if command -v rhubarb &> /dev/null; then
    print_success "🎉 RHUBARB ĐÃ ĐƯỢC CÀI ĐẶT THÀNH CÔNG!"
    print_success "Lỗi Issue #23 đã được sửa!"
    print_success ""
    print_status "Để verify, hãy:"
    echo "1. Restart ứng dụng EmLinh"
    echo "2. Test TTS generation"
    echo "3. Kiểm tra log - không còn thấy 'rhubarb not found'"
    echo ""
    print_success "Hệ thống giờ sẽ sử dụng Rhubarb cho lip sync thay vì fallback"
else
    print_error "RHUBARB VẪN CHƯA ĐƯỢC CÀI ĐẶT"
    print_warning "Hệ thống sẽ tiếp tục sử dụng simple lip sync fallback"
    print_warning ""
    print_status "Khuyến nghị khắc phục:"
    echo "1. Kiểm tra lại quyền thực thi file"
    echo "2. Thử cài đặt thủ công: sudo ./install_rhubarb_linux.sh"
    echo "3. Kiểm tra log cài đặt để tìm lỗi cụ thể"
fi

echo ""
print_status "Script hoàn thành lúc: $(date)"