FROM mcr.microsoft.com/devcontainers/typescript-node:20

# Install Python and pip
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends \
    python3.12 \
    python3-pip \
    python3.12-venv \
    python3.12-dev \
    build-essential \
    curl \
    git \
    wget \
    unzip \
    rclone \
    sqlite3 \
    libmagic1 \
    libmagic-dev \
    libffi-dev \
    libssl-dev \
    pkg-config \
    && apt-get clean -y && rm -rf /var/lib/apt/lists/*

# Create python symlink
RUN ln -sf /usr/bin/python3.12 /usr/bin/python

# Upgrade pip
RUN python -m pip install --upgrade pip setuptools wheel

# Install global Python tools
RUN pip install --user \
    uvicorn[standard] \
    fastapi \
    firebase-admin \
    google-auth \
    google-api-python-client \
    python-dotenv \
    requests \
    aiofiles

# Install global Node.js tools
RUN npm install -g \
    firebase-tools \
    @supabase/supabase-js \
    typescript \
    @types/node \
    vite \
    create-react-app \
    vercel \
    netlify-cli

# Install Supabase CLI
RUN wget -O supabase.deb https://github.com/supabase/cli/releases/download/v1.199.0/supabase_1.199.0_linux_amd64.deb \
    && dpkg -i supabase.deb \
    && rm supabase.deb

# Install rclone (for file operations)
RUN curl https://rclone.org/install.sh | bash

# Create workspace directory
WORKDIR /workspaces/duplicate-photo

# Set up environment for development
ENV PYTHONPATH="/workspaces/duplicate-photo:$PYTHONPATH"
ENV NODE_ENV=development
