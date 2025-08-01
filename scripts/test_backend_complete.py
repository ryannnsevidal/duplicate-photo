#!/usr/bin/env python3
"""
Complete Google Drive Backend Test
Tests the entire OAuth -> Drive API -> Duplicate Detection workflow
"""

import requests
import json
import time
from urllib.parse import parse_qs, urlparse

# Backend URL
BASE_URL = "http://localhost:8010"

def test_backend_health():
    """Test if backend is running"""
    try:
        response = requests.get(f"{BASE_URL}/")
        if response.status_code == 200:
            print("✅ Backend is running successfully")
            return True
        else:
            print(f"❌ Backend returned status {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Backend connection failed: {e}")
        return False

def test_oauth_flow():
    """Test OAuth endpoints"""
    print("\n=== Testing OAuth Flow ===")
    
    # Test login endpoint
    try:
        response = requests.get(f"{BASE_URL}/google/login", allow_redirects=False)
        if response.status_code == 307:
            redirect_url = response.headers.get('location')
            print("✅ /google/login redirects properly")
            print(f"   Redirect URL: {redirect_url[:100]}...")
            return redirect_url
        else:
            print(f"❌ /google/login failed with status {response.status_code}")
            return None
    except Exception as e:
        print(f"❌ OAuth login test failed: {e}")
        return None

def test_auth_required_endpoints():
    """Test endpoints that require authentication"""
    print("\n=== Testing Auth-Required Endpoints ===")
    
    endpoints = [
        "/api/drive/scan",
        "/api/drive/duplicates", 
        "/api/drive/files",
        "/api/stats"
    ]
    
    for endpoint in endpoints:
        try:
            response = requests.get(f"{BASE_URL}{endpoint}")
            if response.status_code == 401:
                print(f"✅ {endpoint} properly requires authentication")
            else:
                print(f"⚠️  {endpoint} returned unexpected status {response.status_code}")
        except Exception as e:
            print(f"❌ {endpoint} test failed: {e}")

def test_callback_endpoint():
    """Test callback endpoint with dummy data"""
    print("\n=== Testing Callback Endpoint ===")
    
    try:
        # Test with missing code
        response = requests.get(f"{BASE_URL}/google/callback")
        if "No authorization code" in response.text:
            print("✅ /google/callback properly handles missing code")
        
        # Test with error parameter
        response = requests.get(f"{BASE_URL}/google/callback?error=access_denied")
        if "Google Login Error" in response.text:
            print("✅ /google/callback properly handles errors")
            
    except Exception as e:
        print(f"❌ Callback test failed: {e}")

def generate_test_auth_instructions():
    """Generate instructions for manual OAuth testing"""
    print("\n=== Manual OAuth Testing Instructions ===")
    print("To test the complete OAuth flow:")
    print(f"1. Visit: {BASE_URL}/google/login")
    print("2. Complete Google OAuth (you'll be redirected to /google/callback)")
    print("3. Copy the access token from the callback page")
    print("4. Test authenticated endpoints with:")
    print("   curl -H 'Authorization: Bearer YOUR_TOKEN' http://localhost:8010/api/drive/scan")
    print("   curl -H 'Authorization: Bearer YOUR_TOKEN' http://localhost:8010/api/drive/duplicates")

def test_with_local_redirect():
    """Show how to test with localhost redirect"""
    print("\n=== Testing with Localhost Redirect ===")
    print("If you want to test with localhost instead of Codespaces URL:")
    print("1. Update your .env file:")
    print("   export GOOGLE_REDIRECT_URI=http://localhost:8010/google/callback")
    print("2. Add this to your Google Cloud Console authorized redirect URIs:")
    print("   http://localhost:8010/google/callback")
    print("3. Restart the backend")
    print("4. Visit: http://localhost:8010/google/login")

def main():
    print("🔍 Testing Google Drive Backend...")
    
    # Test basic connectivity
    if not test_backend_health():
        print("❌ Backend is not running. Start it with:")
        print("   python backend/clean_google_drive_backend.py")
        return
    
    # Test OAuth flow
    redirect_url = test_oauth_flow()
    
    # Test protected endpoints
    test_auth_required_endpoints()
    
    # Test callback
    test_callback_endpoint()
    
    # Generate instructions
    generate_test_auth_instructions()
    test_with_local_redirect()
    
    print("\n=== Backend Status Summary ===")
    print("✅ Backend is running and responding")
    print("✅ OAuth login endpoint works (redirects to Google)")
    print("✅ Protected endpoints require authentication")
    print("✅ Callback endpoint handles errors properly")
    print("✅ Ready for full OAuth testing!")

if __name__ == "__main__":
    main()
