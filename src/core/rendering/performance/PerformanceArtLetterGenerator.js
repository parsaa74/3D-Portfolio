/**
 * PerformanceArtLetterGenerator.js
 * A specialized Three.js component that generates floating 3D letters that 
 * automatically form words related to performance art.
 */
import * as THREE from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { getAssetPath } from '../../../utils/assetPath.js';

// Performance art related vocabulary
const PERFORMANCE_ART_WORDS = [
  // Performance art concepts
  "performance", "ritual", "durational", "participatory", "interactive", 
  "embodiment", "presence", "ephemeral", "temporality", "authenticity",
  "gesture", "action", "movement", "body", "space", "time", "audience", 
  "spectator", "witness", "documentation", "liveness", "event", "happening",
  
  // Performance art techniques
  "endurance", "repetition", "duration", "transformation", "immersion",
  "intervention", "activation", "engagement", "intimacy", "vulnerability",
  
  // Performance art themes
  "identity", "memory", "trauma", "politics", "gender", "sexuality",
  "power", "technology", "nature", "ecology", "social", "cultural"
];

const FONT_PATH = getAssetPath('/assets/fonts/Noto Sans_Regular.typeface.json');

function shuffleArray(array) {
  // Fisher-Yates shuffle
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

const SPHERE_VERTEX_SHADER = `
varying vec3 vNormal;
varying vec3 vPosition;
varying vec2 vUv;
uniform float uTime;

// Simplex noise function (for vertex displacement)
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  // First corner
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  // Other corners
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;

  // Permutations
  i = mod289(i);
  vec4 p = permute(permute(permute(
             i.z + vec4(0.0, i1.z, i2.z, 1.0))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0))
           + i.x + vec4(0.0, i1.x, i2.x, 1.0));

  // Gradients: 7x7 points over a square, mapped onto an octahedron.
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);

  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);

  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;

  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);

  // Normalise gradients
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  // Mix final noise value
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}

void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);
  
  // Add "breathing" vertex displacement
  float time = uTime * 0.3;
  float displacementScale = 0.15;
  float noise1 = snoise(position * 0.9 + vec3(0.0, 0.0, time * 0.5)) * displacementScale;
  float noise2 = snoise(position * 1.4 + vec3(time * 0.7, 0.0, 0.0)) * displacementScale * 0.5;
  float breathing = sin(time) * 0.03 + 0.03;

  // Add a slow global scale pulse
  float pulse = 0.96 + 0.06 * sin(uTime * 0.7);
  
  // Combine displacement effects
  vec3 newPosition = position * (1.0 + breathing) * pulse;
  newPosition += normal * (noise1 + noise2);
  
  vPosition = vec3(modelMatrix * vec4(newPosition, 1.0));
  gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
}
`;

const SPHERE_FRAGMENT_SHADER = `
uniform float uTime;
uniform vec3 uColor;
uniform float uOpacity;

varying vec3 vNormal;
varying vec3 vPosition;
varying vec2 vUv;

// Simplex noise for FBM
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  // First corner
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  // Other corners
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;

  // Permutations
  i = mod289(i);
  vec4 p = permute(permute(permute(
             i.z + vec4(0.0, i1.z, i2.z, 1.0))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0))
           + i.x + vec4(0.0, i1.x, i2.x, 1.0));

  // Gradients: 7x7 points over a square, mapped onto an octahedron.
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);

  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);

  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;

  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);

  // Normalise gradients
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  // Mix final noise value
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}

// Fractional Brownian Motion
float fbm(vec3 x) {
  float v = 0.0;
  float a = 0.5;
  vec3 shift = vec3(100.0);
  for (int i = 0; i < 5; ++i) {
    v += a * snoise(x);
    x = x * 2.0 + shift;
    a *= 0.5;
  }
  return v;
}

// Custom Severance-inspired color palette
vec3 severancePalette(float t) {
  // Icy blue, pale green, ghostly white, subtle red
  vec3 a = vec3(0.65, 0.85, 1.0); // base icy blue
  vec3 b = vec3(0.2, 0.4, 0.2);   // greenish
  vec3 c = vec3(1.0, 1.0, 1.0);   // white
  vec3 d = vec3(0.7, 0.2, 0.2);   // subtle red
  return a + b * cos(6.28318 * (c * t + d));
}

void main() {
  float time = uTime * 0.2;
  
  // Layered FBM noise for depth
  vec3 p = vPosition * 0.6;
  float noise1 = fbm(p + vec3(time * 0.1, time * 0.2, time * 0.15));
  float noise2 = fbm(p * 2.0 + vec3(-time * 0.15, 0.0, time * 0.1));
  float noise3 = fbm(p * 0.7 + vec3(time * 0.05, -time * 0.1, time * 0.2));
  float finalNoise = mix(noise1, noise2, 0.5 + 0.5 * sin(time * 0.3));
  finalNoise = mix(finalNoise, noise3, 0.3);

  // Swirl for extra movement
  vec3 swirl = vPosition + vec3(
    sin(vPosition.y * 4.0 + time) * 0.1,
    sin(vPosition.z * 4.0 + time * 1.2) * 0.1,
    sin(vPosition.x * 4.0 + time * 0.7) * 0.1
  );
  float swirlNoise = fbm(swirl * 0.8);
  finalNoise = mix(finalNoise, swirlNoise, 0.4);

  // Color shifting (Severance palette)
  vec3 baseColor = severancePalette(finalNoise * 0.7 + time * 0.05);
  vec3 color = mix(baseColor, uColor, 0.25);

  // Enhanced fresnel edge glow (icy blue/white)
  float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.5);
  vec3 fresnelColor = mix(vec3(0.8, 0.95, 1.0), vec3(1.0, 1.0, 1.0), fresnel);
  color = mix(color, fresnelColor, fresnel * 1.2);

  // Soft specular highlight (fake light from above)
  vec3 lightDir = normalize(vec3(0.2, 0.7, 0.5));
  float spec = pow(max(dot(normalize(vNormal), lightDir), 0.0), 16.0);
  color += vec3(0.25, 0.32, 0.38) * spec * 0.5;

  // --- Artistic Enhancements ---
  // Animated veins/cracks
  float veinNoise = snoise(vPosition * 8.0 + vec3(time * 0.8, -time * 0.5, time * 0.3));
  float veins = smoothstep(0.18, 0.22, abs(veinNoise));
  color = mix(color, vec3(0.9, 0.2, 0.3), veins * 0.7); // reddish veins

  // Iridescence based on view angle
  vec3 viewDir = normalize(-vPosition);
  float iridescence = pow(1.0 - max(dot(vNormal, viewDir), 0.0), 2.0);
  vec3 iridescentColor = mix(vec3(0.7, 0.9, 1.0), vec3(1.0, 0.7, 0.9), sin(time + vPosition.x * 2.0));
  color = mix(color, iridescentColor, iridescence * 0.25);

  // Subtle expanding ripple effect
  float ripple = 0.5 + 0.5 * sin(10.0 * length(vPosition) - uTime * 2.0);
  float rippleMask = smoothstep(0.45, 0.55, ripple);
  color = mix(color, vec3(1.0, 1.0, 1.0), rippleMask * 0.12);

  // --- End Artistic Enhancements ---

  // Vary opacity based on noise and fresnel
  float alpha = uOpacity * (0.25 + finalNoise * 0.5) * (0.5 + fresnel * 1.2);

  // Add "nebula" effect with bright spots
  float brightSpots = smoothstep(0.6, 0.8, finalNoise);
  color += brightSpots * 0.7;
 
  // Add a soft radial core glow
  float coreGlow = 1.0 - smoothstep(0.0, 0.7, length(vPosition));
  color += vec3(0.7, 0.85, 1.0) * coreGlow * 0.25;

  gl_FragColor = vec4(color, alpha);
}
`;

// Particle class for the sphere particle system
class SphereParticle {
  constructor(radius) {
    this.position = new THREE.Vector3(
      (Math.random() - 0.5) * radius * 0.9,
      (Math.random() - 0.5) * radius * 0.9,
      (Math.random() - 0.5) * radius * 0.9
    );
    this.velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 0.01,
      (Math.random() - 0.5) * 0.01,
      (Math.random() - 0.5) * 0.01
    );
    this.size = Math.random() * 0.04 + 0.02;
    this.color = new THREE.Color();
    this.color.setHSL(Math.random(), 0.7, 0.7);
    this.life = 1.0;
  }
  
  update(deltaTime, radius) {
    // Update position based on velocity
    this.position.add(this.velocity.clone().multiplyScalar(deltaTime));
    
    // Contain within sphere
    const distance = this.position.length();
    if (distance > radius * 0.85) {
      this.position.normalize().multiplyScalar(radius * 0.85);
      // Bounce back with damping
      this.velocity.reflect(this.position.clone().normalize()).multiplyScalar(0.7);
    }
    
    // Add a small drift toward origin for stability
    const drift = this.position.clone().normalize().multiplyScalar(-0.001 * distance);
    this.velocity.add(drift);
    
    // Add a small random movement for organic feel
    this.velocity.x += (Math.random() - 0.5) * 0.002;
    this.velocity.y += (Math.random() - 0.5) * 0.002;
    this.velocity.z += (Math.random() - 0.5) * 0.002;
    
    // Dampen velocity
    this.velocity.multiplyScalar(0.99);
  }
}

/**
 * Letter Generator that creates floating 3D text based on performance art vocabulary
 */
export default class PerformanceArtLetterGenerator {
  constructor(parentGroup, position, radius = 2.0, wordsPerSet = 8) {
    this.parentGroup = parentGroup;
    this.position = position.clone();
    this.radius = radius * 1.1; // Slightly larger sphere
    this.font = null;
    this.isReady = false;
    this.letterSize = 0.15;
    this.wordMeshes = [];
    this.fadingOutMeshes = [];
    this.group = new THREE.Group();
    this.group.position.copy(this.position);
    this.parentGroup.add(this.group);
    this.wordChangeInterval = 4.0; // seconds
    this.timeSinceLastWord = 0;
    this.wordsPerSet = wordsPerSet;
    this.lastWords = [];
    this.wordList = shuffleArray([...PERFORMANCE_ART_WORDS]);
    this.loadFont();
    
    // Creative sphere with custom shader
    const sphereGeometry = new THREE.SphereGeometry(this.radius, 128, 128); // Higher segments for complex effects
    const sphereMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0.0 },
        uColor: { value: new THREE.Color(0x4fd7ff) }, // Base color
        uOpacity: { value: 1.0 } // Max opacity for more visible sphere
      },
      vertexShader: SPHERE_VERTEX_SHADER,
      fragmentShader: SPHERE_FRAGMENT_SHADER,
      transparent: true
    });
    this.boundingSphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    // The sphere now respects depth and will not be visible through walls.
    this.group.add(this.boundingSphere);
    
    // Initialize particle system
    this.particles = [];
    this.particleGeometry = new THREE.BufferGeometry();
    this.particlePositions = new Float32Array(100 * 3); // 100 particles x 3 coordinates
    this.particleSizes = new Float32Array(100);
    this.particleColors = new Float32Array(100 * 3); // 100 particles x RGB
    
    // Create particles
    for (let i = 0; i < 100; i++) {
      const particle = new SphereParticle(this.radius);
      this.particles.push(particle);
      
      // Set initial positions, sizes, and colors
      const idx = i * 3;
      this.particlePositions[idx] = particle.position.x;
      this.particlePositions[idx + 1] = particle.position.y;
      this.particlePositions[idx + 2] = particle.position.z;
      
      this.particleSizes[i] = particle.size;
      
      this.particleColors[idx] = particle.color.r;
      this.particleColors[idx + 1] = particle.color.g;
      this.particleColors[idx + 2] = particle.color.b;
    }
    
    // Set up particle geometry
    this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(this.particlePositions, 3));
    this.particleGeometry.setAttribute('size', new THREE.BufferAttribute(this.particleSizes, 1));
    this.particleGeometry.setAttribute('color', new THREE.BufferAttribute(this.particleColors, 3));
    
    // Create particle material and system
    const particleMaterial = new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    
    this.particleSystem = new THREE.Points(this.particleGeometry, particleMaterial);
    this.group.add(this.particleSystem);
    
    console.log("PerformanceArtLetterGenerator initialized");
  }
  
  /**
   * Load the font for 3D text
   */
  async loadFont() {
    try {
      console.log("Loading font...");
      const loader = new FontLoader();
      this.font = await new Promise((resolve, reject) => {
        loader.load(FONT_PATH, 
          (font) => resolve(font),
          undefined,
          (error) => {
            console.warn("Could not load font, using fallback:", error);
            reject(error);
          }
        );
      });
      this.isReady = true;
      console.log("Font loaded successfully");
      this.generateNextWordSet();
    } catch (error) {
      console.error("Font loading failed:", error);
      this.isReady = true;
      this.generateNextWordSet();
    }
  }
  
  /**
   * Start the word generation process
   */
  generateNextWordSet() {
    // Instead of hard clearing, fade out old words
    for (const mesh of this.wordMeshes) {
      mesh.userData.fadingOut = true;
      mesh.userData.fade = 1.0;
      if (mesh.material) mesh.material.transparent = true;
      if (mesh.userData.wordLight) mesh.userData.wordLight.intensity = 0.5;
    }
    this.fadingOutMeshes.push(...this.wordMeshes);
    // Pick N unique random words
    let availableWords = PERFORMANCE_ART_WORDS.filter(w => !this.lastWords.includes(w));
    if (availableWords.length < this.wordsPerSet) {
      availableWords = [...PERFORMANCE_ART_WORDS];
    }
    const chosenWords = shuffleArray([...availableWords]).slice(0, this.wordsPerSet);
    this.lastWords = chosenWords;
    this.wordMeshes = [];
    for (let i = 0; i < chosenWords.length; i++) {
      const word = chosenWords[i];
      let mesh, color, textGeometry, wordBoundingSphereRadius;
      // Try up to 10 times to find a position that fits fully inside the sphere
      let foundPosition = false;
      let attempt = 0;
      let x, y, z, r, basePos;
      while (!foundPosition && attempt < 10) {
        // Random position inside the sphere
        const u = Math.random();
        const v = Math.random();
        const theta = 2 * Math.PI * u;
        const phi = Math.acos(2 * v - 1);
        r = this.radius * 0.92 * Math.cbrt(Math.random()); // margin for bounding sphere
        x = r * Math.sin(phi) * Math.cos(theta);
        y = r * Math.sin(phi) * Math.sin(theta);
        z = r * Math.cos(phi);
        basePos = new THREE.Vector3(x, y, z);
        try {
          if (this.font) {
            textGeometry = new TextGeometry(word, {
              font: this.font,
              size: this.letterSize,
              height: this.letterSize / 4,
              curveSegments: 4,
              bevelEnabled: false
            });
            textGeometry.computeBoundingBox();
            textGeometry.computeBoundingSphere();
            const centerOffset = new THREE.Vector3();
            centerOffset.subVectors(
              textGeometry.boundingBox.max,
              textGeometry.boundingBox.min
            );
            centerOffset.multiplyScalar(-0.5);
            textGeometry.translate(centerOffset.x, centerOffset.y, centerOffset.z);
            wordBoundingSphereRadius = textGeometry.boundingSphere.radius;
            // Check if the word fits fully inside the sphere
            if (basePos.length() + wordBoundingSphereRadius <= this.radius * 0.97) {
              foundPosition = true;
            }
          } else {
            // Canvas fallback
            wordBoundingSphereRadius = this.letterSize * word.length * 0.5;
            if (basePos.length() + wordBoundingSphereRadius <= this.radius * 0.97) {
              foundPosition = true;
            }
          }
        } catch (error) {
          // fallback, just try again
        }
        attempt++;
      }
      if (!foundPosition) {
        // If we can't fit, skip this word
        continue;
      }
      try {
        if (this.font) {
          // textGeometry already created above
          const hue = Math.random();
          color = new THREE.Color().setHSL(hue, 0.8, 0.6);
          const material = new THREE.MeshStandardMaterial({
            color: color,
            emissive: color.clone(),
            emissiveIntensity: 2.0, // brighter
            roughness: 0.2,
            metalness: 0.8,
            transparent: false,
            opacity: 1.0 // fully visible
          });
          mesh = new THREE.Mesh(textGeometry, material);
          // Add black outline mesh
          const outlineMaterial = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide });
          const outlineMesh = new THREE.Mesh(textGeometry.clone(), outlineMaterial);
          outlineMesh.scale.multiplyScalar(1.08);
          mesh.add(outlineMesh);
        } else {
          const canvas = document.createElement('canvas');
          canvas.width = 512;
          canvas.height = 128;
          const ctx = canvas.getContext('2d');
          const hue = Math.random() * 360;
          ctx.fillStyle = `hsl(${hue}, 80%, 60%)`;
          ctx.fillRect(0, 0, 512, 128);
          ctx.fillStyle = 'white';
          ctx.font = 'bold 80px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(word, 256, 64);
          const texture = new THREE.CanvasTexture(canvas);
          const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: false,
            side: THREE.DoubleSide,
            opacity: 1.0
          });
          mesh = new THREE.Mesh(
            new THREE.PlaneGeometry(this.letterSize * word.length, this.letterSize),
            material
          );
          color = new THREE.Color().setHSL(hue/360, 0.8, 0.6);
          // Add black outline mesh
          const outlineMaterial = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide });
          const outlineMesh = new THREE.Mesh(mesh.geometry.clone(), outlineMaterial);
          outlineMesh.scale.multiplyScalar(1.08);
          mesh.add(outlineMesh);
        }
        mesh.userData.baseOrbitPosition = basePos;
        mesh.userData.floatPhase = Math.random() * Math.PI * 2;
        mesh.userData.rotationSpeed = Math.random() * 0.01 + 0.01;
        mesh.userData.floatSpeed = 0.5 + Math.random();
        mesh.userData.baseColor = color;
        mesh.userData.orbitAxis = new THREE.Vector3(Math.random()-0.5, Math.random()-0.5, Math.random()-0.5).normalize();
        mesh.userData.orbitSpeed = 0.1 + Math.random() * 0.2;
        mesh.userData.fade = 0.0; // start faded in
        mesh.userData.fadingIn = true;
        this.group.add(mesh);
        this.wordMeshes.push(mesh);
        // Add a point light to make the word glow
        const wordLight = new THREE.PointLight(
          color || new THREE.Color(0xffffff),
          0.7,  // Intensity
          1.2   // Distance
        );
        wordLight.position.copy(mesh.userData.baseOrbitPosition);
        mesh.userData.wordLight = wordLight;
        this.group.add(wordLight);
      } catch (error) {
        console.error(`Failed to create word mesh '${word}':`, error);
      }
    }
  }
  
  /**
   * Update the letter animation
   */
  update(deltaTime) {
    const t = performance.now() * 0.001;
    
    // Update shader uniforms for the sphere
    if (this.boundingSphere && this.boundingSphere.material.uniforms) {
      this.boundingSphere.material.uniforms.uTime.value = t;
    }
    
    // Update particles
    for (let i = 0; i < this.particles.length; i++) {
      const particle = this.particles[i];
      particle.update(deltaTime, this.radius);
      
      // Update particle geometry data
      const idx = i * 3;
      this.particlePositions[idx] = particle.position.x;
      this.particlePositions[idx + 1] = particle.position.y;
      this.particlePositions[idx + 2] = particle.position.z;
      
      // Animate particle color based on position and time
      particle.color.setHSL(
        (Math.sin(t * 0.1 + particle.position.length() * 0.5) * 0.5 + 0.5) % 1.0,
        0.7,
        0.7
      );
      
      this.particleColors[idx] = particle.color.r;
      this.particleColors[idx + 1] = particle.color.g;
      this.particleColors[idx + 2] = particle.color.b;
    }
    
    // Update the geometry attributes
    this.particleGeometry.attributes.position.needsUpdate = true;
    this.particleGeometry.attributes.color.needsUpdate = true;
    
    // Animate each word mesh independently
    for (const mesh of this.wordMeshes) {
      // Orbit animation (update baseOrbitPosition)
      if (mesh.userData.orbitAxis && mesh.userData.orbitSpeed) {
        const rotMat = new THREE.Matrix4().makeRotationAxis(mesh.userData.orbitAxis, mesh.userData.orbitSpeed * deltaTime);
        mesh.userData.baseOrbitPosition.applyMatrix4(rotMat);
      }
      // Floating animation (vertical sine wave)
      const floatPhase = mesh.userData.floatPhase || 0;
      const floatSpeed = mesh.userData.floatSpeed || 1.0;
      const basePos = mesh.userData.baseOrbitPosition || new THREE.Vector3();
      const floatOffset = Math.sin(t * floatSpeed + floatPhase) * 0.25;
      mesh.position.set(basePos.x, basePos.y + floatOffset, basePos.z);
      // Gentle rotation
      mesh.rotation.y += (mesh.userData.rotationSpeed || 0.01) * deltaTime * 60;
      // Color/emissive pulsing
      if (mesh.material && mesh.material.emissive) {
        const pulse = 0.5 + 0.5 * Math.sin(t * 2.0 + floatPhase);
        const baseColor = mesh.userData.baseColor || new THREE.Color(1,1,1);
        mesh.material.emissiveIntensity = 0.3 + 0.7 * pulse;
        mesh.material.emissive.copy(baseColor).multiplyScalar(0.7 + 0.3 * pulse);
      }
      // Fade in
      if (mesh.userData.fadingIn) {
        mesh.userData.fade += deltaTime * 2.0;
        if (mesh.userData.fade >= 1.0) {
          mesh.userData.fade = 1.0;
          mesh.userData.fadingIn = false;
        }
        if (mesh.material) mesh.material.opacity = mesh.userData.fade;
        if (mesh.userData.wordLight) mesh.userData.wordLight.intensity = 0.5 * mesh.userData.fade;
      }
    }
    // Animate fading out meshes
    for (let i = this.fadingOutMeshes.length - 1; i >= 0; i--) {
      const mesh = this.fadingOutMeshes[i];
      mesh.userData.fade -= deltaTime * 2.0;
      if (mesh.userData.fade <= 0.0) {
        // Remove and dispose
        if (mesh.userData.wordLight) {
          this.group.remove(mesh.userData.wordLight);
          mesh.userData.wordLight.dispose && mesh.userData.wordLight.dispose();
        }
        this.group.remove(mesh);
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) mesh.material.dispose();
        this.fadingOutMeshes.splice(i, 1);
        continue;
      }
      if (mesh.material) mesh.material.opacity = mesh.userData.fade;
      if (mesh.userData.wordLight) mesh.userData.wordLight.intensity = 0.5 * mesh.userData.fade;
    }
    // Automatic word set cycling
    this.timeSinceLastWord += deltaTime;
    if (this.timeSinceLastWord >= this.wordChangeInterval) {
      this.timeSinceLastWord = 0;
      this.generateNextWordSet();
    }
  }
  
  /**
   * Clean up resources
   */
  dispose() {
    console.log("Disposing PerformanceArtLetterGenerator");
    this.clearCurrentWords();
    
    if (this.boundingSphere) {
      this.boundingSphere.geometry.dispose();
      this.boundingSphere.material.dispose();
      this.group.remove(this.boundingSphere);
    }
    
    // Dispose of particle system
    if (this.particleSystem) {
      if (this.particleGeometry) this.particleGeometry.dispose();
      if (this.particleSystem.material) this.particleSystem.material.dispose();
      this.group.remove(this.particleSystem);
      this.particleSystem = null;
      this.particles = [];
    }
    
    if (this.parentGroup && this.group) {
      this.parentGroup.remove(this.group);
    }
  }
}