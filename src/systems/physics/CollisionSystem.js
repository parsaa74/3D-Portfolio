/**
 * Collision System for 3D Portfolio
 *
 * This class handles collision detection and response for the game environment.
 * It uses a spatial grid for efficient collision queries and provides a clean
 * interface for checking collisions against the environment.
 */

import { THREE } from "../../utils/ThreeJSLoader.js";
import {
  CORRIDOR_WIDTH,
  CORRIDOR_HEIGHT,
  SEGMENT_LENGTH,
} from "../corridorSystem.js";

export class CollisionSystem {
  constructor(scene) {
    this.scene = scene;

    // Collision constants
    this.WALL_OFFSET = 0.4;
    this.CORNER_BUFFER = 0.2;
    this.COLLISION_PRECISION = 0.01;
    this.FLOOR_OFFSET = 0.1;

    // Optimized spatial grid configuration
    this.cellSize = 5; // Reduced cell size for better performance
    this.grid = new Map();
    this.gridNeighborCache = new Map(); // Cache for grid neighbor lookups

    // Collision objects
    this.colliders = [];
    this.activeColliders = []; // Colliders near the player

    // Raycaster for precise collision detection
    this.raycaster = new THREE.Raycaster();

    // Object pool for vectors
    this.vectorPool = [];
    this.MAX_VECTORS = 20;

    // Cache for collision results
    this.resultCache = new Map();
    this.lastCacheClear = 0;
    this.CACHE_LIFETIME = 100; // ms

    // Debug visualization
    this.debugMode = false;
    this.debugObjects = [];
  }

  /**
   * Initialize the collision system
   */
  initialize() {
    console.log("Initializing collision system");

    // Clear any existing data
    this.clearColliders();

    // Make wall offset available globally for compatibility
    window.WALL_OFFSET = this.WALL_OFFSET;
  }

  /**
   * Add a collider to the system
   * @param {Object} collider - The collider object to add
   * @param {THREE.Box3|THREE.Sphere} collider.bounds - The collision bounds
   * @param {string} collider.type - The type of collider (wall, floor, ceiling, etc.)
   * @param {THREE.Object3D} collider.object - The Three.js object associated with this collider
   */
  addCollider(collider) {
    this.colliders.push(collider);

    // Add to spatial grid
    this.addToSpatialGrid(collider);

    // Create debug visualization if debug mode is enabled
    if (this.debugMode) {
      this.createDebugVisualization(collider);
    }
  }

  /**
   * Add a collider to the spatial grid
   * @param {Object} collider - The collider to add
   */
  addToSpatialGrid(collider) {
    const bounds = collider.bounds;

    // Get min and max grid coordinates
    let minX, minZ, maxX, maxZ;

    if (bounds instanceof THREE.Box3) {
      minX = Math.floor(bounds.min.x / this.cellSize);
      minZ = Math.floor(bounds.min.z / this.cellSize);
      maxX = Math.floor(bounds.max.x / this.cellSize);
      maxZ = Math.floor(bounds.max.z / this.cellSize);
    } else if (bounds instanceof THREE.Sphere) {
      minX = Math.floor((bounds.center.x - bounds.radius) / this.cellSize);
      minZ = Math.floor((bounds.center.z - bounds.radius) / this.cellSize);
      maxX = Math.floor((bounds.center.x + bounds.radius) / this.cellSize);
      maxZ = Math.floor((bounds.center.z + bounds.radius) / this.cellSize);
    } else {
      console.error("Unsupported collider bounds type");
      return;
    }

    // Add to all cells that the collider overlaps
    for (let x = minX; x <= maxX; x++) {
      for (let z = minZ; z <= maxZ; z++) {
        const key = `${x},${z}`;

        if (!this.grid.has(key)) {
          this.grid.set(key, []);
        }

        this.grid.get(key).push(collider);
      }
    }
  }

  /**
   * Get colliders near a position
   * @param {THREE.Vector3} position - The position to check
   * @param {number} radius - The radius to check within
   * @returns {Array} - Array of nearby colliders
   */
  getNearbyColliders(position, radius = 5) {
    // Use cached result if position hasn't changed significantly
    const cacheKey = `${Math.floor(position.x * 10)},${Math.floor(
      position.y * 10
    )},${Math.floor(position.z * 10)},${radius}`;
    if (this.resultCache.has(cacheKey)) {
      const cachedResult = this.resultCache.get(cacheKey);
      if (performance.now() - cachedResult.timestamp < this.CACHE_LIFETIME) {
        return cachedResult.colliders;
      }
    }

    // Clear cache periodically
    const now = performance.now();
    if (now - this.lastCacheClear > 1000) {
      this.resultCache.clear();
      this.lastCacheClear = now;
    }

    // Get grid cell coordinates
    const cellX = Math.floor(position.x / this.cellSize);
    const cellZ = Math.floor(position.z / this.cellSize);

    // Calculate cell radius based on search radius
    const cellRadius = Math.ceil(radius / this.cellSize);

    // Use cached neighborhood if available
    const neighborhoodKey = `${cellX},${cellZ},${cellRadius}`;
    let cellKeys;

    if (this.gridNeighborCache.has(neighborhoodKey)) {
      cellKeys = this.gridNeighborCache.get(neighborhoodKey);
    } else {
      // Generate cell keys in the neighborhood
      cellKeys = [];
      for (let x = cellX - cellRadius; x <= cellX + cellRadius; x++) {
        for (let z = cellZ - cellRadius; z <= cellZ + cellRadius; z++) {
          const key = `${x},${z}`;
          if (this.grid.has(key)) {
            cellKeys.push(key);
          }
        }
      }

      // Cache the neighborhood
      if (this.gridNeighborCache.size > 100) {
        // Limit cache size
        const keys = Array.from(this.gridNeighborCache.keys());
        this.gridNeighborCache.delete(keys[0]);
      }
      this.gridNeighborCache.set(neighborhoodKey, cellKeys);
    }

    // Get unique colliders from all relevant cells
    const colliderSet = new Set();
    for (const key of cellKeys) {
      const cellColliders = this.grid.get(key);
      if (cellColliders) {
        for (const collider of cellColliders) {
          colliderSet.add(collider);
        }
      }
    }

    // Convert Set to Array
    const colliders = Array.from(colliderSet);

    // Filter out colliders that are definitely too far
    const radiusSq = radius * radius;
    const result = colliders.filter((collider) => {
      if (collider.bounds instanceof THREE.Box3) {
        const closestPoint = this.getClosestPointOnBox(
          position,
          collider.bounds
        );
        return position.distanceToSquared(closestPoint) <= radiusSq;
      } else if (collider.bounds instanceof THREE.Sphere) {
        return (
          position.distanceToSquared(collider.bounds.center) <=
          Math.pow(radius + collider.bounds.radius, 2)
        );
      }
      return false;
    });

    // Cache the result
    this.resultCache.set(cacheKey, {
      colliders: result,
      timestamp: now,
    });

    return result;
  }

  /**
   * Get closest point on a box to a position
   * @param {THREE.Vector3} position - The position to check
   * @param {THREE.Box3} box - The box to check
   * @returns {THREE.Vector3} - The closest point on the box
   */
  getClosestPointOnBox(position, box) {
    // Get a vector from the pool
    const closestPoint = this.getVector().copy(position);

    // Clamp to box bounds
    closestPoint.x = Math.max(box.min.x, Math.min(box.max.x, closestPoint.x));
    closestPoint.y = Math.max(box.min.y, Math.min(box.max.y, closestPoint.y));
    closestPoint.z = Math.max(box.min.z, Math.min(box.max.z, closestPoint.z));

    // No need to release the vector here - the caller will use it
    return closestPoint;
  }

  /**
   * Check if a point collides with any colliders
   * @param {THREE.Vector3} position - The position to check
   * @returns {Object} - Collision result
   */
  checkPoint(position) {
    const nearbyColliders = this.getNearbyColliders(position);

    for (const collider of nearbyColliders) {
      if (collider.bounds.containsPoint(position)) {
        return {
          collided: true,
          collider: collider,
        };
      }
    }

    return { collided: false };
  }

  /**
   * Update the collision system
   * @param {number} deltaTime - Time since last update in seconds
   */
  update(deltaTime) {
    // Update active colliders based on player position
    if (window.playerPosition) {
      this.activeColliders = this.getNearbyColliders(window.playerPosition, 10);
    }

    // Update debug visualization if needed
    if (this.debugMode) {
      this.updateDebugVisualization();
    }
  }

  /**
   * Clear all colliders and reset the system
   */
  clearColliders() {
    // Clear all colliders
    this.colliders = [];
    this.activeColliders = [];
    this.grid.clear();
    this.gridNeighborCache.clear();
    this.resultCache.clear();

    // Clear debug visualization
    this.clearDebugVisualization();

    // Release pooled vectors
    this.vectorPool = [];
  }

  /**
   * Vector object pooling to reduce garbage collection
   */
  getVector() {
    if (this.vectorPool.length > 0) {
      return this.vectorPool.pop().set(0, 0, 0);
    }
    return new THREE.Vector3();
  }

  releaseVector(vector) {
    if (vector && this.vectorPool.length < this.MAX_VECTORS) {
      vector.set(0, 0, 0);
      this.vectorPool.push(vector);
    }
  }

  /**
   * Create a debug visualization for a collider
   * @param {Object} collider - The collider to visualize
   */
  createDebugVisualization(collider) {
    if (!this.scene || !this.debugMode) return;

    let helper;

    if (collider.bounds instanceof THREE.Box3) {
      // Create box helper with minimized geometry creation
      const size = this.getVector();
      collider.bounds.getSize(size);

      const center = this.getVector();
      collider.bounds.getCenter(center);

      const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
      const material = new THREE.MeshBasicMaterial({
        color: this.getDebugColor(collider.type),
        wireframe: true,
        transparent: true,
        opacity: 0.5,
      });

      helper = new THREE.Mesh(geometry, material);
      helper.position.copy(center);

      this.releaseVector(size);
      this.releaseVector(center);
    } else if (collider.bounds instanceof THREE.Sphere) {
      // Create sphere helper with minimal geometry
      const geometry = new THREE.SphereGeometry(collider.bounds.radius, 8, 8);
      const material = new THREE.MeshBasicMaterial({
        color: this.getDebugColor(collider.type),
        wireframe: true,
        transparent: true,
        opacity: 0.5,
      });

      helper = new THREE.Mesh(geometry, material);
      helper.position.copy(collider.bounds.center);
    }

    if (helper) {
      this.scene.add(helper);
      this.debugObjects.push(helper);
    }
  }

  /**
   * Get a color for debug visualization based on collider type
   * @param {string} type - The type of collider
   * @returns {number} - The color
   */
  getDebugColor(type) {
    switch (type) {
      case "wall":
        return 0xff0000;
      case "floor":
        return 0x00ff00;
      case "ceiling":
        return 0x0000ff;
      case "object":
        return 0xffff00;
      default:
        return 0xffffff;
    }
  }

  /**
   * Update debug visualization
   */
  updateDebugVisualization() {
    // Only update occasionally to reduce overhead
    if (
      !this.lastDebugUpdate ||
      performance.now() - this.lastDebugUpdate > 500
    ) {
      // Highlight active colliders
      for (
        let i = 0;
        i < Math.min(this.debugObjects.length, this.colliders.length);
        i++
      ) {
        const helper = this.debugObjects[i];
        const isActive = this.activeColliders.includes(this.colliders[i]);

        if (helper && helper.material) {
          helper.material.opacity = isActive ? 0.8 : 0.2;
        }
      }

      this.lastDebugUpdate = performance.now();
    }
  }

  /**
   * Toggle debug visualization
   * @param {boolean} enabled - Whether debug visualization should be enabled
   */
  setDebugMode(enabled) {
    this.debugMode = enabled;

    // Remove existing debug objects if disabling
    if (!enabled) {
      this.clearDebugVisualization();
    } else {
      // Create visualizations for all colliders
      for (const collider of this.colliders) {
        this.createDebugVisualization(collider);
      }
    }
  }

  /**
   * Clear all debug visualizations
   */
  clearDebugVisualization() {
    if (!this.scene) return;

    for (const obj of this.debugObjects) {
      // Dispose of geometry and materials
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) obj.material.dispose();

      // Remove from scene
      this.scene.remove(obj);
    }

    this.debugObjects = [];
  }

  /**
   * Handle cleanup
   */
  dispose() {
    this.clearColliders();
    this.clearDebugVisualization();
    this.scene = null;
  }
}
