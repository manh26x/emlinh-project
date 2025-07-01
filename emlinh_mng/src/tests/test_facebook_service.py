#!/usr/bin/env python3
"""
Unit tests cho Facebook Service
Test tất cả các chức năng của FacebookService bao gồm:
- Đọc token từ .env file
- Validation token
- Tất cả các core functions
- Error handling
"""

import unittest
import os
import tempfile
import json
from unittest.mock import patch, mock_open, MagicMock
import sys

# Thêm thư mục gốc vào Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.facebook_service import (
    FacebookService, 
    FacebookTokenError, 
    FacebookAPIError,
    create_facebook_service,
    validate_facebook_token
)


class TestFacebookService(unittest.TestCase):
    """Test class cho FacebookService"""
    
    def setUp(self):
        """Setup cho mỗi test case"""
        self.test_token = "test_access_token_123"
        self.test_api_version = "v18.0"
        self.test_user_info = {
            "id": "123456789",
            "name": "Test User",
            "email": "test@example.com"
        }
        
    @patch.dict(os.environ, {}, clear=True)
    def test_init_without_token_in_env_should_raise_error(self):
        """Test khởi tạo FacebookService khi không có token trong .env"""
        with self.assertRaises(FacebookTokenError) as context:
            FacebookService()
        
        self.assertIn("FACEBOOK_ACCESS_TOKEN không được tìm thấy trong .env file", str(context.exception))
    
    @patch.dict(os.environ, {'FACEBOOK_ACCESS_TOKEN': 'test_token_123'})
    @patch('services.facebook_service.requests.request')
    def test_init_with_token_in_env_success(self, mock_request):
        """Test khởi tạo FacebookService thành công khi có token trong .env"""
        # Mock successful token verification
        mock_response = MagicMock()
        mock_response.json.return_value = {"id": "123", "name": "Test User"}
        mock_response.raise_for_status.return_value = None
        mock_request.return_value = mock_response
        
        service = FacebookService()
        
        self.assertEqual(service.access_token, 'test_token_123')
        self.assertEqual(service.api_version, 'v18.0')
        self.assertEqual(service.base_url, 'https://graph.facebook.com/v18.0')
    
    @patch('services.facebook_service.requests.request')
    def test_init_with_invalid_token_should_raise_error(self, mock_request):
        """Test khởi tạo FacebookService với token không hợp lệ"""
        # Mock failed token verification
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "error": {
                "message": "Invalid OAuth access token",
                "type": "OAuthException"
            }
        }
        mock_response.raise_for_status.return_value = None
        mock_request.return_value = mock_response
        
        with self.assertRaises(FacebookTokenError) as context:
            FacebookService(access_token="invalid_token")
        
        self.assertIn("Facebook Access Token không hợp lệ hoặc đã hết hạn", str(context.exception))
    
    @patch('services.facebook_service.requests.request')
    def test_verify_token_success(self, mock_request):
        """Test verify_token thành công"""
        mock_response = MagicMock()
        mock_response.json.return_value = {"id": "123", "name": "Test User"}
        mock_response.raise_for_status.return_value = None
        mock_request.return_value = mock_response
        
        service = FacebookService(access_token=self.test_token)
        result = service.verify_token()
        
        self.assertTrue(result)
        mock_request.assert_called()
    
    @patch('services.facebook_service.requests.request')
    def test_verify_token_failure(self, mock_request):
        """Test verify_token thất bại"""
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "error": {"message": "Invalid token"}
        }
        mock_response.raise_for_status.return_value = None
        mock_request.return_value = mock_response
        
        service = FacebookService.__new__(FacebookService)  # Bypass __init__
        service.access_token = "invalid_token"
        service.api_version = "v18.0"
        service.base_url = "https://graph.facebook.com/v18.0"
        service.logger = MagicMock()
        
        result = service.verify_token()
        
        self.assertFalse(result)
    
    @patch('services.facebook_service.requests.request')
    def test_get_user_info_success(self, mock_request):
        """Test get_user_info thành công"""
        # Mock token verification first
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
        self.assertEqual(result['id'], '123456789')
    
    @patch('services.facebook_service.requests.request')
    def test_get_pages_success(self, mock_request):
        """Test get_pages thành công"""
        pages_data = {
            "data": [
                {"id": "page1", "name": "Test Page 1"},
                {"id": "page2", "name": "Test Page 2"}
            ]
        }
        
        # Mock token verification first
        mock_response_verify = MagicMock()
        mock_response_verify.json.return_value = {"id": "123", "name": "Test User"}
        mock_response_verify.raise_for_status.return_value = None
        
        # Mock get_pages
        mock_response_pages = MagicMock()
        mock_response_pages.json.return_value = pages_data
        mock_response_pages.raise_for_status.return_value = None
        
        mock_request.side_effect = [mock_response_verify, mock_response_pages]
        
        service = FacebookService(access_token=self.test_token)
        result = service.get_pages()
        
        self.assertEqual(len(result), 2)
        self.assertEqual(result[0]['name'], 'Test Page 1')
        self.assertEqual(result[1]['name'], 'Test Page 2')
    
    @patch('services.facebook_service.requests.request')
    def test_post_text_success(self, mock_request):
        """Test post_text thành công"""
        post_response = {"id": "post_123", "message": "Test message"}
        
        # Mock token verification first
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
    
    @patch('services.facebook_service.requests.request')
    def test_post_text_with_page_id(self, mock_request):
        """Test post_text với page_id"""
        post_response = {"id": "page_post_123"}
        
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
        result = service.post_text("Test message", page_id="page123")
        
        self.assertEqual(result['id'], 'page_post_123')
        
        # Verify endpoint was called correctly
        args, kwargs = mock_request.call_args_list[1]
        self.assertIn('page123/feed', kwargs['url'])
    
    @patch('services.facebook_service.requests.request')
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
    
    @patch('os.path.exists')
    def test_post_photo_file_not_found(self, mock_exists):
        """Test post_photo khi file không tồn tại"""
        mock_exists.return_value = False
        
        # Create service without verification for this test
        service = FacebookService.__new__(FacebookService)
        service.access_token = self.test_token
        service.logger = MagicMock()
        
        with self.assertRaises(FileNotFoundError) as context:
            service.post_photo("/nonexistent/image.jpg")
        
        self.assertIn("Image file not found", str(context.exception))
    
    @patch('services.facebook_service.requests.request')
    @patch('builtins.open', new_callable=mock_open, read_data=b"fake video data")
    @patch('os.path.exists')
    def test_post_video_success(self, mock_exists, mock_file, mock_request):
        """Test post_video thành công"""
        mock_exists.return_value = True
        video_response = {"id": "video_123"}
        
        # Mock token verification
        mock_response_verify = MagicMock()
        mock_response_verify.json.return_value = {"id": "123", "name": "Test User"}
        mock_response_verify.raise_for_status.return_value = None
        
        # Mock post_video
        mock_response_video = MagicMock()
        mock_response_video.json.return_value = video_response
        mock_response_video.raise_for_status.return_value = None
        
        mock_request.side_effect = [mock_response_verify, mock_response_video]
        
        service = FacebookService(access_token=self.test_token)
        result = service.post_video("/fake/path/video.mp4", "Test description")
        
        self.assertEqual(result['id'], 'video_123')
        mock_exists.assert_called_with("/fake/path/video.mp4")
    
    @patch('services.facebook_service.requests.request')
    def test_send_message_success(self, mock_request):
        """Test send_message thành công"""
        message_response = {"message_id": "msg_123"}
        
        # Mock token verification
        mock_response_verify = MagicMock()
        mock_response_verify.json.return_value = {"id": "123", "name": "Test User"}
        mock_response_verify.raise_for_status.return_value = None
        
        # Mock send_message
        mock_response_msg = MagicMock()
        mock_response_msg.json.return_value = message_response
        mock_response_msg.raise_for_status.return_value = None
        
        mock_request.side_effect = [mock_response_verify, mock_response_msg]
        
        service = FacebookService(access_token=self.test_token)
        result = service.send_message("recipient_123", "Hello!")
        
        self.assertEqual(result['message_id'], 'msg_123')
    
    @patch('services.facebook_service.requests.request')
    def test_delete_post_success(self, mock_request):
        """Test delete_post thành công"""
        delete_response = {"success": True}
        
        # Mock token verification
        mock_response_verify = MagicMock()
        mock_response_verify.json.return_value = {"id": "123", "name": "Test User"}
        mock_response_verify.raise_for_status.return_value = None
        
        # Mock delete_post
        mock_response_delete = MagicMock()
        mock_response_delete.json.return_value = delete_response
        mock_response_delete.raise_for_status.return_value = None
        
        mock_request.side_effect = [mock_response_verify, mock_response_delete]
        
        service = FacebookService(access_token=self.test_token)
        result = service.delete_post("post_123")
        
        self.assertTrue(result)
    
    @patch('services.facebook_service.requests.request')
    def test_api_error_handling(self, mock_request):
        """Test xử lý lỗi API"""
        # Mock error response
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
    
    @patch('services.facebook_service.requests.request')
    def test_network_error_handling(self, mock_request):
        """Test xử lý lỗi network"""
        from requests.exceptions import ConnectionError
        mock_request.side_effect = ConnectionError("Network error")
        
        service = FacebookService.__new__(FacebookService)
        service.access_token = self.test_token
        service.api_version = "v18.0"
        service.base_url = "https://graph.facebook.com/v18.0"
        service.logger = MagicMock()
        
        with self.assertRaises(FacebookAPIError) as context:
            service._make_request('me')
        
        self.assertIn("Request error", str(context.exception))


class TestUtilityFunctions(unittest.TestCase):
    """Test cho các utility functions"""
    
    @patch.dict(os.environ, {'FACEBOOK_ACCESS_TOKEN': 'test_token'})
    @patch('services.facebook_service.requests.request')
    def test_create_facebook_service(self, mock_request):
        """Test create_facebook_service factory function"""
        mock_response = MagicMock()
        mock_response.json.return_value = {"id": "123", "name": "Test User"}
        mock_response.raise_for_status.return_value = None
        mock_request.return_value = mock_response
        
        service = create_facebook_service()
        
        self.assertIsInstance(service, FacebookService)
        self.assertEqual(service.access_token, 'test_token')
    
    @patch('services.facebook_service.requests.request')
    def test_validate_facebook_token_valid(self, mock_request):
        """Test validate_facebook_token với token hợp lệ"""
        mock_response = MagicMock()
        mock_response.json.return_value = {"id": "123", "name": "Test User"}
        mock_response.raise_for_status.return_value = None
        mock_request.return_value = mock_response
        
        result = validate_facebook_token("valid_token")
        
        self.assertTrue(result)
    
    @patch('services.facebook_service.requests.request')
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


class TestEnvironmentIntegration(unittest.TestCase):
    """Test tích hợp với environment variables"""
    
    def test_missing_env_file_should_fail(self):
        """Test rằng nếu không có token trong .env thì phải fail"""
        # Clear all environment variables
        with patch.dict(os.environ, {}, clear=True):
            with self.assertRaises(FacebookTokenError) as context:
                FacebookService()
            
            self.assertIn("FACEBOOK_ACCESS_TOKEN không được tìm thấy trong .env file", 
                         str(context.exception))
    
    @patch.dict(os.environ, {'FACEBOOK_ACCESS_TOKEN': ''})
    def test_empty_token_should_fail(self):
        """Test rằng token rỗng cũng phải fail"""
        with self.assertRaises(FacebookTokenError) as context:
            FacebookService()
        
        self.assertIn("FACEBOOK_ACCESS_TOKEN không được tìm thấy trong .env file", 
                     str(context.exception))


def run_facebook_service_tests():
    """Chạy tất cả tests cho Facebook Service"""
    print("🚀 Bắt đầu chạy unit tests cho Facebook Service")
    print("=" * 60)
    
    # Tạo test suite
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    
    # Thêm test cases
    suite.addTests(loader.loadTestsFromTestCase(TestFacebookService))
    suite.addTests(loader.loadTestsFromTestCase(TestUtilityFunctions))
    suite.addTests(loader.loadTestsFromTestCase(TestEnvironmentIntegration))
    
    # Chạy tests
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    # Tổng kết
    print("\n" + "=" * 60)
    print(f"📊 Tổng kết: {result.testsRun} tests")
    print(f"✅ Thành công: {result.testsRun - len(result.failures) - len(result.errors)}")
    print(f"❌ Thất bại: {len(result.failures)}")
    print(f"💥 Lỗi: {len(result.errors)}")
    
    if result.failures:
        print("\n🔍 Chi tiết lỗi thất bại:")
        for test, error in result.failures:
            print(f"- {test}: {error}")
    
    if result.errors:
        print("\n💥 Chi tiết lỗi hệ thống:")
        for test, error in result.errors:
            print(f"- {test}: {error}")
    
    return result.wasSuccessful()


if __name__ == "__main__":
    success = run_facebook_service_tests()
    sys.exit(0 if success else 1)