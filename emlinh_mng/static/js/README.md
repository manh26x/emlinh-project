# Kiến Trúc Module Chat System

## Tổng Quan

Chat system đã được refactor thành kiến trúc module để cải thiện khả năng bảo trì, mở rộng và tái sử dụng code. Thay vì một file `chat.js` lớn (553 dòng), giờ đây hệ thống được chia thành các module chuyên biệt.

## Cấu Trúc Thư Mục

```
js/
├── core/                    # Các module cốt lõi
│   ├── ChatCore.js         # Logic gửi/nhận tin nhắn chính
│   ├── UIManager.js        # Quản lý giao diện người dùng
│   ├── SessionManager.js   # Quản lý phiên làm việc
│   └── NotificationManager.js # Quản lý thông báo
├── modules/                 # Các module chức năng
│   ├── VideoManager.js     # Quản lý chức năng video
│   └── IdeaManager.js      # Quản lý ý tưởng
├── utils/                   # Tiện ích
│   └── ChatUtils.js        # Các hàm utility
├── ChatManager.js          # Manager chính kết nối tất cả modules
├── app.js                  # Khởi tạo ứng dụng
└── chat.js.backup         # Backup file cũ
```

## Mô Tả Các Module

### Core Modules

#### 1. **ChatCore.js**
- **Chức năng**: Xử lý logic gửi/nhận tin nhắn chính
- **Phụ thuộc**: SessionManager, UIManager, NotificationManager
- **Phương thức chính**:
  - `sendMessage(message)`: Gửi tin nhắn
  - `setMessageType(type)`: Đặt loại tin nhắn
  - `useQuickPrompt(prompt, type)`: Sử dụng prompt nhanh

#### 2. **UIManager.js**
- **Chức năng**: Quản lý toàn bộ giao diện người dùng
- **Phương thức chính**:
  - `addUserMessage(message)`: Thêm tin nhắn người dùng
  - `addAIMessage(message, timestamp)`: Thêm tin nhắn AI
  - `showTypingIndicator()`: Hiển thị chỉ báo đang gõ
  - `formatMessage(message)`: Format tin nhắn với markdown
  - `setLoadingState(loading)`: Đặt trạng thái loading

#### 3. **SessionManager.js**
- **Chức năng**: Quản lý phiên làm việc chat
- **Phương thức chính**:
  - `generateSessionId()`: Tạo session ID mới
  - `startNewSession()`: Bắt đầu phiên mới
  - `getSessionId()`: Lấy session ID hiện tại

#### 4. **NotificationManager.js**
- **Chức năng**: Quản lý hệ thống thông báo toast
- **Phương thức chính**:
  - `showNotification(message, type)`: Hiển thị thông báo
  - `showSuccess(message)`: Thông báo thành công
  - `showError(message)`: Thông báo lỗi

### Feature Modules

#### 5. **VideoManager.js**
- **Chức năng**: Quản lý tất cả chức năng liên quan đến video
- **Phương thức chính**:
  - `createVideo(topic, ...)`: Tạo video mới
  - `downloadVideo(videoId)`: Tải video
  - `viewVideoDetail(videoId)`: Xem chi tiết video
  - `showVideoDetailModal(video)`: Hiển thị modal chi tiết

#### 6. **IdeaManager.js**
- **Chức năng**: Quản lý ý tưởng và hiển thị danh sách gần đây
- **Phương thức chính**:
  - `loadRecentIdeas()`: Tải ý tưởng gần đây
  - `displayRecentIdeas(ideas)`: Hiển thị danh sách ý tưởng

### Utilities

#### 7. **ChatUtils.js**
- **Chức năng**: Các hàm tiện ích dùng chung
- **Phương thức chính**:
  - `copyToClipboard(text)`: Sao chép vào clipboard
  - `exportChat()`: Export lịch sử chat
  - `escapeHtml(text)`: Escape HTML
  - `debounce(func, wait)`: Hàm debounce
  - `throttle(func, limit)`: Hàm throttle

### Main Manager

#### 8. **ChatManager.js**
- **Chức năng**: Kết nối và điều phối tất cả các module
- **Khởi tạo**: Tạo instances của tất cả managers theo đúng thứ tự dependency
- **Event Binding**: Xử lý events toàn cục của ứng dụng

## Cách Sử Dụng

### Import Modules
Sử dụng template `chat_modules.html` trong template HTML:

```html
{% include 'chat_modules.html' %}
```

### Truy Cập Modules
```javascript
// Truy cập thông qua chatManager global
window.chatManager.videoManager.createVideo('Topic mới');
window.chatManager.notificationManager.showSuccess('Thành công!');

// Hoặc truy cập trực tiếp (cho debugging)
window.videoManager.downloadVideo(123);
window.notificationManager.showError('Lỗi!');
```

## Lợi Ích Của Kiến Trúc Mới

### 1. **Khả Năng Bảo Trì**
- Mỗi module có trách nhiệm rõ ràng
- Dễ dàng debug và fix lỗi trong từng module riêng biệt
- Code dễ đọc và hiểu hơn

### 2. **Khả Năng Mở Rộng**
- Có thể thêm module mới mà không ảnh hưởng code cũ
- Dễ dàng thêm tính năng mới cho từng module
- Tách biệt concerns giữa các modules

### 3. **Tái Sử Dụng**
- Các module có thể được sử dụng độc lập
- Dễ dàng test từng module riêng biệt
- Có thể tái sử dụng NotificationManager cho các phần khác của app

### 4. **Hiệu Suất**
- Chỉ load những module cần thiết
- Có thể lazy load các module nếu cần
- Tách biệt event handlers để tránh conflict

### 5. **Team Collaboration**
- Nhiều developer có thể làm việc trên các module khác nhau
- Merge conflicts ít hơn
- Easier code review per module

## Migration từ Chat.js Cũ

File `chat.js` cũ đã được backup thành `chat.js.backup`. Toàn bộ functionality đã được preserve và refactor vào các module mới với cải thiện:

- **Better error handling** trong mỗi module
- **Event-driven architecture** với custom events
- **Improved dependency injection** giữa các modules
- **Better separation of concerns**

## Testing

Mỗi module có thể được test độc lập:

```javascript
// Test NotificationManager
const notifManager = new NotificationManager();
notifManager.showSuccess('Test notification');

// Test UIManager
const uiManager = new UIManager();
uiManager.addUserMessage('Test message');
```

## Future Enhancements

1. **TypeScript Migration**: Convert các modules sang TypeScript
2. **Module Bundling**: Sử dụng webpack/rollup để bundle modules
3. **Lazy Loading**: Load modules khi cần thiết
4. **Service Worker**: Cache modules cho offline usage
5. **Unit Tests**: Thêm test suite cho từng module 