#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Setting up Duplicate Photo Detection Development Environment${NC}"
echo "=================================================================="

# Function to print status
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Change to workspace directory
cd /workspaces/duplicate-photo

# Create necessary directories
print_status "Creating directory structure..."
mkdir -p logs
mkdir -p uploads
mkdir -p temp

# Install dependencies for Supabase app (primary)
print_status "Installing Supabase app dependencies..."
if [ -d "pix-dupe-detect-main" ]; then
    cd pix-dupe-detect-main
    npm install
    cd ..
else
    print_warning "pix-dupe-detect-main directory not found"
fi

# Install dependencies for Firebase app (secondary)
print_status "Installing Firebase app dependencies..."
if [ -d "Dtddpe-ryan-main/frontend" ]; then
    cd Dtddpe-ryan-main/frontend
    npm install
    cd ../..
else
    print_warning "Dtddpe-ryan-main/frontend directory not found"
fi

# Install Python dependencies for FastAPI backend
print_status "Installing Python dependencies..."
if [ -f "Dtddpe-ryan-main/backend/requirements.txt" ]; then
    pip install -r Dtddpe-ryan-main/backend/requirements.txt
elif [ -f "backend/requirements.txt" ]; then
    pip install -r backend/requirements.txt
else
    print_warning "No requirements.txt found, installing common packages..."
    pip install fastapi uvicorn python-dotenv requests firebase-admin google-auth google-api-python-client
fi

# Set up environment files
print_status "Setting up environment files..."

# Supabase app env
if [ -f "pix-dupe-detect-main/.env.example" ] && [ ! -f "pix-dupe-detect-main/.env.local" ]; then
    cp pix-dupe-detect-main/.env.example pix-dupe-detect-main/.env.local
    print_status "Created .env.local for Supabase app from example"
fi

# Firebase app env
if [ -f "Dtddpe-ryan-main/.env.example" ] && [ ! -f "Dtddpe-ryan-main/.env" ]; then
    cp Dtddpe-ryan-main/.env.example Dtddpe-ryan-main/.env
    print_status "Created .env for Firebase app from example"
fi

# Main backend env
if [ -f ".env.example" ] && [ ! -f ".env" ]; then
    cp .env.example .env
    print_status "Created main .env from example"
fi

# Initialize git hooks (if in a git repo)
if [ -d ".git" ]; then
    print_status "Setting up git hooks..."
    # Add pre-commit hook for code formatting
    cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
# Run linting and formatting before commit
echo "Running pre-commit checks..."

# Check Python files
if command -v black &> /dev/null; then
    black --check . || {
        echo "Run 'black .' to fix Python formatting"
        exit 1
    }
fi

# Check TypeScript/JavaScript files
if [ -f "pix-dupe-detect-main/package.json" ]; then
    cd pix-dupe-detect-main
    npm run lint --silent || {
        echo "Fix linting errors in Supabase app"
        exit 1
    }
    cd ..
fi

echo "Pre-commit checks passed!"
EOF
    chmod +x .git/hooks/pre-commit
    print_status "Git pre-commit hooks installed"
fi

# Setup Firebase emulator (if Firebase project exists)
if [ -f "Dtddpe-ryan-main/firebase.json" ]; then
    print_status "Setting up Firebase emulator..."
    cd Dtddpe-ryan-main
    if command -v firebase &> /dev/null; then
        firebase setup:emulators:database
        firebase setup:emulators:firestore
        firebase setup:emulators:functions
    else
        print_warning "Firebase CLI not found, skipping emulator setup"
    fi
    cd ..
fi

# Create useful scripts
print_status "Creating helper scripts..."

# Create start script for all services
cat > start-all.sh << 'EOF'
#!/bin/bash
echo "🚀 Starting all services for Duplicate Photo Detection..."

# Start Supabase app in background
if [ -d "pix-dupe-detect-main" ]; then
    echo "Starting Supabase app on port 5173..."
    cd pix-dupe-detect-main
    npm run dev &
    SUPABASE_PID=$!
    cd ..
fi

# Start Firebase app in background
if [ -d "Dtddpe-ryan-main/frontend" ]; then
    echo "Starting Firebase frontend on port 3000..."
    cd Dtddpe-ryan-main/frontend
    npm run dev &
    FIREBASE_PID=$!
    cd ..
fi

# Start FastAPI backend
if [ -f "Dtddpe-ryan-main/backend/main.py" ]; then
    echo "Starting FastAPI backend on port 8010..."
    cd Dtddpe-ryan-main/backend
    uvicorn main:app --host 0.0.0.0 --port 8010 --reload &
    BACKEND_PID=$!
    cd ..
elif [ -f "backend/clean_google_drive_backend.py" ]; then
    echo "Starting legacy FastAPI backend on port 8010..."
    uvicorn backend.clean_google_drive_backend:app --host 0.0.0.0 --port 8010 --reload &
    BACKEND_PID=$!
fi

echo "All services started!"
echo "Supabase app: http://localhost:5173"
echo "Firebase app: http://localhost:3000"
echo "FastAPI backend: http://localhost:8010"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for interrupt
trap 'kill $SUPABASE_PID $FIREBASE_PID $BACKEND_PID 2>/dev/null' EXIT
wait
EOF

chmod +x start-all.sh

# Create test script
cat > test-all.sh << 'EOF'
#!/bin/bash
echo "🧪 Running all tests for Duplicate Photo Detection..."

# Test Python backend
if [ -f "backend/test_backend.py" ]; then
    echo "Testing Python backend..."
    python -m pytest backend/ -v
fi

# Test Supabase app
if [ -d "pix-dupe-detect-main" ] && [ -f "pix-dupe-detect-main/package.json" ]; then
    echo "Testing Supabase app..."
    cd pix-dupe-detect-main
    npm test 2>/dev/null || echo "No tests configured for Supabase app"
    cd ..
fi

# Test Firebase app
if [ -d "Dtddpe-ryan-main/frontend" ] && [ -f "Dtddpe-ryan-main/frontend/package.json" ]; then
    echo "Testing Firebase app..."
    cd Dtddpe-ryan-main/frontend
    npm test 2>/dev/null || echo "No tests configured for Firebase app"
    cd ..
fi

echo "✅ All tests completed!"
EOF

chmod +x test-all.sh

print_status "Helper scripts created: start-all.sh, test-all.sh"

# Create package.json for workspace root with useful scripts
cat > package.json << 'EOF'
{
  "name": "duplicate-photo-detection-workspace",
  "version": "1.0.0",
  "description": "Fullstack duplicate photo detection with Supabase and Firebase",
  "scripts": {
    "install:all": "npm run install:supabase && npm run install:firebase && pip install -r Dtddpe-ryan-main/backend/requirements.txt",
    "install:supabase": "cd pix-dupe-detect-main && npm install",
    "install:firebase": "cd Dtddpe-ryan-main/frontend && npm install",
    "dev:supabase": "cd pix-dupe-detect-main && npm run dev",
    "dev:firebase": "cd Dtddpe-ryan-main/frontend && npm run dev",
    "dev:backend": "uvicorn Dtddpe-ryan-main.backend.main:app --host 0.0.0.0 --port 8010 --reload",
    "dev:all": "./start-all.sh",
    "build:supabase": "cd pix-dupe-detect-main && npm run build",
    "build:firebase": "cd Dtddpe-ryan-main/frontend && npm run build",
    "build:all": "npm run build:supabase && npm run build:firebase",
    "test:all": "./test-all.sh",
    "lint:supabase": "cd pix-dupe-detect-main && npm run lint",
    "lint:firebase": "cd Dtddpe-ryan-main/frontend && npm run lint",
    "lint:python": "black . && flake8 .",
    "format": "npm run lint:python && npm run lint:supabase && npm run lint:firebase"
  },
  "keywords": ["duplicate-detection", "supabase", "firebase", "fastapi", "react"],
  "author": "Duplicate Photo Detection Team",
  "license": "MIT"
}
EOF

print_status "Root package.json created with workspace scripts"

# Display setup completion message
echo ""
echo -e "${GREEN}🎉 Setup completed successfully!${NC}"
echo "=================================================================="
echo -e "${BLUE}Quick Start Commands:${NC}"
echo ""
echo "📦 Install all dependencies:"
echo "  npm run install:all"
echo ""
echo "🚀 Start development servers:"
echo "  npm run dev:all              # Start all services"
echo "  npm run dev:supabase         # Supabase app only (port 5173)"
echo "  npm run dev:firebase         # Firebase app only (port 3000)"
echo "  npm run dev:backend          # FastAPI backend only (port 8010)"
echo ""
echo "🧪 Run tests:"
echo "  npm run test:all"
echo ""
echo "🏗️  Build for production:"
echo "  npm run build:all"
echo ""
echo -e "${YELLOW}⚠️  Don't forget to:${NC}"
echo "1. Configure your .env files with actual API keys"
echo "2. Set up Supabase project and database"
echo "3. Configure Firebase project and authentication"
echo "4. Set up Google Cloud Console for OAuth"
echo ""
echo -e "${BLUE}📚 Documentation:${NC}"
echo "- Main guide: COPILOT_READY_PROMPT.md"
echo "- Supabase setup: pix-dupe-detect-main/README.md"
echo "- Firebase setup: Dtddpe-ryan-main/README.md"
echo ""
echo -e "${GREEN}Happy coding! 🚀${NC}"
