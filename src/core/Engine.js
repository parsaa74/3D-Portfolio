import { THREE } from '@utils/ThreeJSLoader.js';
import Stats from 'stats.js/build/stats.min.js';
import { EventEmitter } from '@utils/EventEmitter';

/**
 * Core game engine class that handles the main game loop and systems
 * @class Engine
 */
export class Engine extends EventEmitter {
  constructor(options = {}) {
    super();

    this.options = {
      debug: false,
      showStats: true,
      ...options,
    };

    // Core properties
    this.scene = new THREE.Scene();
    this.camera = null;
    this.renderer = null;
    this.clock = new THREE.Clock();
    this.stats = null;
    this.systems = new Map();
    this.isRunning = false;

    // Initialize core systems
    this._initRenderer();
    this._initCamera();
    if (this.options.showStats) this._initStats();

    // Handle window resize
    window.addEventListener("resize", this._onResize.bind(this));
  }

  /**
   * Initialize WebGL renderer
   * @private
   */
  _initRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(this.renderer.domElement);
  }

  /**
   * Initialize camera
   * @private
   */
  _initCamera() {
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 2, 5);
  }

  /**
   * Initialize stats panel
   * @private
   */
  _initStats() {
    this.stats = new Stats();
    document.body.appendChild(this.stats.dom);
  }

  /**
   * Handle window resize
   * @private
   */
  _onResize() {
    if (this.camera) {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
    }
    if (this.renderer) {
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    this.emit("resize");
  }

  /**
   * Add a system to the engine
   * @param {string} name - System name
   * @param {object} system - System instance
   */
  addSystem(name, system) {
    if (this.systems.has(name)) {
      console.warn(`System "${name}" already exists. Overwriting...`);
    }
    this.systems.set(name, system);
    if (system.init) system.init(this);
  }

  /**
   * Get a system by name
   * @param {string} name - System name
   * @returns {object|null} System instance or null if not found
   */
  getSystem(name) {
    return this.systems.get(name) || null;
  }

  /**
   * Start the game loop
   */
  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.clock.start();
    this._update();
  }

  /**
   * Stop the game loop
   */
  stop() {
    this.isRunning = false;
    this.clock.stop();
  }

  /**
   * Main update loop
   * @private
   */
  _update() {
    if (!this.isRunning) return;

    // Request next frame
    requestAnimationFrame(() => this._update());

    // Calculate delta time
    const deltaTime = this.clock.getDelta();

    // Update all systems
    for (const system of this.systems.values()) {
      if (system.update) system.update(deltaTime);
    }

    // Render scene
    this.renderer.render(this.scene, this.camera);

    // Update stats
    if (this.stats) this.stats.update();
  }

  /**
   * Clean up resources
   */
  dispose() {
    this.stop();

    // Dispose systems
    for (const system of this.systems.values()) {
      if (system.dispose) system.dispose();
    }
    this.systems.clear();

    // Remove event listeners
    window.removeEventListener("resize", this._onResize);

    // Dispose renderer
    if (this.renderer) {
      this.renderer.dispose();
      document.body.removeChild(this.renderer.domElement);
    }

    // Remove stats
    if (this.stats) {
      document.body.removeChild(this.stats.dom);
    }

    // Clear references
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.clock = null;
    this.stats = null;
  }
}
