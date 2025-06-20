-- Bảng ideas: Lưu trữ các ý tưởng và kế hoạch content
CREATE TABLE IF NOT EXISTS ideas (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    content_type VARCHAR(100), -- 'video', 'post', 'story', 'reel'
    category VARCHAR(100), -- 'entertainment', 'education', 'lifestyle', 'business'
    status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'in_progress', 'completed', 'published'
    priority INTEGER DEFAULT 3, -- 1: High, 2: Medium, 3: Low
    target_audience TEXT,
    estimated_duration INTEGER, -- Thời lượng ước tính (phút)
    tags TEXT[], -- Mảng các tag
    related_chat_id INTEGER REFERENCES chats(id),
    scheduled_date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tạo index để tăng hiệu suất truy vấn
CREATE INDEX IF NOT EXISTS idx_ideas_status ON ideas(status);
CREATE INDEX IF NOT EXISTS idx_ideas_content_type ON ideas(content_type);
CREATE INDEX IF NOT EXISTS idx_ideas_category ON ideas(category);
CREATE INDEX IF NOT EXISTS idx_ideas_priority ON ideas(priority);
CREATE INDEX IF NOT EXISTS idx_ideas_scheduled_date ON ideas(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_ideas_tags ON ideas USING GIN(tags);

-- Trigger để tự động cập nhật updated_at
CREATE TRIGGER update_ideas_updated_at 
    BEFORE UPDATE ON ideas 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();