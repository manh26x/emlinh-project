-- Bảng chats: Lưu trữ cuộc trò chuyện với nhân vật AI
CREATE TABLE IF NOT EXISTS chats (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL,
    user_message TEXT NOT NULL,
    ai_response TEXT NOT NULL,
    message_type VARCHAR(50) DEFAULT 'conversation', -- 'conversation', 'planning', 'brainstorm'
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tạo index để tăng hiệu suất truy vấn
CREATE INDEX IF NOT EXISTS idx_chats_session_id ON chats(session_id);
CREATE INDEX IF NOT EXISTS idx_chats_timestamp ON chats(timestamp);
CREATE INDEX IF NOT EXISTS idx_chats_message_type ON chats(message_type);

-- Trigger để tự động cập nhật updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_chats_updated_at 
    BEFORE UPDATE ON chats 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();