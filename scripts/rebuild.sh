#!/bin/bash
# Rebuild script for Replit environment
echo "🔄 Rebuilding application..."
npm run build
echo "📁 Copying static files..."
cp -r dist/public server/
echo "✅ Build complete! Restart the workflow to see changes."