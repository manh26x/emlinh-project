#!/usr/bin/env python3
"""
Unit tests đơn giản cho Facebook Service
Test các chức năng cơ bản mà không phụ thuộc vào các service khác
"""

import unittest
import os
import sys
from unittest.mock import patch, MagicMock

# Thêm thư mục src vào Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

# Import trực tiếp FacebookService 
from services.facebook_service import (
    FacebookService, 
    FacebookTokenError, 
    FacebookAPIError,
    create_facebook_service,
    validate_facebook_token
)


class TestFacebookServiceSimple(unittest.TestCase):
    """Test class đơn giản cho FacebookService"""
    
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
    @patch('services.facebook_service.requests.request')
    def test_init_with_token_success(self, mock_request):
        """Test khởi tạo FacebookService thành công"""
        # Mock successful token verification
        mock_response = MagicMock()
        mock_response.json.return_value = {"id": "123", "name": "Test User"}
        mock_response.raise_for_status.return_value = None
        mock_request.return_value = mock_response
        
        service = FacebookService()
        
        self.assertEqual(service.access_token, 'test_token_123')
        self.assertEqual(service.api_version, 'v18.0')
    
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
    
    @patch('services.facebook_service.requests.request') 
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


def run_simple_facebook_tests():
    """Chạy tests đơn giản cho Facebook Service"""
    print("🚀 Bắt đầu chạy unit tests đơn giản cho Facebook Service")
    print("=" * 60)
    
    # Tạo test suite
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    
    # Thêm test cases
    suite.addTests(loader.loadTestsFromTestCase(TestFacebookServiceSimple))
    
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
    success = run_simple_facebook_tests()
    sys.exit(0 if success else 1)