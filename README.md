# Google Drive Duplicate Detection with Firebase Integration

A complete FastAPI backend with Google OAuth2, Google Drive API integration, and Firebase support for duplicate photo detection.

## 🚀 Features

- **Google OAuth2 Authentication** - Secure login with Google accounts
- **Google Drive API Integration** - Access and scan user's Drive files
- **Duplicate Detection** - Advanced algorithms using MD5 checksums and name/size matching
- **Firebase Integration** - Cloud database and authentication
- **RESTful API** - Clean, documented endpoints
- **SQLite Database** - Local storage for file metadata
- **CORS Support** - Frontend-ready API

## 📋 Prerequisites

1. **Google Cloud Console Setup**
   - Create a project at [Google Cloud Console](https://console.cloud.google.com/)
   - Enable Google Drive API and Google+ API
   - Create OAuth 2.0 credentials
   - Add authorized redirect URIs

2. **Firebase Console Setup**
   - Create a project at [Firebase Console](https://console.firebase.google.com/)
   - Enable Authentication (Google provider)
   - Enable Firestore Database
   - Download service account key

## 🛠️ Installation

### 1. Clone the Repository
```bash
git clone <your-repo-url>
cd google-drive-duplicate-detector
```

### 2. Install Dependencies
```bash
pip install fastapi uvicorn python-dotenv google-auth google-api-python-client requests firebase-admin
```

### 3. Environment Configuration
Create a `.env` file:
```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:8010/google/callback

# Firebase Configuration (optional)
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_PRIVATE_KEY_PATH=path/to/service-account-key.json
```

### 4. Google Cloud Console Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create OAuth 2.0 Client ID
3. Add these authorized redirect URIs:
   - `http://localhost:8010/google/callback`
   - `https://your-domain.com/google/callback` (for production)

### 5. Firebase Console Setup
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create new project
3. Enable Authentication → Google provider
4. Enable Firestore Database
5. Generate service account key (Settings → Service Accounts)

## 🚀 Usage

### Start the Backend
```bash
python backend/clean_google_drive_backend.py
```

### API Endpoints

#### Authentication
- `GET /google/login` - Initiate Google OAuth
- `GET /google/callback` - Handle OAuth callback

#### Google Drive Operations
- `GET /api/drive/scan` - Scan Google Drive files
- `GET /api/drive/duplicates` - Find duplicate files
- `GET /api/drive/files` - List Drive files
- `GET /api/stats` - Get Drive statistics

#### Testing
- `GET /` - Backend status page
- `GET /test-auth` - Test authentication
- `GET /docs` - API documentation

### Complete Workflow

1. **Start Authentication**
   ```
   Visit: http://localhost:8010/google/login
   ```

2. **Complete OAuth Flow**
   - Login with Google account
   - Copy access token from callback page

3. **Scan Google Drive**
   ```bash
   curl -H 'Authorization: Bearer YOUR_TOKEN' http://localhost:8010/api/drive/scan
   ```

4. **Find Duplicates**
   ```bash
   curl -H 'Authorization: Bearer YOUR_TOKEN' http://localhost:8010/api/drive/duplicates
   ```

## 🔧 Configuration

### Google Cloud Console
1. **APIs & Services** → **Credentials**
2. **Create OAuth 2.0 Client ID**
3. **Add authorized redirect URIs:**
   - Development: `http://localhost:8010/google/callback`
   - Production: `https://yourdomain.com/google/callback`

### Firebase Console
1. **Authentication** → **Sign-in method** → **Google** (Enable)
2. **Firestore Database** → **Create database**
3. **Project Settings** → **Service accounts** → **Generate new private key**

## 📊 API Documentation

### Authentication Flow
```
GET /google/login
↓
Google OAuth Consent
↓  
GET /google/callback?code=...
↓
Access Token Response
```

### Drive API Flow
```
POST /api/drive/scan (with Bearer token)
↓
Fetch files from Google Drive
↓
Store in local database
↓
GET /api/drive/duplicates
↓
Return duplicate analysis
```

## 🔐 Security Features

- OAuth2 Bearer token authentication
- CORS protection
- Input validation
- Secure credential storage
- Error handling

## 📁 Project Structure

```
├── backend/
│   ├── clean_google_drive_backend.py    # Main FastAPI application
│   └── requirements.txt                 # Python dependencies
├── .env                                 # Environment variables
├── README.md                           # This file
└── demo_scripts/
    ├── automate_google_drive_demo.py   # Demo script
    └── test_backend_complete.py        # Testing script
```

## 🧪 Testing

### Manual Testing
```bash
# Run demo script
python automate_google_drive_demo.py

# Run comprehensive tests
python test_backend_complete.py
```

### API Testing
```bash
# Test backend health
curl http://localhost:8010/

# Test OAuth redirect
curl -I http://localhost:8010/google/login

# Test authenticated endpoint (replace TOKEN)
curl -H 'Authorization: Bearer TOKEN' http://localhost:8010/api/drive/scan
```

## 🚀 Deployment

### Local Development
```bash
python backend/clean_google_drive_backend.py
```

### Production (with Gunicorn)
```bash
pip install gunicorn
gunicorn -w 4 -k uvicorn.workers.UvicornWorker backend.clean_google_drive_backend:app
```

### Docker
```dockerfile
FROM python:3.12
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["uvicorn", "backend.clean_google_drive_backend:app", "--host", "0.0.0.0", "--port", "8010"]
```

## 🔧 Troubleshooting

### Common Issues

1. **redirect_uri_mismatch**
   - Ensure redirect URI in Google Console matches `.env` file
   - Check for typos in the URI

2. **Invalid credentials**
   - Verify Google Client ID and Secret
   - Ensure APIs are enabled in Google Cloud Console

3. **Permission denied**
   - Check Google Drive API permissions
   - Verify OAuth scopes include Drive access

### Debug Mode
Set environment variable:
```bash
export DEBUG=True
python backend/clean_google_drive_backend.py
```

## 📝 License

MIT License - see LICENSE file for details

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## 📞 Support

For issues and questions:
- Check the troubleshooting section
- Review API documentation at `/docs`
- Test with demo scripts provided
