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
  
  // For paths starting with /assets/, point to the right location
  if (cleanPath.startsWith('/assets/')) {
    cleanPath = cleanPath.replace('/assets/', '/');
  }
  
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