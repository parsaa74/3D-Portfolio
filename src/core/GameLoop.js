import * as THREE from "three";
import { UnifiedMovementController } from "../systems/movement/UnifiedMovementController.js";
import { AudioManager } from './audio/AudioManager.js';

export class GameLoop {
  constructor(scene, camera, environment, audioManager) {
    console.log("Initializing GameLoop");

    if (!scene || !camera || !environment || !audioManager) {
      throw new Error(
        "Scene, camera, environment, and audioManager must be provided to GameLoop"
      );
    }

    this.scene = scene;
    this.camera = camera;
    this.environment = environment;
    this.audioManager = audioManager;
    this.isRunning = false;
    this.lastFrameTime = 0;

    // Add disorientation tracking for maze-like experience
    this.disorientation = {
      active: false,
      intensity: 0,
      maxIntensity: 0.03,
      currentDuration: 0,
      duration: 4000, // ms
      lastPosition: new THREE.Vector3(),
      totalDistance: 0,
      soundActive: false,
    };

    // Bind methods
    this.start = this.start.bind(this);
    this.stop = this.stop.bind(this);
    this.update = this.update.bind(this);
    this.updateDisorientation = this.updateDisorientation.bind(this);

    console.log("GameLoop initialization complete");
  }

  start() {
    if (!this.isRunning) {
      this.isRunning = true;
      this.lastFrameTime = performance.now();

      // Start generative mysterious music, but handle possible failure
      if (this.audioManager) {
        this.audioManager.startDroneInstallation()
          .catch(error => {
            console.warn("Failed to start audio, will try again on next user interaction:", error);
          });
      }

      this.update();

      // Initialize disorientation tracker with current camera position
      if (this.camera && this.camera.position) {
        this.disorientation.lastPosition.copy(this.camera.position);
      }
    }
  }

  stop() {
    this.isRunning = false;
    // Stop generative mysterious music
    this.audioManager.stopDroneInstallation();
  }

  update() {
    if (!this.isRunning) {
        return;
    }

    const currentTime = performance.now();
    const deltaTime = (currentTime - this.lastFrameTime) / 1000;
    this.lastFrameTime = currentTime;

    // Update the environment (which includes movement controller, systems, etc.)
    if (this.environment && typeof this.environment.update === 'function') {
      console.log("GameLoop.update: Calling environment.update..."); // LOG BEFORE
      try {
           this.environment.update(deltaTime);
           console.log("GameLoop.update: Returned from environment.update."); // LOG AFTER
      } catch (envError) {
           console.error("ERROR during environment.update:", envError); // LOG ERROR
           this.stop(); // Stop the loop if environment update fails critically
           return;
      }
    } else {
       console.warn("GameLoop.update: Environment or environment.update missing!");
    }

    // Update disorientation effect for maze-like experience
    // console.log("GameLoop.update: Calling updateDisorientation..."); // Optional log
    this.updateDisorientation(deltaTime);

    // Request next frame - REMOVED - This is handled in main.js
    // requestAnimationFrame(this.update);
  }

  /**
   * Updates disorientation effect based on player movement through the maze
   * Creates subtle rotation changes when player moves through complex areas
   * Plays unsettling sounds during disorientation.
   * @param {number} deltaTime - Time since last frame in seconds
   */
  updateDisorientation(deltaTime) {
    // Add a check at the very beginning
    if (!this.audioManager) {
        console.warn("updateDisorientation: AudioManager is missing!");
        return;
    }
    if (!this.camera) {
        // console.warn("updateDisorientation: Camera is missing!");
        return; // Less spammy
    }
    if (!window.activeMovementController) {
        // console.warn("updateDisorientation: activeMovementController is missing!");
        return; // Less spammy
    }

    // Calculate distance moved since last frame
    const currentPos = this.camera.position.clone();
    const distanceMoved = currentPos.distanceTo(
      this.disorientation.lastPosition
    );
    this.disorientation.lastPosition.copy(currentPos);

    // Accumulate distance for trigger threshold
    this.disorientation.totalDistance += distanceMoved;

    // Check if player is in a junction/intersection
    let segmentInfo = "N/A";
    let isInJunction = false;
    try {
        if (window.activeMovementController.getCurrentSegment) {
            const segment = window.activeMovementController.getCurrentSegment();
            segmentInfo = segment ? segment.toString() : "null_segment";
            isInJunction = segmentInfo.includes("junction");
        }
    } catch (e) {
        console.error("Error getting/checking segment:", e);
        segmentInfo = "Error";
    }

    // Trigger disorientation after accumulated movement or at junctions
    const triggerConditionMet = this.disorientation.totalDistance > 50 || isInJunction;

    if (triggerConditionMet) {
      // Reset accumulated distance
      this.disorientation.totalDistance = 0;

      // Begin disorientation effect if not already active
      if (!this.disorientation.active) {
        this.disorientation.active = true;
        this.disorientation.currentDuration = 0;
        this.disorientation.intensity =
          Math.random() * this.disorientation.maxIntensity;

        // No longer play disorientation sounds; generative music is always running
      }
    }
  }

  dispose() {
    this.stop();
    // Call dispose on AudioManager to clean up AudioContext and listeners
    if (this.audioManager && typeof this.audioManager.dispose === 'function') {
        this.audioManager.dispose();
    }
  }
}
