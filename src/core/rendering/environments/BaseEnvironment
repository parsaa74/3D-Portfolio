import * as THREE from "three";
import { PerformanceMonitor } from "../performance/PerformanceMonitor.js";
import { PostProcessingManager } from "../postprocessing/PostProcessingManager.js";

/**
 * BaseEnvironment - Foundation for all 3D environments in Severance
 * Provides core functionality for scene management, rendering, and resource handling
 * @abstract
 */
export class BaseEnvironment {
  /**
   * Create a new BaseEnvironment
   * @param {Object} options - Configuration options
   * @param {string} options.containerId - ID of the container element
   * @param {boolean} options.usePostProcessing - Whether to use post-processing effects
   * @param {boolean} options.usePerformanceMonitoring - Whether to monitor performance
   * @param {number} options.cameraHeight - Camera height in meters (default: 1.7m - average human eye level)
   * @param {number} options.fov - Field of view for camera
   * @param {number} options.near - Near clipping plane
   * @param {number} options.far - Far clipping plane
   */
  constructor(options = {}) {
    // Core components
    this.container = null;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.composer = null;
    this.clock = new THREE.Clock();

    // Configuration
    this.options = {
      containerId: "three-container",
      usePostProcessing: false,
      usePerformanceMonitoring: true,
      cameraHeight: 1.7,
      fov: 75,
      near: 0.1,
      far: 1000,
      ...options,
    };

    // Asset management
    this.assets = {
      models: new Map(),
      textures: new Map(),
      geometries: new Map(),
      materials: new Map(),
      lights: new Map(),
    };

    // Systems management
    this.systems = new Map();

    // Performance monitoring
    if (this.options.usePerformanceMonitoring) {
      this.performanceMonitor = new PerformanceMonitor();
    }

    // Bind methods to preserve context
    this._onWindowResize = this._onWindowResize.bind(this);
    this.animate = this.animate.bind(this);

    this._isAnimating = false;
  }

  /**
   * Initialize the environment
   * @returns {Promise<boolean>} - True if initialization was successful
   */
  async initialize() {
    console.log("Initializing environment...");

    try {
      // Get container
      this.container = document.getElementById(this.options.containerId);
      if (!this.container) {
        throw new Error(
          `Container with id ${this.options.containerId} not found`
        );
      }

      // Initialize core components
      await this.initializeScene();
      await this.initializeRenderer();
      await this.initializeSystems();

      // Set up post-processing if enabled
      if (this.options.usePostProcessing) {
        this.postProcessing = new PostProcessingManager(
          this.scene,
          this.camera,
          this.renderer
        );
        await this.postProcessing.initialize();
      }

      // Set up event listeners
      window.addEventListener("resize", this._onWindowResize, false);

      // Set up pointer lock on canvas
      this._setupPointerLock();

      // Start animation loop
      if (!this._isAnimating) {
        this._isAnimating = true;
        this.animate();
      }

      console.log("Environment initialized successfully");
      return true;
    } catch (error) {
      this.handleInitializationError(error);
      return false;
    }
  }

  /**
   * Initialize the Three.js scene
   * @protected
   */
  async initializeScene() {
    // Create scene with default background
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);

    // Create camera
    this.camera = new THREE.PerspectiveCamera(
      this.options.fov,
      window.innerWidth / window.innerHeight,
      this.options.near,
      this.options.far
    );

    // Set initial camera position
    this.camera.position.set(0, this.options.cameraHeight, 0);

    // Make camera globally accessible for systems integration
    window.threeCamera = this.camera;
    window.playerPosition = this.camera.position;

    // Add default ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    this.scene.add(ambientLight);
    this.assets.lights.set("ambient", ambientLight);
  }

  /**
   * Initialize the WebGL renderer
   * @protected
   */
  async initializeRenderer() {
    // Create renderer with optimal settings
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
      stencil: false,
    });

    // Configure renderer
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    // Add to container
    this.container.appendChild(this.renderer.domElement);
  }

  /**
   * Initialize environment systems
   * @protected
   */
  async initializeSystems() {
    // Override in subclasses to initialize specific systems
  }

  /**
   * Update the environment state
   * @protected
   */
  update() {
    const deltaTime = this.clock.getDelta();

    // Start performance monitoring if enabled
    if (this.performanceMonitor) {
      this.performanceMonitor.begin();
    }

    // Create a cloneable position vector if camera exists
    const position = this.camera
      ? new THREE.Vector3().copy(this.camera.position)
      : null;

    // Update systems
    for (const system of this.systems.values()) {
      if (system.update) {
        system.update(deltaTime, position);
      }
    }

    // Update materials if available
    if (this.materials && typeof this.materials.update === "function") {
      this.materials.update(deltaTime);
    }
  }

  /**
   * Render the scene
   * @protected
   */
  render() {
    if (this.options.usePostProcessing && this.composer) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }

    if (this.performanceMonitor) {
      this.performanceMonitor.end();
    }
  }

  /**
   * Animation loop
   * @protected
   */
  animate() {
    if (!this._isAnimating) return;
    requestAnimationFrame(this.animate);
    this.update();
    this.render();
  }

  /**
   * Handle window resize
   * @private
   */
  _onWindowResize() {
    if (!this.camera || !this.renderer) return;

    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(window.innerWidth, window.innerHeight);

    if (this.composer) {
      this.composer.setSize(window.innerWidth, window.innerHeight);
    }

    // Update materials if available
    if (this.materials && typeof this.materials.handleResize === "function") {
      this.materials.handleResize();
    }
  }

  /**
   * Handle initialization errors
   * @protected
   * @param {Error} error - The error that occurred
   */
  handleInitializationError(error) {
    console.error("Environment initialization error:", error);

    // Check for WebGL support
    if (error.message.includes("WebGL")) {
      this.displayWebGLError();
    }
  }

  /**
   * Display WebGL error message
   * @protected
   */
  displayWebGLError() {
    const message = document.createElement("div");
    message.style.cssText = "padding: 20px; text-align: center; color: red;";
    message.textContent =
      "WebGL is not supported or has been disabled. Please check your browser settings.";
    this.container.appendChild(message);
  }

  /**
   * Clean up resources
   */
  dispose() {
    // Remove event listeners
    window.removeEventListener("resize", this._onWindowResize);

    // Dispose of systems
    for (const system of this.systems.values()) {
      if (system.dispose) {
        system.dispose();
      }
    }
    this.systems.clear();

    // Clean up Three.js resources
    this.scene.traverse((object) => {
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

    // Clean up renderer
    if (this.renderer) {
      this.renderer.dispose();
    }

    // Clean up post-processing
    if (this.composer) {
      this.composer.dispose();
    }

    // Clean up assets
    for (const collection of Object.values(this.assets)) {
      collection.forEach((asset) => {
        if (asset.dispose) {
          asset.dispose();
        }
      });
      collection.clear();
    }

    this._isAnimating = false;
  }

  /**
   * Set up pointer lock for mouse control
   * @private
   */
  _setupPointerLock() {
    if (!this.renderer || !this.renderer.domElement) return;

    const canvas = this.renderer.domElement;

    // Add standard pointer lock setup to canvas
    canvas.requestPointerLock =
      canvas.requestPointerLock ||
      canvas.mozRequestPointerLock ||
      canvas.webkitRequestPointerLock;

    // Initial click handler for pointer lock
    const lockPointer = () => {
      try {
        // Handle the Promise returned by requestPointerLock
        const promise = canvas.requestPointerLock();
        if (promise && promise.catch) {
          promise.catch(error => {
            console.warn("Pointer lock request rejected:", error);
          });
        }
      } catch (error) {
        console.warn("Failed to request pointer lock:", error);
      }
    };

    // Add click event to canvas to request pointer lock
    canvas.addEventListener("click", lockPointer);

    // Handle pointer lock change
    document.addEventListener("pointerlockchange", () => {
      if (document.pointerLockElement === canvas) {
        console.log("Pointer lock active, cursor hidden");
        document.body.classList.add("pointerlock-active");
        canvas.removeEventListener("click", lockPointer);
      } else {
        console.log("Pointer lock inactive, cursor visible");
        document.body.classList.remove("pointerlock-active");
        // Re-add click listener when pointer lock is lost
        canvas.addEventListener("click", lockPointer);
      }
    });

    // Handle escape key to exit pointer lock
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && document.pointerLockElement === canvas) {
        console.log("Pointer lock released via Escape key");
        document.body.classList.remove("pointerlock-active");
      }
    });
  }

  /**
   * Returns an array of meshes that the player can interact with.
   * Subclasses should override this to provide actual interactables.
   * @returns {THREE.Object3D[]} List of interactable objects (default: empty array)
   */
  getInteractableObjects() {
    return [];
  }
}
