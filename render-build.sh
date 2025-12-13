#!/usr/bin/env bash
# Exit on error
set -o errexit

echo "--- STARTING DEPLOYMENT BUILD ---"

echo "1. Installing Frontend Dependencies..."
cd frontend
npm install --production=false

echo "2. Building Frontend..."
npm run build

echo "3. Verifying Build Output..."
if [ ! -d "dist" ]; then
  echo "Error: dist directory not found!"
  exit 1
fi

echo "4. Installing Backend Dependencies..."
cd ../backend
npm install

echo "5. Preparing Static Files..."
mkdir -p public
# Clean old files
rm -rf public/*
# Copy new files
cp -r ../frontend/dist/* ./public/

echo "--- BUILD SUCCESSFUL ---"
