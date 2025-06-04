/**
 * Asset path utilities for handling development and production environments
 */

/**
 * Get the correct asset path based on the environment
 * @param {string} path - The asset path relative to the public directory
 * @returns {string} - The correctly formatted path for the current environment
 */
export function getAssetPath(path) {
  // Remove leading slash if present to ensure consistent format
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  
  // In production (GitHub Pages), we need to include the base path
  if (import.meta.env.PROD) {
    return `/3D-Portfolio/${cleanPath}`;
  }
  
  // In development, use paths relative to the root
  return `/${cleanPath}`;
}

/**
 * Get texture path
 * @param {string} filename - The texture filename
 * @returns {string} - The complete texture path
 */
export function getTexturePath(filename) {
  return getAssetPath(`assets/textures/${filename}`);
}

/**
 * Get shader path
 * @param {string} filename - The shader filename
 * @returns {string} - The complete shader path
 */
export function getShaderPath(filename) {
  return getAssetPath(`src/shaders/${filename}`);
}

/**
 * Get model path
 * @param {string} filename - The model filename
 * @returns {string} - The complete model path
 */
export function getModelPath(filename) {
  return getAssetPath(`models/${filename}`);
} 