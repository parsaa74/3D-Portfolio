/**
 * Lumon Renderer Management System
 * A robust system for managing and debugging Three.js rendering in the Lumon environment
 */

class LumonRenderer {
  static instance = null;

  constructor() {
    this.config = {
      containerId: "three-container",
      zIndex: 9999,
      backgroundColor: "transparent",
      pixelRatio: Math.min(window.devicePixelRatio, 2),
      antialias: false,
      precision: "mediump",
      powerPreference: "high-performance",
      alpha: false,
      stencil: false,
      depth: true,
      preserveDrawingBuffer: false,
      failIfMajorPerformanceCaveat: true,
      logarithmicDepthBuffer: false,
      premultipliedAlpha: false,
      desynchronized: true,
    };

    this.emergencyConfig = {
      ambientIntensity: 1.0,
      directionalIntensity: 1.0,
      pointLightIntensity: 1.0,
      pointLightDistance: 10,
    };

    this.state = {
      isInitialized: false,
      isRendering: false,
      lastFrameTime: 0,
      frameCount: 0,
      fps: 0,
      fpsUpdateInterval: 1000,
      qualityLevel: 1.0,
      debugMode: false,
    };

    this.initializeEventListeners();
    this.setupPerformanceMonitoring();
  }

  static getInstance() {
    if (!LumonRenderer.instance) {
      LumonRenderer.instance = new LumonRenderer();
    }
    return LumonRenderer.instance;
  }

  initializeEventListeners() {
    document.addEventListener("DOMContentLoaded", () => this.initialize());
    window.addEventListener("keydown", (e) => {
      if (e.key === "F3") this.emergencyFix();
    });
    window.addEventListener("resize", () => this.handleResize());
  }

  setupPerformanceMonitoring() {
    setInterval(() => {
      const now = performance.now();
      const delta = now - this.state.lastFrameTime;

      if (delta >= this.state.fpsUpdateInterval) {
        this.state.fps = Math.round((this.state.frameCount * 1000) / delta);
        this.state.frameCount = 0;
        this.state.lastFrameTime = now;

        // Adjust quality based on FPS
        if (this.state.fps < 30 && this.state.qualityLevel > 0.5) {
          this.state.qualityLevel = Math.max(
            0.5,
            this.state.qualityLevel - 0.1
          );
          this.updateQuality();
        } else if (this.state.fps > 55 && this.state.qualityLevel < 1.0) {
          this.state.qualityLevel = Math.min(
            1.0,
            this.state.qualityLevel + 0.1
          );
          this.updateQuality();
        }
      }
    }, 1000);
  }

  updateQuality() {
    if (!window.lumonEnvironment?.threeRenderer) return;

    const renderer = window.lumonEnvironment.threeRenderer;
    renderer.setPixelRatio(
      Math.min(window.devicePixelRatio * this.state.qualityLevel, 2)
    );

    // Update post-processing quality
    if (window.lumonEnvironment.composer) {
      window.lumonEnvironment.composer.setPixelRatio(
        Math.min(window.devicePixelRatio * this.state.qualityLevel, 2)
      );
    }
  }

  handleResize() {
    if (!window.lumonEnvironment?.threeRenderer) return;

    const renderer = window.lumonEnvironment.threeRenderer;
    const camera = window.lumonEnvironment?.threeCamera;

    if (camera) {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
    }

    renderer.setSize(window.innerWidth, window.innerHeight);

    if (window.lumonEnvironment.composer) {
      window.lumonEnvironment.composer.setSize(
        window.innerWidth,
        window.innerHeight
      );
    }
  }

  initialize() {
    if (window.debugLumon) {
      window.debugLumon.fixRendering = () => this.emergencyFix();
    }
  }

  getContainer() {
    let container = document.getElementById(this.config.containerId);
    if (!container) {
      container = document.createElement("div");
      container.id = this.config.containerId;
      document.body.appendChild(container);
    }
    return container;
  }

  setupContainerStyles(container) {
    container.style.cssText = `
      position: absolute !important;
      top: 0 !important;
      left: 0 !important;
      width: 100% !important;
      height: 100% !important;
      z-index: ${this.config.zIndex} !important;
      background-color: ${this.config.backgroundColor} !important;
      display: block !important;
      overflow: hidden !important;
    `;
  }

  setupRenderer() {
    if (!window.lumonEnvironment?.threeRenderer) return false;

    const renderer = window.lumonEnvironment.threeRenderer;
    const canvas = renderer.domElement;

    if (!canvas.parentElement) {
      this.getContainer().appendChild(canvas);
    }

    canvas.style.cssText = `
      width: 100% !important;
      height: 100% !important;
      position: absolute !important;
      top: 0 !important;
      left: 0 !important;
      z-index: ${this.config.zIndex + 1} !important;
      display: block !important;
      outline: none !important;
    `;

    // Apply renderer settings
    Object.entries(this.config).forEach(([key, value]) => {
      if (typeof renderer[key] !== "undefined") {
        renderer[key] = value;
      }
    });

    return true;
  }

  setupEmergencyLighting() {
    const scene = window.threeScene || window.lumonEnvironment?.threeScene;
    if (!scene) return;

    // Remove existing emergency lights if any
    scene.children = scene.children.filter(
      (child) => !child.userData.isEmergencyLight
    );

    // Ambient light for base illumination
    const ambientLight = new THREE.AmbientLight(
      0xffffff,
      this.emergencyConfig.ambientIntensity
    );
    ambientLight.userData.isEmergencyLight = true;
    scene.add(ambientLight);

    // Directional light for shadows and depth
    const dirLight = new THREE.DirectionalLight(
      0xffffff,
      this.emergencyConfig.directionalIntensity
    );
    dirLight.position.set(0, 10, 0);
    dirLight.userData.isEmergencyLight = true;
    scene.add(dirLight);

    // Strategic point lights for balanced illumination
    const pointLightPositions = [
      [0, 2, 0],
      [5, 2, 5],
      [-5, 2, -5],
      [0, 2, 5],
      [5, 2, 0],
    ];

    pointLightPositions.forEach(([x, y, z]) => {
      const pointLight = new THREE.PointLight(
        0xffffff,
        this.emergencyConfig.pointLightIntensity,
        this.emergencyConfig.pointLightDistance
      );
      pointLight.position.set(x, y, z);
      pointLight.userData.isEmergencyLight = true;
      scene.add(pointLight);
    });
  }

  updateEnvironment() {
    if (!window.lumonEnvironment) return;

    if (window.lumonEnvironment.update) {
      window.lumonEnvironment.update();
    }

    if (window.lumonEnvironment.onWindowResize) {
      window.lumonEnvironment.onWindowResize();
    }

    this.resetCamera();
  }

  resetCamera() {
    const camera = window.lumonEnvironment?.threeCamera;
    if (!camera) return;

    camera.position.set(0, 1.6, 0);
    camera.lookAt(0, 1.6, -1);
  }

  hideBlockingElements() {
    const blockingElements = [
      "lumon-elevator",
      "elevator-transition",
      "shader-container",
    ];
    blockingElements.forEach((id) => {
      const element = document.getElementById(id);
      if (element) {
        element.style.opacity = "0";
        element.style.visibility = "hidden";
      }
    });
  }

  addDebugObjects() {
    const scene = window.threeScene || window.lumonEnvironment?.threeScene;
    if (!scene) return;

    // Remove existing debug objects if any
    scene.children = scene.children.filter(
      (child) => !child.userData.isDebugObject
    );

    const geometry = new THREE.BoxGeometry(1, 1, 1);

    // Add debug cubes with distinct colors
    const debugCubes = [
      { color: 0xff3333, position: [0, 1, -3] },
      { color: 0x33ff33, position: [3, 1, 0] },
    ];

    debugCubes.forEach(({ color, position }) => {
      const material = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.5,
      });
      const cube = new THREE.Mesh(geometry, material);
      cube.position.set(...position);
      cube.userData.isDebugObject = true;
      scene.add(cube);
    });
  }

  emergencyFix() {
    console.log("Initiating emergency rendering fix...");

    try {
      const container = this.getContainer();
      this.setupContainerStyles(container);

      const rendererFound = this.setupRenderer();
      if (!rendererFound) {
        throw new Error("Renderer not found in environment");
      }

      this.setupEmergencyLighting();
      this.updateEnvironment();
      this.hideBlockingElements();

      window.gameState = "gameplay";
      window.dispatchEvent(new Event("resize"));

      if (this.state.debugMode) {
        this.addDebugObjects();
      }

      this.state.isInitialized = true;
      console.log("Emergency rendering fix completed successfully");
    } catch (error) {
      console.error("Failed to apply emergency fix:", error);
      throw error;
    }
  }

  setDebugMode(enabled) {
    this.state.debugMode = enabled;
    if (enabled) {
      this.addDebugObjects();
    } else {
      const scene = window.threeScene || window.lumonEnvironment?.threeScene;
      if (scene) {
        scene.children = scene.children.filter(
          (child) => !child.userData.isDebugObject
        );
      }
    }
  }

  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    if (this.state.isInitialized) {
      this.setupRenderer();
    }
  }

  updateEmergencyConfig(newConfig) {
    this.emergencyConfig = { ...this.emergencyConfig, ...newConfig };
    if (this.state.isInitialized) {
      this.setupEmergencyLighting();
    }
  }

  dispose() {
    // Clean up resources
    if (window.lumonEnvironment?.threeRenderer) {
      window.lumonEnvironment.threeRenderer.dispose();
    }
    if (window.lumonEnvironment?.composer) {
      window.lumonEnvironment.composer.dispose();
    }
    this.state.isInitialized = false;
  }
}

// Initialize the renderer system
const lumonRenderer = LumonRenderer.getInstance();

// Export for global access
window.toggleEmergencyMode = () => lumonRenderer.emergencyFix();
