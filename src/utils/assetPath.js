/**
 * Asset path utility for handling paths in both development and production (GitHub Pages)
 * 
 * This resolves issues with file paths in GitHub Pages deployment where
 * the base URL includes the repository name: /3D-Portfolio/
 */

/**
 * Get the correct asset path based on environment
 * @param {string} path - The relative path to the asset (should start with /)
 * @returns {string} The correct asset path for the current environment
 */
export function getAssetPath(path) {
  // Get the base URL from the current environment
  const baseUrl = import.meta.env?.BASE_URL || '/3D-Portfolio/';

  // Remove any leading double slashes and ensure path starts with /
  let cleanPath = path.replace(/^\/+/, '/');

  // For paths with src/shaders, use shaders directly
  if (cleanPath.includes('/src/shaders/')) {
    cleanPath = cleanPath.replace('/src/shaders/', '/shaders/');
  }

  // For any paths with ./src/shaders, use shaders directly
  if (cleanPath.includes('./src/shaders/')) {
    cleanPath = cleanPath.replace('./src/shaders/', '/shaders/');
  }

  // Remove leading slash to avoid double slashes when joining with baseUrl
  cleanPath = cleanPath.replace(/^\//, '');

  // Join with base URL
  return baseUrl + cleanPath;
}

/**
 * Get alternative paths to try when an asset fails to load
 * This handles different directory structures and path formats
 * @param {string} originalPath - The original path that failed to load
 * @returns {string[]} Array of alternative paths to try
 */
export function getAlternativePaths(originalPath) {
  const alternatives = [];
  const baseUrl = import.meta.env?.BASE_URL || '/3D-Portfolio/';
  
  // Clean the original path
  let cleanPath = originalPath.replace(/^\/+/, '/').replace(/^\.\/+/, '/');
  
  // Remove leading slash for appending to baseUrl
  const pathWithoutLeadingSlash = cleanPath.replace(/^\//, '');
  
  // 1. First try with the proper baseUrl prefix
  alternatives.push(baseUrl + pathWithoutLeadingSlash);
  
  // 2. Try without the 'assets/' prefix if it exists
  if (cleanPath.startsWith('/assets/')) {
    const withoutAssets = cleanPath.replace('/assets/', '/');
    alternatives.push(baseUrl + withoutAssets.replace(/^\//, ''));
  }
  
  // 3. Try adding 'assets/' prefix if it doesn't exist
  if (!cleanPath.includes('/assets/') && !cleanPath.startsWith('/assets/')) {
    const withAssets = '/assets' + cleanPath;
    alternatives.push(baseUrl + withAssets.replace(/^\//, ''));
  }
  
  // 4. Try replacing spaces with hyphens and underscores
  if (cleanPath.includes(' ')) {
    const withHyphens = cleanPath.replace(/ /g, '-');
    const withUnderscores = cleanPath.replace(/ /g, '_');
    alternatives.push(baseUrl + withHyphens.replace(/^\//, ''));
    alternatives.push(baseUrl + withUnderscores.replace(/^\//, ''));
  }
  
  // 5. Try replacing hyphens with spaces
  if (cleanPath.includes('-')) {
    const withSpaces = cleanPath.replace(/-/g, ' ');
    alternatives.push(baseUrl + withSpaces.replace(/^\//, ''));
  }
  
  // 6. Try with URL-encoded spaces
  if (cleanPath.includes(' ')) {
    const withEncodedSpaces = cleanPath.replace(/ /g, '%20');
    alternatives.push(baseUrl + withEncodedSpaces.replace(/^\//, ''));
  }
  
  // 7. Try with different case patterns for directories
  const segments = cleanPath.split('/').filter(Boolean);
  
  if (segments.length > 0) {
    // Try with camelCase for the last segment
    const lastSegmentCamel = segments[segments.length - 1].replace(/-([a-z])/g, (g) => g[1].toUpperCase());
    segments[segments.length - 1] = lastSegmentCamel;
    alternatives.push(baseUrl + segments.join('/'));
  }
  
  // Remove duplicates
  return [...new Set(alternatives)];
}

/**
 * Create a utility function for loading assets with fallbacks
 * For use with Three.js loaders
 * @param {object} loader - A Three.js loader instance (TextureLoader, GLTFLoader, etc.)
 * @param {string} originalPath - The original path to load
 * @param {function} onLoad - Success callback
 * @param {function} onProgress - Progress callback
 * @param {function} onError - Error callback
 */
export function loadWithFallbacks(loader, originalPath, onLoad, onProgress, onError) {
  // Get the properly formatted primary path
  const primaryPath = getAssetPath(originalPath);
  
  // Try the primary path first
  loader.load(
    primaryPath,
    onLoad,
    onProgress,
    (primaryError) => {
      console.warn(`Failed to load ${primaryPath}, trying alternatives...`, primaryError);
      
      // Get alternative paths to try
      const alternatives = getAlternativePaths(originalPath);
      
      // Try alternatives sequentially
      tryNextAlternative(0);
      
      function tryNextAlternative(index) {
        if (index >= alternatives.length) {
          // All alternatives failed, call the original error callback
          console.error(`All alternative paths failed for ${originalPath}`);
          if (onError) onError(primaryError);
          return;
        }
        
        const alternativePath = alternatives[index];
        
        // Skip if it's the same as the primary path we already tried
        if (alternativePath === primaryPath) {
          tryNextAlternative(index + 1);
          return;
        }
        
        console.log(`Trying alternative path: ${alternativePath}`);
        
        loader.load(
          alternativePath,
          onLoad,
          onProgress,
          (altError) => {
            console.warn(`Alternative path failed: ${alternativePath}`, altError);
            tryNextAlternative(index + 1);
          }
        );
      }
    }
  );
}

/**
 * Async version of loadWithFallbacks that returns a Promise
 * @param {object} loader - A Three.js loader instance with loadAsync method
 * @param {string} originalPath - The original path to load
 * @returns {Promise} Promise that resolves with the loaded asset or rejects after all alternatives fail
 */
export async function loadWithFallbacksAsync(loader, originalPath) {
  // Get the properly formatted primary path
  const primaryPath = getAssetPath(originalPath);
  
  try {
    // Try the primary path first
    return await loader.loadAsync(primaryPath);
  } catch (primaryError) {
    console.warn(`Failed to load ${primaryPath}, trying alternatives...`, primaryError);
    
    // Get alternative paths to try
    const alternatives = getAlternativePaths(originalPath);
    
    // Try each alternative
    for (let i = 0; i < alternatives.length; i++) {
      const alternativePath = alternatives[i];
      
      // Skip if it's the same as the primary path we already tried
      if (alternativePath === primaryPath) continue;
      
      console.log(`Trying alternative path: ${alternativePath}`);
      
      try {
        return await loader.loadAsync(alternativePath);
      } catch (altError) {
        console.warn(`Alternative path failed: ${alternativePath}`, altError);
        // Continue to next alternative
      }
    }
    
    // If we get here, all alternatives failed
    console.error(`All alternative paths failed for ${originalPath}`);
    throw new Error(`Failed to load asset: ${originalPath}`);
  }
}