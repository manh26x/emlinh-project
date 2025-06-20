# 🎬 Hướng Dẫn Video Embedding trong Chat

## 🎯 Tổng Quan

Video embedding cho phép hiển thị video player trực tiếp trong chat sau khi video được tạo thành công, thay vì chỉ hiển thị link.

## 🔧 Cách Hoạt Động

### 1. **Auto Detection**
Hệ thống sẽ tự động detect các pattern video trong tin nhắn AI:

- `🆔 Video ID: 123`
- `/videos/123`
- `tại đây: /videos/123`
- `Video ID 123`

### 2. **Auto Embed**
Khi detect được video ID, system sẽ tự động thêm video player với:
- ✅ Video player HTML5 với controls
- ✅ Nút tải về
- ✅ Nút xem chi tiết
- ✅ Link đến Video Library

## 🚀 Cách Sử Dụng

### **Tự Động (Tin Nhắn Mới)**
1. Tạo video qua chat AI
2. Khi video hoàn thành, tin nhắn response sẽ tự động có video player

### **Thủ Công (Tin Nhắn Cũ)**
1. Click nút **"🔄 Hiển thị video"** trong sidebar
2. System sẽ reprocess tất cả tin nhắn cũ để thêm video player

## 🧪 Test Video Embedding

### **Option 1: Test Page**
```bash
# Mở file test
open emlinh_mng/test_video_embed.html
```

### **Option 2: Browser Console**
```javascript
// Test trong chat page
window.reprocessMessages();
```

### **Option 3: Direct UI Test**
```javascript
// Test formatMessage function
const uiManager = window.chatManager.uiManager;
const testMessage = "Video được tạo tại /videos/6";
const result = uiManager.formatMessage(testMessage);
console.log(result);
```

## 📋 Checklist Troubleshooting

### ✅ **Video Không Hiển thị?**

1. **Kiểm tra Console**: Mở Developer Tools (F12) → Console tab
   - Không có lỗi JavaScript? ✅
   - ChatManager initialized? ✅
   - UIManager available? ✅

2. **Kiểm tra Message Format**: 
   - Tin nhắn có chứa `/videos/[số]`? ✅
   - Pattern match đúng? ✅

3. **Test Manual Reprocess**:
   - Click nút "🔄 Hiển thị video"
   - Thấy notification success? ✅

4. **Kiểm tra Video File**:
   - Video file tồn tại trên server? ✅
   - URL `/api/videos/[id]/file` accessible? ✅

### 🔧 **Debug Steps**

```javascript
// 1. Test pattern matching
const testMsg = "Video tại /videos/6";
const patterns = [
    /🆔 <strong>Video ID:<\/strong> (\d+)/,
    /\/videos\/(\d+)/,
    /Video ID[:\s]+(\d+)/i,
    /tại đây:\s*\/videos\/(\d+)/
];

patterns.forEach((pattern, i) => {
    const match = testMsg.match(pattern);
    console.log(`Pattern ${i+1}:`, match ? match[1] : 'No match');
});

// 2. Test formatMessage
const uiManager = window.chatManager?.uiManager;
if (uiManager) {
    const result = uiManager.formatMessage(testMsg);
    console.log('Formatted result:', result);
    console.log('Contains video embed:', result.includes('video-embed-container'));
}

// 3. Manual reprocess
window.reprocessMessages();
```

## 🎨 Styling & Customization

Video player được styled với CSS trong `custom.css`:

```css
.video-embed-container {
    max-width: 100%;
    margin: 15px 0;
    border-radius: 8px;
    animation: fadeIn 0.6s ease-out;
}

.video-player-wrapper {
    background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
    border-radius: 10px;
    padding: 20px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}
```

## 📱 Responsive Design

Video player tự động responsive:
- **Desktop**: Max width 500px
- **Tablet**: Full width với controls
- **Mobile**: Stack controls vertically

## 🔗 API Endpoints

- **Video Stream**: `/api/videos/{id}/file`
- **Video Info**: `/api/videos/{id}`
- **Video Library**: `/videos`

## 🎯 Expected Behavior

1. **Tin nhắn có video ID** → Auto embed video player
2. **Click "🔄 Hiển thị video"** → Reprocess all messages
3. **Video player loads** → Can play, download, view details
4. **Responsive design** → Works on all devices

## 🐛 Known Issues & Solutions

### **Issue**: Video không load
**Solution**: Kiểm tra video file path và permissions

### **Issue**: Player không có controls
**Solution**: Đảm bảo HTML5 video tag có `controls` attribute

### **Issue**: Styling bị lỗi
**Solution**: Check CSS conflicts và Bootstrap compatibility

## 📈 Performance Notes

- Video embed chỉ trigger khi detect pattern
- Không ảnh hưởng performance chat thông thường
- CSS animations optimized cho smooth UX
- Lazy loading video với `preload="metadata"` 