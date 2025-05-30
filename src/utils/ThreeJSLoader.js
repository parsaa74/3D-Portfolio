/**
 * ThreeJSLoader.js
 *
 * This file provides a centralized way to import and access Three.js
 * and its various modules. This ensures consistent imports across the project.
 */

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass";
import { CopyShader } from "three/examples/jsm/shaders/CopyShader";
import { ColorCorrectionShader } from "three/examples/jsm/shaders/ColorCorrectionShader";

// Track singleton instance
let instance = null;

// Export all modules
export {
  THREE,
  GLTFLoader,
  DRACOLoader,
  OrbitControls,
  PointerLockControls,
  RGBELoader,
  GLTFExporter,
  EffectComposer,
  RenderPass,
  ShaderPass,
  UnrealBloomPass,
  CopyShader,
  ColorCorrectionShader,
};

// Optimize renderer creation with proper defaults
function createOptimizedRenderer(options) {
  const renderer = new THREE.WebGLRenderer({
    antialias: options.antialias,
    powerPreference: "high-performance",
    precision: options.precision || "mediump",
    alpha: false, // Disable alpha for better performance
    stencil: false, // Disable stencil buffer if not needed
    depth: true,
    logarithmicDepthBuffer: false, // Disable logarithmic depth buffer for better performance
  });

  // Optimize renderer settings
  renderer.setPixelRatio(
    Math.min(window.devicePixelRatio, options.maxPixelRatio || 1.5)
  );
  renderer.shadowMap.enabled = options.shadows || false;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate = false; // Manual shadow updates only
  renderer.physicallyCorrectLights = false; // Disable for better performance

  // Set explicit memory management
  renderer.info.autoReset = false; // Manual stat resets

  return renderer;
}

// Optimize scene creation with proper update settings
function createOptimizedScene() {
  const scene = new THREE.Scene();
  scene.matrixAutoUpdate = true;
  scene.autoUpdate = true;
  return scene;
}

/**
 * Initialize Three.js and return basic components
 * @param {Object} options - Configuration options
 * @param {string} options.containerId - ID of the container element
 * @param {boolean} options.antialias - Whether to use antialiasing
 * @param {number} options.fov - Field of view for the camera
 * @returns {Object} - Object containing scene, camera, and renderer
 */
export function initThreeJS(options = {}) {
  // Return existing instance if already initialized
  if (instance) {
    console.log("Reusing existing Three.js instance");
    return instance;
  }

  const {
    containerId = "three-container",
    antialias = false,
    fov = 75,
    maxPixelRatio = 1.5,
    shadows = false,
    precision = "mediump",
  } = options;

  // Get container element
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Container element with ID "${containerId}" not found`);
    return null;
  }

  // Create optimized scene and components
  const scene = createOptimizedScene();
  const camera = new THREE.PerspectiveCamera(
    fov,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.set(0, 1.6, 0);

  const renderer = createOptimizedRenderer({
    antialias,
    maxPixelRatio,
    shadows,
    precision,
  });

  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  // Create instance with proper methods
  instance = {
    scene,
    camera,
    renderer,
    update: function () {
      if (shadows) {
        renderer.shadowMap.needsUpdate = true;
      }
      renderer.info.reset();
    },
    getMemoryInfo: function () {
      return renderer.info.memory;
    },
  };

  // Set up optimized resize handling
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  return instance;
}

/**
 * Dispose of Three.js resources
 */
export function disposeThreeJS() {
  if (!instance) return;

  const { scene, renderer } = instance;

  // Dispose of scene objects
  scene.traverse((object) => {
    if (object.geometry) {
      object.geometry.dispose();
    }
    if (object.material) {
      if (Array.isArray(object.material)) {
        object.material.forEach((material) => material.dispose());
      } else {
        object.material.dispose();
      }
    }
  });

  // Dispose of renderer
  renderer.dispose();

  // Clear instance
  instance = null;
}
