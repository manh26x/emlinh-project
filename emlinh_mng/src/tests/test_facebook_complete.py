#!/usr/bin/env python3
"""
Unit tests toàn diện cho Facebook Service
"""

import unittest
import os
import sys
from unittest.mock import patch, MagicMock, mock_open

# Thêm thư mục src vào Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'services'))

from facebook_service import (
    FacebookService, 
    FacebookTokenError, 
    FacebookAPIError,
    validate_facebook_token,
    create_facebook_service
)


class TestFacebookServiceComplete(unittest.TestCase):
    """Test class toàn diện cho FacebookService"""
    
    def setUp(self):
        """Setup cho mỗi test case"""
        self.test_token = "test_access_token_123"
        self.test_user_info = {
            "id": "123456789", 
            "name": "Test User",
            "email": "test@example.com"
        }
    
    @patch.dict(os.environ, {}, clear=True)
    def test_init_without_token_should_raise_error(self):
        """Test khởi tạo FacebookService khi không có token trong .env"""
        with self.assertRaises(FacebookTokenError) as context:
            FacebookService()
        
        self.assertIn("FACEBOOK_ACCESS_TOKEN không được tìm thấy trong .env file", str(context.exception))
    
    @patch.dict(os.environ, {'FACEBOOK_ACCESS_TOKEN': 'test_token_123'})
    @patch('facebook_service.requests.request')
    def test_init_with_token_success(self, mock_request):
        """Test khởi tạo FacebookService thành công"""
        mock_response = MagicMock()
        mock_response.json.return_value = {"id": "123", "name": "Test User"}
        mock_response.raise_for_status.return_value = None
        mock_request.return_value = mock_response
        
        service = FacebookService()
        
        self.assertEqual(service.access_token, 'test_token_123')
        self.assertEqual(service.api_version, 'v18.0')
    
    @patch('facebook_service.requests.request')
    def test_verify_token_success(self, mock_request):
        """Test verify_token thành công"""
        mock_response = MagicMock()
        mock_response.json.return_value = {"id": "123", "name": "Test User"}
        mock_response.raise_for_status.return_value = None
        mock_request.return_value = mock_response
        
        service = FacebookService(access_token=self.test_token)
        result = service.verify_token()
        
        self.assertTrue(result)
    
    @patch('facebook_service.requests.request')
    def test_get_user_info_success(self, mock_request):
        """Test get_user_info thành công"""
        # Mock token verification
        mock_response_verify = MagicMock()
        mock_response_verify.json.return_value = {"id": "123", "name": "Test User"}
        mock_response_verify.raise_for_status.return_value = None
        
        # Mock get_user_info
        mock_response_user = MagicMock()
        mock_response_user.json.return_value = self.test_user_info
        mock_response_user.raise_for_status.return_value = None
        
        mock_request.side_effect = [mock_response_verify, mock_response_user]
        
        service = FacebookService(access_token=self.test_token)
        result = service.get_user_info()
        
        self.assertEqual(result, self.test_user_info)
        self.assertEqual(result['name'], 'Test User')
    
    @patch('facebook_service.requests.request')
    def test_post_text_success(self, mock_request):
        """Test post_text thành công"""
        post_response = {"id": "post_123", "message": "Test message"}
        
        # Mock token verification
        mock_response_verify = MagicMock()
        mock_response_verify.json.return_value = {"id": "123", "name": "Test User"}
        mock_response_verify.raise_for_status.return_value = None
        
        # Mock post_text
        mock_response_post = MagicMock()
        mock_response_post.json.return_value = post_response
        mock_response_post.raise_for_status.return_value = None
        
        mock_request.side_effect = [mock_response_verify, mock_response_post]
        
        service = FacebookService(access_token=self.test_token)
        result = service.post_text("Test message")
        
        self.assertEqual(result['id'], 'post_123')
        self.assertEqual(result['message'], 'Test message')
    
    @patch('facebook_service.requests.request')
    @patch('builtins.open', new_callable=mock_open, read_data=b"fake image data")
    @patch('os.path.exists')
    def test_post_photo_success(self, mock_exists, mock_file, mock_request):
        """Test post_photo thành công"""
        mock_exists.return_value = True
        photo_response = {"id": "photo_123", "post_id": "post_456"}
        
        # Mock token verification
        mock_response_verify = MagicMock()
        mock_response_verify.json.return_value = {"id": "123", "name": "Test User"}
        mock_response_verify.raise_for_status.return_value = None
        
        # Mock post_photo
        mock_response_photo = MagicMock()
        mock_response_photo.json.return_value = photo_response
        mock_response_photo.raise_for_status.return_value = None
        
        mock_request.side_effect = [mock_response_verify, mock_response_photo]
        
        service = FacebookService(access_token=self.test_token)
        result = service.post_photo("/fake/path/image.jpg", "Test caption")
        
        self.assertEqual(result['id'], 'photo_123')
        mock_exists.assert_called_with("/fake/path/image.jpg")
    
    @patch('facebook_service.requests.request')
    def test_api_error_handling(self, mock_request):
        """Test xử lý lỗi API"""
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "error": {
                "message": "API rate limit exceeded",
                "type": "OAuthException"
            }
        }
        mock_response.raise_for_status.return_value = None
        mock_request.return_value = mock_response
        
        service = FacebookService.__new__(FacebookService)
        service.access_token = self.test_token
        service.api_version = "v18.0"
        service.base_url = "https://graph.facebook.com/v18.0"
        service.logger = MagicMock()
        
        with self.assertRaises(FacebookAPIError) as context:
            service._make_request('me')
        
        self.assertIn("API rate limit exceeded", str(context.exception))
    
    @patch('facebook_service.requests.request')
    def test_validate_facebook_token_valid(self, mock_request):
        """Test validate_facebook_token với token hợp lệ"""
        mock_response = MagicMock()
        mock_response.json.return_value = {"id": "123", "name": "Test User"}
        mock_response.raise_for_status.return_value = None
        mock_request.return_value = mock_response
        
        result = validate_facebook_token("valid_token")
        self.assertTrue(result)
    
    @patch('facebook_service.requests.request')
    def test_validate_facebook_token_invalid(self, mock_request):
        """Test validate_facebook_token với token không hợp lệ"""
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "error": {"message": "Invalid token"}
        }
        mock_response.raise_for_status.return_value = None
        mock_request.return_value = mock_response
        
        result = validate_facebook_token("invalid_token")
        self.assertFalse(result)


if __name__ == "__main__":
    print("🚀 Chạy unit tests toàn diện cho Facebook Service")
    print("=" * 60)
    unittest.main(verbosity=2)
