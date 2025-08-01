"""
Clean Google Drive Duplicate Detection Backend
Full OAuth2 authentication and Google Drive integration
"""

import os
import re
import json
import sqlite3
import hashlib
import requests
from typing import Optional
from urllib.parse import urlencode

from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.responses import HTMLResponse, RedirectResponse, JSONResponse
from fastapi.security import OAuth2PasswordBearer
from fastapi.middleware.cors import CORSMiddleware

import google.auth.transport.requests
import google.oauth2.credentials
from googleapiclient.discovery import build

# Load environment variables
import dotenv
dotenv.load_dotenv()

# OAuth2 Configuration
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "your-google-client-id")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "your-google-client-secret")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8010/google/callback")

# Database setup
DATABASE_FILE = "google_drive_duplicates.db"

def init_database():
    """Initialize the database for storing Google Drive file metadata"""
    conn = sqlite3.connect(DATABASE_FILE)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS drive_files (
            id TEXT PRIMARY KEY,
            name TEXT,
            size INTEGER,
            mimeType TEXT,
            md5Checksum TEXT,
            createdTime TEXT,
            modifiedTime TEXT,
            webViewLink TEXT,
            user_email TEXT
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS user_sessions (
            user_email TEXT PRIMARY KEY,
            access_token TEXT,
            refresh_token TEXT,
            token_expiry TEXT
        )
    ''')
    conn.commit()
    conn.close()

# Initialize FastAPI app
app = FastAPI(title="Google Drive Duplicate Detection", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database on startup
init_database()

# Simple in-memory session storage (use Redis/DB in production)
user_sessions = {}

@app.get("/")
async def root():
    """Root endpoint with navigation"""
    return HTMLResponse("""
    <html>
        <head><title>Google Drive Duplicate Detection</title></head>
        <body>
            <h1>Google Drive Duplicate Detection System</h1>
            <h2>Getting Started:</h2>
            <ol>
                <li><a href="/google/login">1. Login with Google</a></li>
                <li><a href="/api/drive/scan">2. Scan Google Drive for files</a></li>
                <li><a href="/api/drive/duplicates">3. Find duplicates</a></li>
            </ol>
            <h2>API Documentation:</h2>
            <ul>
                <li><a href="/docs">OpenAPI Documentation</a></li>
                <li><a href="/test-auth">Test Authentication Status</a></li>
            </ul>
        </body>
    </html>
    """)

@app.get("/google/login")
async def google_login():
    """Initiate Google OAuth2 login flow"""
    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile https://www.googleapis.com/auth/drive.readonly",
        "access_type": "offline",
        "prompt": "consent"
    }
    auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"
    return RedirectResponse(auth_url)

@app.get("/google/callback", response_class=HTMLResponse)
async def google_callback(code: str = None, error: str = None):
    """Handle Google OAuth2 callback"""
    if error:
        return f"<h2>Google Login Error</h2><pre>{error}</pre>"
    
    if not code:
        return "<h2>No authorization code provided</h2>"
    
    # Exchange code for tokens
    token_url = "https://oauth2.googleapis.com/token"
    data = {
        "code": code,
        "client_id": GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "grant_type": "authorization_code"
    }
    
    response = requests.post(token_url, data=data)
    if response.status_code != 200:
        return f"<h2>Token Exchange Failed</h2><pre>{response.text}</pre>"
    
    tokens = response.json()
    access_token = tokens.get("access_token")
    refresh_token = tokens.get("refresh_token")
    
    # Get user info
    user_info_url = f"https://www.googleapis.com/oauth2/v1/userinfo?access_token={access_token}"
    user_response = requests.get(user_info_url)
    user_data = user_response.json()
    user_email = user_data.get("email")
    
    # Store session
    user_sessions[user_email] = {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user_info": user_data
    }
    
    # Store in database
    conn = sqlite3.connect(DATABASE_FILE)
    cursor = conn.cursor()
    cursor.execute('''
        INSERT OR REPLACE INTO user_sessions (user_email, access_token, refresh_token)
        VALUES (?, ?, ?)
    ''', (user_email, access_token, refresh_token))
    conn.commit()
    conn.close()
    
    return f"""
    <h2>✅ Google Login Successful!</h2>
    <p><strong>Email:</strong> {user_email}</p>
    <p><strong>Access Token:</strong> {access_token[:50]}...</p>
    <h3>Next Steps:</h3>
    <ul>
        <li><a href="/api/drive/scan">Scan your Google Drive</a></li>
        <li><a href="/api/drive/duplicates">Find duplicates</a></li>
        <li><a href="/test-auth">Test authentication</a></li>
    </ul>
    <h3>API Usage:</h3>
    <p>Use this in Authorization header: <code>Bearer {access_token}</code></p>
    """

def get_current_user(authorization: str = None) -> dict:
    """Get current user from authorization header or session"""
    if not authorization:
        raise HTTPException(status_code=401, detail="No authorization provided")
    
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization format")
    
    token = authorization.replace("Bearer ", "")
    
    # Find user by token
    for email, session in user_sessions.items():
        if session["access_token"] == token:
            return session
    
    raise HTTPException(status_code=401, detail="Invalid or expired token")

def get_drive_service(access_token: str):
    """Create Google Drive service instance"""
    credentials = google.oauth2.credentials.Credentials(access_token)
    return build('drive', 'v3', credentials=credentials)

@app.get("/test-auth")
async def test_auth(authorization: str = None):
    """Test endpoint to verify authentication"""
    if not authorization:
        return HTMLResponse("""
        <h2>Authentication Test</h2>
        <p>To test with a token, visit: <code>/test-auth?authorization=Bearer YOUR_TOKEN</code></p>
        <p>Or use the Authorization header: <code>Authorization: Bearer YOUR_TOKEN</code></p>
        <a href="/google/login">Login with Google</a>
        """)
    
    try:
        user = get_current_user(authorization)
        return {
            "status": "authenticated",
            "user": user["user_info"],
            "message": "Authentication successful!"
        }
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"error": e.detail})

@app.get("/api/drive/scan")
async def scan_drive(authorization: str = None):
    """Scan user's Google Drive and store file metadata"""
    try:
        user = get_current_user(authorization)
        service = get_drive_service(user["access_token"])
        
        # Get all files from Drive
        files = []
        page_token = None
        
        while True:
            results = service.files().list(
                pageSize=1000,
                fields="nextPageToken, files(id, name, size, mimeType, md5Checksum, createdTime, modifiedTime, webViewLink)",
                pageToken=page_token
            ).execute()
            
            batch_files = results.get('files', [])
            files.extend(batch_files)
            
            page_token = results.get('nextPageToken')
            if not page_token:
                break
        
        # Store files in database
        user_email = user["user_info"]["email"]
        conn = sqlite3.connect(DATABASE_FILE)
        cursor = conn.cursor()
        
        # Clear existing files for this user
        cursor.execute('DELETE FROM drive_files WHERE user_email = ?', (user_email,))
        
        # Insert new files
        for file in files:
            cursor.execute('''
                INSERT INTO drive_files 
                (id, name, size, mimeType, md5Checksum, createdTime, modifiedTime, webViewLink, user_email)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                file.get('id'),
                file.get('name'),
                file.get('size'),
                file.get('mimeType'),
                file.get('md5Checksum'),
                file.get('createdTime'),
                file.get('modifiedTime'),
                file.get('webViewLink'),
                user_email
            ))
        
        conn.commit()
        conn.close()
        
        return {
            "status": "success",
            "message": f"Scanned and stored {len(files)} files from Google Drive",
            "file_count": len(files),
            "user": user_email
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error scanning drive: {str(e)}")

@app.get("/api/drive/duplicates")
async def find_duplicates(authorization: str = None):
    """Find duplicate files in user's Google Drive"""
    try:
        user = get_current_user(authorization)
        user_email = user["user_info"]["email"]
        
        # Get files from database
        conn = sqlite3.connect(DATABASE_FILE)
        cursor = conn.cursor()
        cursor.execute('''
            SELECT id, name, size, mimeType, md5Checksum, webViewLink 
            FROM drive_files 
            WHERE user_email = ? AND size IS NOT NULL
            ORDER BY name, size
        ''', (user_email,))
        
        files = cursor.fetchall()
        conn.close()
        
        if not files:
            return {
                "duplicates": [],
                "message": "No files found. Please scan your drive first.",
                "scan_url": "/api/drive/scan"
            }
        
        # Find duplicates
        duplicates = []
        seen = {}
        
        for file_data in files:
            file_id, name, size, mime_type, md5_hash, web_link = file_data
            
            file_obj = {
                "id": file_id,
                "name": name,
                "mimeType": mime_type,
                "size": size,
                "md5Checksum": md5_hash,
                "webViewLink": web_link
            }
            
            # Check for duplicates by MD5 hash (most reliable)
            if md5_hash and md5_hash in seen:
                duplicates.append({
                    "original": seen[md5_hash],
                    "duplicate": file_obj,
                    "match_type": "md5_hash",
                    "confidence": 1.0
                })
                continue
            
            # Check for duplicates by name + size
            name_size_key = f"{name}:{size}"
            if name_size_key in seen:
                duplicates.append({
                    "original": seen[name_size_key],
                    "duplicate": file_obj,
                    "match_type": "name_size",
                    "confidence": 0.9
                })
                continue
            
            # Store for future comparison
            if md5_hash:
                seen[md5_hash] = file_obj
            seen[name_size_key] = file_obj
        
        return {
            "duplicates": duplicates,
            "total_files": len(files),
            "duplicate_pairs": len(duplicates),
            "user": user_email,
            "summary": {
                "exact_duplicates": len([d for d in duplicates if d["match_type"] == "md5_hash"]),
                "name_size_duplicates": len([d for d in duplicates if d["match_type"] == "name_size"])
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error finding duplicates: {str(e)}")

@app.get("/api/drive/files")
async def list_files(authorization: str = None, limit: int = 100):
    """List files from user's Google Drive (from database)"""
    try:
        user = get_current_user(authorization)
        user_email = user["user_info"]["email"]
        
        conn = sqlite3.connect(DATABASE_FILE)
        cursor = conn.cursor()
        cursor.execute('''
            SELECT id, name, size, mimeType, md5Checksum, createdTime, webViewLink 
            FROM drive_files 
            WHERE user_email = ? 
            ORDER BY name 
            LIMIT ?
        ''', (user_email, limit))
        
        files = cursor.fetchall()
        conn.close()
        
        file_list = []
        for file_data in files:
            file_id, name, size, mime_type, md5_hash, created_time, web_link = file_data
            file_list.append({
                "id": file_id,
                "name": name,
                "size": size,
                "mimeType": mime_type,
                "md5Checksum": md5_hash,
                "createdTime": created_time,
                "webViewLink": web_link
            })
        
        return {
            "files": file_list,
            "count": len(file_list),
            "user": user_email
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing files: {str(e)}")

@app.get("/api/stats")
async def get_stats(authorization: str = None):
    """Get statistics about user's Google Drive"""
    try:
        user = get_current_user(authorization)
        user_email = user["user_info"]["email"]
        
        conn = sqlite3.connect(DATABASE_FILE)
        cursor = conn.cursor()
        
        # Total files
        cursor.execute('SELECT COUNT(*) FROM drive_files WHERE user_email = ?', (user_email,))
        total_files = cursor.fetchone()[0]
        
        # Total size
        cursor.execute('SELECT SUM(CAST(size AS INTEGER)) FROM drive_files WHERE user_email = ? AND size IS NOT NULL', (user_email,))
        total_size = cursor.fetchone()[0] or 0
        
        # File types
        cursor.execute('''
            SELECT mimeType, COUNT(*) 
            FROM drive_files 
            WHERE user_email = ? 
            GROUP BY mimeType 
            ORDER BY COUNT(*) DESC 
            LIMIT 10
        ''', (user_email,))
        file_types = cursor.fetchall()
        
        conn.close()
        
        return {
            "user": user_email,
            "total_files": total_files,
            "total_size_bytes": total_size,
            "total_size_mb": round(total_size / (1024 * 1024), 2),
            "file_types": [{"mimeType": ft[0], "count": ft[1]} for ft in file_types]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting stats: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8010)
