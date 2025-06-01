// Vertex shaders
export const vertexShader = `
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
`;

export const wallVertexShader = `
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
`;

// Fragment shaders
export const wallFragmentShader = `
// Wall shader for Severance environment
// Creates the stark, clinical walls with subtle texture effect

uniform vec3 wallColor;
uniform float wallRoughness;
uniform float time;

varying vec3 vNormal;
varying vec2 vUv;
varying vec3 vPosition;

float noise(vec2 p) {
  // Simple noise function for texture
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453123);
}

float fbm(vec2 p) {
  // Fractal Brownian Motion for more complex texture
  float value = 0.0;
  float amplitude = 0.5;
  float frequency = 2.0;
  
  for (int i = 0; i < 5; i++) {
    value += amplitude * noise(p * frequency);
    amplitude *= 0.5;
    frequency *= 2.0;
  }
  
  return value;
}

void main() {
  // Calculate lighting
  vec3 normal = normalize(vNormal);
  vec3 viewDir = normalize(-vPosition);
  
  // Add subtle texture to the walls - Severance walls have slight imperfections
  float textureNoise = fbm(vUv * 50.0) * wallRoughness * 0.1;
  
  // Lighting
  float diffuse = max(dot(normal, vec3(0.0, 1.0, 0.0)), 0.2);
  
  // Wall color with texture variations
  vec3 color = wallColor * (1.0 - textureNoise) * diffuse;
  
  // Add subtle shadow near corners
  float cornerShadow = (1.0 - smoothstep(0.0, 0.2, abs(vUv.x - 0.5) * 2.0)) * 0.1;
  cornerShadow += (1.0 - smoothstep(0.0, 0.2, abs(vUv.y - 0.5) * 2.0)) * 0.1;
  color = color * (1.0 - cornerShadow);
  
  // Add very subtle flicker to simulate reflection of fluorescent lights
  float flicker = 1.0 + sin(time * 8.0 + vUv.y * 10.0) * 0.01 * diffuse;
  color *= flicker;
  
  gl_FragColor = vec4(color, 1.0);
}
`;

export const corridorShader = `
// Corridor shader for Severance environment
// Provides subtle lighting effects and enhances the clinical atmosphere

uniform vec3 lightColor;
uniform float lightIntensity;
uniform vec3 ambientLight;
uniform float time;

varying vec3 vNormal;
varying vec3 vPosition;
varying vec2 vUv;

void main() {
  // Calculate normal lighting
  vec3 normal = normalize(vNormal);
  vec3 viewDir = normalize(-vPosition);
  
  // Calculate basic lighting
  float diffuse = max(dot(normal, vec3(0.0, -1.0, 0.0)), 0.0);
  
  // Add flickering effect to simulate fluorescent lighting
  float flicker = 1.0 + 0.02 * sin(time * 10.0) * sin(time * 5.0);
  
  // Subtle edge glow effect for that clinical Severance look
  float edgeGlow = pow(1.0 - max(dot(normal, viewDir), 0.0), 5.0) * 0.5;
  
  // Calculate final color
  vec3 color = ambientLight + (lightColor * lightIntensity * diffuse * flicker);
  
  // Add subtle white-blue tint that's characteristic of the Severance offices
  color = mix(color, vec3(0.9, 0.95, 1.0), 0.15);
  
  // Add edge glow effect
  color += vec3(0.9, 0.95, 1.0) * edgeGlow;
  
  // Add subtle vignette effect
  float vignetteAmount = 0.8;
  float vignette = smoothstep(0.0, vignetteAmount, length(vUv - 0.5) * 1.5);
  color = mix(color, color * 0.6, vignette);
  
  gl_FragColor = vec4(color, 1.0);
}
`;

export const corridorFragmentShader = corridorShader;
export const wallShader = wallFragmentShader;