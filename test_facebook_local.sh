#!/bin/bash

# 🧪 Facebook Service Local Test Script
# Script này chạy toàn bộ Facebook Service tests local

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Facebook Service Local Test Suite${NC}"
echo -e "${GREEN}=====================================${NC}"

# Set test environment variables
export FACEBOOK_ACCESS_TOKEN="test_token_local_script"
export FACEBOOK_API_VERSION="v18.0"
export PYTHONPATH="emlinh_mng/src:$PYTHONPATH"

# Navigate to project directory
cd emlinh_mng

echo -e "\n${YELLOW}📋 Test Environment:${NC}"
echo -e "   • FACEBOOK_ACCESS_TOKEN: $FACEBOOK_ACCESS_TOKEN"
echo -e "   • FACEBOOK_API_VERSION: $FACEBOOK_API_VERSION"
echo -e "   • PYTHONPATH: $PYTHONPATH"

echo -e "\n${YELLOW}🔧 Activating virtual environment...${NC}"
if [ -f "venv/bin/activate" ]; then
    source venv/bin/activate
    echo -e "${GREEN}✅ Virtual environment activated${NC}"
else
    echo -e "${RED}❌ Virtual environment not found. Creating...${NC}"
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    echo -e "${GREEN}✅ Virtual environment created and dependencies installed${NC}"
fi

echo -e "\n${YELLOW}🧪 Running Facebook Service Tests...${NC}"

# Test 1: Simple Tests
echo -e "\n${YELLOW}Test 1: Simple Unit Tests${NC}"
python src/tests/test_facebook_service_simple.py
echo -e "${GREEN}✅ Simple tests passed${NC}"

# Test 2: Complete Tests
echo -e "\n${YELLOW}Test 2: Complete Unit Tests${NC}"
python src/tests/test_facebook_complete.py
echo -e "${GREEN}✅ Complete tests passed${NC}"

# Test 3: Import Tests
echo -e "\n${YELLOW}Test 3: Import Tests${NC}"
python -c "
import sys
sys.path.insert(0, 'src/services')
from facebook_service import FacebookService, create_facebook_service, validate_facebook_token
print('✅ All imports successful')
"

# Test 4: Configuration Tests
echo -e "\n${YELLOW}Test 4: Configuration Tests${NC}"
python -c "
import sys
sys.path.insert(0, 'src')
from app.config import Config
assert hasattr(Config, 'FACEBOOK_ACCESS_TOKEN'), 'Missing FACEBOOK_ACCESS_TOKEN'
assert hasattr(Config, 'FACEBOOK_API_VERSION'), 'Missing FACEBOOK_API_VERSION' 
assert hasattr(Config, 'FACEBOOK_BASE_URL'), 'Missing FACEBOOK_BASE_URL'
print('✅ Configuration tests passed')
print(f'   • API Version: {Config.FACEBOOK_API_VERSION}')
print(f'   • Base URL: {Config.FACEBOOK_BASE_URL}')
"

# Test 5: Error Handling Tests
echo -e "\n${YELLOW}Test 5: Error Handling Tests${NC}"
python -c "
import sys
import os
from unittest.mock import patch
sys.path.insert(0, 'src/services')

from facebook_service import FacebookService, FacebookTokenError, FacebookAPIError

# Test missing token error
with patch.dict(os.environ, {}, clear=True):
    try:
        FacebookService()
        assert False, 'Should have raised FacebookTokenError'
    except FacebookTokenError:
        pass

# Test exception classes
assert issubclass(FacebookTokenError, Exception)
assert issubclass(FacebookAPIError, Exception)

print('✅ Error handling tests passed')
"

echo -e "\n${GREEN}🎉 ===============================${NC}"
echo -e "${GREEN}   ALL FACEBOOK SERVICE TESTS PASSED!${NC}"
echo -e "${GREEN}   ===============================${NC}"

echo -e "\n${YELLOW}📊 Test Summary:${NC}"
echo -e "   ✅ Simple Unit Tests: PASSED"
echo -e "   ✅ Complete Unit Tests: PASSED"  
echo -e "   ✅ Import Tests: PASSED"
echo -e "   ✅ Configuration Tests: PASSED"
echo -e "   ✅ Error Handling Tests: PASSED"

echo -e "\n${GREEN}🚀 FacebookService is ready for production!${NC}"
echo -e "${GREEN}📝 You can now merge your PR safely.${NC}"

# Deactivate virtual environment
deactivate 2>/dev/null || true

echo -e "\n${YELLOW}💡 To run these tests using Makefile:${NC}"
echo -e "   make test-facebook"
echo -e "   make test-facebook-ci" 