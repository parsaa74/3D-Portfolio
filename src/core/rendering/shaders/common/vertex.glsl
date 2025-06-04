// Outputs to fragment shader
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewDir;
varying vec4 vWorldPosition;
varying vec3 vPosition;

void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);
  vPosition = position;
  
  // Calculate world position for reflections
  vWorldPosition = modelViewMatrix * vec4(position, 1.0);
  vViewDir = normalize(cameraPosition - vWorldPosition.xyz);
  
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
} 