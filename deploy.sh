#!/bin/bash

# Build the project with Vite
echo "Building project..."
npm run build

# Make sure all .glb files are in the root of the dist directory
echo "Copying 3D models to root..."
cp -f *.glb dist/ 2>/dev/null || echo "No .glb files found in root directory"

# Create a .nojekyll file to disable Jekyll processing on GitHub Pages
echo "Creating .nojekyll file..."
touch dist/.nojekyll

# Ensure asset directories exist with correct casing
echo "Creating asset directories with correct casing..."
mkdir -p dist/assets/Images/performance/solo-performances/circle-of-confusion
mkdir -p dist/assets/Images/performance/solo-performances/dissolve
mkdir -p dist/assets/Images/performance/solo-performances/friends
mkdir -p dist/assets/fonts

# Copy assets with correct paths and folder structure
echo "Copying image assets with correct paths..."

# Function to copy files safely
safe_copy() {
  if [ -d "$1" ]; then
    echo "Copying from $1 to $2"
    mkdir -p "$2"
    cp -r "$1"/* "$2"/ 2>/dev/null || echo "No files found in $1"
  else
    echo "Directory $1 not found, skipping"
  fi
}

# Copy performance images with the correct folder structure
safe_copy "assets/Images/performance/solo-performances" "dist/assets/Images/performance/solo-performances"
safe_copy "assets/Images/performance/solo%20performances" "dist/assets/Images/performance/solo-performances"
safe_copy "assets/Images/performance/solo performances" "dist/assets/Images/performance/solo-performances"

# Also try with lowercase "images" directory
safe_copy "assets/images/performance/solo-performances" "dist/assets/Images/performance/solo-performances"
safe_copy "assets/images/performance/solo%20performances" "dist/assets/Images/performance/solo-performances"
safe_copy "assets/images/performance/solo performances" "dist/assets/Images/performance/solo-performances"

# Copy from public directory as well
safe_copy "public/assets/Images/performance/solo-performances" "dist/assets/Images/performance/solo-performances"
safe_copy "public/assets/Images/performance/solo%20performances" "dist/assets/Images/performance/solo-performances"
safe_copy "public/assets/Images/performance/solo performances" "dist/assets/Images/performance/solo-performances"
safe_copy "public/Images/performance/solo-performances" "dist/assets/Images/performance/solo-performances"
safe_copy "public/Images/performance/solo%20performances" "dist/assets/Images/performance/solo-performances"
safe_copy "public/Images/performance/solo performances" "dist/assets/Images/performance/solo-performances"

# Copy fonts
echo "Copying fonts..."
safe_copy "assets/fonts" "dist/assets/fonts"
safe_copy "fonts" "dist/assets/fonts"
safe_copy "public/fonts" "dist/assets/fonts"
safe_copy "public/assets/fonts" "dist/assets/fonts"

# Ensure required files are in place
echo "Verifying essential files..."
if [ ! -f "dist/chair.glb" ]; then
  echo "Warning: chair.glb not found in dist. Checking other locations..."
  find . -name "chair.glb" -exec cp {} dist/ \; -quit
fi

# Fix paths in JavaScript files
echo "Fixing paths in JavaScript files..."
node fix-paths.js

echo "Deployment build complete! The contents of the 'dist' directory are ready to be deployed to GitHub Pages." 