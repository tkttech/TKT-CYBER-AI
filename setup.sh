#!/bin/bash

# TKT-CYBER-AI Bot Setup Script
# This script helps you set up and run the TKT-CYBER-AI WhatsApp bot

echo "🤖 TKT-CYBER-AIBot Setup"
echo "===================="
echo ""

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed!"
    echo ""
    echo "Please install Node.js first:"
    echo "  - Ubuntu/Debian: sudo apt install nodejs npm"
    echo "  - Fedora: sudo dnf install nodejs npm"
    echo "  - macOS: brew install node"
    echo "  - Or download from: https://nodejs.org/"
    exit 1
fi

# Check for npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed!"
    echo ""
    echo "Please install npm:"
    echo "  - Ubuntu/Debian: sudo apt install npm"
    echo "  - Fedora: sudo dnf install npm"
    echo "  - macOS: npm comes with Node.js"
    exit 1
fi

echo "✅ Node.js $(node --version) found"
echo "✅ npm $(npm --version) found"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully!"
    echo ""
    echo "⚙️  Next steps:"
    echo "  1. Edit config.json with your settings"
    echo "  2. Add your Pastebin URL (optional)"
    echo "  3. Run: npm start"
    echo ""
else
    echo "❌ Failed to install dependencies"
    exit 1
fi
