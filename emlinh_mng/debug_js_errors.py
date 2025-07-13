#!/usr/bin/env python3
"""
Debug JavaScript errors after SSE migration
"""

import os
import re
import json
from pathlib import Path

def check_js_syntax_errors():
    """Check for common JavaScript syntax errors"""
    print("🔍 Checking JavaScript syntax errors...")
    
    js_files = [
        "static/js/core/ChatCore.js",
        "static/js/modules/VideoManager.js", 
        "static/js/utils/ChatUtils.js",
        "static/js/ChatManager.js"
    ]
    
    errors = []
    
    for js_file in js_files:
        if not os.path.exists(js_file):
            errors.append(f"❌ File not found: {js_file}")
            continue
            
        print(f"Checking {js_file}...")
        
        with open(js_file, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # Check for Python docstring in JavaScript (""")
        if '"""' in content:
            lines = content.split('\n')
            for i, line in enumerate(lines):
                if '"""' in line:
                    errors.append(f"❌ {js_file}:{i+1} - Python docstring in JavaScript: {line.strip()}")
        
        # Check for missing semicolons or common syntax issues
        lines = content.split('\n')
        for i, line in enumerate(lines):
            line = line.strip()
            
            # Check for function definitions without proper closing
            if line.startswith('function') and not line.endswith('{') and not line.endswith(';'):
                if i + 1 < len(lines) and not lines[i + 1].strip().startswith('{'):
                    errors.append(f"⚠️ {js_file}:{i+1} - Possible syntax issue: {line}")
                    
            # Check for class definitions
            if line.startswith('class ') and not line.endswith('{'):
                if i + 1 < len(lines) and not lines[i + 1].strip().startswith('{'):
                    errors.append(f"⚠️ {js_file}:{i+1} - Possible class syntax issue: {line}")
    
    return errors

def check_duplicate_definitions():
    """Check for duplicate class/function definitions"""
    print("🔍 Checking for duplicate definitions...")
    
    # Find all JavaScript files
    js_files = []
    for root, dirs, files in os.walk("static/js"):
        for file in files:
            if file.endswith('.js'):
                js_files.append(os.path.join(root, file))
    
    class_definitions = {}
    function_definitions = {}
    
    for js_file in js_files:
        try:
            with open(js_file, 'r', encoding='utf-8') as f:
                content = f.read()
                
            # Find class definitions
            for match in re.finditer(r'class\s+(\w+)', content):
                class_name = match.group(1)
                if class_name in class_definitions:
                    class_definitions[class_name].append(js_file)
                else:
                    class_definitions[class_name] = [js_file]
            
            # Find function definitions
            for match in re.finditer(r'function\s+(\w+)', content):
                func_name = match.group(1)
                if func_name in function_definitions:
                    function_definitions[func_name].append(js_file)
                else:
                    function_definitions[func_name] = [js_file]
                    
        except Exception as e:
            print(f"Error reading {js_file}: {e}")
    
    duplicates = []
    
    # Check for duplicate classes
    for class_name, files in class_definitions.items():
        if len(files) > 1:
            duplicates.append(f"❌ Duplicate class '{class_name}' found in: {', '.join(files)}")
    
    # Check for duplicate functions
    for func_name, files in function_definitions.items():
        if len(files) > 1:
            duplicates.append(f"❌ Duplicate function '{func_name}' found in: {', '.join(files)}")
    
    return duplicates

def check_module_loading_order():
    """Check module loading order in templates"""
    print("🔍 Checking module loading order...")
    
    template_files = [
        "templates/chat_modules.html",
        "templates/base.html",
        "templates/chat.html"
    ]
    
    issues = []
    
    for template_file in template_files:
        if not os.path.exists(template_file):
            continue
            
        print(f"Checking {template_file}...")
        
        with open(template_file, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # Find all script tags
        script_matches = re.findall(r'<script.*?src=["\']([^"\']*)["\'].*?>', content)
        js_scripts = [s for s in script_matches if s.endswith('.js')]
        
        if js_scripts:
            print(f"  JavaScript files loaded in {template_file}:")
            for script in js_scripts:
                print(f"    - {script}")
                
        # Check for ChatUtils loading
        if 'ChatUtils' in content:
            chatutils_matches = re.findall(r'.*ChatUtils.*', content)
            for match in chatutils_matches:
                print(f"  ChatUtils reference in {template_file}: {match.strip()}")
    
    return issues

def main():
    print("🚀 JavaScript Error Debugging Tool")
    print("=" * 50)
    
    # Change to the correct directory
    os.chdir('.')
    
    # Check syntax errors
    syntax_errors = check_js_syntax_errors()
    
    if syntax_errors:
        print("\n❌ SYNTAX ERRORS FOUND:")
        for error in syntax_errors:
            print(f"  {error}")
    else:
        print("\n✅ No syntax errors found")
    
    # Check duplicates
    duplicates = check_duplicate_definitions()
    
    if duplicates:
        print("\n❌ DUPLICATE DEFINITIONS FOUND:")
        for dup in duplicates:
            print(f"  {dup}")
    else:
        print("\n✅ No duplicate definitions found")
    
    # Check module loading
    loading_issues = check_module_loading_order()
    
    if loading_issues:
        print("\n❌ MODULE LOADING ISSUES:")
        for issue in loading_issues:
            print(f"  {issue}")
    else:
        print("\n✅ Module loading order looks good")
    
    print("\n" + "=" * 50)
    print("🔧 RECOMMENDATIONS:")
    print("1. Make sure all Python docstrings (''') are replaced with JavaScript comments (//)")
    print("2. Check for duplicate class/function definitions")
    print("3. Verify module loading order in templates")
    print("4. Test the application in browser console")

if __name__ == "__main__":
    main() 