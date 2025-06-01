import { THREE } from "./src/utils/ThreeJSLoader.js";

// Minimalist shader effects for Severance opening screen
// Inspired by Mr. Doob's approach

// Uniform variables passed to shaders
const uniforms = {
  time: { value: 0 },
  resolution: { value: new THREE.Vector2() },
};

// Vertex shader
const vertexShader = `
  varying vec2 vUv;
  
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Fragment shader - Minimal grid effect
const gridFragmentShader = `
  uniform float time;
  uniform vec2 resolution;
  varying vec2 vUv;
  
  float line(vec2 p, vec2 a, vec2 b, float width) {
    vec2 pa = p - a;
    vec2 ba = b - a;
    float t = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    float d = length(pa - ba * t);
    return smoothstep(0.0, width, d);
  }
  
  void main() {
    // Normalized coordinates (0 to 1)
    vec2 uv = vUv;
    
    // Create a clean grid
    vec2 grid = fract(uv * 20.0);
    float gridLines = 1.0 - smoothstep(0.05, 0.06, min(grid.x, grid.y));
    
    // Add time-based movement
    float offset = sin(time * 0.2) * 0.01;
    
    // Create pulsing effect
    float pulse = 0.5 + 0.5 * sin(time * 0.5);
    
    // Final color is a subtle blue-green grid
    vec3 color = vec3(0.05, 0.1, 0.15) + 
                 gridLines * vec3(0.0, 0.15, 0.2) * pulse;
    
    // Add subtle vignette
    float vignette = 1.0 - smoothstep(0.0, 1.0, length(uv - 0.5) * 1.5);
    color *= vignette;
    
    // Output color
    gl_FragColor = vec4(color, 0.3);
  }
`;

// Fragment shader - Data flow effect
const dataFlowFragmentShader = `
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
`;

// Initialize shader effects
function initShaderEffects(containerId) {
  // Create Three.js scene
  const container = document.getElementById(containerId);
  if (!container) return;

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const renderer = new THREE.WebGLRenderer({ alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(window.devicePixelRatio);
  container.appendChild(renderer.domElement);

  // Create shader planes
  const geometry = new THREE.PlaneGeometry(2, 2);

  // Grid shader
  const gridUniforms = {
    time: { value: 0 },
    resolution: {
      value: new THREE.Vector2(window.innerWidth, window.innerHeight),
    },
  };

  const gridMaterial = new THREE.ShaderMaterial({
    uniforms: gridUniforms,
    vertexShader: vertexShader,
    fragmentShader: gridFragmentShader,
    transparent: true,
    blending: THREE.AdditiveBlending,
  });

  const gridPlane = new THREE.Mesh(geometry, gridMaterial);
  scene.add(gridPlane);

  // Data flow shader
  const dataUniforms = {
    time: { value: 0 },
    resolution: {
      value: new THREE.Vector2(window.innerWidth, window.innerHeight),
    },
  };

  const dataMaterial = new THREE.ShaderMaterial({
    uniforms: dataUniforms,
    vertexShader: vertexShader,
    fragmentShader: dataFlowFragmentShader,
    transparent: true,
    blending: THREE.AdditiveBlending,
  });

  const dataPlane = new THREE.Mesh(geometry, dataMaterial);
  scene.add(dataPlane);

  // Animation loop
  function animate() {
    requestAnimationFrame(animate);

    const time = performance.now() * 0.001;

    gridUniforms.time.value = time;
    dataUniforms.time.value = time;

    renderer.render(scene, camera);
  }

  // Handle resize
  function onWindowResize() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    gridUniforms.resolution.value.set(window.innerWidth, window.innerHeight);
    dataUniforms.resolution.value.set(window.innerWidth, window.innerHeight);
  }

  window.addEventListener("resize", onWindowResize, false);

  // Start animation
  animate();

  return {
    scene,
    camera,
    renderer,
  };
}

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", function () {
  // Create shader container
  const shaderContainer = document.createElement("div");
  shaderContainer.id = "shader-container";
  shaderContainer.style.cssText = `
    position: absolute; 
    top: 0; 
    left: 0; 
    width: 100%; 
    height: 100%; 
    z-index: 2; 
    pointer-events: none;
  `;
  document.getElementById("lumon-welcome").appendChild(shaderContainer);

  // Initialize shaders
  initShaderEffects("shader-container");
});
