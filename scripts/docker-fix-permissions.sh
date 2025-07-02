#!/bin/bash

# Docker Container Permission Fix Script
# This script fixes permissions inside Docker container

set -e

# Check if we're actually running in a Docker container
if [ ! -f /.dockerenv ]; then
    echo "❌ This script is designed to run inside Docker containers only!"
    echo "ℹ️ Use scripts/fix-permissions.sh for host environment instead."
    exit 1
fi

echo "🔧 Fixing permissions for emlinh project in Docker container..."

# Set workspace root for Docker container
WORKSPACE_ROOT=${WORKSPACE_ROOT:-/app}

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}📁 Creating necessary directories (only if they don't exist)...${NC}"

# Create necessary directories with proper permissions - only if paths are safe
if [ -w "$(dirname "${WORKSPACE_ROOT}")" ] 2>/dev/null; then
    mkdir -p "${WORKSPACE_ROOT}/emlinh-remotion/out" 2>/dev/null || echo "⚠️ Could not create out directory"
    mkdir -p "${WORKSPACE_ROOT}/emlinh-remotion/public/audios" 2>/dev/null || echo "⚠️ Could not create audios directory"
    mkdir -p "${WORKSPACE_ROOT}/emlinh_mng/instance" 2>/dev/null || echo "⚠️ Could not create instance directory"
else
    echo "⚠️ Workspace root directory not writable, skipping directory creation"
fi

# Only create temp directory if /tmp is writable
if [ -w "/tmp" ] 2>/dev/null; then
    mkdir -p "/tmp/emlinh_audio" 2>/dev/null || echo "⚠️ Could not create temp audio directory"
else
    echo "⚠️ /tmp not writable, skipping temp directory creation"
fi

# Fix ownership if running as root
if [ "$(id -u)" = "0" ]; then
    echo -e "${YELLOW}👑 Running as root, fixing ownership...${NC}"
    chown -R app:app "${WORKSPACE_ROOT}" 2>/dev/null || true
    chown -R app:app "/tmp/emlinh_audio" 2>/dev/null || true
fi

# Set proper permissions only for existing directories
echo -e "${YELLOW}🔐 Setting proper permissions for existing directories...${NC}"
[ -d "${WORKSPACE_ROOT}/emlinh-remotion/out" ] && chmod -R 755 "${WORKSPACE_ROOT}/emlinh-remotion/out" 2>/dev/null || true
[ -d "${WORKSPACE_ROOT}/emlinh-remotion/public/audios" ] && chmod -R 755 "${WORKSPACE_ROOT}/emlinh-remotion/public/audios" 2>/dev/null || true
[ -d "/tmp/emlinh_audio" ] && chmod -R 755 "/tmp/emlinh_audio" 2>/dev/null || true

# Test write permissions only for existing directories
echo -e "${YELLOW}🔍 Testing write permissions for existing directories...${NC}"
test_dirs=(
    "${WORKSPACE_ROOT}/emlinh-remotion/out"
    "${WORKSPACE_ROOT}/emlinh-remotion/public/audios"
    "/tmp/emlinh_audio"
)

for dir in "${test_dirs[@]}"; do
    if [ -d "$dir" ]; then
        if touch "${dir}/.test_write" 2>/dev/null; then
            rm "${dir}/.test_write" 2>/dev/null || true
            echo -e "${GREEN}✅ Write test successful for ${dir}${NC}"
        else
            echo -e "${YELLOW}⚠️ Write test failed for ${dir}${NC}"
        fi
    else
        echo -e "${YELLOW}ℹ️ Directory ${dir} does not exist, skipping write test${NC}"
    fi
done

echo -e "${GREEN}🎉 Permissions fixed successfully!${NC}" 