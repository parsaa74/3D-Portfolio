// Fix paths in JavaScript files
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const distDir = 'dist';
const jsFilesPattern = /\.js$/;
const mapFilesPattern = /\.js\.map$/;

// Paths to fix - this matches absolute paths that start with "/" that need to be relative
const pathsToFix = [
  { pattern: /load\("\/chair\.glb"/g, replacement: 'load("./chair.glb"' },
  { pattern: /load\("\/lamp\.glb"/g, replacement: 'load("./lamp.glb"' },
  { pattern: /load\("\/projector\.glb"/g, replacement: 'load("./projector.glb"' },
  { pattern: /load\("\/projector_screen\.glb"/g, replacement: 'load("./projector_screen.glb"' },
  { pattern: /load\("\/severance_tv_show_office\.glb"/g, replacement: 'load("./severance_tv_show_office.glb"' },
  { pattern: /\/assets\//g, replacement: './assets/' },
  { pattern: /\/fonts\//g, replacement: './fonts/' },
  { pattern: /\/models\//g, replacement: './models/' },
  { pattern: /\/sounds\//g, replacement: './sounds/' },
  { pattern: /\/textures\//g, replacement: './textures/' },
  { pattern: /\/images\//g, replacement: './images/' },
  { pattern: /\/Images\//g, replacement: './assets/Images/' },
  { pattern: /\/performance\/solo%20performances\//g, replacement: '/performance/solo-performances/' },
  { pattern: /\/performance\/solo performances\//g, replacement: '/performance/solo-performances/' }
];

// Process a file
function processFile(filePath) {
  console.log(`Processing ${filePath}`);
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  for (const { pattern, replacement } of pathsToFix) {
    if (pattern.test(content)) {
      content = content.replace(pattern, replacement);
      modified = true;
    }
  }

  if (modified) {
    console.log(`- Modified paths in ${filePath}`);
    fs.writeFileSync(filePath, content, 'utf8');
  }
}

// Walk through the dist directory and process JS files
function processDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      processDirectory(fullPath);
    } else if (jsFilesPattern.test(entry.name) && !mapFilesPattern.test(entry.name)) {
      processFile(fullPath);
    }
  }
}

// Start processing
console.log('Starting path fixing process...');
processDirectory(path.join(__dirname, distDir));
console.log('Path fixing completed!'); 