#!/bin/bash

# Build the project with Vite
echo "Building project..."
npm run build

# Make sure all .glb files are in the root of the dist directory
echo "Copying 3D models to root..."
cp *.glb dist/

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
# Copy performance images with the correct folder structure
if [ -d "assets/Images/performance/solo-performances" ]; then
  cp -r assets/Images/performance/solo-performances/* dist/assets/Images/performance/solo-performances/
fi

if [ -d "assets/Images/performance/solo%20performances" ]; then
  cp -r "assets/Images/performance/solo%20performances"/* dist/assets/Images/performance/solo-performances/
fi

if [ -d "assets/Images/performance/solo performances" ]; then
  cp -r "assets/Images/performance/solo performances"/* dist/assets/Images/performance/solo-performances/
fi

# Copy fonts
echo "Copying fonts..."
if [ -d "assets/fonts" ]; then
  cp -r assets/fonts/* dist/assets/fonts/
fi

if [ -d "fonts" ]; then
  cp -r fonts/* dist/assets/fonts/
fi

echo "Deployment build complete! The contents of the 'dist' directory are ready to be deployed to GitHub Pages." 