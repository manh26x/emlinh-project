#!/usr/bin/env python3
"""
Script để tạo bảng videos trong database
"""

from src.app.app import create_app
from src.app.extensions import db
from src.app.models import Video, Chat, Idea, Vector, User

def create_tables():
    """Tạo tất cả bảng trong database"""
    app = create_app()
    
    with app.app_context():
        print("🔍 Kiểm tra database hiện tại...")
        
        # Kiểm tra các bảng hiện có
        inspector = db.inspect(db.engine)
        existing_tables = inspector.get_table_names()
        print(f"📋 Bảng hiện có: {existing_tables}")
        
        # Tạo bảng videos nếu chưa có
        if 'videos' not in existing_tables:
            print("🎬 Tạo bảng videos...")
            Video.__table__.create(db.engine)
            print("✅ Đã tạo bảng videos thành công!")
        else:
            print("✅ Bảng videos đã tồn tại")
            
        # Tạo tất cả bảng khác nếu cần
        print("🔧 Tạo tất cả bảng còn lại...")
        db.create_all()
        
        # Kiểm tra lại
        updated_tables = inspector.get_table_names()
        print(f"📋 Bảng sau khi update: {updated_tables}")
        
        print("✅ Database đã được cập nhật thành công!")

if __name__ == '__main__':
    create_tables() 