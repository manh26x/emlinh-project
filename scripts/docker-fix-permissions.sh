#!/bin/bash

# Docker Container Permission Fix Script
# This script fixes permissions inside Docker container

set -e

echo "🔧 Fixing permissions for emlinh project in Docker container..."

# Set workspace root
WORKSPACE_ROOT=${WORKSPACE_ROOT:-/app}

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}📁 Creating necessary directories...${NC}"

# Create necessary directories with proper permissions
mkdir -p "${WORKSPACE_ROOT}/emlinh-remotion/out"
mkdir -p "${WORKSPACE_ROOT}/emlinh-remotion/public/audios"
mkdir -p "${WORKSPACE_ROOT}/emlinh_mng/instance"
mkdir -p "/tmp/emlinh_audio"

# Fix ownership if running as root
if [ "$(id -u)" = "0" ]; then
    echo -e "${YELLOW}👑 Running as root, fixing ownership...${NC}"
    chown -R app:app "${WORKSPACE_ROOT}" 2>/dev/null || true
    chown -R app:app "/tmp/emlinh_audio" 2>/dev/null || true
fi

# Set proper permissions
echo -e "${YELLOW}🔐 Setting proper permissions...${NC}"
chmod -R 755 "${WORKSPACE_ROOT}/emlinh-remotion/out" 2>/dev/null || true
chmod -R 755 "${WORKSPACE_ROOT}/emlinh-remotion/public/audios" 2>/dev/null || true
chmod -R 755 "/tmp/emlinh_audio" 2>/dev/null || true

# Test write permissions
echo -e "${YELLOW}🔍 Testing write permissions...${NC}"
test_dirs=(
    "${WORKSPACE_ROOT}/emlinh-remotion/out"
    "${WORKSPACE_ROOT}/emlinh-remotion/public/audios"
    "/tmp/emlinh_audio"
)

for dir in "${test_dirs[@]}"; do
    if touch "${dir}/.test_write" 2>/dev/null; then
        rm "${dir}/.test_write" 2>/dev/null || true
        echo -e "${GREEN}✅ Write test successful for ${dir}${NC}"
    else
        echo -e "${YELLOW}⚠️ Write test failed for ${dir}${NC}"
    fi
done

echo -e "${GREEN}🎉 Permissions fixed successfully!${NC}" 