import { THREE, initThreeJS, loadAddon } from "./src/utils/ThreeJSLoader.js";
import { CorridorSystem } from "./src/systems/corridorSystem.js";
import { UnifiedMovementController } from "./src/systems/movement/UnifiedMovementController.js";

// 3D Environment for Lumon Interior
// By Tim Rodenbroker - Severance: The Game

// Object containers for 3D assets
let lumonGeometry = {};
let lumonMaterials = {};
let lumonObjects = {};

// Lazy loaded modules
let OrbitControls;
let EffectComposer;
let RenderPass;
let ShaderPass;
let CopyShader;
let ColorCorrectionShader;

// MDR department standalone environment
class MDREnvironment {
  constructor() {
    console.log("Creating MDR Environment instance");
    this.threeContainer = null;
    this.threeScene = null;
    this.threeCamera = null;
    this.threeRenderer = null;
    this.composer = null;
    this.initialized = false;
    this.assets = {
      models: {},
      textures: {},
      geometries: {},
      materials: {},
    };

    // Performance settings
    this.useSharedRenderer = true;
    this.skipOwnRenderLoop = true;
    this.lastFrameTime = 0;
    this.frameCount = 0;
    this.fpsUpdateInterval = 1000; // Update FPS every second
    this.targetFPS = 60;
    this.qualityLevel = 1.0; // Dynamic quality scaling

    setTimeout(() => this.init(), 100);
  }

  init(containerId = "three-container") {
    console.log("Initializing optimized Lumon Environment");

    this.threeContainer = document.getElementById(containerId);
    if (!this.threeContainer) {
      console.error("No container found for 3D environment");
      return;
    }

    console.log("3D container found:", this.threeContainer);

    // Use shared renderer if available
    if (window.threeScene && this.useSharedRenderer) {
      console.log("Using shared THREE.js resources");
      this.threeScene = window.threeScene;
      this.threeCamera = window.threeCamera;
      this.renderer = window.renderer;
    } else {
      this.initializeNewScene();
    }

    // Initialize post-processing with minimal effects
    this.initPostProcessing()
      .then((composer) => {
        this.composer = composer;

        // Set up performance monitoring
        this.setupPerformanceMonitoring();

        this.initialized = true;
        this.animate();
      })
      .catch((err) => {
        console.error("Failed to initialize post-processing:", err);

        // Continue without post-processing
        this.setupPerformanceMonitoring();
        this.initialized = true;
        this.animate();
      });
  }

  // Lazy load post-processing modules and initialize them
  async initPostProcessing() {
    try {
      // Load post-processing modules
      EffectComposer = await loadAddon("EffectComposer");
      RenderPass = await loadAddon("RenderPass");
      ShaderPass = await loadAddon("ShaderPass");
      CopyShader = await loadAddon("CopyShader");
      ColorCorrectionShader = await loadAddon("ColorCorrectionShader");

      if (!this.renderer) return null;

      // Create the effect composer
      const composer = new EffectComposer(this.renderer);

      // Add passes
      const renderPass = new RenderPass(this.threeScene, this.threeCamera);
      composer.addPass(renderPass);

      // Optional color correction
      if (ColorCorrectionShader) {
        const colorPass = new ShaderPass(ColorCorrectionShader);
        colorPass.uniforms.powRGB.value.set(1.1, 1.1, 1.1);
        colorPass.uniforms.mulRGB.value.set(1.2, 1.2, 1.2);
        composer.addPass(colorPass);
      }

      // Final output pass
      const copyPass = new ShaderPass(CopyShader);
      copyPass.renderToScreen = true;
      composer.addPass(copyPass);

      return composer;
    } catch (error) {
      console.warn("Error initializing post-processing:", error);
      return null;
    }
  }

  hideRenderer() {
    if (this.renderer && this.renderer.domElement) {
      this.renderer.domElement.style.display = "none";
    }
  }

  showRenderer() {
    if (this.renderer && this.renderer.domElement) {
      this.renderer.domElement.style.display = "block";
    }
  }
}

// Main Lumon Environment
export class LumonEnvironment {
  constructor() {
    // No need to check if THREE is defined since we're importing it directly
    console.log("Creating LumonEnvironment instance");

    // Initialize properties
    this.threeContainer = null;
    this.threeScene = null;
    this.threeCamera = null;
    this.threeRenderer = null;
    this.composer = null;
    this.controls = null;
    this.clock = new THREE.Clock();
    this.initialized = false;

    this.corridorSystem = null;
    this.materials = null;
    this.useSharedRenderer = true;
    this.pauseRendering = false;
    this.frameCount = 0;
    this.lastFrameTime = 0;
    this.fpsUpdateInterval = 1000;
    this.targetFPS = 60;
    this.qualityLevel = 1.0;

    // Add movement controller
    this.movementController = null;

    this.initializationPromise = this.initialize();
  }

  async initialize() {
    try {
      // Set up Three.js scene
      this.threeScene = new THREE.Scene();
      this.threeScene.background = new THREE.Color(0x090909);
      window.threeScene = this.threeScene;

      // Add ambient light
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
      this.threeScene.add(ambientLight);

      // Add directional light
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(5, 5, 5);
      this.threeScene.add(directionalLight);

      // Camera setup
      this.threeCamera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
      );
      this.threeCamera.position.set(0, 1.8, 0);
      this.threeCamera.lookAt(0, 1.8, 5);
      window.threeCamera = this.threeCamera;

      // Initialize renderer
      await this.initializeRenderer();

      // Initialize materials
      this.initializeMaterials();

      // Initialize corridor system
      await this.initializeCorridorSystem();

      // Initialize movement controller after camera setup
      this.movementController = new UnifiedMovementController(this.threeCamera);

      // Set initial position
      this.movementController.position.set(0, 1.8, 9.5);
      this.movementController.rotation.y = Math.PI;

      // Set up event listeners
      window.addEventListener("resize", this.onWindowResize.bind(this));

      this.initialized = true;
      console.log("LumonEnvironment initialized successfully");
    } catch (error) {
      console.error("Initialization error:", error);
      this.handleInitializationError(error);
      throw error;
    }
  }

  async initializeRenderer() {
    try {
      // Check for WebGL support
      const canvas = document.createElement("canvas");
      const gl =
        canvas.getContext("webgl") || canvas.getContext("experimental-webgl");

      if (!gl) {
        throw new Error("WebGL not supported");
      }

      this.renderer = new THREE.WebGLRenderer({
        antialias: false,
        precision: "mediump",
        powerPreference: "high-performance",
        alpha: false,
        stencil: false,
        depth: true,
        failIfMajorPerformanceCaveat: true,
      });

      const pixelRatio = Math.min(window.devicePixelRatio, 1);
      this.renderer.setPixelRatio(pixelRatio);
      this.renderer.setSize(window.innerWidth, window.innerHeight);

      this.renderer.domElement.style.position = "absolute";
      this.renderer.domElement.style.top = "0";
      this.renderer.domElement.style.left = "0";
      this.renderer.domElement.style.zIndex = "-1";

      // Make renderer globally available
      window.renderer = this.renderer;

      document.body.appendChild(this.renderer.domElement);
      return true;
    } catch (error) {
      this.displayWebGLError();
      throw error;
    }
  }

  async initializeCorridorSystem() {
    try {
      // Create and initialize corridor system
      this.corridorSystem = new CorridorSystem(this.threeScene, this.materials);
      await this.corridorSystem.initialize();

      console.log("Corridor system initialized successfully");
    } catch (error) {
      console.error("Error initializing corridor system:", error);
      throw error;
    }
  }

  initializeMaterials() {
    // Create a materials object to store all materials
    this.materials = {
      wall: new THREE.MeshStandardMaterial({
        color: window.WALL_COLOR || 0xffffff,
        metalness: 0.1,
        roughness: 0.8,
        side: THREE.DoubleSide,
      }),
      floor: new THREE.MeshStandardMaterial({
        color: window.FLOOR_COLOR || 0xf0f0f0,
        metalness: 0.2,
        roughness: 0.7,
        side: THREE.DoubleSide,
      }),
      ceiling: new THREE.MeshStandardMaterial({
        color: window.CEILING_COLOR || 0xffffff,
        metalness: 0.1,
        roughness: 0.9,
        side: THREE.DoubleSide,
      }),
      trim: new THREE.MeshStandardMaterial({
        color: window.CORRIDOR_BASEBOARD_COLOR || 0x222222,
        metalness: 0.3,
        roughness: 0.7,
        side: THREE.DoubleSide,
      }),
      door: new THREE.MeshStandardMaterial({
        color: 0x808080,
        metalness: 0.4,
        roughness: 0.6,
        side: THREE.DoubleSide,
      }),
      light: new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xffffff,
        emissiveIntensity: 0.5,
        metalness: 0.1,
        roughness: 0.8,
      }),
      emergencyLight: new THREE.MeshStandardMaterial({
        color: 0xff0000,
        emissive: 0xff0000,
        emissiveIntensity: 0.8,
        metalness: 0.1,
        roughness: 0.9,
      }),
      glass: new THREE.MeshStandardMaterial({
        color: 0xffffff,
        metalness: 0.1,
        roughness: 0.1,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide,
      }),
      metalTrim: new THREE.MeshStandardMaterial({
        color: 0x404040,
        metalness: 0.8,
        roughness: 0.2,
        side: THREE.DoubleSide,
      }),
    };

    // Store materials globally if needed
    window.lumonMaterials = this.materials;
  }

  handleInitializationError(error) {
    console.error("Initialization error:", error);
    const errorDiv = document.createElement("div");
    errorDiv.style.position = "absolute";
    errorDiv.style.top = "50%";
    errorDiv.style.left = "50%";
    errorDiv.style.transform = "translate(-50%, -50%)";
    errorDiv.style.padding = "20px";
    errorDiv.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
    errorDiv.style.color = "white";
    errorDiv.style.borderRadius = "5px";
    errorDiv.style.textAlign = "center";
    errorDiv.innerHTML = `
      <h2>Initialization Error</h2>
      <p>${error.message}</p>
      <p>Please try:</p>
      <ul style="text-align: left;">
        <li>Refreshing the page</li>
        <li>Clearing your browser cache</li>
        <li>Checking your console for detailed errors</li>
      </ul>
    `;
    document.body.appendChild(errorDiv);
  }

  displayWebGLError() {
    const errorDiv = document.createElement("div");
    errorDiv.style.position = "absolute";
    errorDiv.style.top = "50%";
    errorDiv.style.left = "50%";
    errorDiv.style.transform = "translate(-50%, -50%)";
    errorDiv.style.padding = "20px";
    errorDiv.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
    errorDiv.style.color = "white";
    errorDiv.style.borderRadius = "5px";
    errorDiv.style.textAlign = "center";
    errorDiv.innerHTML = `
      <h2>WebGL Error</h2>
      <p>Your browser doesn't support WebGL or it's disabled.</p>
      <p>Please try:</p>
      <ul style="text-align: left;">
        <li>Enabling hardware acceleration in your browser</li>
        <li>Updating your graphics drivers</li>
        <li>Using a different browser (like Chrome or Firefox)</li>
      </ul>
    `;
    document.body.appendChild(errorDiv);
  }

  animate() {
    if (!this.initialized || this.pauseRendering) return;

    requestAnimationFrame(() => this.animate());

    // Update movement controller
    if (this.movementController) {
      const deltaTime = this.clock.getDelta();
      this.movementController.update(deltaTime);
    }

    this.updatePerformance();

    // Use composer only if post-processing is needed
    if (this.composer && !this.useSharedRenderer) {
      this.composer.render();
    } else {
      this.renderer.render(this.threeScene, this.threeCamera);
    }
  }

  dispose() {
    if (this.corridorSystem) {
      this.corridorSystem.dispose();
    }

    // Clean up Three.js resources
    if (this.threeScene) {
      this.threeScene.traverse((object) => {
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
    }

    if (this.renderer) {
      this.renderer.dispose();
    }

    window.removeEventListener("resize", this.onWindowResize.bind(this));

    // Dispose movement controller
    if (this.movementController) {
      this.movementController.dispose();
    }

    this.initialized = false;
  }

  onWindowResize() {
    if (!this.initialized) return;

    this.threeCamera.aspect = window.innerWidth / window.innerHeight;
    this.threeCamera.updateProjectionMatrix();

    if (!this.useSharedRenderer) {
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      if (this.composer) {
        this.composer.setSize(window.innerWidth, window.innerHeight);
      }
    }
  }

  updatePerformance() {
    const now = performance.now();
    this.frameCount++;

    if (now - this.lastFrameTime >= this.fpsUpdateInterval) {
      const fps = (this.frameCount * 1000) / (now - this.lastFrameTime);

      // Adjust quality based on FPS
      if (fps < this.targetFPS * 0.8) {
        this.qualityLevel = Math.max(0.5, this.qualityLevel - 0.1);
        this.renderer.setPixelRatio(
          Math.min(window.devicePixelRatio * this.qualityLevel, 2)
        );
      } else if (fps > this.targetFPS * 0.9 && this.qualityLevel < 1) {
        this.qualityLevel = Math.min(1.0, this.qualityLevel + 0.1);
        this.renderer.setPixelRatio(
          Math.min(window.devicePixelRatio * this.qualityLevel, 2)
        );
      }

      this.frameCount = 0;
      this.lastFrameTime = now;
    }
  }

  updateCamera() {
    if (!this.threeCamera || !window.playerPosition) return;

    // Update camera position from player position
    this.threeCamera.position.x = window.playerPosition.x;
    this.threeCamera.position.y = window.playerPosition.y;
    this.threeCamera.position.z = window.playerPosition.z;

    // Update camera rotation from player rotation and pitch
    const pitch = window.cameraPitch || 0;
    const rotation = window.playerRotation || 0;

    // Create a quaternion for rotation
    const quaternion = new THREE.Quaternion();
    quaternion.setFromEuler(new THREE.Euler(pitch, rotation, 0, "YXZ"));
    this.threeCamera.quaternion.copy(quaternion);
  }

  // Add initPostProcessing method for LumonEnvironment
  async initPostProcessing() {
    try {
      // Load post-processing modules
      EffectComposer = await loadAddon("EffectComposer");
      RenderPass = await loadAddon("RenderPass");
      ShaderPass = await loadAddon("ShaderPass");
      CopyShader = await loadAddon("CopyShader");
      ColorCorrectionShader = await loadAddon("ColorCorrectionShader");

      if (!this.renderer) return null;

      // Create the effect composer
      const composer = new EffectComposer(this.renderer);

      // Add passes
      const renderPass = new RenderPass(this.threeScene, this.threeCamera);
      composer.addPass(renderPass);

      // Optional color correction
      if (ColorCorrectionShader) {
        const colorPass = new ShaderPass(ColorCorrectionShader);
        colorPass.uniforms.powRGB.value.set(1.1, 1.1, 1.1);
        colorPass.uniforms.mulRGB.value.set(1.2, 1.2, 1.2);
        composer.addPass(colorPass);
      }

      // Final output pass
      const copyPass = new ShaderPass(CopyShader);
      copyPass.renderToScreen = true;
      composer.addPass(copyPass);

      return composer;
    } catch (error) {
      console.warn("Error initializing post-processing:", error);
      return null;
    }
  }

  update() {
    if (!this.initialized || this.pauseRendering) return;

    const delta = this.clock.getDelta();

    // Update movement controller if it exists
    if (this.movementController) {
      this.movementController.update(delta);
    }

    // Update corridor system if it exists and has an update method
    if (
      this.corridorSystem &&
      typeof this.corridorSystem.update === "function"
    ) {
      this.corridorSystem.update(delta);
    }

    this.frameCount++;
    const currentTime = performance.now();

    // Update FPS counter every second
    if (currentTime - this.lastFrameTime >= this.fpsUpdateInterval) {
      const fps = (this.frameCount * 1000) / (currentTime - this.lastFrameTime);
      this.frameCount = 0;
      this.lastFrameTime = currentTime;

      // Dynamic quality adjustment based on FPS
      if (fps < this.targetFPS * 0.8) {
        this.qualityLevel = Math.max(0.5, this.qualityLevel - 0.1);
      } else if (fps > this.targetFPS * 1.2) {
        this.qualityLevel = Math.min(1.0, this.qualityLevel + 0.1);
      }
    }
  }

  render() {
    if (!this.initialized || this.pauseRendering) return;

    if (this.composer && this.qualityLevel >= 0.8) {
      this.composer.render();
    } else if (this.threeRenderer && this.threeScene && this.threeCamera) {
      this.threeRenderer.render(this.threeScene, this.threeCamera);
    }
  }
}

// Initialize and start animation loop
function init3DAndAnimate() {
  const mdrEnv = new MDREnvironment();
  mdrEnv.hideRenderer(); // Start hidden until innie state is active
  window.isThreeJSActive = false;
  mdrEnv.animate();
}

// Severance: The Game - 3D Environment
// Handles the Three.js implementation for the Lumon office corridors
