/**
 * Interactive 3D Experience - Main Entry Point
 * @author Parsa Azari's Project
 * @description A Three.js-powered exploration of corridor environments
 */

import "./styles/main.css";
import * as THREE from "three";
import { SeveranceEnvironment } from "./core/rendering/environments/SeveranceEnvironment.js";
import { GameLoop } from "@core/GameLoop";
import { PerformanceMonitor } from "./core/rendering/performance/PerformanceMonitor.js";
import { UnifiedMovementController } from "./systems/movement/UnifiedMovementController.js";
import { AudioManager } from "./core/audio/AudioManager.js";

// Game constants from init.js
export const GAME_CONSTANTS = {
  CORRIDOR_WIDTH: 2.5,
  CORRIDOR_HEIGHT: 3.5,
  WALL_HEIGHT: 3.5,
  SEGMENT_LENGTH: 6.0,
  WALL_COLOR: 0xf6f6f6,
  FLOOR_COLOR: 0xeeeeee,
  CEILING_COLOR: 0xf8f8f8,
  WALL_THICKNESS: 0.1,
  CORRIDOR_BASEBOARD_COLOR: 0x232323,
  CORRIDOR_TRIM_HEIGHT: 0.1,
  LIGHTING_INTENSITY: 0.5,
  LIGHT_COLOR: 0xf7f7ef,
};

// WebGL compatibility check
export function checkWebGL() {
  const canvas = document.createElement("canvas");
  const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");

  if (!gl) {
    const errorMsg =
      "WebGL not supported. Please enable WebGL in your browser settings.";
    console.error(errorMsg);
    document.getElementById("emergency-instructions").innerHTML = `
      <strong>WebGL Not Available</strong><br>
      ${errorMsg}<br>
      <strong>How to fix:</strong><br>
      1. Enable WebGL in your browser settings<br>
      2. Try using Chrome or Firefox<br>
      3. Check if your graphics drivers are up to date<br>
      <button onclick="window.location.reload()" style="background: #5CDED3; border: none; color: black; padding: 5px; margin-top: 5px; cursor: pointer;">Retry</button>
    `;
    document.getElementById("emergency-instructions").style.display = "block";
    return false;
  }

  // Check WebGL capabilities and log them
  const capabilities = {
    maxTexSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
    maxVaryings: gl.getParameter(gl.MAX_VARYING_VECTORS),
    vendor: gl.getParameter(gl.VENDOR),
    renderer: gl.getParameter(gl.RENDERER),
    version: gl.getParameter(gl.VERSION),
  };

  console.log("WebGL capabilities:", capabilities);

  // Check if we have enough resources
  if (capabilities.maxTexSize < 2048 || capabilities.maxVaryings < 8) {
    console.warn(
      "Limited WebGL capabilities detected. Performance may be reduced."
    );
  }

  // Store capabilities for later use
  window.webglCapabilities = capabilities;

  return true;
}

// Memory monitoring
export const memoryMonitor = {
  interval: null,
  start(intervalMs = 5000) {
    this.stop(); // Clear any existing monitor

    // Only run if the performance API supports memory stats
    if (performance.memory) {
      this.interval = setInterval(() => {
        const used = Math.round(performance.memory.usedJSHeapSize / 1048576);
        const total = Math.round(performance.memory.totalJSHeapSize / 1048576);
        const limit = Math.round(performance.memory.jsHeapSizeLimit / 1048576);

        // Log memory usage
        console.log(`Memory: ${used}MB / ${total}MB (Limit: ${limit}MB)`);

        // Warn if memory usage is high (over 80% of limit)
        if (used > limit * 0.8) {
          console.warn("High memory usage detected!");

          // Try to force garbage collection if available
          if (window.gc) window.gc();
        }
      }, intervalMs);
    }
  },
  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  },
};

/**
 * @class SeveranceApp
 * @description Main application class for the interactive corridor experience
 */
class SeveranceApp {
  constructor() {
    // Core Three.js components
    this.scene = null;
    this.camera = null;
    this.renderer = null;

    // Game systems
    this.environment = null;
    this.gameLoop = null;
    this.performanceMonitor = null;
    this.audioManager = null;
    this.movementController = null;

    // State management
    this.isGameStarted = false;
    this.isInitialized = false;
    this.clock = new THREE.Clock();

    // Debug tools
    this.isDevelopment = import.meta.env.DEV;
    this.raycaster = new THREE.Raycaster();
    this.interactionDistance = 2.5;

    this.currentPosterInteractable = null; // Track the current interactable poster
    this.currentNodeInteractable = null; // Track the current interactable node
    
    // Bind methods to this context so they work correctly with event listeners
    this._onKeyDown = this._onKeyDown.bind(this);
    this.startGame = this.startGame.bind(this);
    this.onWindowResize = this.onWindowResize.bind(this);
    this.handlePosterInteraction = this.handlePosterInteraction.bind(this);
    this.checkForInteractions = this.checkForInteractions.bind(this);
    this.showInteractionPrompt = this.showInteractionPrompt.bind(this);
    this.handleNodeInfoInteraction = this.handleNodeInfoInteraction.bind(this);
    
    console.log("App constructor complete, methods bound");
  }

  /**
   * @method initialize
   * @description Initialize the corridor experience
   */
  async initialize() {
    try {
      console.log("Initializing 3D experience...");

      // Check WebGL compatibility first
      if (!checkWebGL()) {
        console.error("WebGL not supported or enabled");
        return false;
      }

      // Clean up any existing map canvases
      const existingMapCanvas = document.getElementById("map-canvas");
      if (existingMapCanvas) {
        existingMapCanvas.remove();
      }

      // Show loading screen
      this.showLoadingScreen();

      // Initialize environment
      this.environment = new SeveranceEnvironment({
        containerId: "three-container",
        usePostProcessing: true,
        usePerformanceMonitoring: this.isDevelopment,
      });

      // Initialize the environment
      const success = await this.environment.initialize();
      if (!success) {
        throw new Error("Failed to initialize environment");
      }

      // Get scene and camera from environment
      this.scene = this.environment.scene;
      this.camera = this.environment.camera;
      this.renderer = this.environment.renderer;

      // Initialize Audio Manager - DO THIS EARLY
      this.audioManager = new AudioManager();

      // Preload essential sounds
      try {
        // No longer preloading ambient_hum, disorientation_start, or disorientation_loop
        // If you have other essential sounds, preload them here.
        console.log("No legacy music sounds to preload.");
      } catch (audioError) {
        console.error("Failed to preload essential audio assets:", audioError);
      }

      // Initialize game systems with environment's scene and camera
      await this.initializeGameSystems();

      // Setup event listeners
      this.setupEventListeners();

      // Start memory monitoring in development mode
      if (this.isDevelopment && performance.memory) {
        memoryMonitor.start();
      }

      // Ensure game state is properly initialized but not started
      this.isGameStarted = false;
      if (this.environment?.gameState) {
        this.environment.gameState.isPlaying = false;
      }
      if (this.gameLoop) {
        this.gameLoop.stop();
      }

      // Hide loading screen and show start screen
      this.hideLoadingScreen();
      this.showStartScreen();
      // Safety: ensure aspect ratio is correct after initialization
      this.onWindowResize();
      this.isInitialized = true;
      console.log("3D experience successfully initialized");

    } catch (error) {
      console.error("Failed to initialize 3D experience:", error);
      this.showErrorMessage(error);
    }
  }

  /**
   * @method initializeGameSystems
   * @description Initialize game-specific systems and environment
   */
  async initializeGameSystems() {
    // Ensure audioManager is initialized before creating GameLoop
    if (!this.audioManager) {
      throw new Error("AudioManager not initialized before initializeGameSystems");
    }

    // Initialize movement controller
    this.movementController = new UnifiedMovementController(
      this.camera,
      this.environment
    );

    // Initialize game loop with environment's scene, camera, and audioManager
    this.gameLoop = new GameLoop(
      this.scene,
      this.camera,
      this.environment,
      this.audioManager
    );

    // Initialize performance monitoring
    this.performanceMonitor = new PerformanceMonitor({ renderer: this.renderer, showStats: false });

    // Ensure movement is disabled initially
    if (this.environment?.gameState) {
      this.environment.gameState.isPlaying = false;
    }
    if (this.gameLoop) {
      this.gameLoop.stop();
    }
  }

  /**
   * @method setupEventListeners
   * @description Setup all necessary event listeners
   */
  setupEventListeners() {
    console.log("Setting up event listeners..."); // LOG 1
    
    // Make sure methods are bound correctly
    this._onKeyDown = this._onKeyDown.bind(this);
    this.onWindowResize = this.onWindowResize.bind(this);
    this.startGame = this.startGame.bind(this);
    
    console.log("startGame:", this.startGame);
    console.log("onWindowResize:", this.onWindowResize);
    window.addEventListener("resize", this.onWindowResize, false);

    // Game-specific events
    console.log("Adding gameStart listener..."); // LOG 2
    console.log("startGame (gameStart):", this.startGame);
    document.addEventListener("gameStart", this.startGame);

    // Add keydown event for poster interaction
    // First remove any existing to avoid duplicates
    window.removeEventListener("keydown", this._onKeyDown);
    window.addEventListener("keydown", this._onKeyDown);
    console.log("Added keydown listener for interaction", this._onKeyDown);
    
    // Add global interaction detector that doesn't depend on focus
    window.addEventListener("keydown", (e) => {
      if ((e.key === "e" || e.key === "E" || e.code === "KeyE") && 
          this.isGameStarted && 
          !this.gameState?.isPaused) {
        console.log("[Global] E key pressed, triggering global interaction handler");
        // Force a check for interactions immediately
        const hasInteraction = this.checkForInteractions();
        
        if (hasInteraction && this.currentPosterInteractable) {
          console.log("[Global] Found interactable poster, handling interaction");
          this.handlePosterInteraction(this.currentPosterInteractable);
          e.preventDefault();
        }
      }
      
      // Always try to resume audio context on key press
      if (this.audioManager) {
        this.audioManager.resumeAudioContext().catch(err => {
          // Silent catch - no need to log every time
        });
      }
    });
    
    // Also resume audio context on any click
    document.addEventListener("click", () => {
      if (this.audioManager) {
        this.audioManager.resumeAudioContext().catch(err => {
          // Silent catch - no need to log every time
        });
      }
    });
  }

  // UI Methods
  showLoadingScreen() {
    const loadingScreen = document.createElement("div");
    loadingScreen.id = "loading-screen";
    loadingScreen.innerHTML = `
      <div class="loading-content">
        <div class="trb-loader-grid">
          <div class="trb-square"></div>
          <div class="trb-square"></div>
          <div class="trb-square"></div>
          <div class="trb-square"></div>
          <div class="trb-square trb-square-animate"></div>
          <div class="trb-square"></div>
          <div class="trb-square"></div>
          <div class="trb-square"></div>
          <div class="trb-square"></div>
        </div>
        <h1 class="trb-loading-text">LOADING</h1>
      </div>
    `;
    document.body.appendChild(loadingScreen);
  }

  hideLoadingScreen() {
    const loadingScreen = document.getElementById("loading-screen");
    if (loadingScreen) {
      loadingScreen.classList.add("fade-out");
      setTimeout(() => loadingScreen.remove(), 1000);
    }
  }

  showErrorMessage(error) {
    const errorMessage = document.createElement("div");
    errorMessage.id = "error-message";
    errorMessage.innerHTML = `
      <div class="error-content">
        <h2>Initialization Error</h2>
        <p>${error.message}</p>
        <button onclick="location.reload()">Retry</button>
      </div>
    `;
    document.body.appendChild(errorMessage);
  }

  // Event Handlers
  onWindowResize() {
    console.log('[DEBUG] onWindowResize called. Camera:', !!this.camera, 'Renderer:', !!this.renderer, 'isGameStarted:', this.isGameStarted);
    if (!this.camera || !this.renderer) {
      console.warn('[DEBUG] onWindowResize: camera or renderer not available, skipping.');
      return;
    }

    // Determine if we are in cinema scope (orientation) or fullscreen (game)
    const isCinemaScope = !this.isGameStarted;
    const cinemaAspect = 2.35; // CinemaScope aspect ratio
    let width = window.innerWidth;
    let height = window.innerHeight;
    const canvas = this.renderer.domElement;

    // Helper to add or remove cinema bars
    function setCinemaBars(show, barHeightTop = 0, barHeightBottom = 0) {
      let topBar = document.getElementById('cinema-bar-top');
      let bottomBar = document.getElementById('cinema-bar-bottom');
      if (show) {
        if (!topBar) {
          topBar = document.createElement('div');
          topBar.id = 'cinema-bar-top';
          document.body.appendChild(topBar);
        }
        if (!bottomBar) {
          bottomBar = document.createElement('div');
          bottomBar.id = 'cinema-bar-bottom';
          document.body.appendChild(bottomBar);
        }
        topBar.style.position = 'fixed';
        topBar.style.left = '0';
        topBar.style.top = '0';
        topBar.style.width = '100vw';
        topBar.style.height = `${barHeightTop}px`;
        topBar.style.background = 'black';
        topBar.style.zIndex = '999';
        topBar.style.pointerEvents = 'none';
        bottomBar.style.position = 'fixed';
        bottomBar.style.left = '0';
        bottomBar.style.bottom = '0';
        bottomBar.style.width = '100vw';
        bottomBar.style.height = `${barHeightBottom}px`;
        bottomBar.style.background = 'black';
        bottomBar.style.zIndex = '999';
        bottomBar.style.pointerEvents = 'none';
      } else {
        if (topBar) topBar.remove();
        if (bottomBar) bottomBar.remove();
      }
    }

    if (isCinemaScope) {
      // Calculate the largest 2.35:1 rectangle that fits in the window
      if (width / height > cinemaAspect) {
        width = Math.floor(height * cinemaAspect);
      } else {
        height = Math.floor(width / cinemaAspect);
      }
      // Center the canvas
      canvas.style.position = 'absolute';
      canvas.style.left = `${Math.floor((window.innerWidth - width) / 2)}px`;
      canvas.style.top = `${Math.floor((window.innerHeight - height) / 2)}px`;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      canvas.style.background = 'black';
      canvas.style.display = 'block';
      canvas.style.zIndex = '1';
      document.body.style.background = 'black';
      // Add explicit black bars
      const barHeightTop = Math.round((window.innerHeight - height) / 2);
      const barHeightBottom = window.innerHeight - height - barHeightTop;
      setCinemaBars(true, barHeightTop, barHeightBottom);
      console.log('[DEBUG] CinemaScope applied. width:', width, 'height:', height, 'barHeightTop:', barHeightTop, 'barHeightBottom:', barHeightBottom);
    } else {
      // Fullscreen: fill the window
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.style.position = 'fixed';
      canvas.style.left = '0';
      canvas.style.top = '0';
      canvas.style.width = '100vw';
      canvas.style.height = '100vh';
      canvas.style.background = 'black';
      canvas.style.display = 'block';
      canvas.style.zIndex = '1';
      document.body.style.background = 'black';
      // Remove cinema bars
      setCinemaBars(false);
      console.log('[DEBUG] Fullscreen applied. width:', width, 'height:', height);
    }

    // Update renderer and camera
    this.renderer.setSize(width, height, false); // false = don't update style
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    console.log('[DEBUG] Camera aspect set to', this.camera.aspect);
  }

  // Game State Methods
  updateLocationDisplay() {
    if (this.environment?.getCurrentSegment) {
      const segment = this.environment.getCurrentSegment();
      const locationIndicator = document.getElementById("location-indicator");

      if (locationIndicator && segment) {
        locationIndicator.textContent = `LOCATION: ${this.getLocationName(
          segment
        )}`;
      }
    }
  }

  getLocationName(segment) {
    if (!segment?.department) return "UNKNOWN";

    const locationMap = {
      hub: "CENTRAL HUB",
      mdr: "MACRODATA REFINEMENT",
      breakRoom: "BREAK ROOM",
      wellness: "WELLNESS CENTER",
      perpetuity: "PERPETUITY WING",
      testing: "TESTING FLOOR",
    };

    return locationMap[segment.department] || "HALLWAY";
  }

  checkForInteractions() {
    // Only skip if there's no player position
    if (!window.playerPosition) {
      console.log("[Interaction] Skipping checkForInteractions - no player position");
      this.currentPosterInteractable = null;
      return;
    }
    // If poster modal is open, hide all poster E buttons and skip further interaction prompts
    const modal = document.getElementById('poster-modal');
    if (modal && modal.style.display !== 'none') {
      if (this.environment && Array.isArray(this.environment._customWatchInteractables)) {
        for (const posterMesh of this.environment._customWatchInteractables) {
          if (posterMesh && posterMesh.userData && posterMesh.userData.eButtonMesh) {
            posterMesh.userData.eButtonMesh.visible = false;
          }
        }
      }
      // Also hide the 2D prompt if modal is open
      const promptElement = document.getElementById("interaction-prompt");
      if (promptElement) {
        promptElement.style.display = "none";
      }
      return;
    }

    let nearbyInteraction = false;
    const interactionDistance = 6.0; // Increased from 5.0 for better detection
    
    console.log("[Interaction] Running checkForInteractions");
    
    // Check door interactions first
    if (window.doorLocations) {
      for (const door of window.doorLocations) {
        if (!door || !door.position) continue;
        const distance = this.camera.position.distanceTo(door.position);
        if (distance < door.radius || distance < interactionDistance) {
          console.log('[DEBUG] Showing interaction prompt for door:', door.name);
          this.showInteractionPrompt(door);
          nearbyInteraction = true;
          this.currentPosterInteractable = null; // Not a poster
          break;
        }
      }
    }
    
    // If no door interaction prompt, check poster interactions
    if (!nearbyInteraction && this.environment && Array.isArray(this.environment._customWatchInteractables)) {
      console.log('[DEBUG] Number of poster interactables in checkForInteractions:', this.environment._customWatchInteractables.length);
      // Hide all poster E buttons by default
      for (const posterMesh of this.environment._customWatchInteractables) {
        if (!posterMesh) continue;
        if (posterMesh.userData.eButtonMesh) {
          posterMesh.userData.eButtonMesh.visible = false;
        }
      }
      
      // Find closest poster in range
      let closestDistance = Infinity;
      let closestPoster = null;
      
      // Check distance to each poster
      for (const posterMesh of this.environment._customWatchInteractables) {
        if (!posterMesh) continue;
        
        // Compute world position of poster interactable
        const worldPos = new THREE.Vector3();
        posterMesh.getWorldPosition(worldPos);
        const distance = this.camera.position.distanceTo(worldPos);
        
        // If in range and closer than any previously found poster
        if (distance < interactionDistance && distance < closestDistance) {
          closestDistance = distance;
          closestPoster = posterMesh;
        }
      }
      
      // If we found a poster in range, show interaction for it
      if (closestPoster) {
        const worldPos = new THREE.Vector3();
        closestPoster.getWorldPosition(worldPos);
        
        // Show interaction prompt
        this.showInteractionPrompt({ 
          name: "View Film Details", 
          position: worldPos,
          promptText: "Press E for info"
        });
        
        nearbyInteraction = true;
        this.currentPosterInteractable = closestPoster; // Track the poster
        
        // Show the E button mesh
        const eButtonMesh = closestPoster.userData.eButtonMesh;
        if (eButtonMesh) {
          eButtonMesh.visible = true;
          console.log(`[DEBUG] Setting E button mesh visible for '${closestPoster.userData.filmTitle}':`, eButtonMesh.visible);
          
          // Ensure the button is properly oriented
          if (this.camera) {
            eButtonMesh.lookAt(this.camera.position);
          }
        } else {
          console.warn("[DEBUG] Poster missing E button mesh:", closestPoster.userData.filmTitle);
        }
      }
    }
    
    // Check node interactions if no other interactions found
    if (!nearbyInteraction && this.environment && Array.isArray(this.environment._nodeInfoInteractables)) {
      console.log('[DEBUG] Number of node interactables in checkForInteractions:', this.environment._nodeInfoInteractables.length);
      
      // Find closest node in range
      let closestDistance = Infinity;
      let closestNode = null;
      
      // Check distance to each node
      for (const nodeMesh of this.environment._nodeInfoInteractables) {
        if (!nodeMesh) continue;
        
        // Compute world position of node interactable
        const worldPos = new THREE.Vector3();
        nodeMesh.getWorldPosition(worldPos);
        const distance = this.camera.position.distanceTo(worldPos);
        
        console.log(`[DEBUG] Node '${nodeMesh.userData.nodeType}' at distance: ${distance.toFixed(2)}`);
        
        // If in range and closer than any previously found node
        if (distance < interactionDistance && distance < closestDistance) {
          closestDistance = distance;
          closestNode = nodeMesh;
        }
      }
      
      // If we found a node in range, show interaction for it
      if (closestNode) {
        const worldPos = new THREE.Vector3();
        closestNode.getWorldPosition(worldPos);
        
        console.log(`[DEBUG] Found closest node: ${closestNode.userData.nodeType} at distance ${closestDistance.toFixed(2)}`);
        
        // Show interaction prompt
        this.showInteractionPrompt({ 
          name: "View Node Info", 
          position: worldPos,
          promptText: "Press E for node info"
        });
        
        nearbyInteraction = true;
        this.currentNodeInteractable = closestNode; // Track the node
        this.currentPosterInteractable = null; // Not a poster
        
        // Show the E button mesh if it exists
        const eButtonMesh = closestNode.userData.eButtonMesh;
        if (eButtonMesh) {
          eButtonMesh.visible = true;
          console.log(`[DEBUG] Setting E button mesh visible for node '${closestNode.userData.nodeType}':`, eButtonMesh.visible);
          
          // Ensure the button is properly oriented
          if (this.camera) {
            eButtonMesh.lookAt(this.camera.position);
          }
        } else {
          console.log("[DEBUG] Node has no E button mesh:", closestNode.userData.nodeType);
        }
      }
    }
    
    // Hide prompt if nothing nearby
    if (!nearbyInteraction) {
      const promptElement = document.getElementById("interaction-prompt");
      if (promptElement) {
        promptElement.style.display = "none";
      }
      this.currentPosterInteractable = null;
      this.currentNodeInteractable = null;
    }
    
    // Return true if an interaction was found
    return nearbyInteraction;
  }

  showInteractionPrompt(door) {
    console.log('[DEBUG] showInteractionPrompt called with:', door);
    const promptElement = document.getElementById("interaction-prompt");
    
    if (!promptElement) {
      console.error("[DEBUG] interaction-prompt element not found in DOM");
      return;
    }
    
    promptElement.style.display = "flex";
    
    // Use custom prompt text if provided, otherwise default to 'Press E to enter'
    const label = door.promptText || door.prompt || "Press E to enter";
    console.log('[DEBUG] Prompt label:', label);
    promptElement.innerHTML = `
      <div class="key-indicator">E</div>
      <span>${label}</span>
    `;
    
    // Ensure the CSS is applied only once
    if (!document.getElementById('interaction-prompt-styles')) {
      const style = document.createElement('style');
      style.id = 'interaction-prompt-styles';
      style.textContent = `
        #interaction-prompt {
          display: flex;
          align-items: center;
          background-color: rgba(0, 0, 0, 0.75);
          border: 1px solid #5CDED3;
          border-radius: 4px;
          padding: 10px 15px;
          font-family: 'Neue Montreal', sans-serif;
          color: white;
          box-shadow: 0 0 10px rgba(92, 222, 211, 0.3);
          backdrop-filter: blur(4px);
          animation: pulse 2s infinite;
          transition: opacity 0.3s ease;
          z-index: 9999;
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
        }
        
        .key-indicator {
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: #5CDED3;
          color: black;
          font-weight: bold;
          border-radius: 3px;
          width: 24px;
          height: 24px;
          margin-right: 10px;
          box-shadow: 0 0 5px rgba(92, 222, 211, 0.5);
        }
        
        @keyframes pulse {
          0% { transform: translate(-50%, -50%) scale(1); opacity: 0.8; }
          50% { transform: translate(-50%, -50%) scale(1.05); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(1); opacity: 0.8; }
        }
      `;
      document.head.appendChild(style);
    }
    
    // Ensure prompt is visible
    promptElement.style.opacity = "1";
  }

  _onKeyDown(e) {
    // Only trigger if E is pressed, game is started, and not paused
    if (!this.isGameStarted || this.gameState?.isPaused) {
      console.log("[DEBUG] Ignoring keydown, game not started or paused");
      return;
    }
    
    if (e.key === "e" || e.key === "E" || e.code === "KeyE") {
      console.log("[Main] E key pressed, checking for interactions");
      
      // Check for node interaction first
      if (this.currentNodeInteractable) {
        console.log("[DEBUG] Attempting node interaction with:", this.currentNodeInteractable.userData.nodeType);
        this.handleNodeInfoInteraction(this.currentNodeInteractable);
        e.preventDefault();
        return;
      }
      
      if (this.currentPosterInteractable) {
        console.log("[DEBUG] Attempting poster interaction with:", 
                    this.currentPosterInteractable.userData.filmTitle);
        
        // Check if E button is visible
        const eButton = this.currentPosterInteractable.userData.eButtonMesh;
        if (eButton) {
          console.log("[DEBUG] E button visible:", eButton.visible);
          
          // If button is not visible, we shouldn't interact
          if (!eButton.visible) {
            console.log("[DEBUG] E button not visible, skipping interaction");
            // Instead of just skipping, do a immediate check for interactions
            this.checkForInteractions();
            // Try again with current poster interactable
            if (this.currentPosterInteractable && 
                this.currentPosterInteractable.userData.eButtonMesh && 
                this.currentPosterInteractable.userData.eButtonMesh.visible) {
              this.handlePosterInteraction(this.currentPosterInteractable);
            }
            return;
          }
        }
        
        this.handlePosterInteraction(this.currentPosterInteractable);
        e.preventDefault();
      } else {
        // Check if we're near any interactable but missed it
        console.log("[DEBUG] No current poster interactable, performing proximity check");
        this.checkForInteractions(); // Force a check before proceeding
        
        if (this.currentPosterInteractable) {
          console.log("[DEBUG] Found poster interactable after check:", 
                     this.currentPosterInteractable.userData.filmTitle);
          this.handlePosterInteraction(this.currentPosterInteractable);
          e.preventDefault();
          return;
        }
        
        // Additional fallback if no poster interactable is found
        if (this.environment && Array.isArray(this.environment._customWatchInteractables)) {
          let nearestDistance = Infinity;
          let nearestPoster = null;
          
          for (const posterMesh of this.environment._customWatchInteractables) {
            if (!posterMesh) continue;
            
            const worldPos = new THREE.Vector3();
            posterMesh.getWorldPosition(worldPos);
            const distance = this.camera.position.distanceTo(worldPos);
            
            if (distance < nearestDistance) {
              nearestDistance = distance;
              nearestPoster = posterMesh;
            }
          }
          
          // If nearest poster is within reasonable distance, use it
          if (nearestPoster && nearestDistance < 8.0) {
            console.log("[DEBUG] Nearest poster found within range:", 
                        nearestPoster.userData.filmTitle, 
                        "distance:", nearestDistance.toFixed(2));
            this.currentPosterInteractable = nearestPoster;
            this.handlePosterInteraction(nearestPoster);
            e.preventDefault();
          } else if (nearestPoster) {
            console.log("[DEBUG] E pressed near poster but not in interaction range:", 
                        nearestPoster.userData.filmTitle, 
                        "distance:", nearestDistance.toFixed(2));
          } else {
            console.log("[DEBUG] E pressed but no posters found");
          }
        } else {
          console.log("[DEBUG] E pressed but no currentPosterInteractable and no customWatchInteractables array");
        }
      }
    }
  }

  handlePosterInteraction(posterMesh) {
    // Debug: log to console
    console.log("[DEBUG] Poster interaction triggered", posterMesh.userData.filmTitle);
    
    // Safety check for posterMesh
    if (!posterMesh || !posterMesh.userData) {
      console.error("[ERROR] Invalid poster mesh for interaction");
      return;
    }
    
    // Hide the E button to prevent it from showing over the modal
    if (posterMesh.userData.eButtonMesh) {
      posterMesh.userData.eButtonMesh.visible = false;
    }

    // Hide the generic interaction prompt as well
    const promptElement = document.getElementById("interaction-prompt");
    if (promptElement) {
      promptElement.style.display = "none";
    }
    
    // Show a modal overlay with film details
    const data = posterMesh.userData;
    
    // Create modal if it doesn't exist
    let modal = document.getElementById('poster-modal');
    if (!modal) {
      console.log("[DEBUG] Creating new poster modal");
      modal = document.createElement('div');
      modal.id = 'poster-modal';
      modal.innerHTML = `
        <div class="poster-modal-content">
          <div class="modal-header">
            <h2 id="poster-modal-title"></h2>
            <p id="poster-modal-year"></p>
          </div>
          <div class="modal-body">
            <p id="poster-modal-cast"></p>
            <p id="poster-modal-role"></p>
            <p id="poster-modal-summary"></p>
            <a id="poster-modal-link" href="#" target="_blank" style="display:none;"></a>
          </div>
          <div class="modal-footer">
            <button id="poster-modal-close">Close</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      
      // Style
      const style = document.createElement('style');
      style.id = 'poster-modal-style';
      style.textContent = `
        #poster-modal { 
          position: fixed; 
          top: 0; 
          left: 0; 
          width: 100vw; 
          height: 100vh; 
          background: rgba(0,0,0,0.85); 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          z-index: 2000;
          animation: fadeIn 0.3s ease;
        }
        .poster-modal-content { 
          background: #181818; 
          color: #fff; 
          border-radius: 10px; 
          padding: 2rem 2.5rem; 
          box-shadow: 0 0 30px #000a; 
          max-width: 420px; 
          font-family: 'Neue Montreal', sans-serif;
          transform: translateY(0);
          animation: slideUp 0.3s ease;
        }
        .modal-header h2 { 
          margin-top: 0; 
          color: #5CDED3; 
        }
        .modal-footer button { 
          margin-top: 1.5rem; 
          background: #5CDED3; 
          color: #000; 
          border: none; 
          border-radius: 4px; 
          padding: 0.5rem 1.5rem; 
          font-size: 1rem; 
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .modal-footer button:hover { 
          background: #fff; 
          color: #222;
          transform: scale(1.05);
        }
        .poster-modal-content a { 
          color: #5CDED3; 
          text-decoration: underline; 
          display: block; 
          margin-top: 1rem;
          transition: color 0.2s ease; 
        }
        .poster-modal-content a:hover {
          color: #fff;
          text-decoration: none;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `;
      document.head.appendChild(style);
      console.log("[DEBUG] Poster modal created");
    }
    
    // Make the modal visible
    modal.style.display = 'flex';
    console.log("[DEBUG] Poster modal shown");
    
    // Fill in details
    try {
      document.getElementById('poster-modal-title').textContent = data.filmTitle || 'Film Poster';
      document.getElementById('poster-modal-year').textContent = data.filmYear ? `Year: ${data.filmYear}` : '';
      const castLabel = data.castLabel || 'Cast';
      document.getElementById('poster-modal-cast').textContent = data.filmCast ? `${castLabel}: ${data.filmCast}` : '';
      // Only show role if it exists and is not null
      const roleElement = document.getElementById('poster-modal-role');
      if (data.filmRole && data.filmRole !== null) {
        roleElement.textContent = `Role: ${data.filmRole}`;
        roleElement.style.display = 'block';
      } else {
        roleElement.textContent = '';
        roleElement.style.display = 'none';
      }
      document.getElementById('poster-modal-summary').textContent = data.filmSummary || '';
      
      // Set link if available
      const link = document.getElementById('poster-modal-link');
      if (data.watchLink) {
        link.href = data.watchLink;
        link.textContent = 'More Info';
        link.style.display = 'block';
      } else {
        link.style.display = 'none';
      }
      
      // Add close button event handler
      const closeButton = document.getElementById('poster-modal-close');
      if (closeButton) {
        // Remove any existing event listeners
        const newCloseButton = closeButton.cloneNode(true);
        closeButton.parentNode.replaceChild(newCloseButton, closeButton);
        
        // Add new event listener
        newCloseButton.addEventListener('click', () => {
          modal.style.display = 'none';
          if (posterMesh.userData.eButtonMesh) posterMesh.userData.eButtonMesh.visible = true;
          this.checkForInteractions();
          if (this.movementController && typeof this.movementController.enableMovement === 'function') {
            this.movementController.enableMovement();
          }
        });
      }
      
      // Allow clicking outside the modal to close it
      modal.addEventListener('click', (event) => {
        if (event.target === modal) {
          modal.style.display = 'none';
          if (posterMesh.userData.eButtonMesh) posterMesh.userData.eButtonMesh.visible = true;
          this.checkForInteractions();
          if (this.movementController && typeof this.movementController.enableMovement === 'function') {
            this.movementController.enableMovement();
          }
        }
      });
      
      // Allow ESC key to close the modal
      const escHandler = (event) => {
        if (event.key === 'Escape') {
          modal.style.display = 'none';
          if (posterMesh.userData.eButtonMesh) posterMesh.userData.eButtonMesh.visible = true;
          document.removeEventListener('keydown', escHandler);
          this.checkForInteractions();
          if (this.movementController && typeof this.movementController.enableMovement === 'function') {
            this.movementController.enableMovement();
          }
        }
      };
      document.addEventListener('keydown', escHandler);
    } catch (error) {
      console.error("[ERROR] Error filling poster details:", error);
      
      // Fallback: display basic info
      modal.innerHTML = `
        <div style="background: #111; color: #fff; padding: 20px; border-radius: 10px;">
          <h3>Film Information</h3>
          <p>Title: ${data.filmTitle || 'Unknown'}</p>
          <button onclick="this.parentNode.parentNode.style.display='none'">Close</button>
        </div>
      `;
    }
  }

  handleArtPosterInteraction(posterMesh) {
    // Debug: log to console
    console.log("[DEBUG] Art poster interaction triggered", posterMesh.userData.posterTitle);
    if (!posterMesh || !posterMesh.userData) {
      console.error("[ERROR] Invalid art poster mesh for interaction");
      return;
    }
    // Hide the E button to prevent it from showing over the modal
    if (posterMesh.userData.eButtonMesh) {
      posterMesh.userData.eButtonMesh.visible = false;
    }
    // Hide the generic interaction prompt as well
    const promptElement = document.getElementById("interaction-prompt");
    if (promptElement) {
      promptElement.style.display = "none";
    }
    // Show a modal overlay with art info
    let modal = document.getElementById('art-poster-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'art-poster-modal';
      modal.innerHTML = `
        <div class="poster-modal-content">
          <div class="modal-header">
            <h2 id="art-poster-modal-title"></h2>
          </div>
          <div class="modal-body split-layout">
            <div id="poster-modal-images" class="poster-modal-image-container">
              <div class="image-navigation">
                <div class="nav-controls">
                  <span class="nav-indicator left-nav">◀ Left Arrow</span>
                  <span id="image-counter" class="image-counter">Image 1 of 6</span>
                  <span class="nav-indicator right-nav">Right Arrow ▶</span>
                </div>
              </div>
            </div>
            <div class="info-container">
              <div id="art-poster-modal-info-wrapper" class="info-wrapper">
            <p id="art-poster-modal-info"></p>
              </div>
              <div class="scroll-navigation">
                <span class="nav-indicator scroll-nav">▲ Up / Down ▼ to scroll text</span>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button id="art-poster-modal-close">Close</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      // Style (reuse film modal style)
      if (!document.getElementById('poster-modal-style')) {
        const style = document.createElement('style');
        style.id = 'poster-modal-style';
        style.textContent = `
          #art-poster-modal, #poster-modal { 
            position: fixed; 
            top: 0; 
            left: 0; 
            width: 100vw; 
            height: 100vh; 
            background: rgba(0,0,0,0.85); 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            z-index: 2000;
            animation: fadeIn 0.3s ease;
          }
          .poster-modal-content { 
            background: #181818; 
            color: #fff; 
            border-radius: 10px; 
            padding: 2rem 2.5rem; 
            box-shadow: 0 0 30px #000a; 
            max-width: 900px; 
            width: 90%;
            height: 80vh;
            display: flex; /* Use flexbox for layout */
            flex-direction: column; /* Stack items vertically */
            font-family: 'Neue Montreal', sans-serif;
            transform: translateY(0);
            animation: slideUp 0.3s ease;
          }
          .modal-body {
            display: flex;
            flex-direction: row;
            flex-grow: 1; /* Allow body to take available space */
            overflow: hidden;
            gap: 1.5rem;
          }
          .split-layout {
            height: calc(80vh - 160px); /* Account for header and footer */
          }
          .info-container {
            flex: 1;
            display: flex;
            flex-direction: column;
            position: relative;
          }
          .info-wrapper {
            flex: 1;
            overflow-y: auto;
            padding-right: 10px;
            scrollbar-width: thin;
            scrollbar-color: #5CDED3 #181818;
            position: relative;
          }
          .info-wrapper::-webkit-scrollbar {
            width: 6px;
          }
          .info-wrapper::-webkit-scrollbar-thumb {
            background-color: #5CDED3;
            border-radius: 3px;
          }
          .scroll-navigation, .image-navigation {
            text-align: center;
            padding: 6px 0;
            font-size: 0.8rem;
            color: rgba(255,255,255,0.6);
          }
          .nav-controls {
            display: flex;
            justify-content: space-between;
            align-items: center;
            width: 100%;
          }
          .image-counter {
            font-size: 0.8rem;
            color: rgba(255,255,255,0.8);
          }
          .nav-indicator {
            display: inline-block;
            background-color: rgba(92, 222, 211, 0.2);
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.7rem;
          }
          .poster-modal-image-container {
            flex: 1.2;
            margin-bottom: 1rem;
            position: relative; /* For potential absolute positioned controls later */
            display: flex;
            flex-direction: column;
            background-color: #111; /* Placeholder background */
            border-radius: 6px;
            overflow: hidden;
          }
          .poster-modal-image-container img {
            display: none; /* Hidden by default, shown by slider logic */
            width: 100%;
            height: auto;
            flex: 1;
            max-height: calc(80vh - 220px);
            object-fit: contain; /* Ensure image fits without cropping, maintaining aspect ratio */
            border-radius: 4px;
          }
          .modal-header h2 { 
            margin-top: 0; 
            color: #5CDED3; 
          }
          #art-poster-modal-info {
            white-space: pre-line;
          }
          .modal-footer button { 
            margin-top: 1.5rem; 
            background: #5CDED3; 
            color: #000; 
            border: none; 
            border-radius: 4px; 
            padding: 0.5rem 1.5rem; 
            font-size: 1rem; 
            cursor: pointer;
            transition: all 0.2s ease;
          }
          .modal-footer button:hover { 
            background: #fff; 
            color: #222;
            transform: scale(1.05);
          }
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes slideUp {
            from { transform: translateY(20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
        `;
        document.head.appendChild(style);
      }
    }
    modal.style.display = 'flex';
    try {
      document.getElementById('art-poster-modal-title').textContent = posterMesh.userData.posterTitle || 'Art Poster';
      document.getElementById('art-poster-modal-info').textContent = posterMesh.userData.infoContent || '';

      const imageUrls = posterMesh.userData.imageUrls || [];
      console.log(`Loading ${imageUrls.length} images for poster '${posterMesh.userData.posterTitle}':`);
      imageUrls.forEach((url, i) => console.log(`  [${i}] ${url}`));
      const imageContainer = document.getElementById('poster-modal-images');
      // Clear previous images, but keep navigation
      const navElement = imageContainer.querySelector('.image-navigation');
      imageContainer.innerHTML = '';
      if (navElement) {
        imageContainer.appendChild(navElement);
      } else {
        // Recreate navigation if it doesn't exist
        const newNav = document.createElement('div');
        newNav.className = 'image-navigation';
        newNav.innerHTML = `
          <div class="nav-controls">
            <span class="nav-indicator left-nav">◀ Left Arrow</span>
            <span id="image-counter" class="image-counter">Image 1 of 6</span>
            <span class="nav-indicator right-nav">Right Arrow ▶</span>
          </div>
        `;
        imageContainer.appendChild(newNav);
      }
      let currentModalImageIndex = 0;
      const modalImages = [];
      const successfullyLoadedIndices = new Set(); // Track which images have loaded

      // Always define showModalImage in this scope so both image loading and sliderKeyHandler can call it
      function showModalImage(index) {
        // Filter to show only successfully loaded images
        const validImages = modalImages.filter(img => img.dataset.realIndex !== undefined);
        // If no valid images, show a message
        if (validImages.length === 0) {
          if (!document.getElementById('no-images-message')) {
            const msg = document.createElement('p');
            msg.id = 'no-images-message';
            msg.style.textAlign = 'center';
            msg.style.padding = '20px';
            msg.textContent = 'No images could be loaded for this poster.';
            imageContainer.appendChild(msg);
          }
          return;
        }
        // Hide any error message
        const errorMsg = document.getElementById('no-images-message');
        if (errorMsg) errorMsg.style.display = 'none';
        // Update image counter
        const counter = document.getElementById('image-counter');
        if (counter) {
          counter.textContent = `Image ${index + 1} of ${validImages.length}`;
        }
        // Show the appropriate image
        validImages.forEach(img => {
          const realIndex = parseInt(img.dataset.realIndex);
          img.style.display = realIndex === index ? 'block' : 'none';
        });
        // Update navigation indicator visibility
        const leftNav = imageContainer.querySelector('.left-nav');
        const rightNav = imageContainer.querySelector('.right-nav');
        if (leftNav) leftNav.style.opacity = index > 0 ? '1' : '0.3';
        if (rightNav) rightNav.style.opacity = index < validImages.length - 1 ? '1' : '0.3';
      }

      if (imageUrls.length > 0) {
        imageUrls.forEach((url, index) => { // Here, `index` is the direct conceptual image index
          const img = document.createElement('img');
          img.src = url; // The URL should now be pre-cleaned and unique
          img.alt = posterMesh.userData.posterTitle || 'Art poster image';
          
          img.onload = () => {
            console.log(`Successfully loaded image: ${url} (index: ${index})`);
            // Since each URL is now unique and directly for an image,
            // the loop index is the realIndex.
            if (!successfullyLoadedIndices.has(index)) {
              successfullyLoadedIndices.add(index);
              img.dataset.realIndex = index.toString();
              console.log(`Image ${url} assigned realIndex: ${index}`);
            } else {
              // This case should ideally not happen if getArtPosterImagePaths is correct
              console.warn(`Image ${url} (index ${index}) appears to be a duplicate or already processed.`);
              img.style.display = 'none'; 
            }
            // Refresh the view
            showModalImage(currentModalImageIndex);
          };

          img.onerror = (err) => {
            console.error(`Failed to load image: ${url} (index: ${index})`, err);
            // Optionally mark this index as failed if needed elsewhere
          };
          imageContainer.appendChild(img);
          modalImages.push(img);
        });

        showModalImage(currentModalImageIndex);
        imageContainer.style.backgroundColor = 'transparent'; // Remove placeholder bg if images load
      } else {
        imageContainer.innerHTML = '<p style="text-align: center; padding: 20px;">No images available for this poster.</p>';
        imageContainer.style.backgroundColor = '#111'; // Keep placeholder bg
      }

      // Slider keyboard navigation
      let sliderKeyHandler; // Declare here to be accessible in close handlers

      // Add keyboard navigation for both images and text scrolling
      const infoWrapper = document.getElementById('art-poster-modal-info-wrapper');
      sliderKeyHandler = (event) => {
        // Image navigation with left/right arrows
        if (event.key === 'ArrowRight' && imageUrls.length > 1) {
          event.preventDefault();
          // Count valid images (those that loaded successfully)
          const validImageCount = modalImages.filter(img => img.dataset.realIndex !== undefined).length;
          if (currentModalImageIndex < validImageCount - 1) {
            currentModalImageIndex++;
            showModalImage(currentModalImageIndex);
          }
        } else if (event.key === 'ArrowLeft' && imageUrls.length > 1) {
          event.preventDefault();
          if (currentModalImageIndex > 0) {
            currentModalImageIndex--;
            showModalImage(currentModalImageIndex);
          }
        } 
        // Text scrolling with up/down arrows
        else if (event.key === 'ArrowUp') {
          event.preventDefault();
          if (infoWrapper) {
            infoWrapper.scrollTop -= 50; // Scroll up by 50 pixels
          }
        } else if (event.key === 'ArrowDown') {
          event.preventDefault();
          if (infoWrapper) {
            infoWrapper.scrollTop += 50; // Scroll down by 50 pixels
          }
        }
      };
      document.addEventListener('keydown', sliderKeyHandler);

      // Add close button event handler
      const closeButton = document.getElementById('art-poster-modal-close');
      if (closeButton) {
        const newCloseButton = closeButton.cloneNode(true);
        closeButton.parentNode.replaceChild(newCloseButton, closeButton);
        newCloseButton.addEventListener('click', () => {
          modal.style.display = 'none';
          if (posterMesh.userData.eButtonMesh) posterMesh.userData.eButtonMesh.visible = true;
          if (sliderKeyHandler) document.removeEventListener('keydown', sliderKeyHandler);
          document.removeEventListener('keydown', escHandler); // Also remove esc handler for this specific modal instance
          this.checkForInteractions();
          if (this.movementController && typeof this.movementController.enableMovement === 'function') {
            this.movementController.enableMovement();
          }
        });
      }
      // Allow clicking outside the modal to close it
      modal.addEventListener('click', (event) => {
        if (event.target === modal) {
          modal.style.display = 'none';
          if (posterMesh.userData.eButtonMesh) posterMesh.userData.eButtonMesh.visible = true;
          if (sliderKeyHandler) document.removeEventListener('keydown', sliderKeyHandler);
          document.removeEventListener('keydown', escHandler); // Also remove esc handler for this specific modal instance
          this.checkForInteractions();
          if (this.movementController && typeof this.movementController.enableMovement === 'function') {
            this.movementController.enableMovement();
          }
        }
      });
      // Allow ESC key to close the modal
      const escHandler = (event) => {
        if (event.key === 'Escape') {
          modal.style.display = 'none';
          if (posterMesh.userData.eButtonMesh) posterMesh.userData.eButtonMesh.visible = true;
          if (sliderKeyHandler) document.removeEventListener('keydown', sliderKeyHandler);
          document.removeEventListener('keydown', escHandler); // This specific escHandler instance
          this.checkForInteractions();
          if (this.movementController && typeof this.movementController.enableMovement === 'function') {
            this.movementController.enableMovement();
          }
        }
      };
      document.addEventListener('keydown', escHandler);
    } catch (error) {
      console.error("[ERROR] Error filling art poster details:", error);
      modal.innerHTML = `
        <div style="background: #111; color: #fff; padding: 20px; border-radius: 10px;">
          <h3>Art Poster Information</h3>
          <p>Title: ${posterMesh.userData.posterTitle || 'Unknown'}</p>
          <button onclick="this.parentNode.parentNode.style.display='none'">Close</button>
        </div>
      `;
    }
  }

  handleNodeInfoInteraction(nodeMesh) {
    // Debug: log to console
    console.log("[DEBUG] Node info interaction triggered", nodeMesh.userData.nodeType);
    if (!nodeMesh || !nodeMesh.userData) {
      console.error("[ERROR] Invalid node mesh for interaction");
      return;
    }

    // Show a modal overlay with node info
    let modal = document.getElementById('node-info-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'node-info-modal';
      modal.innerHTML = `
        <div class="node-modal-content">
          <div class="modal-header">
            <h2 id="node-modal-title"></h2>
          </div>
          <div class="modal-body">
            <div class="node-visual">
              <div class="node-sphere"></div>
              <div class="node-glow"></div>
            </div>
            <div class="info-container">
              <div id="node-modal-info-wrapper" class="info-wrapper">
                <p id="node-modal-info"></p>
                <div id="node-modal-link-wrapper" class="link-wrapper">
                  <a id="node-modal-link" href="#" target="_blank" rel="noopener noreferrer">
                    <span class="link-text">Explore Further</span>
                    <span class="link-arrow">→</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button id="node-modal-close">Close</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      // Style the modal
      if (!document.getElementById('node-modal-style')) {
        const style = document.createElement('style');
        style.id = 'node-modal-style';
        style.textContent = `
          #node-info-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0,0,0,0.9);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 2000;
            animation: fadeIn 0.3s ease;
          }
          .node-modal-content {
            background: linear-gradient(145deg, #0a0a0a, #1a1a1a);
            color: #fff;
            border-radius: 15px;
            padding: 2rem;
            box-shadow: 0 0 50px rgba(92, 222, 211, 0.3);
            max-width: 600px;
            width: 90%;
            max-height: 80vh;
            display: flex;
            flex-direction: column;
            font-family: 'Neue Montreal', sans-serif;
            border: 1px solid rgba(92, 222, 211, 0.5);
            transform: translateY(0);
            animation: slideUp 0.3s ease;
          }
          .modal-body {
            display: flex;
            flex-direction: column;
            flex-grow: 1;
            overflow: hidden;
            gap: 1.5rem;
          }
          .node-visual {
            display: flex;
            justify-content: center;
            align-items: center;
            position: relative;
            height: 120px;
            margin: 1rem 0;
          }
          .node-sphere {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            background: linear-gradient(45deg, #5CDED3, #4FC3F7);
            box-shadow: 0 0 30px rgba(92, 222, 211, 0.6);
            animation: nodeGlow 2s ease-in-out infinite alternate;
            position: relative;
            z-index: 2;
          }
          .node-glow {
            position: absolute;
            width: 120px;
            height: 120px;
            border-radius: 50%;
            background: radial-gradient(circle, rgba(92, 222, 211, 0.3) 0%, transparent 70%);
            animation: nodePulse 3s ease-in-out infinite;
          }
          @keyframes nodeGlow {
            from { box-shadow: 0 0 30px rgba(92, 222, 211, 0.6); }
            to { box-shadow: 0 0 50px rgba(92, 222, 211, 0.9); }
          }
          @keyframes nodePulse {
            0%, 100% { transform: scale(1); opacity: 0.5; }
            50% { transform: scale(1.2); opacity: 0.8; }
          }
          .info-container {
            flex: 1;
            display: flex;
            flex-direction: column;
          }
          .info-wrapper {
            flex: 1;
            overflow-y: auto;
            padding-right: 10px;
            scrollbar-width: thin;
            scrollbar-color: #5CDED3 #181818;
          }
          .info-wrapper::-webkit-scrollbar {
            width: 6px;
          }
          .info-wrapper::-webkit-scrollbar-thumb {
            background-color: #5CDED3;
            border-radius: 3px;
          }
          .link-wrapper {
            margin-top: 1.5rem;
            padding-top: 1rem;
            border-top: 1px solid rgba(92, 222, 211, 0.3);
          }
          .link-wrapper a {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            color: #5CDED3;
            text-decoration: none;
            font-weight: 500;
            transition: all 0.3s ease;
            padding: 0.5rem 1rem;
            border: 1px solid rgba(92, 222, 211, 0.5);
            border-radius: 6px;
            background: rgba(92, 222, 211, 0.1);
          }
          .link-wrapper a:hover {
            background: rgba(92, 222, 211, 0.2);
            transform: translateX(5px);
          }
          .link-arrow {
            transition: transform 0.3s ease;
          }
          .link-wrapper a:hover .link-arrow {
            transform: translateX(3px);
          }
          .modal-header h2 {
            margin-top: 0;
            color: #5CDED3;
            text-align: center;
            font-size: 1.5rem;
          }
          #node-modal-info {
            white-space: pre-line;
            line-height: 1.6;
            font-size: 1rem;
          }
          .modal-footer button {
            margin-top: 1.5rem;
            background: #5CDED3;
            color: #000;
            border: none;
            border-radius: 6px;
            padding: 0.75rem 2rem;
            font-size: 1rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
            width: 100%;
          }
          .modal-footer button:hover {
            background: #fff;
            transform: scale(1.02);
          }
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes slideUp {
            from { transform: translateY(20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
        `;
        document.head.appendChild(style);
      }
    }

    modal.style.display = 'flex';

    // Populate modal content
    try {
      const title = `${nodeMesh.userData.nodeType.charAt(0).toUpperCase()}${nodeMesh.userData.nodeType.slice(1)} Node`;
      document.getElementById('node-modal-title').textContent = title;
      document.getElementById('node-modal-info').textContent = nodeMesh.userData.infoContent || 'No information available for this node.';
      
      // Handle link if provided
      const linkElement = document.getElementById('node-modal-link');
      const linkWrapper = document.getElementById('node-modal-link-wrapper');
      if (nodeMesh.userData.link) {
        linkElement.href = nodeMesh.userData.link;
        linkWrapper.style.display = 'block';
      } else {
        linkWrapper.style.display = 'none';
      }

      // Close button handler
      const closeBtn = document.getElementById('node-modal-close');
      const closeHandler = () => {
        modal.style.display = 'none';
        closeBtn.removeEventListener('click', closeHandler);
        document.removeEventListener('keydown', escHandler);
        // Re-enable movement
        if (this.movementController && typeof this.movementController.enableMovement === 'function') {
          this.movementController.enableMovement();
        }
      };
      closeBtn.addEventListener('click', closeHandler);

      // ESC key handler
      const escHandler = (event) => {
        if (event.key === 'Escape') {
          closeHandler();
        }
      };
      document.addEventListener('keydown', escHandler);

      // Disable movement while modal is open
      if (this.movementController && typeof this.movementController.disableMovement === 'function') {
        this.movementController.disableMovement();
      }

    } catch (error) {
      console.error("[ERROR] Error filling node info details:", error);
      modal.innerHTML = `
        <div style="background: #111; color: #fff; padding: 20px; border-radius: 10px; text-align: center;">
          <h3>Node Information</h3>
          <p>Type: ${nodeMesh.userData.nodeType || 'Unknown'}</p>
          <button onclick="this.parentNode.parentNode.style.display='none'">Close</button>
        </div>
      `;
    }
  }

  // Cleanup
  dispose() {
    // Dispose Three.js resources
    this.scene?.dispose();
    this.renderer?.dispose();

    // Dispose game systems
    this.environment?.dispose();
    this.gameLoop?.dispose();
    this.performanceMonitor?.dispose();

    // Remove event listeners
    window.removeEventListener("resize", this.onWindowResize);
    window.removeEventListener("keydown", this._onKeyDown); // Clean up keydown listener

    // Clear global references
    window.threeCamera = null;
    window.playerPosition = null;
    window.playerCanMove = false;
  }

  // Add showSubtitle function
  subtitleTimeout = null;

  showSubtitle(text, duration = 5000) {
    const subtitleElement = document.getElementById("subtitle-container");
    if (!subtitleElement) {
      console.error("Subtitle container not found!");
      return;
    }

    subtitleElement.textContent = text;
    subtitleElement.style.opacity = 1; // Fade in

    // Clear any existing timeout to prevent premature hiding
    if (this.subtitleTimeout) {
      clearTimeout(this.subtitleTimeout);
    }

    // Set timeout to fade out
    this.subtitleTimeout = setTimeout(() => {
      subtitleElement.style.opacity = 0; // Fade out
      this.subtitleTimeout = null;
    }, duration);
  }

  showGameUI() {
    console.log("Showing game UI elements...");
    
    // Show the game HUD
    const gameHud = document.getElementById("game-hud");
    if (gameHud) {
      gameHud.style.display = "block";
    } else {
      console.warn("Game HUD element not found!");
    }

    // Show location indicator
    const locationIndicator = document.getElementById("location-indicator");
    if (locationIndicator) {
      locationIndicator.style.display = "block";
    }

    // Show controls info
    const controlsInfo = document.getElementById("controls-info");
    if (controlsInfo) {
      controlsInfo.style.display = "block";
    }

    // Hide any loading or transition elements
    const loadingScreen = document.getElementById("loading-screen");
    if (loadingScreen) {
      loadingScreen.style.display = "none";
    }

    // Make sure the three-container is visible
    const threeContainer = document.getElementById("three-container");
    if (threeContainer) {
      threeContainer.style.display = "block";
    }
  }

  // Add new method to show start screen
  showStartScreen() {
    // Remove any existing start screen first
    const existingStartScreen = document.getElementById("start-screen");
    if (existingStartScreen) {
      existingStartScreen.remove();
    }

    // Reset game state
    this.isGameStarted = false;
    if (this.gameLoop) {
      this.gameLoop.stop();
    }

    const startScreen = document.createElement("div");
    startScreen.id = "start-screen";
    startScreen.innerHTML = `
      <div class="start-container">
        <button id="start-button" class="start-button">BEGIN ORIENTATION</button>
        <p class="key-prompt">Press any key to begin orientation</p>
      </div>
    `;
    document.body.appendChild(startScreen);

    // Add event listener to the button with proper binding
    const startButton = document.getElementById("start-button");
    if (startButton) {
      const boundStartGame = this.startGame.bind(this);
      startButton.addEventListener("click", boundStartGame, { once: true });
    }

    // Add event listener for key press
    const keyPressHandler = (e) => {
      this.startGame();
      document.removeEventListener("keydown", keyPressHandler);
    };
    document.addEventListener("keydown", keyPressHandler);

    // Style the start screen
    const style = document.createElement("style");
    style.textContent = `
      #start-screen {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.85);
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        z-index: 1000;
      }
      .start-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        padding: 2rem;
        background: rgba(0, 0, 0, 0.7);
        border-radius: 10px;
        max-width: 500px;
        margin-bottom: 20px;
      }
      .start-button {
        background-color: rgba(0, 0, 0, 0.6);
        border: 1px solid #5CDED3;
        color: #FFFFFF;
        padding: 15px 35px;
        font-size: 1.1em;
        font-weight: 300;
        letter-spacing: 1px;
        cursor: pointer;
        transition: all 0.3s ease;
        border-radius: 4px;
        backdrop-filter: blur(5px);
        -webkit-backdrop-filter: blur(5px);
      }
      .start-button:hover {
        background-color: #5CDED3;
        color: #000000;
        box-shadow: 0 0 15px rgba(92, 222, 211, 0.5);
        transform: scale(1.05);
      }
      .start-button:active {
        transform: scale(0.98);
      }
      .key-prompt {
        color: #5CDED3;
        margin-top: 20px;
        font-size: 0.9em;
        letter-spacing: 1px;
        animation: pulse-key-prompt 2s infinite;
        text-align: center;
        align-self: center;
        margin-left: 0;
        margin-right: 0;
        padding: 0;
      }
      @keyframes pulse-key-prompt {
        0% { transform: scale(1); opacity: 0.8; }
        50% { transform: scale(1.05); opacity: 1; }
        100% { transform: scale(1); opacity: 0.8; }
      }
    `;
    document.head.appendChild(style);

    // Ensure player can't move until game starts
    if (this.environment?.gameState) {
      this.environment.gameState.isPlaying = false;
    }
    // Force resize for cinema scope
    if (typeof this.onWindowResize === 'function') {
      this.onWindowResize();
    }
  }

  /**
   * @method startGame
   * @description Start the Severance game from the start screen
   */
  startGame() {
    console.log("startGame called. playerCanMove:", window.playerCanMove, "isPlaying:", this.environment?.gameState?.isPlaying);
    
    // First, resume AudioContext since we're responding to a user gesture
    if (this.audioManager) {
      this.audioManager.resumeAudioContext()
        .then(success => {
          console.log("AudioContext resume result:", success ? "success" : "failed");
        })
        .catch(err => console.error("Error resuming AudioContext:", err));
    }
    
    // Set game state
    this.isGameStarted = true; // App-level flag
    if (this.environment?.gameState) {
      this.environment.gameState.isPlaying = true; // Environment-level flag
    }

    // Explicitly enable player movement
    if (this.movementController && typeof this.movementController.enableMovement === 'function') {
      this.movementController.enableMovement(); // This sets window.playerCanMove = true
    } else {
      // Fallback if enableMovement is not available or controller is missing
      window.playerCanMove = true; 
      console.warn("MovementController or enableMovement not found, setting window.playerCanMove directly.");
    }
    
    // Reset mouse state to prevent camera jump after enabling movement and pointer lock
    if (this.movementController) {
      this.movementController._firstMouseMove = true;
    }

    // Hide the start screen
    const startScreen = document.getElementById("start-screen");
    if (startScreen) {
      startScreen.remove();
    }
    // Remove any lingering keydown event for starting
    // document.removeEventListener("keydown", this.startGame); // Already handled by { once: true } or manual removal in showStartScreen

    // Request pointer lock
    const threeContainer = document.getElementById('three-container');
    if (threeContainer && typeof threeContainer.requestPointerLock === 'function') {
        threeContainer.requestPointerLock()
            .then(() => console.log("Pointer lock acquired for game start."))
            .catch(err => console.error("Error acquiring pointer lock:", err));
    }
    
    // Start the game loop if available
    if (this.gameLoop) {
      this.gameLoop.start();
    }
    // Show game UI if needed
    if (typeof this.showGameUI === 'function') {
      this.showGameUI();
    }
    
    // Debug log
    console.log(`Game started: isPlaying=${this.environment?.gameState?.isPlaying}, playerCanMove=${window.playerCanMove}`);
    
    // Force resize for fullscreen
    if (typeof this.onWindowResize === 'function') {
      this.onWindowResize();
    }
  }

  // Add a debug method to verify E button positions
  _debugVerifyPosterButtons() {
    if (!this.environment || !this.environment._customWatchInteractables) {
      console.warn("[DEBUG] No poster interactables found to verify");
      return;
    }
    
    console.log(`[DEBUG] Verifying ${this.environment._customWatchInteractables.length} poster interactables`);
    
    for (const posterMesh of this.environment._customWatchInteractables) {
      if (!posterMesh) {
        console.warn("[DEBUG] Found null poster interactable");
        continue;
      }
      
      // Log basic information
      console.log(`[DEBUG] Poster: ${posterMesh.userData.filmTitle || 'Unknown'}`);
      
      // Check if E button exists
      if (!posterMesh.userData.eButtonMesh) {
        console.error(`[DEBUG] Missing E button for poster: ${posterMesh.userData.filmTitle || 'Unknown'}`);
        continue;
      }
      
      // Get world positions
      const posterWorldPos = new THREE.Vector3();
      posterMesh.getWorldPosition(posterWorldPos);
      
      const buttonWorldPos = new THREE.Vector3();
      posterMesh.userData.eButtonMesh.getWorldPosition(buttonWorldPos);
      
      // Log positions
      console.log(`[DEBUG] Poster position: (${posterWorldPos.x.toFixed(2)}, ${posterWorldPos.y.toFixed(2)}, ${posterWorldPos.z.toFixed(2)})`);
      console.log(`[DEBUG] E button position: (${buttonWorldPos.x.toFixed(2)}, ${buttonWorldPos.y.toFixed(2)}, ${buttonWorldPos.z.toFixed(2)})`);
      
      // Verify button is above poster (y should be higher)
      const heightDiff = buttonWorldPos.y - posterWorldPos.y;
      if (heightDiff < 0.5) {
        console.warn(`[DEBUG] E button might not be positioned high enough above poster: ${heightDiff.toFixed(2)}m above`);
      } else {
        console.log(`[DEBUG] E button height verified: ${heightDiff.toFixed(2)}m above poster`);
      }
      
      // Verify button visibility state
      console.log(`[DEBUG] E button visible: ${posterMesh.userData.eButtonMesh.visible}`);
      
      // Create a temporary helper sphere to visualize E button position (debug only)
      if (this.isDevelopment) {
        // Remove old debug helpers first
        if (posterMesh.userData.debugHelper) {
          this.scene.remove(posterMesh.userData.debugHelper);
        }
        
        const helperGeometry = new THREE.SphereGeometry(0.05, 8, 8);
        const helperMaterial = new THREE.MeshBasicMaterial({ color: 0xff00ff });
        const helper = new THREE.Mesh(helperGeometry, helperMaterial);
        helper.position.copy(buttonWorldPos);
        this.scene.add(helper);
        
        // Store reference to remove it later
        posterMesh.userData.debugHelper = helper;
        
        // Auto-remove after 10 seconds
        setTimeout(() => {
          if (helper.parent) {
            this.scene.remove(helper);
          }
        }, 10000);
      }
    }
  }

  // Debug: Teleport to film room poster for testing
  teleportToFilmRoom(retryCount = 0) {
    if (
      this.environment &&
      this.environment._customWatchInteractables &&
      this.environment._customWatchInteractables.length > 0
    ) {
      const poster = this.environment._customWatchInteractables[0];
      const pos = new THREE.Vector3();
      poster.getWorldPosition(pos);
      console.log('[DEBUG] Poster world position:', pos);
      console.log('[DEBUG] Poster parent:', poster.parent ? poster.parent.name : 'No parent');
      // Print hierarchy up to scene
      let p = poster.parent;
      let hierarchy = [];
      while (p) { hierarchy.push(p.name || p.type); p = p.parent; }
      console.log('[DEBUG] Poster hierarchy:', hierarchy.join(' -> '));
      // If the position is still at origin or not valid, retry after a delay
      if ((pos.length() < 1 || pos.x === 0) && retryCount < 10) {
        console.warn('[DEBUG] Poster world position not valid yet, retrying teleport in 500ms...');
        setTimeout(() => this.teleportToFilmRoom(retryCount + 1), 500);
        return;
      }
      // Place the camera 2 units in front of the poster
      const forward = new THREE.Vector3(0, 0, -1).applyEuler(poster.userData.frameRotation || new THREE.Euler());
      pos.add(forward.multiplyScalar(2));
      pos.y = 1.7; // Eye height
      this.camera.position.copy(pos);
      if (this.movementController) {
        this.movementController.position.copy(pos);
      }
      window.playerPosition = this.camera.position;
      console.log('[DEBUG] Teleported to film room poster at', pos);
    } else {
      console.warn('[DEBUG] No film room poster found for teleport');
    }
  }
}

// Initialize the application when the DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  const app = new SeveranceApp();
  app.initialize();

  // Export for debugging in development
  if (import.meta.env.DEV) {
    window.app = app;
    window.app.teleportToFilmRoom = app.teleportToFilmRoom.bind(app);
  }

  // Always export app for interaction handlers
  window.app = app;

  // --- Animation loop for interaction checks ---
  function interactionLoop() {
    if (app.isGameStarted && typeof app.checkForInteractions === "function") {
      app.checkForInteractions();
    }
    requestAnimationFrame(interactionLoop);
  }
  requestAnimationFrame(interactionLoop);
});

// === DEV TERMINAL OVERLAY LOGIC ===
(function() {
  const overlay = document.getElementById('dev-terminal-overlay');
  const body = document.getElementById('dev-terminal-body');
  const promptDiv = document.getElementById('dev-terminal-prompt');
  const closeBtn = document.getElementById('dev-terminal-close');
  const minimizeBtn = document.querySelector('.terminal-minimize');
  const maximizeBtn = document.querySelector('.terminal-maximize');
  
  // Apply custom font to the terminal
  const terminalFontStyleId = 'dev-terminal-font-styles';
  if (!document.getElementById(terminalFontStyleId)) {
    const style = document.createElement('style');
    style.id = terminalFontStyleId;
    style.textContent = `
      #dev-terminal-overlay,
      #dev-terminal-overlay input,
      #dev-terminal-overlay button,
      #dev-terminal-body,
      #dev-terminal-prompt span,
      #dev-terminal-input {
        font-family: 'JetBrains Mono Nerd Font', 'JetBrains Mono', Consolas, Menlo, Monaco, monospace !important;
      }
      /* Ensure preformatted text within terminal output also inherits */
      #dev-terminal-body pre {
        font-family: inherit !important;
      }
    `;
    document.head.appendChild(style);
  }
  
  const PROMPT = 'parsa@portfolio:~$ ';
  const WELCOME_MESSAGE = [
    '█       AUTHORIZED ACCESS ONLY              █',
    '',
    'Type "help" for available commands.',
    ''
  ].join('\n');
  
  const CV_ASCII_ART = [
    '==================== CV ====================',
    '',
    'Exhibitions / Performances',
    '  solo performances:',
    '    - friends',
    '    - dissolve',
    '    - circle of confusion (with parsa samadpour)',
    '  group performances:',
    '    - Tree of Wishes',
    '    - Nafashay e Shahrvand',
    '    - Frame',
    '    - Beta\'s Trajectory',
    '',
    'Residencies, Research',
    '  - Callotype',
    '  - New Media Circle',
    '',
    'Writing and Publications',
    '  - study on the notion of stillness and motion in film and photography of late 19th century and early 20th century (masters thesis)',
    '',
    'Education',
    '  - MA Art Research',
    '    Iran University of Art, Tehran',
    '    2020-2024',
    '  - BA Cinema',
    '    Soore University, Tehran',
    '    2014-2020',
    '',
    'Film Practices',
    '  - 38:01',
    '    Lead Actor, 2017',
    '  - The One of Who Dances on Your Grave',
    '    Cinematographer, 2019',
    '',
    'Skills',
    '  - Development: JavaScript, React, WebGL, Three.js, GLSL, p5.js, HTML5/CSS3',
    '  - Design: After Creative Cloud, Figma',
    '',
    '============================================',
  ].join('\n');
  
  let input = '';
  let isOpen = false;
  let cursorVisible = true;
  let cursorInterval = null;
  let commandHistory = [];
  let historyIndex = -1;
  let isMinimized = false;
  let originalHeight = '400px';

  function renderPrompt() {
    promptDiv.innerHTML =
      `<span style="color:#33ff33;">${PROMPT}</span>` +
      `<span id="dev-terminal-input">${input.replace(/ /g, '&nbsp;')}</span>` +
      `<span class="dev-terminal-cursor">&nbsp;</span>`;
  }

  function appendOutput(text, className = '') {
    // Apply syntax highlighting if appropriate
    if (className === 'terminal-output') {
      // For multi-line output, preserve whitespace and line breaks
      body.innerHTML += `<div class="${className}"><pre style="margin:0; font-family:inherit;">${text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre></div>`;
    } else if (className) {
      body.innerHTML += `<div class="${className}">${text}</div>`;
    } else {
      body.innerHTML += `${text}\n`;
    }
    body.scrollTop = body.scrollHeight;
  }

  function processCommand(cmd) {
    // Add to command history if not empty
    if (cmd.trim() !== '' && (commandHistory.length === 0 || commandHistory[commandHistory.length - 1] !== cmd)) {
      commandHistory.push(cmd);
      historyIndex = commandHistory.length;
    }
    
    // Always show what was typed with proper styling
    appendOutput(`${PROMPT}${cmd}`, 'terminal-command');
    
    const trimmedCmd = cmd.trim().toLowerCase();
    let output = '';
    
    // Handle commands
    switch(trimmedCmd) {
      case 'help':
        output = [
          'Available commands:',
          '  help          - Display this help message',
          '  clear         - Clear the terminal',
          '  version       - Display terminal version',
          '  cv            - Display CV information',
          '  biography     - Display biography information',
          '  contact       - Display contact information',
          '  ls            - List files in current directory',
          '  whoami        - Display current user',
          '  exit          - Close the terminal'
        ].join('\n');
        appendOutput(output, 'terminal-output');
        break;
        
      case 'clear':
        body.innerHTML = '';
        break;
        
      case 'version':
        appendOutput(VERSION, 'terminal-output');
        break;
        
      case 'cv':
        output = CV_ASCII_ART;
        appendOutput(output, 'terminal-output');
        break;
        
      case 'biography':
        output = [
          'Parsa Azari is a designer turned developer based in Tehran.',
          '',
          'His practice spans film, motion graphics, and interaction design,',
          'evolving from traditional visual media to digital interfaces and creative',
          'coding that explore both aesthetic and functional dimensions of',
          'human-computer interaction.',
          '',
          'His work is informed by film theory, media studies, and art research,',
          'drawing connections between early cinema history and contemporary',
          'digital experiences to examine how technologies shape human',
          'perception and engagement.',
          '',
          'Azari was part of New Media Group, a research collective at Tehran',
          'Museum of Contemporary Art (TMoCA), and Beta performance art',
          'group. He holds a BA in Cinema from Soore University and an MA in Art',
          'Research from Iran University of Art.'
        ].join('\n');
        appendOutput(output, 'terminal-output');
        break;
        
      case 'contact':
        output = [
          'email:    parsaazari28@proton.me',
          'github:   @parsaa74',
          'mastodon: @parsaaz',
          'x:        @sighpaaa',
          'are.na:   @parsa-azari',
          'bsky:     @sighpaa.bsky.social'
        ].join('\n');
        appendOutput(output, 'terminal-output');
        break;
        
      case 'ls':
        output = [
          'Documents/',
          'macrodata.dat',
          'refinement.exe',
          'secrets.txt',
          'README.md'
        ].join('\n');
        appendOutput(output, 'terminal-output');
        break;
        
      case 'whoami':
        appendOutput('macrodata-refiner-429', 'terminal-output');
        break;
        
      case 'exit':
        window.hideDevTerminalOverlay();
        return;
        
      default:
        if (trimmedCmd === '') {
          // Just show a blank line for empty command
          appendOutput('');
        } else {
          // Command not recognized
          appendOutput(`bash: ${cmd}: command not found`, 'terminal-error');
        }
    }
  }

  function navigateHistory(direction) {
    if (commandHistory.length === 0) return;
    
    if (direction === 'up') {
      historyIndex = Math.max(0, historyIndex - 1);
      input = commandHistory[historyIndex] || '';
    } else if (direction === 'down') {
      historyIndex = Math.min(commandHistory.length, historyIndex + 1);
      input = historyIndex === commandHistory.length ? '' : commandHistory[historyIndex];
    }
    
    renderPrompt();
  }

  function onKeyDown(e) {
    if (!isOpen || isMinimized) return;
    
    // Keyboard scrolling for terminal
    const scrollAmountLine = 30; // px per line
    const scrollAmountPage = body.clientHeight - 40; // px per page (minus prompt)
    if (e.shiftKey && e.key === 'PageUp') {
      body.scrollTop = Math.max(0, body.scrollTop - scrollAmountPage);
      e.preventDefault();
      return;
    }
    if (e.shiftKey && e.key === 'PageDown') {
      body.scrollTop = Math.min(body.scrollHeight, body.scrollTop + scrollAmountPage);
      e.preventDefault();
      return;
    }
    if (e.ctrlKey && (e.key === 'ArrowUp' || e.key === 'Up')) {
      body.scrollTop = Math.max(0, body.scrollTop - scrollAmountLine);
      e.preventDefault();
      return;
    }
    if (e.ctrlKey && (e.key === 'ArrowDown' || e.key === 'Down')) {
      body.scrollTop = Math.min(body.scrollHeight, body.scrollTop + scrollAmountLine);
      e.preventDefault();
      return;
    }
    // Handle special keys
    switch(e.key) {
      case 'Escape':
        window.hideDevTerminalOverlay();
        e.preventDefault();
        return;
        
      case 'Backspace':
        input = input.slice(0, -1);
        renderPrompt();
        e.preventDefault();
        return;
        
      case 'Enter':
        processCommand(input);
        input = '';
        renderPrompt();
        e.preventDefault();
        return;
        
      case 'ArrowUp':
        navigateHistory('up');
        e.preventDefault();
        return;
        
      case 'ArrowDown':
        navigateHistory('down');
        e.preventDefault();
        return;
        
      case 'Tab':
        // Simple tab completion (to be expanded)
        const commands = ['help', 'clear', 'version', 'cv', 'biography', 'contact', 'ls', 'whoami', 'exit'];
        const matchingCmds = commands.filter(cmd => cmd.startsWith(input));
        
        if (matchingCmds.length === 1) {
          input = matchingCmds[0];
          renderPrompt();
        } else if (matchingCmds.length > 1) {
          appendOutput(`${PROMPT}${input}`, 'terminal-command');
          appendOutput(matchingCmds.join('  '), 'terminal-output');
          renderPrompt();
        }
        e.preventDefault();
        return;
    }
    
    // Handle regular character input
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      input += e.key;
      renderPrompt();
      e.preventDefault();
      return;
    }
    
    // Prevent browser shortcuts when terminal is focused
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
    }
  }

  // Toggle terminal size (minimize/maximize)
  function toggleMinimize() {
    if (isMinimized) {
      // Restore
      overlay.style.height = originalHeight;
      body.style.display = 'block';
      promptDiv.style.display = 'flex';
      isMinimized = false;
    } else {
      // Minimize
      originalHeight = overlay.style.height;
      overlay.style.height = '25px';
      body.style.display = 'none';
      promptDiv.style.display = 'none';
      isMinimized = true;
    }
  }

  // Handle click events for terminal controls
  if (minimizeBtn) {
    minimizeBtn.onclick = toggleMinimize;
  }
  
  if (maximizeBtn) {
    maximizeBtn.onclick = function() {
      if (overlay.style.width === '100vw') {
        // Restore normal size
        overlay.style.width = '700px';
        overlay.style.height = '400px';
        overlay.style.left = '5vw';
        overlay.style.top = '15vh';
      } else {
        // Maximize
        overlay.style.width = '100vw';
        overlay.style.height = '100vh';
        overlay.style.left = '0';
        overlay.style.top = '0';
      }
    };
  }

  // Make terminal draggable (basic implementation)
  let isDragging = false;
  let offsetX, offsetY;
  
  document.getElementById('dev-terminal-header').addEventListener('mousedown', function(e) {
    // Don't drag if clicking controls
    if (e.target.classList.contains('terminal-btn')) return;
    
    isDragging = true;
    offsetX = e.clientX - overlay.getBoundingClientRect().left;
    offsetY = e.clientY - overlay.getBoundingClientRect().top;
  });
  
  document.addEventListener('mousemove', function(e) {
    if (!isDragging) return;
    
    const x = e.clientX - offsetX;
    const y = e.clientY - offsetY;
    
    overlay.style.left = `${x}px`;
    overlay.style.top = `${y}px`;
  });
  
  document.addEventListener('mouseup', function() {
    isDragging = false;
  });

  window.showDevTerminalOverlay = function() {
    if (isOpen) return;
    
    overlay.style.display = 'block';
    isOpen = true;
    input = '';
    
    // Clear and show welcome message
    body.innerHTML = '';
    appendOutput(WELCOME_MESSAGE);
    
    renderPrompt();
    overlay.focus();
    
    // Prevent player movement while terminal is open
    window.playerCanMove = false;
    
    // Add event listener for keyboard input
    document.addEventListener('keydown', onKeyDown, true);
    
    // Blinking cursor effect
    if (cursorInterval) clearInterval(cursorInterval);
    cursorInterval = setInterval(() => {
      const cursor = promptDiv.querySelector('.dev-terminal-cursor');
      if (cursor) cursor.style.opacity = cursorVisible ? '1' : '0';
      cursorVisible = !cursorVisible;
    }, 500);
  };

  window.hideDevTerminalOverlay = function() {
    if (!isOpen) return;
    
    overlay.style.display = 'none';
    isOpen = false;
    input = '';
    renderPrompt();
    
    // Re-enable player movement
    window.playerCanMove = true;
    
    // Remove keyboard event listener
    document.removeEventListener('keydown', onKeyDown, true);
    
    // Clear cursor interval
    if (cursorInterval) clearInterval(cursorInterval);
  };

  if (closeBtn) closeBtn.onclick = window.hideDevTerminalOverlay;
})();
