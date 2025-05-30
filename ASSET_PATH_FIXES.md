# Asset Path Fixes for GitHub Pages Deployment

## Issue
Assets (images, GLB files, and shaders) were not loading on GitHub Pages due to incorrect path resolution. The application works fine on localhost but fails when deployed because GitHub Pages serves the app from `/3D-Portfolio/` base path.

## Root Cause
The project was using absolute paths starting with `/` which don't account for the GitHub Pages base URL. When deployed to `parsaa74.github.io/3D-Portfolio/`, these paths resolve to the domain root instead of the project subdirectory.

## Solution

### 1. Created Asset Path Utility
- **File**: `src/utils/assetPath.js`
- **Purpose**: Centralizes asset path resolution using Vite's `import.meta.env.BASE_URL`
- **Function**: `getAssetPath(path)` - converts relative paths to correct absolute paths for the current environment

### 2. Updated Asset References

#### Core Environment Files
- **`src/core/rendering/environments/SeveranceEnvironment.js`**
  - Fixed GLB model loading paths (`door frame.glb`, `door pivot.glb`, `card reader.glb`)
  - Fixed texture paths for posters and film images
  - Fixed shader loading paths
  - Updated `getArtPosterImagePaths` function

#### Material System  
- **`src/core/rendering/materials/SeveranceMaterials.js`**
  - Fixed texture loading paths (wall, floor, ceiling, etc.)
  - Fixed shader loading paths and extensions (`.txt` → `.glsl`)
  - Added graceful fallback materials for missing shaders

#### Performance Components
- **`src/core/rendering/performance/PerformanceArtLetterGenerator.js`**
  - Fixed font loading path (`Noto Sans_Regular.typeface.json`)

#### Asset Loader
- **`src/systems/environment/AssetLoader.js`**
  - Fixed texture and model loading paths
  - Updated import statements for proper Three.js usage

### 3. Shader Loading Improvements
- Fixed shader file extensions from `.txt` to `.glsl`
- Added error handling for missing shader files
- Implemented fallback standard materials when shaders fail to load
- Ensured all required materials (`corridorWall`, `floor`, `sky`) are available

### 4. Vite Configuration
The existing `vite.config.js` was already correctly configured with:
```js
base: process.env.NODE_ENV === 'production' ? '/3D-Portfolio/' : '/'
```

## Files Modified
1. `src/utils/assetPath.js` (new)
2. `src/core/rendering/environments/SeveranceEnvironment.js`
3. `src/core/rendering/materials/SeveranceMaterials.js`
4. `src/core/rendering/performance/PerformanceArtLetterGenerator.js`
5. `src/systems/environment/AssetLoader.js`

## Testing
- ✅ Build process completes successfully
- ✅ Assets are correctly copied to `dist/` folder
- ✅ Deployed to GitHub Pages with proper asset resolution
- ✅ Fallback materials ensure app doesn't crash on missing shaders

## Result
All assets (images, GLB files, fonts, textures) now load correctly on both:
- **Development**: `localhost:3000`
- **Production**: `parsaa74.github.io/3D-Portfolio/`

The application should now work identically in both environments. 