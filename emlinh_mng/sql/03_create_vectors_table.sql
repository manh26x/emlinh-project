-- Extension vector cho PostgreSQL (cần cài đặt pgvector)
CREATE EXTENSION IF NOT EXISTS vector;

-- Bảng vectors: Lưu trữ embeddings để AI có thể query dễ dàng hơn
CREATE TABLE IF NOT EXISTS vectors (
    id SERIAL PRIMARY KEY,
    content_id INTEGER, -- ID tham chiếu đến nội dung gốc
    content_type VARCHAR(50) NOT NULL, -- 'chat', 'idea', 'plan'
    content_text TEXT NOT NULL, -- Nội dung text gốc
    embedding vector(768), -- Vector embedding (Nomic embed-text: 768 dimensions)
    metadata JSONB, -- Thông tin bổ sung dạng JSON
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tạo index cho vector similarity search
CREATE INDEX IF NOT EXISTS idx_vectors_embedding ON vectors USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_vectors_content_type ON vectors(content_type);
CREATE INDEX IF NOT EXISTS idx_vectors_content_id ON vectors(content_id);
CREATE INDEX IF NOT EXISTS idx_vectors_metadata ON vectors USING GIN(metadata);

-- Trigger để tự động cập nhật updated_at
CREATE TRIGGER update_vectors_updated_at 
    BEFORE UPDATE ON vectors 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Function để tìm kiếm similarity
CREATE OR REPLACE FUNCTION search_similar_content(
    query_embedding vector(768),
    content_type_filter VARCHAR(50) DEFAULT NULL,
    similarity_threshold FLOAT DEFAULT 0.7,
    max_results INTEGER DEFAULT 10
)
RETURNS TABLE (
    id INTEGER,
    content_id INTEGER,
    content_type VARCHAR(50),
    content_text TEXT,
    similarity FLOAT,
    metadata JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        v.id,
        v.content_id,
        v.content_type,
        v.content_text,
        1 - (v.embedding <=> query_embedding) as similarity,
        v.metadata
    FROM vectors v
    WHERE 
        (content_type_filter IS NULL OR v.content_type = content_type_filter)
        AND (1 - (v.embedding <=> query_embedding)) >= similarity_threshold
    ORDER BY v.embedding <=> query_embedding
    LIMIT max_results;
END;
$$ LANGUAGE plpgsql;