import { BaseController } from "./BaseController";
import * as THREE from "three";

/**
 * Specialized controller for Lumon corridor movement
 * Handles the unique movement constraints and interactions of the corridor system
 * @class CorridorController
 * @extends BaseController
 */
export class CorridorController extends BaseController {
  constructor() {
    super();
    this.currentSegment = null;
    this.lastValidPosition = { x: 0, z: 0 };
    this.interactionRange = 2.0; // Distance for door interactions

    // Stealth system
    this.stealthLevel = 0;
    this.isInShadow = false;
    this.nearSupervisor = false;
    this.supervisors = new Set();

    // Map system
    this.exploredAreas = new Set();
    this.mapCellSize = 5.0;

    // Keycard system
    this.keycards = new Set();

    // Initialize UI
    this.initializeUI();
  }

  /**
   * Initialize UI elements for the corridor system
   * @private
   */
  initializeUI() {
    // Create stealth indicator
    const stealthIndicator = document.createElement("div");
    stealthIndicator.id = "stealth-indicator";
    stealthIndicator.style.position = "absolute";
    stealthIndicator.style.left = "20px";
    stealthIndicator.style.top = "20px";
    stealthIndicator.style.width = "20px";
    stealthIndicator.style.height = "20px";
    stealthIndicator.style.background = "#ff0000";
    document.body.appendChild(stealthIndicator);

    // Create keycard container
    const keycardContainer = document.createElement("div");
    keycardContainer.id = "keycard-container";
    keycardContainer.style.position = "absolute";
    keycardContainer.style.left = "20px";
    keycardContainer.style.bottom = "20px";
    document.body.appendChild(keycardContainer);
  }

  /**
   * Update the controller state
   * @param {number} deltaTime Time since last update
   */
  update(deltaTime) {
    super.update(deltaTime);

    // Update stealth mechanics
    this.updateStealth(deltaTime);

    // Update map
    this.updateExploredAreas();

    // Update UI
    this.updateUI();
  }

  /**
   * Update stealth mechanics
   * @param {number} deltaTime Time since last update
   * @private
   */
  updateStealth(deltaTime) {
    // Check if player is in shadow
    this.isInShadow = this.checkShadowLevel();

    // Check for nearby supervisors
    this.nearSupervisor = this.checkForSupervisors();

    // Update stealth level
    if (this.nearSupervisor) {
      this.stealthLevel = Math.max(0, this.stealthLevel - 0.1 * deltaTime);
    } else if (this.isInShadow) {
      this.stealthLevel = Math.min(1, this.stealthLevel + 0.2 * deltaTime);
    } else {
      this.stealthLevel = Math.max(0, this.stealthLevel - 0.05 * deltaTime);
    }
  }

  /**
   * Check if player is in shadow
   * @returns {boolean} True if player is in shadow
   * @private
   */
  checkShadowLevel() {
    if (!this.scene) return false;

    // Create raycaster for light detection
    const raycaster = new THREE.Raycaster();
    const playerPos = new THREE.Vector3(
      window.playerPosition.x,
      window.playerPosition.y,
      window.playerPosition.z
    );

    // Check each light in the scene
    let totalLight = 0;
    this.scene.traverse((object) => {
      if (object.isLight) {
        const lightPos = object.position;
        const direction = new THREE.Vector3()
          .subVectors(lightPos, playerPos)
          .normalize();

        raycaster.set(playerPos, direction);
        const intersects = raycaster.intersectObjects(
          this.scene.children,
          true
        );

        // If no obstacles between player and light
        if (intersects.length === 0) {
          const distance = playerPos.distanceTo(lightPos);
          totalLight += object.intensity / (distance * distance);
        }
      }
    });

    return totalLight < 0.3; // Threshold for shadow
  }

  /**
   * Check for nearby supervisors
   * @returns {boolean} True if a supervisor is nearby
   * @private
   */
  checkForSupervisors() {
    if (!this.supervisors.size) return false;

    const playerPos = new THREE.Vector3(
      window.playerPosition.x,
      window.playerPosition.y,
      window.playerPosition.z
    );

    for (const supervisor of this.supervisors) {
      const distance = playerPos.distanceTo(supervisor.position);
      if (distance < 5) return true;
    }

    return false;
  }

  /**
   * Update explored areas on the map
   * @private
   */
  updateExploredAreas() {
    const currentCell = {
      x: Math.floor(window.playerPosition.x / this.mapCellSize),
      z: Math.floor(window.playerPosition.z / this.mapCellSize),
    };

    this.exploredAreas.add(`${currentCell.x},${currentCell.z}`);
  }

  /**
   * Update UI elements
   * @private
   */
  updateUI() {
    // Update stealth indicator
    const stealthIndicator = document.getElementById("stealth-indicator");
    if (stealthIndicator) {
      stealthIndicator.style.opacity = 1 - this.stealthLevel;
    }
  }

  /**
   * Add a keycard to the player's inventory
   * @param {string} id Keycard ID
   */
  addKeycard(id) {
    this.keycards.add(id);
    this.updateKeycardUI();
  }

  /**
   * Check if player has a specific keycard
   * @param {string} id Keycard ID
   * @returns {boolean} True if player has the keycard
   */
  hasKeycard(id) {
    return this.keycards.has(id);
  }

  /**
   * Update the keycard UI
   * @private
   */
  updateKeycardUI() {
    const container = document.getElementById("keycard-container");
    if (!container) return;

    container.innerHTML = "";
    this.keycards.forEach((id) => {
      const keycard = document.createElement("div");
      keycard.className = "keycard";
      keycard.textContent = id;
      container.appendChild(keycard);
    });
  }

  /**
   * Handle door interactions with keycard check
   * @param {Object} door Door object to interact with
   * @override
   */
  handleDoorInteraction(door) {
    if (door.requiresKeycard && !this.hasKeycard(door.keycardId)) {
      this.showMessage("Access denied. Required keycard not found.");
      return;
    }

    super.handleDoorInteraction(door);
  }

  /**
   * Show a message to the player
   * @param {string} text Message text
   * @private
   */
  showMessage(text) {
    const message = document.createElement("div");
    message.className = "severance-message";
    message.textContent = text;
    document.body.appendChild(message);
    setTimeout(() => message.remove(), 3000);
  }

  /**
   * Move forward in the corridor system
   * Includes collision detection and sliding along walls
   */
  moveForward() {
    if (!window.playerPosition) {
      console.error("Movement system not properly initialized");
      return;
    }

    if (!this.ensureRenderer()) return;

    const deltaTime = this.getDeltaTime();
    const moveAmount = this.moveSpeed * deltaTime;

    // Calculate new position
    const angle = window.playerRotation.y;
    const moveX = Math.sin(angle) * moveAmount;
    const moveZ = Math.cos(angle) * moveAmount;

    this.attemptMovement(moveX, moveZ);
  }

  /**
   * Attempt to move in the given direction, including wall sliding
   * @param {number} moveX X movement amount
   * @param {number} moveZ Z movement amount
   */
  attemptMovement(moveX, moveZ) {
    const newX = window.playerPosition.x + moveX;
    const newZ = window.playerPosition.z + moveZ;

    if (this.isValidPosition(newX, newZ)) {
      window.playerPosition.x = newX;
      window.playerPosition.z = newZ;
      this.lastValidPosition = { x: newX, z: newZ };
    } else {
      // Attempt to slide along walls
      if (
        this.isValidPosition(
          window.playerPosition.x + moveX,
          window.playerPosition.z
        )
      ) {
        window.playerPosition.x += moveX;
      } else if (
        this.isValidPosition(
          window.playerPosition.x,
          window.playerPosition.z + moveZ
        )
      ) {
        window.playerPosition.z += moveZ;
      }
    }

    this.updateCurrentSegment();
  }

  /**
   * Check if a position is valid (no collisions)
   * @param {number} x X coordinate to check
   * @param {number} z Z coordinate to check
   * @returns {boolean} True if position is valid
   */
  isValidPosition(x, z) {
    // Implementation depends on your collision system
    // This is a placeholder that should be replaced with actual collision detection
    return true;
  }

  /**
   * Update the current corridor segment based on player position
   */
  updateCurrentSegment() {
    // Implementation depends on your corridor system
    // This should update this.currentSegment based on player position
  }

  /**
   * Handle interaction with doors and other corridor elements
   */
  interact() {
    if (!this.currentSegment) return;

    // Check for nearby doors
    const doors = this.currentSegment.doors || [];
    for (const door of doors) {
      if (
        this.distanceBetween(
          window.playerPosition.x,
          window.playerPosition.z,
          door.position.x,
          door.position.z
        ) < this.interactionRange
      ) {
        this.handleDoorInteraction(door);
        break;
      }
    }
  }
}
