/**
 * Asset path utility for correct path resolution in both dev and production
 */

// Get the base URL from Vite's environment
const BASE_URL = import.meta.env.BASE_URL || '/';

/**
 * Convert a path to the correct asset path for the current environment
 * @param {string} path - The asset path (should start with /)
 * @returns {string} - The correctly formatted path
 */
export function getAssetPath(path) {
  // Remove leading slash if present
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  
  // If BASE_URL is '/', just return the path with leading slash
  if (BASE_URL === '/') {
    return '/' + cleanPath;
  }
  
  // Otherwise, combine BASE_URL with the clean path
  return BASE_URL + cleanPath;
}

/**
 * Get the correct path for public assets
 * @param {string} path - Path relative to public directory
 * @returns {string} - The correctly formatted path
 */
export function getPublicAssetPath(path) {
  return getAssetPath(path);
} 