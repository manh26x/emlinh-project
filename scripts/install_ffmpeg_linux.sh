#!/bin/bash
# Script cài đặt FFmpeg trên Linux
# Chạy với: sudo ./install_ffmpeg_linux.sh

set -e

echo "🎬 Installing FFmpeg on Linux..."

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ This script must be run as root (use sudo)"
    exit 1
fi

# Install FFmpeg
echo "📦 Installing FFmpeg..."
apt-get update
apt-get install -y ffmpeg

# Verify installation
echo "✅ Verifying installation..."
if command -v ffmpeg &> /dev/null; then
    echo "✅ FFmpeg installed successfully!"
    echo "📍 Location: $(which ffmpeg)"
    echo "📋 Version: $(ffmpeg -version | head -n1)"
else
    echo "❌ FFmpeg installation failed"
    exit 1
fi

# Check ffprobe
if command -v ffprobe &> /dev/null; then
    echo "✅ FFprobe also available: $(which ffprobe)"
else
    echo "⚠️ FFprobe not found - audio duration detection may fail"
fi

echo "🎉 FFmpeg installation completed!" 