import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { getAssetPath } from '../../../utils/assetPath.js';
import fs from 'fs';
import path from 'path';

// List of all GLB and image assets to check
const glbAssets = [
  '/assets/models/glb/chair.glb',
  '/assets/models/glb/lamp.glb',
  '/assets/models/glb/projector.glb',
  '/assets/models/glb/projector_screen.glb',
  '/assets/models/glb/door-frame.glb',
  '/assets/models/glb/door-pivot.glb',
  '/assets/models/glb/card-reader.glb',
];
const imageAssets = [
  '/assets/textures/posters/poster1.jpg',
  '/assets/textures/posters/poster2(1).jpg',
  '/assets/textures/posters/poster2(2).jpg',
  '/assets/textures/posters/poster2(3).jpg',
  '/assets/textures/posters/poster2(4).jpg',
  // Optionally add a few performance art images:
  '/assets/Images/performance/solo performances/friends/photo_2025-05-01_17-29-01.jpg',
  '/assets/Images/performance/solo performances/dissolve/سی پرفورمنس ،سی هنرمند، سی روز 3.jpg',
  '/assets/Images/performance/solo performances/circle of confusion/photo_2025-05-01_17-25-22.jpg',
];

// --- Loader-based tests (browser context required) ---
describe('GitHub Pages Asset Loading', () => {
  it('should load all GLB models without error', async () => {
    const loader = new GLTFLoader();
    const errors = [];
    for (const asset of glbAssets) {
      try {
        await new Promise((resolve, reject) => {
          loader.load(getAssetPath(asset), resolve, undefined, (err) => reject(err));
        });
      } catch (e) {
        errors.push(asset);
      }
    }
    expect(errors, `Failed to load GLB assets: ${errors.join(', ')}`).toHaveLength(0);
  });

  it('should load all images without error', async () => {
    const loader = new THREE.TextureLoader();
    const errors = [];
    for (const asset of imageAssets) {
      try {
        await new Promise((resolve, reject) => {
          loader.load(getAssetPath(asset), resolve, undefined, (err) => reject(err));
        });
      } catch (e) {
        errors.push(asset);
      }
    }
    expect(errors, `Failed to load image assets: ${errors.join(', ')}`).toHaveLength(0);
  });
});

// --- Node.js file existence tests ---
describe('Asset file existence (Node.js)', () => {
  const root = path.resolve(__dirname, '../../../../public');
  it('should have all required GLB files in public/assets/models/glb', () => {
    const missing = [];
    for (const asset of glbAssets) {
      const filePath = path.join(root, asset);
      if (!fs.existsSync(filePath)) {
        missing.push(asset);
      }
    }
    expect(missing, `Missing GLB files: ${missing.join(', ')}`).toHaveLength(0);
  });
  it('should have all required image files in public/assets', () => {
    const missing = [];
    for (const asset of imageAssets) {
      const filePath = path.join(root, asset);
      if (!fs.existsSync(filePath)) {
        missing.push(asset);
      }
    }
    expect(missing, `Missing image files: ${missing.join(', ')}`).toHaveLength(0);
  });
}); 