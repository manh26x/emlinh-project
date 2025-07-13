# 🎵 Audio Tools Installation Guide

## Vấn đề
Trên server Linux production, hệ thống đang gặp lỗi:
```
⚠️ rhubarb not found, trying next option...
⚠️ rhubarb.exe not found, trying next option...
⚠️ Rhubarb not available or failed, using simple lip sync fallback
```

## Nguyên nhân
- Code cũ đang tìm kiếm cả `rhubarb` và `rhubarb.exe` trên mọi hệ điều hành
- Trên Linux, `rhubarb.exe` không tồn tại nên gây ra warning
- Rhubarb chưa được cài đặt trên server Linux

## Giải pháp

### 1. Fix Code (Đã hoàn thành)
- ✅ Cập nhật `tts_service.py` để detection cross-platform đúng cách
- ✅ Trên Windows: tìm `rhubarb.exe` trước, sau đó `rhubarb`
- ✅ Trên Linux: chỉ tìm `rhubarb`

### 2. Cài đặt Audio Tools trên Linux

#### Cách 1: Sử dụng script tổng hợp (Khuyến nghị)
```bash
# Chạy với quyền sudo
sudo ./install_audio_tools_linux.sh
```

#### Cách 2: Cài đặt riêng lẻ
```bash
# Cài đặt FFmpeg
sudo ./install_ffmpeg_linux.sh

# Cài đặt Rhubarb
sudo ./install_rhubarb_linux.sh
```

#### Cách 3: Cài đặt thủ công
```bash
# Cài đặt FFmpeg
sudo apt-get update
sudo apt-get install -y ffmpeg

# Cài đặt Rhubarb
cd /tmp
wget https://github.com/DanielSWolf/rhubarb-lip-sync/releases/download/v1.13.0/rhubarb-lip-sync-1.13.0-linux.zip
unzip rhubarb-lip-sync-1.13.0-linux.zip
find . -name "rhubarb" -type f -exec chmod +x {} \;
find . -name "rhubarb" -type f -exec sudo ln -sf {} /usr/local/bin/rhubarb \;
rm rhubarb-lip-sync-1.13.0-linux.zip
```

### 3. Kiểm tra cài đặt
```bash
# Kiểm tra FFmpeg
ffmpeg -version

# Kiểm tra FFprobe
ffprobe -version

# Kiểm tra Rhubarb
rhubarb --version
```

## Kết quả mong đợi
Sau khi cài đặt, hệ thống sẽ:
- ✅ Không còn warning về `rhubarb.exe` trên Linux
- ✅ Rhubarb hoạt động bình thường cho lip sync
- ✅ FFmpeg hoạt động cho audio conversion
- ✅ Cross-platform compatibility hoàn chỉnh

## Fallback
Nếu Rhubarb không có sẵn, hệ thống sẽ tự động:
- Tạo simple lip sync JSON
- Tiếp tục hoạt động bình thường
- Không gây lỗi cho ứng dụng

## Files đã được cập nhật
- `emlinh_mng/src/services/tts_service.py` - Fix cross-platform detection
- `start_app_daemon.sh` - Thêm auto-installation
- `install_audio_tools_linux.sh` - Script cài đặt tổng hợp
- `install_ffmpeg_linux.sh` - Script cài đặt FFmpeg
- `install_rhubarb_linux.sh` - Script cài đặt Rhubarb 