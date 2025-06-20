-- Update vectors table để đổi tên column metadata thành meta_data
-- Chạy script này để sync với models.py

-- Đổi tên column metadata thành meta_data
ALTER TABLE vectors RENAME COLUMN metadata TO meta_data;