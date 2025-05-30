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