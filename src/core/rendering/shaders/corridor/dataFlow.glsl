uniform float time;
uniform vec2 resolution;
varying vec2 vUv;

// Noise function
float random(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

void main() {
  // Normalized coordinates
  vec2 uv = vUv;
  
  // Create flowing data streams
  float yPos = fract(uv.y * 20.0 - time * 0.2);
  float xPos = fract(uv.x * 10.0);
  
  // Digital effect
  float r = random(vec2(floor(uv.x * 20.0), floor(uv.y * 20.0 - time)));
  
  // Data lines
  float dataLine = step(0.97, r);
  
  // Falling dots
  float y = fract(uv.y * 10.0 - time * 0.5 + random(vec2(floor(uv.x * 20.0), 0.0)));
  float dots = 1.0 - step(0.02, y) * step(random(vec2(floor(uv.x * 20.0), floor(time * 2.0))), 0.2);
  
  // Combine effects
  float effect = max(dataLine * 0.3, dots * 0.5);
  
  // Lumon blue-green color palette
  vec3 color = mix(
    vec3(0.0, 0.0, 0.0),
    vec3(0.1, 0.4, 0.4),
    effect
  );
  
  // Add subtle vignette
  float vignette = 1.0 - smoothstep(0.0, 1.0, length(uv - 0.5) * 1.5);
  color *= vignette;
  
  // Output with subtle transparency
  gl_FragColor = vec4(color, effect * 0.5);
} 