-- Bảng chat_sessions: Lưu trữ thông tin về các cuộc hội thoại chat
CREATE TABLE IF NOT EXISTS chat_sessions (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) UNIQUE NOT NULL,
    title VARCHAR(255),
    description TEXT,
    message_count INTEGER DEFAULT 0,
    is_archived BOOLEAN DEFAULT FALSE,
    is_favorite BOOLEAN DEFAULT FALSE,
    tags TEXT[], -- Mảng các tag để phân loại
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tạo index để tăng hiệu suất truy vấn
CREATE INDEX IF NOT EXISTS idx_chat_sessions_session_id ON chat_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_created_at ON chat_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_last_message_at ON chat_sessions(last_message_at);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_is_archived ON chat_sessions(is_archived);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_is_favorite ON chat_sessions(is_favorite);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_tags ON chat_sessions USING GIN(tags);

-- Trigger để tự động cập nhật updated_at
CREATE TRIGGER update_chat_sessions_updated_at 
    BEFORE UPDATE ON chat_sessions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Function để tự động cập nhật message_count và last_message_at khi có chat mới
CREATE OR REPLACE FUNCTION update_chat_session_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Cập nhật message_count và last_message_at
    UPDATE chat_sessions 
    SET 
        message_count = message_count + 1,
        last_message_at = NEW.timestamp,
        updated_at = CURRENT_TIMESTAMP
    WHERE session_id = NEW.session_id;
    
    -- Nếu không tồn tại chat_session, tạo mới
    IF NOT FOUND THEN
        INSERT INTO chat_sessions (session_id, title, message_count, last_message_at)
        VALUES (NEW.session_id, 'Cuộc hội thoại mới', 1, NEW.timestamp);
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger để tự động cập nhật thống kê chat_session khi có chat mới
CREATE TRIGGER update_chat_session_stats_trigger
    AFTER INSERT ON chats
    FOR EACH ROW
    EXECUTE FUNCTION update_chat_session_stats();

-- Function để tự động cập nhật thống kê khi xóa chat
CREATE OR REPLACE FUNCTION update_chat_session_stats_on_delete()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE chat_sessions 
    SET 
        message_count = GREATEST(message_count - 1, 0),
        updated_at = CURRENT_TIMESTAMP
    WHERE session_id = OLD.session_id;
    
    RETURN OLD;
END;
$$ language 'plpgsql';

-- Trigger để tự động cập nhật thống kê khi xóa chat
CREATE TRIGGER update_chat_session_stats_on_delete_trigger
    AFTER DELETE ON chats
    FOR EACH ROW
    EXECUTE FUNCTION update_chat_session_stats_on_delete(); 