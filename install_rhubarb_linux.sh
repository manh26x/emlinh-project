#!/bin/bash
# Script cài đặt Rhubarb Lip Sync trên Linux
# Chạy với: sudo ./install_rhubarb_linux.sh

set -e

echo "🎤 Installing Rhubarb Lip Sync on Linux..."

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ This script must be run as root (use sudo)"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
apt-get update
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

# Verify installation
echo "✅ Verifying installation..."
if command -v rhubarb &> /dev/null; then
    echo "✅ Rhubarb installed successfully!"
    echo "📍 Location: $(which rhubarb)"
    echo "📋 Version: $(rhubarb --version 2>/dev/null || echo 'version info not available')"
else
    echo "❌ Rhubarb installation failed"
    exit 1
fi

echo "🎉 Rhubarb Lip Sync installation completed!" 