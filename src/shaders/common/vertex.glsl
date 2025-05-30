// Common vertex shader for Severance environments
// Used by walls, corridors, and other surfaces

// Varying outputs passed to fragment shader
varying vec3 vNormal;
varying vec2 vUv;
varying vec3 vPosition;

void main() {
  // Pass texture coordinates to fragment shader
  vUv = uv;
  
  // Transform normal into view space
  vNormal = normalize(normalMatrix * normal);
  
  // Calculate view space position
  vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
  
  // Output clip space position
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
} 