import * as THREE from "three";

/**
 * MapSystem - Handles map exploration and visualization
 * Implements Severance's map mechanics for tracking explored areas
 */
export class MapSystem {
  constructor(options = {}) {
    // Map grid settings
    this.cellSize = options.cellSize || 2;
    this.mapSize = options.mapSize || 100;

    // Explored areas tracking
    this.exploredCells = new Set();
    this.exploredAreas = new Map(); // Maps cell coordinates to area type

    // Department zones
    this.departmentZones = new Map();

    // UI elements
    this.mapCanvas = null;
    this.mapContext = null;
    this.mapScale = options.mapScale || 5;

    // Colors for different areas
    this.areaColors = {
      MDR: "#2196F3",
      O_AND_D: "#4CAF50",
      WELLNESS: "#FF9800",
      UNEXPLORED: "#1a1a1a",
      CORRIDOR: "#ffffff",
    };
  }

  /**
   * Initialize the map system
   * @param {HTMLElement} container - Container for the map UI
   */
  initialize(container) {
    this.createMapUI(container);
  }

  /**
   * Create the map UI
   * @param {HTMLElement} container - Container element for the map
   * @private
   */
  createMapUI(container) {
    // Create canvas for map rendering
    this.mapCanvas = document.createElement("canvas");
    this.mapCanvas.id = "map-canvas";
    this.mapCanvas.width = this.mapSize * this.mapScale;
    this.mapCanvas.height = this.mapSize * this.mapScale;
    this.mapCanvas.style.position = "absolute";
    this.mapCanvas.style.right = "20px";
    this.mapCanvas.style.top = "20px";
    this.mapCanvas.style.background = "#000000";
    this.mapCanvas.style.border = "2px solid #333333";
    container.appendChild(this.mapCanvas);

    // Get canvas context
    this.mapContext = this.mapCanvas.getContext("2d");
  }

  /**
   * Convert world position to map grid coordinates
   * @param {THREE.Vector3} position - World position
   * @returns {Object} Grid coordinates {x, z}
   * @private
   */
  worldToGrid(position) {
    return {
      x: Math.floor(position.x / this.cellSize),
      z: Math.floor(position.z / this.cellSize),
    };
  }

  /**
   * Update explored areas based on player position
   * @param {THREE.Vector3} playerPosition - Current player position
   * @param {string} currentArea - Current department/area type
   */
  updateExploration(playerPosition, currentArea) {
    const gridPos = this.worldToGrid(playerPosition);
    const cellKey = `${gridPos.x},${gridPos.z}`;

    if (!this.exploredCells.has(cellKey)) {
      this.exploredCells.add(cellKey);
      this.exploredAreas.set(cellKey, currentArea);
      this.updateMapDisplay();
    }
  }

  /**
   * Define a department zone
   * @param {string} department - Department name
   * @param {THREE.Box3} bounds - Bounding box of the department
   */
  defineDepartmentZone(department, bounds) {
    const minGrid = this.worldToGrid(bounds.min);
    const maxGrid = this.worldToGrid(bounds.max);

    this.departmentZones.set(department, {
      min: minGrid,
      max: maxGrid,
    });
  }

  /**
   * Update the map display
   * @private
   */
  updateMapDisplay() {
    // Clear canvas
    this.mapContext.fillStyle = this.areaColors.UNEXPLORED;
    this.mapContext.fillRect(0, 0, this.mapCanvas.width, this.mapCanvas.height);

    // Draw explored areas
    for (const [cellKey, areaType] of this.exploredAreas) {
      const [x, z] = cellKey.split(",").map(Number);
      const screenX = (x + this.mapSize / 2) * this.mapScale;
      const screenY = (z + this.mapSize / 2) * this.mapScale;

      this.mapContext.fillStyle =
        this.areaColors[areaType] || this.areaColors.CORRIDOR;
      this.mapContext.fillRect(screenX, screenY, this.mapScale, this.mapScale);
    }

    // Draw player position
    this.drawPlayerPosition();
  }

  /**
   * Draw the player's position on the map
   * @private
   */
  drawPlayerPosition() {
    if (!this.lastPlayerPosition) return;

    const gridPos = this.worldToGrid(this.lastPlayerPosition);
    const screenX = (gridPos.x + this.mapSize / 2) * this.mapScale;
    const screenY = (gridPos.z + this.mapSize / 2) * this.mapScale;

    // Draw player marker
    this.mapContext.fillStyle = "#ff0000";
    this.mapContext.beginPath();
    this.mapContext.arc(
      screenX + this.mapScale / 2,
      screenY + this.mapScale / 2,
      this.mapScale / 2,
      0,
      Math.PI * 2
    );
    this.mapContext.fill();
  }

  /**
   * Update the map system
   * @param {number} deltaTime - Time since last update
   * @param {THREE.Vector3} playerPosition - Current player position
   */
  update(deltaTime, playerPosition) {
    if (!playerPosition || !playerPosition.clone) {
      return;
    }

    this.lastPlayerPosition = playerPosition.clone();

    // Determine current area
    let currentArea = "CORRIDOR";
    for (const [department, zone] of this.departmentZones) {
      const gridPos = this.worldToGrid(playerPosition);
      if (
        gridPos.x >= zone.min.x &&
        gridPos.x <= zone.max.x &&
        gridPos.z >= zone.min.z &&
        gridPos.z <= zone.max.z
      ) {
        currentArea = department;
        break;
      }
    }

    this.updateExploration(playerPosition, currentArea);
    this.updateMapDisplay();
  }

  /**
   * Get the percentage of the map that has been explored
   * @returns {number} Percentage explored (0-100)
   */
  getExplorationPercentage() {
    const totalCells = this.mapSize * this.mapSize;
    return (this.exploredCells.size / totalCells) * 100;
  }

  /**
   * Clean up resources
   */
  dispose() {
    if (this.mapCanvas && this.mapCanvas.parentNode) {
      this.mapCanvas.parentNode.removeChild(this.mapCanvas);
    }
    this.exploredCells.clear();
    this.exploredAreas.clear();
    this.departmentZones.clear();
  }
}
