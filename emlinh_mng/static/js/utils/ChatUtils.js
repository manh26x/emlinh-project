class ChatUtils {
    static copyToClipboard(text) {
        return navigator.clipboard.writeText(text).then(() => {
            if (window.chatManager) {
                window.chatManager.notificationManager.showSuccess('Đã sao chép vào clipboard');
            }
        }).catch(err => {
            console.error('Failed to copy: ', err);
            if (window.chatManager) {
                window.chatManager.notificationManager.showError('Lỗi khi sao chép');
            }
        });
    }
    
    static exportChat() {
        const messages = document.querySelectorAll('.message');
        const chatData = Array.from(messages).map(msg => {
            const isUser = msg.classList.contains('user-message');
            const content = msg.querySelector('.message-content > div').textContent.trim();
            const timestamp = msg.querySelector('small').textContent;
            
            return {
                type: isUser ? 'user' : 'ai',
                content: content,
                timestamp: timestamp
            };
        });
        
        const dataStr = JSON.stringify(chatData, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        const sessionId = window.chatManager ? window.chatManager.sessionManager.getSessionId() : 'unknown';
        link.download = `chat_export_${sessionId}.json`;
        link.click();
        
        URL.revokeObjectURL(url);
        
        if (window.chatManager) {
            window.chatManager.notificationManager.showSuccess('Đã export chat thành công');
        }
    }
    
    static reprocessMessages() {
        // Reprocess all AI messages to trigger video embedding
        const aiMessages = document.querySelectorAll('.ai-message .message-content > div');
        const uiManager = window.chatManager?.uiManager;
        
        if (!uiManager) {
            console.error('UIManager not available');
            alert('ChatManager chưa sẵn sàng. Vui lòng thử lại.');
            return;
        }
        
        console.log(`🔍 Found ${aiMessages.length} AI messages to check`);
        
        let processedCount = 0;
        
        aiMessages.forEach((messageDiv, index) => {
            const originalText = messageDiv.textContent;
            const originalHtml = messageDiv.innerHTML;
            
            console.log(`Message ${index + 1}:`, originalText.substring(0, 100) + '...');
            
            // Check if this message might contain video info
            const hasVideoKeywords = originalText.includes('/videos/') || 
                                   originalText.includes('Video ID') || 
                                   originalText.toLowerCase().includes('video') ||
                                   originalText.includes('tại đây');
            
            if (hasVideoKeywords) {
                console.log(`✅ Message ${index + 1} has video keywords`);
                console.log('Original text:', originalText);
                
                // Reformat the message
                const formattedMessage = uiManager.formatMessage(originalText);
                console.log('Formatted message contains video embed:', formattedMessage.includes('video-embed-container'));
                
                // Only update if formatting added video embed and it wasn't already there
                if (formattedMessage.includes('video-embed-container') && !originalHtml.includes('video-embed-container')) {
                    messageDiv.innerHTML = formattedMessage;
                    processedCount++;
                    console.log(`🎬 Added video embed to message ${index + 1}`);
                } else if (originalHtml.includes('video-embed-container')) {
                    console.log(`ℹ️ Message ${index + 1} already has video embed`);
                } else {
                    console.log(`❌ No video ID found in message ${index + 1}`);
                }
            } else {
                console.log(`⏭️ Message ${index + 1} has no video keywords`);
            }
        });
        
        console.log(`📊 Processed ${processedCount} messages with video embeds`);
        
        if (window.chatManager && processedCount > 0) {
            window.chatManager.notificationManager.showSuccess(`✅ Đã hiển thị ${processedCount} video trong chat`);
        } else if (window.chatManager) {
            window.chatManager.notificationManager.showInfo(`ℹ️ Không tìm thấy tin nhắn video mới để hiển thị. Kiểm tra Console (F12) để xem chi tiết.`);
        }
        
        return processedCount;
    }
    
    static escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    static formatTimestamp(timestamp) {
        if (!timestamp) return new Date().toLocaleTimeString('vi-VN');
        return new Date(timestamp).toLocaleTimeString('vi-VN');
    }
    
    static generateRandomId(prefix = 'id') {
        return prefix + '_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    static throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
    
    static addTestVideoMessage() {
        // Add a test message with video ID for debugging
        const uiManager = window.chatManager?.uiManager;
        if (!uiManager) {
            alert('ChatManager chưa sẵn sàng');
            return;
        }
        
        const testMessage = "✅ Video đã được tạo thành công chủ đề Python với thời gian 7 giây! Bạn có thể xem video này tại đây: /videos/6. Chúc bạn có một ngày tuyệt vời!";
        
        uiManager.addAIMessage(testMessage, new Date().toISOString());
        
        if (window.chatManager) {
            window.chatManager.notificationManager.showSuccess('✅ Đã thêm tin nhắn test video');
        }
    }
}

// Export utility functions to global scope for backward compatibility
window.copyToClipboard = ChatUtils.copyToClipboard;
window.exportChat = ChatUtils.exportChat;
window.reprocessMessages = ChatUtils.reprocessMessages;
window.addTestVideoMessage = ChatUtils.addTestVideoMessage; 