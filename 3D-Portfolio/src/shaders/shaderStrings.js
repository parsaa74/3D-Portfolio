// Vertex shaders
export const vertexShader = `
// Paste content of vertex.glsl here
void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const wallVertexShader = `
// Paste content of wall.vert.glsl here
uniform float time;
varying vec2 vUv;
void main() {
  vUv = uv;
  vec3 newPosition = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
}
`;

// Fragment shaders
export const wallFragmentShader = `
// Paste content of wall.frag.glsl here
uniform float time;
varying vec2 vUv;
void main() {
  gl_FragColor = vec4(vUv, 0.5 + 0.5 * sin(time), 1.0);
}
`;

export const corridorShader = `
// Paste content of corridor.glsl here
// ... (actual shader code)
`; 