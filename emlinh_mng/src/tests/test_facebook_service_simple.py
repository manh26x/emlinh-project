#!/usr/bin/env python3
"""
Unit tests đơn giản cho Facebook Service
"""

import unittest
import os
import sys
from unittest.mock import patch, MagicMock

# Thêm thư mục src vào Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

# Import trực tiếp từ file facebook_service thay vì qua services package
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'services'))
from facebook_service import (
    FacebookService, 
    FacebookTokenError, 
    FacebookAPIError,
    validate_facebook_token
)


class TestFacebookServiceSimple(unittest.TestCase):
    """Test class đơn giản cho FacebookService"""
    
    def setUp(self):
        """Setup cho mỗi test case"""
        self.test_token = "test_access_token_123"
    
    @patch.dict(os.environ, {}, clear=True)
    def test_init_without_token_should_raise_error(self):
        """Test khởi tạo FacebookService khi không có token trong .env"""
        with self.assertRaises(FacebookTokenError) as context:
            FacebookService()
        
        self.assertIn("FACEBOOK_ACCESS_TOKEN không được tìm thấy trong .env file", str(context.exception))
    
    @patch('facebook_service.requests.request')
    def test_validate_facebook_token_valid(self, mock_request):
        """Test validate_facebook_token với token hợp lệ"""
        mock_response = MagicMock()
        mock_response.json.return_value = {"id": "123", "name": "Test User"}
        mock_response.raise_for_status.return_value = None
        mock_request.return_value = mock_response
        
        result = validate_facebook_token("valid_token")
        
        self.assertTrue(result)


if __name__ == "__main__":
    print("🚀 Chạy unit tests cho Facebook Service")
    unittest.main(verbosity=2)
