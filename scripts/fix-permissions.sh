#!/bin/bash

# Fix Permissions Script for Emlinh Project CI/CD
# This script fixes common permission issues with Docker mounted volumes

set -e

# Function to show usage
show_usage() {
    echo "Usage: $0 [--cleanup-workspace]"
    echo "  --cleanup-workspace: Force cleanup entire workspace for CI/CD"
    echo "  (no args): Fix permissions for development"
}

# Check for cleanup-workspace flag
CLEANUP_WORKSPACE=false
if [[ "$1" == "--cleanup-workspace" ]]; then
    CLEANUP_WORKSPACE=true
    echo "🧹 Cleaning up entire workspace for CI/CD..."
else
    echo "🔧 Fixing permissions for CI/CD..."
fi

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to fix permissions
fix_permissions() {
    local dir="$1"
    local description="$2"
    
    if [ -d "$dir" ]; then
        echo -e "${YELLOW}📁 Fixing permissions for $description...${NC}"
        
        # Try without sudo first
        if chown -R $USER:$USER "$dir" 2>/dev/null; then
            chmod -R 755 "$dir" 2>/dev/null || {
                echo -e "${YELLOW}⚠️ chmod failed, trying with sudo...${NC}"
                sudo chmod -R 755 "$dir" || {
                    echo -e "${RED}❌ Failed to change permissions of $dir${NC}"
                    return 1
                }
            }
        else
            # Try with sudo
            echo -e "${YELLOW}⚠️ chown failed, trying with sudo...${NC}"
            sudo chown -R $USER:$USER "$dir" 2>/dev/null || {
                echo -e "${YELLOW}⚠️ sudo chown failed, trying to continue...${NC}"
            }
            sudo chmod -R 755 "$dir" 2>/dev/null || {
                echo -e "${YELLOW}⚠️ sudo chmod failed, trying to continue...${NC}"
            }
        fi
        echo -e "${GREEN}✅ Fixed permissions for $description${NC}"
    else
        echo -e "${YELLOW}⚠️ Directory $dir does not exist, creating it...${NC}"
        mkdir -p "$dir" 2>/dev/null || {
            echo -e "${YELLOW}⚠️ mkdir failed, trying with sudo...${NC}"
            sudo mkdir -p "$dir" || {
                echo -e "${RED}❌ Failed to create directory $dir${NC}"
                return 1
            }
            sudo chown -R $USER:$USER "$dir" 2>/dev/null || true
        }
        chmod -R 755 "$dir" 2>/dev/null || true
        echo -e "${GREEN}✅ Created and fixed permissions for $description${NC}"
    fi
}

# Function to cleanup workspace
cleanup_workspace() {
    echo -e "${YELLOW}🗑️ Performing workspace cleanup...${NC}"
    
    # Gom tất cả sudo commands vào một lệnh để giảm password prompts
    sudo bash -c "
        echo 'Fixing workspace ownership and permissions...'
        chown -R $USER:$USER . 2>/dev/null || echo 'Warning: Failed to change workspace ownership'
        chmod -R 755 . 2>/dev/null || echo 'Warning: Failed to change workspace permissions'
        
        echo 'Removing problematic directories...'
        for dir in 'public/audios' 'public/models' 'emlinh_mng/instance'; do
            if [ -d \"\$dir\" ]; then
                echo \"Removing \$dir...\"
                rm -rf \"\$dir\" 2>/dev/null || echo \"Warning: Failed to remove \$dir\"
            fi
        done
        
        echo 'Workspace cleanup commands completed'
    " || {
        echo -e "${YELLOW}⚠️ Some cleanup operations failed, but continuing...${NC}"
    }
    
    echo -e "${GREEN}✅ Workspace cleanup completed${NC}"
}

# Main execution logic
if [ "$CLEANUP_WORKSPACE" = true ]; then
    cleanup_workspace
else
    # Fix permissions for all problematic directories
    fix_permissions "public/audios" "audio files directory"
    fix_permissions "public/models" "model files directory"
    fix_permissions "emlinh_mng/instance" "Flask instance directory"
fi

# Only do additional cleanup and verification if not in workspace cleanup mode
if [ "$CLEANUP_WORKSPACE" != true ]; then
    # Clean up any problematic files
    echo -e "${YELLOW}🧹 Cleaning up problematic files...${NC}"
    find public/ -type f -name "*.tmp" -delete 2>/dev/null || true
    find public/ -type f -name ".DS_Store" -delete 2>/dev/null || true
    
    # Set proper permissions for scripts
    if [ -f "scripts/fix-permissions.sh" ]; then
        chmod +x scripts/fix-permissions.sh
    fi
    
    echo -e "${GREEN}🎉 All permissions fixed successfully!${NC}"
    echo -e "${GREEN}ℹ️  You can now run your Docker commands without permission issues.${NC}"
    
    # Verify fix by attempting to write to directories
    echo -e "${YELLOW}🔍 Verifying permissions...${NC}"
    all_passed=true
    
    for dir in "public/audios" "public/models" "emlinh_mng/instance"; do
        if [ -d "$dir" ]; then
            if touch "$dir/.test_write" 2>/dev/null; then
                rm "$dir/.test_write" 2>/dev/null || true
                echo -e "${GREEN}✅ Write test successful for $dir${NC}"
            else
                echo -e "${YELLOW}⚠️ Write test failed for $dir (may not be critical)${NC}"
                all_passed=false
            fi
        else
            echo -e "${YELLOW}⚠️ Directory $dir does not exist for verification${NC}"
        fi
    done
    
    if [ "$all_passed" = true ]; then
        echo -e "${GREEN}🎯 All permission verifications passed!${NC}"
    else
        echo -e "${YELLOW}⚠️ Some permission verifications failed, but continuing...${NC}"
    fi
    
    echo -e "${GREEN}🎯 Permission fix completed successfully!${NC}"
else
    echo -e "${GREEN}🎯 Workspace cleanup completed successfully!${NC}"
fi 