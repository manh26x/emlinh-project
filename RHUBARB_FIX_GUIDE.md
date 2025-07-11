# 🔧 Hướng Dẫn Sửa Lỗi Rhubarb Issue #23

## 🚨 Vấn Đề

Trên server Linux production, hệ thống TTS đang gặp lỗi:

```
⚠️ rhubarb not found, trying next option...
⚠️ rhubarb.exe not found, trying next option...
⚠️ Rhubarb not available or failed, using simple lip sync fallback
```

**Nguyên nhân:** Rhubarb Lip Sync chưa được cài đặt đúng cách trên server Linux.

## ✅ Giải Pháp Nhanh

### 🎯 **Cách 1: Script Tự Động (Khuyến nghị)**

```bash
# 1. Chạy script fix tự động
sudo ./fix_rhubarb_issue.sh

# 2. Verify installation
./test_tts_rhubarb.py

# 3. Restart ứng dụng
sudo systemctl restart emlinh  # hoặc ./start_app_daemon.sh
```

### 🛠️ **Cách 2: Sử dụng Script Có Sẵn**

```bash
# Cài đặt toàn bộ audio tools
sudo ./install_audio_tools_linux.sh

# Hoặc chỉ cài Rhubarb
sudo ./install_rhubarb_linux.sh
```

### ⚙️ **Cách 3: Cài Đặt Thủ Công**

```bash
# 1. Cài dependencies
sudo apt-get update
sudo apt-get install -y wget unzip ffmpeg

# 2. Download Rhubarb
cd /tmp
wget https://github.com/DanielSWolf/rhubarb-lip-sync/releases/download/v1.13.0/rhubarb-lip-sync-1.13.0-linux.zip

# 3. Extract và install
unzip rhubarb-lip-sync-1.13.0-linux.zip
find . -name "rhubarb" -type f -exec chmod +x {} \;
find . -name "rhubarb" -type f -exec sudo cp {} /usr/local/bin/rhubarb \;

# 4. Cleanup
rm -rf rhubarb-lip-sync-*

# 5. Verify
rhubarb --version
```

## 🔍 Kiểm Tra & Verify

### **1. Kiểm tra tools có sẵn:**

```bash
# Check FFmpeg
ffmpeg -version

# Check Rhubarb
rhubarb --version

# Check đường dẫn
which rhubarb
```

### **2. Test TTS Service:**

```bash
# Chạy test script
python3 test_tts_rhubarb.py

# Hoặc test manual trong Python
python3 -c "
import subprocess
result = subprocess.run(['rhubarb', '--version'], capture_output=True, text=True)
print('Success!' if result.returncode == 0 else 'Failed!')
"
```

### **3. Kiểm tra application logs:**

```bash
# Check Flask logs
tail -f emlinh_mng/flask.log

# Check for success messages (sau khi fix)
grep -i "rhubarb" emlinh_mng/flask.log

# Should see: "✅ Rhubarb lip sync generated successfully"
# Instead of: "⚠️ rhubarb not found"
```

## 🎯 Các Files Đã Được Sửa

### **1. TTS Service đã được update:**
- ✅ `emlinh_mng/src/services/tts_service.py` - Cross-platform Rhubarb detection
- ✅ Trên Linux: chỉ tìm `rhubarb`
- ✅ Trên Windows: tìm `rhubarb.exe` trước, sau đó `rhubarb`
- ✅ Fallback mechanism nếu Rhubarb không có

### **2. Scripts cài đặt:**
- ✅ `install_audio_tools_linux.sh` - Cài tất cả audio tools
- ✅ `install_rhubarb_linux.sh` - Chỉ cài Rhubarb
- ✅ `start_app_daemon.sh` - Auto-install trong startup

### **3. Scripts debug/fix:**
- ✅ `fix_rhubarb_issue.sh` - Script fix toàn diện
- ✅ `test_tts_rhubarb.py` - Test script để verify

## 📋 Checklist Verification

Sau khi fix, verify các điều sau:

- [ ] `rhubarb --version` chạy thành công
- [ ] `which rhubarb` trả về `/usr/local/bin/rhubarb`
- [ ] TTS generation không có warning "rhubarb not found"
- [ ] Lip sync JSON được tạo bởi Rhubarb thay vì fallback
- [ ] Application logs không còn error về Rhubarb

## 🛡️ Troubleshooting

### **Nếu vẫn gặp lỗi "rhubarb not found":**

1. **Kiểm tra PATH:**
   ```bash
   echo $PATH | grep -o '/usr/local/bin'
   # Nếu không có output, thêm vào PATH:
   export PATH="/usr/local/bin:$PATH"
   ```

2. **Kiểm tra permissions:**
   ```bash
   ls -la /usr/local/bin/rhubarb
   # Should be: -rwxr-xr-x (executable)
   
   # Fix permissions nếu cần:
   sudo chmod +x /usr/local/bin/rhubarb
   ```

3. **Kiểm tra binary hoạt động:**
   ```bash
   /usr/local/bin/rhubarb --version
   # Should print version info, not "command not found"
   ```

4. **Restart services:**
   ```bash
   # Restart application để reload environment
   sudo systemctl restart emlinh
   # Hoặc
   ./stop_app.sh && ./start_app_daemon.sh
   ```

### **Nếu Rhubarb crashes:**

1. **Check dependencies:**
   ```bash
   ldd /usr/local/bin/rhubarb
   # Check for missing libraries
   ```

2. **Install missing dependencies:**
   ```bash
   sudo apt-get install -y libc6 libgcc1 libstdc++6
   ```

3. **Try different Rhubarb version:**
   ```bash
   # Download different version nếu v1.13.0 không work
   wget https://github.com/DanielSWolf/rhubarb-lip-sync/releases/download/v1.12.0/rhubarb-lip-sync-1.12.0-linux.zip
   ```

## 🎉 Kết Quả Mong Đợi

Sau khi fix thành công:

### **Trước (Issue #23):**
```
⚠️ rhubarb not found, trying next option...
⚠️ rhubarb.exe not found, trying next option...  
⚠️ Rhubarb not available or failed, using simple lip sync fallback
```

### **Sau khi fix:**
```
✅ Rhubarb lip sync generated successfully with rhubarb
✅ JSON output file created: /path/to/audio.json
✅ TTS generation completed with proper lip sync
```

### **Lợi ích:**
- ✅ **Lip sync chính xác** thay vì simple fallback
- ✅ **Better avatar animation** với mouth movements realistic
- ✅ **Professional quality** TTS output
- ✅ **No more warnings** trong application logs

## 📞 Support

Nếu vẫn gặp vấn đề sau khi thử các cách trên:

1. **Chạy diagnostic script:**
   ```bash
   sudo ./fix_rhubarb_issue.sh 2>&1 | tee rhubarb_fix.log
   ```

2. **Share logs cho debugging:**
   - `rhubarb_fix.log` - Output của fix script
   - `emlinh_mng/flask.log` - Application logs  
   - `test_tts_rhubarb.py` output - Test results

3. **Check system info:**
   ```bash
   uname -a              # OS version
   echo $PATH           # Environment PATH
   ls -la /usr/local/bin/rhubarb  # File permissions
   ldd /usr/local/bin/rhubarb     # Dependencies
   ```

## 🔄 Maintenance

### **Regular checks:**
```bash
# Monthly verification
rhubarb --version && echo "Rhubarb OK" || echo "Rhubarb ISSUE"

# Check for updates (manual)
# Visit: https://github.com/DanielSWolf/rhubarb-lip-sync/releases
```

### **Backup current working installation:**
```bash
# Backup working binary
sudo cp /usr/local/bin/rhubarb /usr/local/bin/rhubarb.backup.$(date +%Y%m%d)
```

---

**✨ Issue #23 Resolution:** Rhubarb Lip Sync is now properly installed and configured for Linux production environment, enabling high-quality lip sync generation for TTS videos.