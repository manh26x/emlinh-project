#!/usr/bin/env python3
"""
Facebook API Service để quản lý tương tác với Facebook Graph API
"""

import os
import requests
import logging
from typing import Optional, Dict, List, Any, Union
from flask import current_app


class FacebookTokenError(Exception):
    """Exception raised for Facebook token related errors"""
    pass


class FacebookAPIError(Exception):
    """Exception raised for Facebook API related errors"""
    pass


class FacebookService:
    """
    Service để tương tác với Facebook Graph API
    Hỗ trợ đăng bài, đăng video, gửi tin nhắn và quản lý pages
    """
    
    def __init__(self, access_token: Optional[str] = None, api_version: Optional[str] = None):
        """
        Khởi tạo Facebook Service
        
        Args:
            access_token: Facebook Access Token (nếu không cung cấp sẽ đọc từ .env)
            api_version: Facebook API version (mặc định từ config)
        """
        self.logger = logging.getLogger(__name__)
        
        # Đọc token từ parameter hoặc environment variable
        self.access_token = access_token or self._get_token_from_env()
        if not self.access_token:
            raise FacebookTokenError("FACEBOOK_ACCESS_TOKEN không được tìm thấy trong .env file")
        
        # Cấu hình API
        self.api_version = api_version or self._get_api_version()
        self.base_url = f"https://graph.facebook.com/{self.api_version}"
        
        # Verify token khi khởi tạo
        if not self.verify_token():
            raise FacebookTokenError("Facebook Access Token không hợp lệ hoặc đã hết hạn")
        
        self.logger.info("Facebook Service đã được khởi tạo thành công")
    
    def _get_token_from_env(self) -> Optional[str]:
        """Đọc Facebook Access Token từ environment variable"""
        try:
            # Thử đọc từ Flask config trước
            if current_app:
                return current_app.config.get('FACEBOOK_ACCESS_TOKEN')
        except RuntimeError:
            # Nếu không có Flask context, đọc trực tiếp từ os.environ
            pass
        
        return os.environ.get('FACEBOOK_ACCESS_TOKEN')
    
    def _get_api_version(self) -> str:
        """Đọc Facebook API version từ config hoặc sử dụng mặc định"""
        try:
            if current_app:
                return current_app.config.get('FACEBOOK_API_VERSION', 'v18.0')
        except RuntimeError:
            pass
        
        return os.environ.get('FACEBOOK_API_VERSION', 'v18.0')
    
    def _make_request(self, endpoint: str, method: str = 'GET', params: Optional[Dict] = None, 
                     data: Optional[Dict] = None, files: Optional[Dict] = None) -> Dict[str, Any]:
        """
        Thực hiện request đến Facebook API
        
        Args:
            endpoint: API endpoint (không bao gồm base URL)
            method: HTTP method (GET, POST, DELETE)
            params: Query parameters
            data: POST data
            files: Files to upload
            
        Returns:
            Dict response từ Facebook API
            
        Raises:
            FacebookAPIError: Khi có lỗi API
        """
        url = f"{self.base_url}/{endpoint}"
        
        # Thêm access token vào params
        if not params:
            params = {}
        params['access_token'] = self.access_token
        
        try:
            response = requests.request(
                method=method,
                url=url,
                params=params,
                data=data,
                files=files,
                timeout=30
            )
            response.raise_for_status()
            
            result = response.json()
            
            # Kiểm tra error trong response
            if 'error' in result:
                error_msg = result['error'].get('message', 'Unknown Facebook API error')
                self.logger.error(f"Facebook API Error: {error_msg}")
                raise FacebookAPIError(f"Facebook API Error: {error_msg}")
            
            return result
            
        except requests.RequestException as e:
            self.logger.error(f"Request error: {str(e)}")
            raise FacebookAPIError(f"Request error: {str(e)}")
        except ValueError as e:
            self.logger.error(f"JSON decode error: {str(e)}")
            raise FacebookAPIError(f"Invalid JSON response: {str(e)}")
    
    def verify_token(self) -> bool:
        """
        Kiểm tra xem access token có còn hợp lệ không
        
        Returns:
            True nếu token hợp lệ, False nếu không
        """
        try:
            result = self._make_request('me', params={'fields': 'id,name'})
            self.logger.info(f"Token verification successful for user: {result.get('name', 'Unknown')}")
            return True
        except FacebookAPIError:
            self.logger.error("Token verification failed")
            return False
    
    def get_user_info(self) -> Dict[str, Any]:
        """
        Lấy thông tin user hiện tại
        
        Returns:
            Dict chứa thông tin user
        """
        fields = 'id,name,email,picture'
        return self._make_request('me', params={'fields': fields})
    
    def get_pages(self) -> List[Dict[str, Any]]:
        """
        Lấy danh sách pages mà user quản lý
        
        Returns:
            List of page objects
        """
        result = self._make_request('me/accounts')
        return result.get('data', [])
    
    def post_text(self, message: str, page_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Đăng status text lên timeline hoặc page
        
        Args:
            message: Nội dung bài đăng
            page_id: ID của page (nếu không cung cấp sẽ đăng lên profile cá nhân)
            
        Returns:
            Dict chứa thông tin bài đăng đã tạo
        """
        endpoint = f"{page_id}/feed" if page_id else "me/feed"
        data = {'message': message}
        
        result = self._make_request(endpoint, method='POST', data=data)
        self.logger.info(f"Posted text successfully, post ID: {result.get('id')}")
        return result
    
    def post_photo(self, image_path: str, caption: str = "", page_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Đăng ảnh kèm caption
        
        Args:
            image_path: Đường dẫn đến file ảnh
            caption: Caption cho ảnh
            page_id: ID của page (nếu không cung cấp sẽ đăng lên profile cá nhân)
            
        Returns:
            Dict chứa thông tin bài đăng đã tạo
            
        Raises:
            FileNotFoundError: Nếu file ảnh không tồn tại
        """
        if not os.path.exists(image_path):
            raise FileNotFoundError(f"Image file not found: {image_path}")
        
        endpoint = f"{page_id}/photos" if page_id else "me/photos"
        
        with open(image_path, 'rb') as image_file:
            files = {'source': image_file}
            data = {'caption': caption} if caption else {}
            
            result = self._make_request(endpoint, method='POST', data=data, files=files)
        
        self.logger.info(f"Posted photo successfully, post ID: {result.get('id')}")
        return result
    
    def post_video(self, video_path: str, description: str = "", page_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Upload và đăng video
        
        Args:
            video_path: Đường dẫn đến file video
            description: Mô tả cho video
            page_id: ID của page (nếu không cung cấp sẽ đăng lên profile cá nhân)
            
        Returns:
            Dict chứa thông tin video đã upload
            
        Raises:
            FileNotFoundError: Nếu file video không tồn tại
        """
        if not os.path.exists(video_path):
            raise FileNotFoundError(f"Video file not found: {video_path}")
        
        endpoint = f"{page_id}/videos" if page_id else "me/videos"
        
        with open(video_path, 'rb') as video_file:
            files = {'source': video_file}
            data = {'description': description} if description else {}
            
            result = self._make_request(endpoint, method='POST', data=data, files=files)
        
        self.logger.info(f"Posted video successfully, video ID: {result.get('id')}")
        return result
    
    def send_message(self, recipient_id: str, message: str) -> Dict[str, Any]:
        """
        Gửi tin nhắn qua Messenger API
        
        Args:
            recipient_id: ID của người nhận
            message: Nội dung tin nhắn
            
        Returns:
            Dict chứa thông tin tin nhắn đã gửi
            
        Note:
            Cần permission 'pages_messaging' để sử dụng chức năng này
        """
        endpoint = "me/messages"
        data = {
            'recipient': {'id': recipient_id},
            'message': {'text': message}
        }
        
        result = self._make_request(endpoint, method='POST', data=data)
        self.logger.info(f"Sent message successfully, message ID: {result.get('message_id')}")
        return result
    
    def get_post_insights(self, post_id: str, metrics: List[str] = None) -> Dict[str, Any]:
        """
        Lấy insights (statistics) của một bài đăng
        
        Args:
            post_id: ID của bài đăng
            metrics: List of metrics to retrieve
            
        Returns:
            Dict chứa insights data
        """
        if not metrics:
            metrics = ['post_impressions', 'post_clicks', 'post_reactions_by_type_total']
        
        endpoint = f"{post_id}/insights"
        params = {'metric': ','.join(metrics)}
        
        return self._make_request(endpoint, params=params)
    
    def delete_post(self, post_id: str) -> bool:
        """
        Xóa một bài đăng
        
        Args:
            post_id: ID của bài đăng cần xóa
            
        Returns:
            True nếu xóa thành công
        """
        try:
            result = self._make_request(post_id, method='DELETE')
            success = result.get('success', False)
            if success:
                self.logger.info(f"Post {post_id} deleted successfully")
            return success
        except FacebookAPIError:
            self.logger.error(f"Failed to delete post {post_id}")
            return False


# Utility functions
def create_facebook_service() -> FacebookService:
    """
    Factory function để tạo Facebook Service instance
    
    Returns:
        FacebookService instance
    """
    return FacebookService()


def validate_facebook_token(token: str) -> bool:
    """
    Validate một Facebook access token
    
    Args:
        token: Facebook access token cần validate
        
    Returns:
        True nếu token hợp lệ
    """
    try:
        service = FacebookService(access_token=token)
        return service.verify_token()
    except (FacebookTokenError, FacebookAPIError):
        return False