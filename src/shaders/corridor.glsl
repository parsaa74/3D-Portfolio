// Corridor lighting shader for Severance environment
// Creates the characteristic fluorescent lighting effect

uniform vec3 lightColor;
uniform float intensity = 0.7;
uniform float time;

varying vec2 vUv;
varying vec3 vPosition;

void main() {
  // Distance from center of corridor (v coordinate)
  float centerDistance = abs(vUv.y - 0.5) * 2.0;
  
  // Create soft gradient for light falloff (scaled for narrower light)
  float effectiveDistance = centerDistance * 1.25; // Scale distance
  float gradient = 1.0 - pow(clamp(effectiveDistance, 0.0, 1.0), 2.0); // Clamp before pow
  
  // Subtle flicker effect for fluorescent lighting
  float flicker = 1.0 + sin(time * 3.0 + vUv.x * 5.0) * 0.03;
  
  // Lighting panels at regular intervals
  float panel = smoothstep(0.95, 1.0, sin(vUv.x * 30.0) * 0.5 + 0.5);
  
  // Combine effects
  float brightness = gradient * intensity * flicker * (0.8 + panel * 0.2);
  
  // Apply light color
  vec3 finalColor = lightColor * brightness;
  
  // Output with opacity for light bleeding
  gl_FragColor = vec4(finalColor, brightness * 0.7);
} 