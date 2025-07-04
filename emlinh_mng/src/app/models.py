from src.app.app import db
from datetime import datetime
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy import Text
import uuid

class User(db.Model):
    """User model"""
    __tablename__ = 'users'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)
    
    def __repr__(self):
        return f'<User {self.username}>'
    
    def to_dict(self):
        """Convert model to dictionary"""
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'is_active': self.is_active
        }

class Chat(db.Model):
    """Chat model for storing conversations with AI"""
    __tablename__ = 'chats'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.String(255), nullable=False, index=True)
    user_message = db.Column(db.Text, nullable=False)
    ai_response = db.Column(db.Text, nullable=False)
    message_type = db.Column(db.String(50), default='conversation', index=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<Chat {self.id} - {self.session_id}>'
    
    def to_dict(self):
        """Convert model to dictionary"""
        return {
            'id': self.id,
            'session_id': self.session_id,
            'user_message': self.user_message,
            'ai_response': self.ai_response,
            'message_type': self.message_type,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class Video(db.Model):
    """Video model for storing AI-generated videos"""
    __tablename__ = 'videos'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    topic = db.Column(db.String(500), nullable=False)
    script = db.Column(db.Text)
    file_path = db.Column(db.String(500), nullable=False)
    file_name = db.Column(db.String(255), nullable=False)
    file_size = db.Column(db.Integer)  # Size in bytes
    duration = db.Column(db.Integer, default=15)  # Duration in seconds
    composition = db.Column(db.String(100), default='Scene-Landscape')
    background = db.Column(db.String(100), default='office')
    voice = db.Column(db.String(100), default='nova')
    status = db.Column(db.String(50), default='completed', index=True)  # 'rendering', 'completed', 'failed'
    job_id = db.Column(db.String(255), index=True)  # Render job ID
    thumbnail_path = db.Column(db.String(500))
    related_chat_id = db.Column(db.Integer, db.ForeignKey('chats.id'))
    session_id = db.Column(db.String(255), index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    related_chat = db.relationship('Chat', backref='videos')
    
    def __repr__(self):
        return f'<Video {self.id} - {self.title}>'
    
    def to_dict(self):
        """Convert model to dictionary"""
        return {
            'id': self.id,
            'title': self.title,
            'topic': self.topic,
            'script': self.script,
            'file_path': self.file_path,
            'file_name': self.file_name,
            'file_size': self.file_size,
            'duration': self.duration,
            'composition': self.composition,
            'background': self.background,
            'voice': self.voice,
            'status': self.status,
            'job_id': self.job_id,
            'thumbnail_path': self.thumbnail_path,
            'related_chat_id': self.related_chat_id,
            'session_id': self.session_id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class Idea(db.Model):
    """Idea model for storing content ideas and plans"""
    __tablename__ = 'ideas'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    content_type = db.Column(db.String(100), index=True)  # 'video', 'post', 'story', 'reel'
    category = db.Column(db.String(100), index=True)  # 'entertainment', 'education', 'lifestyle', 'business'
    status = db.Column(db.String(50), default='draft', index=True)  # 'draft', 'in_progress', 'completed', 'published'
    priority = db.Column(db.Integer, default=3, index=True)  # 1: High, 2: Medium, 3: Low
    target_audience = db.Column(db.Text)
    estimated_duration = db.Column(db.Integer)  # Thời lượng ước tính (phút)
    tags = db.Column(ARRAY(db.String))  # Mảng các tag
    related_chat_id = db.Column(db.Integer, db.ForeignKey('chats.id'))
    scheduled_date = db.Column(db.Date, index=True)
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship
    related_chat = db.relationship('Chat', backref='ideas')
    
    def __repr__(self):
        return f'<Idea {self.id} - {self.title}>'
    
    def to_dict(self):
        """Convert model to dictionary"""
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'content_type': self.content_type,
            'category': self.category,
            'status': self.status,
            'priority': self.priority,
            'target_audience': self.target_audience,
            'estimated_duration': self.estimated_duration,
            'tags': self.tags,
            'related_chat_id': self.related_chat_id,
            'scheduled_date': self.scheduled_date.isoformat() if self.scheduled_date else None,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class Vector(db.Model):
    """Vector model for storing embeddings"""
    __tablename__ = 'vectors'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.Integer, primary_key=True)
    content_id = db.Column(db.Integer, index=True)  # ID tham chiếu đến nội dung gốc
    content_type = db.Column(db.String(50), nullable=False, index=True)  # 'chat', 'idea', 'plan'
    content_text = db.Column(db.Text, nullable=False)  # Nội dung text gốc
    embedding = db.Column(ARRAY(db.Float))  # Vector embedding as array of floats
    meta_data = db.Column(db.JSON)  # Thông tin bổ sung dạng JSON (renamed from metadata)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<Vector {self.id} - {self.content_type}>'
    
    def to_dict(self):
        """Convert model to dictionary"""
        return {
            'id': self.id,
            'content_id': self.content_id,
            'content_type': self.content_type,
            'content_text': self.content_text,
            'meta_data': self.meta_data,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

def generate_session_id():
    """Generate a unique session ID for chat"""
    return str(uuid.uuid4())