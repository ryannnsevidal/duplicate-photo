#!/usr/bin/env python3
"""
Firebase Console Setup Guide and Test Script
"""

import os
import json
import webbrowser

def main():
    print("🔥 Firebase Console Setup Guide")
    print("=" * 50)
    
    print("\n📋 STEP 1: Create Firebase Project")
    print("1. Go to: https://console.firebase.google.com/")
    print("2. Click 'Add project' or 'Create a project'")
    print("3. Enter project name: 'google-drive-duplicates' (or your choice)")
    print("4. Enable Google Analytics (optional)")
    print("5. Click 'Create project'")
    
    print("\n🔐 STEP 2: Enable Authentication")
    print("1. In Firebase Console, go to 'Authentication' → 'Get started'")
    print("2. Go to 'Sign-in method' tab")
    print("3. Enable 'Google' provider")
    print("4. Add your Google Client ID from Google Cloud Console")
    print("5. Set authorized domains (add your domain)")
    
    print("\n💾 STEP 3: Enable Firestore Database")
    print("1. Go to 'Firestore Database' → 'Create database'")
    print("2. Choose 'Start in test mode' (for development)")
    print("3. Select location (choose closest to your users)")
    print("4. Click 'Done'")
    
    print("\n🔑 STEP 4: Generate Service Account Key")
    print("1. Go to 'Project Settings' (gear icon)")
    print("2. Go to 'Service accounts' tab")
    print("3. Click 'Generate new private key'")
    print("4. Download the JSON file")
    print("5. Save it as 'firebase-service-account-key.json' in your project")
    
    print("\n🛡️ STEP 5: Configure Firestore Security Rules")
    print("Replace the default rules with:")
    print("""
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow authenticated users to read/write their own data
    match /user_sessions/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    match /drive_files/{fileId} {
      allow read, write: if request.auth != null && 
        resource.data.user_id == request.auth.uid;
    }
    
    match /duplicate_analysis/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}""")
    
    print("\n📝 STEP 6: Update Environment Variables")
    print("Add these to your .env file:")
    print("""
# Firebase Configuration
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_PRIVATE_KEY_PATH=./firebase-service-account-key.json
""")
    
    print("\n🧪 STEP 7: Test Firebase Integration")
    print("Run this command to test:")
    print("python test_firebase_integration.py")
    
    print("\n🔗 STEP 8: Connect with Google Cloud")
    print("1. Ensure both Firebase and Google Cloud use the same project")
    print("2. Firebase automatically enables required APIs")
    print("3. Use the same Google Client ID/Secret for both")
    
    print("\n📱 STEP 9: Frontend Integration (Optional)")
    print("For web frontend, add Firebase SDK:")
    print("""
// Firebase config (get from Firebase Console → Project Settings)
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};
""")
    
    print("\n✅ VERIFICATION CHECKLIST:")
    checklist = [
        "Firebase project created",
        "Authentication enabled with Google provider",
        "Firestore database created in test mode",
        "Service account key downloaded",
        "Security rules configured",
        "Environment variables set",
        "Firebase integration tested"
    ]
    
    for item in checklist:
        print(f"□ {item}")
    
    print("\n🚀 READY TO USE:")
    print("After completing these steps, your backend will have:")
    print("✅ Firebase Authentication")
    print("✅ Firestore Database for user data")
    print("✅ Automatic data sync")
    print("✅ Secure user sessions")
    print("✅ Cloud-based duplicate analysis storage")
    
    user_input = input("\nPress Enter to open Firebase Console, or 'q' to quit: ")
    
    if user_input.lower() != 'q':
        print("🌐 Opening Firebase Console...")
        webbrowser.open("https://console.firebase.google.com/")

if __name__ == "__main__":
    main()
