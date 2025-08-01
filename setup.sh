#!/bin/bash
# Setup script for Google Drive Duplicate Detector

echo "🚀 Setting up Google Drive Duplicate Detector..."

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is required but not installed."
    exit 1
fi

# Install dependencies
echo "📦 Installing Python dependencies..."
pip3 install -r backend/requirements.txt

# Copy environment template
if [ ! -f .env ]; then
    cp .env.example .env
    echo "📝 Created .env file - please configure your credentials"
fi

echo "✅ Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Configure your .env file with Google OAuth credentials"
echo "2. Set up Firebase (run: python3 scripts/setup_firebase.py)"
echo "3. Start the backend: python3 backend/clean_google_drive_backend.py"
echo "4. Visit: http://localhost:8010"
