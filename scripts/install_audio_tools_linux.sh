#!/bin/bash
# Script cài đặt FFmpeg và Rhubarb Lip Sync trên Linux
# Chạy với: sudo ./install_audio_tools_linux.sh

set -e

echo "🎵 Installing Audio Tools on Linux..."
echo "📅 Installation time: $(date)"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ This script must be run as root (use sudo)"
    exit 1
fi

# Install FFmpeg
echo "🎬 Installing FFmpeg..."
apt-get update
apt-get install -y ffmpeg

# Verify FFmpeg installation
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

echo ""

# Install Rhubarb Lip Sync
echo "🎤 Installing Rhubarb Lip Sync..."

# Install dependencies for Rhubarb
echo "📦 Installing Rhubarb dependencies..."
apt-get install -y wget unzip

# Download and install Rhubarb
echo "📥 Downloading Rhubarb Lip Sync..."
cd /tmp
wget https://github.com/DanielSWolf/rhubarb-lip-sync/releases/download/v1.13.0/rhubarb-lip-sync-1.13.0-linux.zip

echo "📦 Extracting Rhubarb..."
unzip rhubarb-lip-sync-1.13.0-linux.zip

echo "🔧 Setting up Rhubarb..."
find . -name "rhubarb" -type f -exec chmod +x {} \;
find . -name "rhubarb" -type f -exec ln -sf {} /usr/local/bin/rhubarb \;

echo "🧹 Cleaning up..."
rm rhubarb-lip-sync-1.13.0-linux.zip

# Verify Rhubarb installation
if command -v rhubarb &> /dev/null; then
    echo "✅ Rhubarb installed successfully!"
    echo "📍 Location: $(which rhubarb)"
    echo "📋 Version: $(rhubarb --version 2>/dev/null || echo 'version info not available')"
else
    echo "❌ Rhubarb installation failed"
    exit 1
fi

echo ""
echo "🎉 All audio tools installed successfully!"
echo "✅ FFmpeg: $(which ffmpeg)"
echo "✅ FFprobe: $(which ffprobe)"
echo "✅ Rhubarb: $(which rhubarb)"
echo ""
echo "🚀 Audio processing tools are ready for use!" 