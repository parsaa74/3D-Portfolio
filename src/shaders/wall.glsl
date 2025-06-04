// Wall shader for Severance environment
// Creates the stark, clinical walls with subtle texture effect

uniform vec3 wallColor; // White
uniform float wallRoughness; // Reduced roughness for smoother walls
uniform float time;

varying vec3 vNormal;
varying vec2 vUv;
varying vec3 vPosition;

// Simple noise function for subtle wall texture
float noise(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453123);
}

void main() {
  // Calculate lighting
  vec3 normal = normalize(vNormal);
  
  // Basic diffuse lighting with directional light from above
  float diffuse = max(dot(normal, vec3(0.0, 1.0, 0.0)), 0.5);
  
  // Simple noise texture
  float noiseValue = noise(vUv * 50.0) * 0.01; // Reduced noise intensity
  
  // Wall color with subtle texture
  vec3 color = wallColor * (1.0 + noiseValue) * diffuse;
  
  // Add very subtle flicker for fluorescent effect
  // Removed flicker effect for more constant lighting
  
  gl_FragColor = vec4(color, 1.0);
} 