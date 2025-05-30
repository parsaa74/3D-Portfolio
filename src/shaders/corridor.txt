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