// Test script to verify asset path resolution
import { getAssetPath } from './src/utils/assetPath.js';

console.log('Testing asset path resolution...');

// Test cases
const testPaths = [
  '/assets/textures/wall.jpg',
  '/chair.glb',
  '/assets/fonts/Noto Sans_Regular.typeface.json',
  '/assets/Images/performance/solo performances/friends/photo_2025-05-01_17-29-01.jpg'
];

testPaths.forEach(path => {
  const resolvedPath = getAssetPath(path);
  console.log(`${path} -> ${resolvedPath}`);
});

console.log('\nBase URL:', import.meta.env.BASE_URL);
console.log('Environment:', import.meta.env.MODE); 