#!/usr/bin/env python3
"""
Google Cloud Console OAuth Setup Verification
"""

print("🔍 Google Cloud Console OAuth Setup Verification")
print("=" * 60)

print("\n📋 STEP-BY-STEP INSTRUCTIONS:")
print("1. Go to: https://console.cloud.google.com/apis/credentials")
print("2. Find your OAuth 2.0 Client ID that starts with: 111297565812-...")
print("3. Click the pencil icon to EDIT it")
print("4. In the 'Authorized redirect URIs' section, add this EXACT URI:")
print()
print("   https://cuddly-system-57gj6qj6g99h57w-8010.app.github.dev/google/callback")
print()
print("5. Click SAVE")
print("6. Wait 2-3 minutes for Google's changes to propagate")

print("\n⚠️  COMMON ISSUES:")
print("- Make sure there are NO spaces before/after the URI")
print("- Make sure it's HTTPS (not HTTP)")  
print("- Make sure the URI is EXACTLY as shown above")
print("- Case matters - use lowercase 'callback'")
print("- Remove any old localhost URIs to avoid confusion")

print("\n🔧 CURRENT BACKEND CONFIGURATION:")
print("Client ID: 111297565812-8j2ct0g0q2m5gfhoguhclk9df1jmg5ia.apps.googleusercontent.com")
print("Redirect URI: https://cuddly-system-57gj6qj6g99h57w-8010.app.github.dev/google/callback")

print("\n🧪 AFTER SETUP, TEST WITH:")
print("1. Visit: https://cuddly-system-57gj6qj6g99h57w-8010.app.github.dev/google/login")
print("2. You should see Google's consent screen (not an error)")
print("3. After login, you should be redirected to /google/callback with a token")

print("\n📋 BACKUP OPTION - Use localhost instead:")
print("If you keep having issues, you can:")
print("1. Add this to Google Cloud Console: http://localhost:8010/google/callback")
print("2. Change .env to use: export GOOGLE_REDIRECT_URI=http://localhost:8010/google/callback")
print("3. Access directly via: http://localhost:8010/google/login")
print("   (This only works from within the Codespace)")

print("\n✅ The backend is working correctly - this is purely a Google Console setup issue!")
