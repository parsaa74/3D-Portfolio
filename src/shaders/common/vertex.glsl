// Common vertex shader for Severance environments
// Used by walls, corridors, and other surfaces

// Varying outputs passed to fragment shader
varying vec3 vNormal;
varying vec2 vUv;
varying vec3 vPosition;
varying vec3 vViewDir;
varying vec4 vWorldPosition;

void main() {
  // Pass texture coordinates to fragment shader
  vUv = uv;
  
  // Transform normal into view space
  vNormal = normalize(normalMatrix * normal);
  
  // Calculate view space position
  vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
  
  // Calculate view direction (not normalized)
  vViewDir = normalize(-vPosition);
  
  // Calculate world position for effects that need it
  vWorldPosition = modelMatrix * vec4(position, 1.0);
  
  // Output clip space position
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
} 