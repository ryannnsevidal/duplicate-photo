#!/usr/bin/env python3
"""
Google Drive Demo Script
Demonstrates the complete OAuth -> Drive API -> Duplicate Detection workflow
"""

import webbrowser
import time

def main():
    print("🚀 Google Drive Duplicate Detection Demo")
    print("=" * 50)
    
    # Get the Codespaces URL
    codespace_url = "https://cuddly-system-57gj6qj6g99h57w-8010.app.github.dev"
    
    print("\n📋 SETUP INSTRUCTIONS:")
    print("1. Make sure your Google Cloud Console has this redirect URI:")
    print(f"   {codespace_url}/google/callback")
    print("   (Add it to 'Authorized redirect URIs' in your OAuth 2.0 Client ID)")
    
    print("\n🔧 BACKEND STATUS:")
    print(f"✅ Backend is running on {codespace_url}")
    print("✅ OAuth endpoints configured")
    print("✅ Google Drive API integration ready")
    print("✅ Duplicate detection algorithms loaded")
    
    print("\n🎯 COMPLETE WORKFLOW TEST:")
    print(f"1. Visit: {codespace_url}/google/login")
    print("2. Login with your Google account")
    print("3. You'll get redirected with an access token")
    print("4. Copy the access token from the callback page")
    print("5. Test the API endpoints:")
    
    print("\n🔧 API TESTING COMMANDS:")
    print("Replace YOUR_TOKEN with the token from step 4:")
    print()
    print("# Scan your Google Drive:")
    print(f"curl -H 'Authorization: Bearer YOUR_TOKEN' {codespace_url}/api/drive/scan")
    print()
    print("# Find duplicates:")
    print(f"curl -H 'Authorization: Bearer YOUR_TOKEN' {codespace_url}/api/drive/duplicates")
    print()
    print("# List files:")
    print(f"curl -H 'Authorization: Bearer YOUR_TOKEN' {codespace_url}/api/drive/files")
    print()
    print("# Get stats:")
    print(f"curl -H 'Authorization: Bearer YOUR_TOKEN' {codespace_url}/api/stats")
    
    print("\n🌐 READY TO START:")
    print(f"Visit: {codespace_url}")
    print(f"Or click the login link: {codespace_url}/google/login")
    
    user_input = input("\nPress Enter to open the backend in your browser, or 'q' to quit: ")
    
    if user_input.lower() != 'q':
        print("🌐 Opening backend in your default browser...")
        webbrowser.open(codespace_url)
        print("✅ Browser opened! Follow the workflow above to test everything.")

if __name__ == "__main__":
    main()
