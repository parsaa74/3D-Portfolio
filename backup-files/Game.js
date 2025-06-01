import { Engine } from "./core/Engine";
import { InputSystem } from "./systems/input/InputSystem";
import { PhysicsSystem } from "./systems/physics/PhysicsSystem";
import { PlayerSystem } from "./systems/player/PlayerSystem";
import { AssetLoader } from "./systems/environment/AssetLoader";
import { EnvironmentSystem } from "./systems/environment/EnvironmentSystem";
import { THREE } from "./utils/ThreeJSLoader.js";
import * as CANNON from "cannon-es";

/**
 * Main game class for Severance
 * @class Game
 */
export class Game {
  constructor(options = {}) {
    this.options = {
      debug: false,
      pointerLock: true,
      ...options,
    };

    // Create engine
    this.engine = new Engine({
      debug: this.options.debug,
      pointerLock: this.options.pointerLock,
    });

    // Get loading screen elements
    this.loadingScreen = document.getElementById("loading-screen");
    this.loadingBar = document.getElementById("loading-bar");
    this.loadingText = document.getElementById("loading-text");
    this.instructions = document.getElementById("instructions");
  }

  /**
   * Initialize game systems
   * @private
   */
  async _initSystems() {
    try {
      // Add input system
      this.engine.addSystem("input", new InputSystem());

      // Add physics system
      this.engine.addSystem(
        "physics",
        new PhysicsSystem({
          gravity: new CANNON.Vec3(0, -9.82, 0),
        })
      );

      // Add asset loader system
      const assetLoader = new AssetLoader();
      this.engine.addSystem("assets", assetLoader);

      // Add environment system
      this.engine.addSystem("environment", new EnvironmentSystem());

      // Add player system last (after physics and environment are set up)
      const playerSystem = new PlayerSystem();
      await playerSystem.init(this.engine); // Initialize player system before adding it
      this.engine.addSystem("player", playerSystem);

      // Update loading screen
      this._updateLoadingScreen("Loading assets...", 0.1);

      // Load assets
      assetLoader.on("progress", (progress) => {
        this._updateLoadingScreen("Loading assets...", 0.1 + progress * 0.6);
      });

      const assetsLoaded = await assetLoader.loadAssets();
      if (!assetsLoaded) {
        throw new Error("Failed to load assets");
      }

      // Initialize environment
      this._updateLoadingScreen("Creating environment...", 0.8);
      await this._initEnvironment();

      // Hide loading screen and show instructions
      this._updateLoadingScreen("Ready!", 1);
      setTimeout(() => {
        if (this.loadingScreen) {
          this.loadingScreen.style.display = "none";
        }
        if (this.instructions) {
          this.instructions.classList.add("visible");
        }
      }, 500);
    } catch (error) {
      console.error("Failed to initialize game:", error);
      this._updateLoadingScreen(`Error: ${error.message}`, 1);
      throw error; // Re-throw to propagate to main.js
    }
  }

  /**
   * Update loading screen
   * @private
   * @param {string} text - Loading text
   * @param {number} progress - Loading progress (0-1)
   */
  _updateLoadingScreen(text, progress) {
    if (this.loadingText) {
      this.loadingText.textContent = text;
    }
    if (this.loadingBar) {
      this.loadingBar.style.width = `${progress * 100}%`;
    }
  }

  /**
   * Initialize game environment
   * @private
   */
  async _initEnvironment() {
    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.engine.scene.add(ambientLight);

    // Add directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(-5, 5, -5);
    directionalLight.castShadow = true;
    this.engine.scene.add(directionalLight);

    // Get environment system
    const environment = this.engine.getSystem("environment");

    // Create main corridor
    environment.createCorridorSegment(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -20)
    );

    // Create left branch
    environment.createCorridorSegment(
      new THREE.Vector3(0, 0, -10),
      new THREE.Vector3(-10, 0, -10)
    );

    // Create right branch
    environment.createCorridorSegment(
      new THREE.Vector3(0, 0, -10),
      new THREE.Vector3(10, 0, -10)
    );

    // Add doors
    environment.createDoor(
      new THREE.Vector3(-8, 0, -10),
      new THREE.Vector3(0, 0, 1)
    );
    environment.createDoor(
      new THREE.Vector3(8, 0, -10),
      new THREE.Vector3(0, 0, 1)
    );
    environment.createDoor(
      new THREE.Vector3(0, 0, -18),
      new THREE.Vector3(1, 0, 0)
    );

    // Set player spawn position
    const player = this.engine.getSystem("player");
    player.mesh.position.set(0, 2, 0);
  }

  /**
   * Start the game
   */
  start() {
    // Start engine
    this.engine.start();

    // Add click handler for instructions and pointer lock
    const onClick = () => {
      if (this.instructions) {
        this.instructions.style.display = "none";
      }

      // Request pointer lock
      const canvas = this.engine.renderer.domElement;
      canvas.requestPointerLock =
        canvas.requestPointerLock ||
        canvas.mozRequestPointerLock ||
        canvas.webkitRequestPointerLock;
      canvas.requestPointerLock();

      document.removeEventListener("click", onClick);
    };

    // Show instructions
    if (this.instructions) {
      this.instructions.style.display = "block";
    }
    document.addEventListener("click", onClick);

    // Debug pointer lock changes
    document.addEventListener("pointerlockchange", () => {
      console.log("Pointer lock changed:", document.pointerLockElement);
    });
  }

  /**
   * Stop the game
   */
  stop() {
    this.engine.stop();
  }

  /**
   * Clean up resources
   */
  dispose() {
    this.engine.dispose();
  }
}
