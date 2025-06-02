#!/bin/bash

# This script deploys the built website to the gh-pages branch

# Build the project
echo "Building the project..."
npm run build

# Create .nojekyll file to prevent Jekyll processing
touch dist/.nojekyll

# Deploy using gh-pages
echo "Deploying to GitHub Pages using gh-pages package..."
npx gh-pages -d dist --dotfiles

echo "Deployment complete!"
echo "Your site should be live at https://$(git config --get remote.origin.url | sed 's/.*github.com[:/]\([^/]*\/[^/]*\)\.git.*/\1/' | sed 's/\//.github.io\//')" 