# 🚀 GitHub Codespaces Setup Guide

## 🎯 Quick Start

This repository is **GitHub Codespaces ready**! Simply:

1. **Click "Code" → "Codespaces" → "Create codespace on main"**
2. **Wait for automatic setup** (3-5 minutes)
3. **Start coding immediately!**

---

## 🏗️ What Gets Set Up Automatically

### 🛠️ **Development Environment**
- ✅ **Node.js 20** with npm, yarn, bun
- ✅ **Python 3.12** with pip, venv
- ✅ **Docker** for containerization
- ✅ **Git** with GitHub CLI
- ✅ **VS Code Extensions** (see below)

### 📦 **Tools & CLIs**
- ✅ **Supabase CLI** for database management
- ✅ **Firebase CLI** for cloud functions
- ✅ **rclone** for file operations
- ✅ **TypeScript, Vite** for frontend dev
- ✅ **FastAPI, uvicorn** for backend dev

### 🔌 **Pre-installed Extensions**
- 🐍 Python development (Pylance, Black, Flake8)
- ⚛️ React/TypeScript (IntelliSense, Refactoring)
- 🎨 Tailwind CSS IntelliSense
- 🔥 Firebase & Supabase extensions
- 🤖 GitHub Copilot integration
- 🔧 Docker, Git, Live Server

---

## ⚡ Available Commands

### 🚀 **Start Development Servers**
```bash
# Start all services (recommended)
npm run dev:all

# Or start individually:
npm run dev:supabase    # Supabase app (port 5173)
npm run dev:firebase    # Firebase app (port 3000)
npm run dev:backend     # FastAPI backend (port 8010)
```

### 🧪 **Testing & Quality**
```bash
npm run test:all        # Run all tests
npm run format          # Format all code
npm run lint:supabase   # Lint Supabase app
npm run lint:python     # Lint Python code
```

### 🏗️ **Build & Deploy**
```bash
npm run build:all       # Build all projects
npm run install:all     # Install all dependencies
```

---

## 🎮 VS Code Tasks

Press **`Ctrl+Shift+P`** → **"Tasks: Run Task"**:

- 🚀 **Start Supabase App**
- 🔥 **Start Firebase App** 
- 🐍 **Start FastAPI Backend**
- 🚀 **Start All Services**
- 📦 **Install All Dependencies**
- 🧪 **Run All Tests**
- 🔧 **Format Code**

---

## 🐛 Debug Configurations

Press **`F5`** to debug or go to **Run and Debug** panel:

- 🚀 **Launch Supabase App** - Debug React app
- 🔥 **Launch Firebase App** - Debug Firebase frontend
- 🐍 **Debug FastAPI Backend** - Debug Python API
- 🧪 **Debug Python Tests** - Debug test files
- ⚙️ **Launch Full Stack** - Debug both frontend + backend

---

## 🌐 Port Forwarding

Codespaces automatically forwards these ports:

| Port | Service | URL |
|------|---------|-----|
| **5173** | Supabase App | `https://your-codespace-5173.preview.app.github.dev` |
| **3000** | Firebase App | `https://your-codespace-3000.preview.app.github.dev` |
| **8010** | FastAPI Backend | `https://your-codespace-8010.preview.app.github.dev` |
| **8080** | Firebase Emulator | `https://your-codespace-8080.preview.app.github.dev` |

---

## ⚙️ Environment Configuration

### 1️⃣ **Copy Environment Files**
```bash
# Supabase app
cp pix-dupe-detect-main/.env.example pix-dupe-detect-main/.env.local

# Firebase app
cp Dtddpe-ryan-main/.env.example Dtddpe-ryan-main/.env

# Root project
cp .env.example .env
```

### 2️⃣ **Configure API Keys**

Edit the `.env*` files with your actual credentials:

```bash
# Essential for Supabase app
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Essential for Google integrations
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Essential for cloud storage
NEXT_PUBLIC_DROPBOX_APP_KEY=your-dropbox-app-key
```

### 3️⃣ **Test Configuration**
```bash
# Test Supabase connection
cd pix-dupe-detect-main && npm run dev

# Test backend API
curl http://localhost:8010/health
```

---

## 🔗 External Service Setup

### 📊 **Supabase Setup**
1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Copy `URL` and `anon key` to `.env.local`
4. Run SQL migrations (if any)

### 🔥 **Firebase Setup**
1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Create new project
3. Enable Authentication → Google provider
4. Download service account key
5. Add config to `.env`

### 🌐 **Google Cloud Setup**
1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Enable Drive API & OAuth2
3. Create OAuth2 credentials
4. Add redirect URIs for Codespaces URLs

---

## 🧪 Testing Your Setup

### ✅ **Frontend Tests**
```bash
# Test Supabase app
cd pix-dupe-detect-main
npm run dev
# Visit: https://your-codespace-5173.preview.app.github.dev

# Test Firebase app  
cd ../Dtddpe-ryan-main/frontend
npm run dev
# Visit: https://your-codespace-3000.preview.app.github.dev
```

### ✅ **Backend Tests**
```bash
# Test FastAPI
uvicorn backend.clean_google_drive_backend:app --host 0.0.0.0 --port 8010
# Visit: https://your-codespace-8010.preview.app.github.dev/docs

# Test health endpoint
curl https://your-codespace-8010.preview.app.github.dev/health
```

### ✅ **Integration Tests**
```bash
# Run comprehensive tests
npm run test:all

# Test file upload
python scripts/test_upload.py

# Test duplicate detection
python scripts/test_duplicates.py
```

---

## 🚨 Troubleshooting

### ❌ **"Port 5173 is already in use"**
```bash
# Kill existing processes
pkill -f "vite"
pkill -f "npm run dev"

# Or use different port
npm run dev -- --port 5174
```

### ❌ **"Supabase connection failed"**
```bash
# Check your .env.local file
cat pix-dupe-detect-main/.env.local

# Test connection
curl -H "apikey: YOUR_ANON_KEY" \
  "https://your-project.supabase.co/rest/v1/"
```

### ❌ **"Python module not found"**
```bash
# Reinstall Python packages
pip install -r Dtddpe-ryan-main/backend/requirements.txt

# Check Python path
echo $PYTHONPATH
export PYTHONPATH="/workspaces/duplicate-photo:$PYTHONPATH"
```

### ❌ **"Firebase authentication error"**
```bash
# Login to Firebase
firebase login --no-localhost

# Check project
firebase projects:list

# Set project
firebase use your-project-id
```

---

## 🎯 GitHub Copilot Integration

This workspace is **Copilot-optimized**! Try these prompts:

```
🤖 "Help me set up Google Drive authentication"
🤖 "Debug this Supabase query error"
🤖 "Create a file upload component with drag and drop"
🤖 "Write tests for the duplicate detection algorithm"
🤖 "Optimize this React component for performance"
```

---

## 📚 Additional Resources

- 📖 **[Main Documentation](./COPILOT_READY_PROMPT.md)**
- 🏗️ **[Architecture Overview](./docs/architecture.md)**
- 🔧 **[API Documentation](./docs/api-guide.md)**
- 🧪 **[Testing Guide](./docs/testing.md)**
- 🚀 **[Deployment Guide](./docs/deployment.md)**

---

## 🆘 Need Help?

1. **Check the logs**: VS Code → Terminal → Output
2. **Use Copilot**: Ask specific questions about errors
3. **Restart services**: `Ctrl+Shift+P` → "Developer: Reload Window"
4. **Create an issue**: [GitHub Issues](../../issues)

---

## 🎉 You're Ready!

Your Codespace includes:
- ✅ **Full development environment**
- ✅ **Pre-configured tools and extensions**
- ✅ **Automated setup scripts**
- ✅ **Debug configurations**
- ✅ **Port forwarding**
- ✅ **GitHub Copilot integration**

**Happy coding! 🚀**
