import * as THREE from "three";
import {
  GLTFLoader,
  DRACOLoader,
  OrbitControls,
  RGBELoader,
  EffectComposer,
  RenderPass,
  ShaderPass,
  UnrealBloomPass,
  ColorCorrectionShader,
} from "../utils/ThreeJSLoader.js";

// Global corridor system configuration
export const CORRIDOR_WIDTH = 2.5;
export const CORRIDOR_HEIGHT = 3.5; // Increased height for less oppressive feel
export const SEGMENT_LENGTH = 5.0;

// Severance-specific color scheme
export const WALL_COLOR = 0xf5f5f5; // Pristine white
export const FLOOR_COLOR = 0xf0f0f0; // Slightly off-white for subtle contrast
export const CEILING_COLOR = 0xffffff; // Pure white
export const CORRIDOR_BASEBOARD_COLOR = 0x222323;
export const CORRIDOR_TRIM_HEIGHT = 0.1;

// Department-specific colors (matching show)
export const DEPARTMENT_COLORS = {
  MDR: 0x1a3f4d, // Blue-green
  OD: 0x2b5329, // Deep green
  WELLNESS: 0x4d3319, // Warm brown
  TESTING: 0x4d1919, // Deep red
  PERPETUITY: 0x333333, // Dark gray
};

// Lighting configuration
export const LIGHTING_INTENSITY = 0.7;
export const AMBIENT_INTENSITY = 0.3;
export const LIGHT_COLOR = 0xc4e0db; // Subtle blue-green fluorescent

// Material properties
export const FLOOR_REFLECTIVITY = 0.3;
export const WALL_ROUGHNESS = 0.2;
export const TRIM_METALNESS = 0.6;

class SpatialGrid {
  constructor(cellSize) {
    this.cellSize = cellSize;
    this.grid = new Map();
  }

  _getCellKey(x, z) {
    const cellX = Math.floor(x / this.cellSize);
    const cellZ = Math.floor(z / this.cellSize);
    return `${cellX},${cellZ}`;
  }

  addObject(object, bounds) {
    const minCellX = Math.floor(bounds.x / this.cellSize);
    const maxCellX = Math.floor((bounds.x + bounds.width) / this.cellSize);
    const minCellZ = Math.floor(bounds.z / this.cellSize);
    const maxCellZ = Math.floor((bounds.z + bounds.depth) / this.cellSize);

    for (let x = minCellX; x <= maxCellX; x++) {
      for (let z = minCellZ; z <= maxCellZ; z++) {
        const key = `${x},${z}`;
        if (!this.grid.has(key)) {
          this.grid.set(key, new Set());
        }
        this.grid.get(key).add(object);
      }
    }
  }

  getNearbyObjects(x, z, radius = 1) {
    const objects = new Set();
    const cellRadius = Math.ceil(radius / this.cellSize);
    const centerCellX = Math.floor(x / this.cellSize);
    const centerCellZ = Math.floor(z / this.cellSize);

    for (let dx = -cellRadius; dx <= cellRadius; dx++) {
      for (let dz = -cellRadius; dz <= cellRadius; dz++) {
        const key = `${centerCellX + dx},${centerCellZ + dz}`;
        const cell = this.grid.get(key);
        if (cell) {
          cell.forEach((obj) => objects.add(obj));
        }
      }
    }

    return Array.from(objects);
  }
}

export class CorridorSystem {
  constructor(scene, materials) {
    if (!scene) {
      throw new Error("Scene is required for CorridorSystem initialization");
    }

    this.scene = scene;
    this.materials = materials;
    this.initialized = false;
    this.spatialGrid = new SpatialGrid(CORRIDOR_WIDTH);
    this.corridorNodes = new Map();
    this.departments = new Map();
    this.junctionNodes = [];
    this.navMesh = null;
    this.corridorBounds = [];
  }

  /**
   * Initialize the corridor system
   */
  initialize() {
    if (this.initialized) {
      console.warn("CorridorSystem already initialized");
      return;
    }

    // Set flag to true to prevent double initialization
    this.initialized = true;

    // Find all corridors and junctions in the scene
    this.identifyCorridorElements();

    // Build navigation graph
    this.buildNavGraph();

    console.log("CorridorSystem initialized");
  }

  /**
   * Identify all corridor elements (corridors, junctions) in the scene
   * @private
   */
  identifyCorridorElements() {
    // Clear existing data
    this.corridorNodes.clear();
    this.junctionNodes = [];
    this.corridorBounds = [];

    // Find all corridor segments and junctions
    this.scene.traverse((object) => {
      // Identify corridor segments
      if (object.name && object.name.startsWith("corridor_")) {
        const id = object.name.replace("corridor_", "");
        const position = new THREE.Vector3().copy(object.position);
        const bounds = this.calculateBounds(object);

        // Store corridor information
        this.corridorNodes.set(id, {
          id,
          position,
          bounds,
          connections: [],
        });

        // Add to spatial grid for collision detection
        this.spatialGrid.addObject(id, bounds);

        // Store bounds for walkable area detection
        this.corridorBounds.push(bounds);
      }

      // Identify junction nodes
      if (object.name && object.name.startsWith("junction_")) {
        const id = object.name.replace("junction_", "");
        const position = new THREE.Vector3().copy(object.position);

        // Store junction information
        this.junctionNodes.push({
          id,
          position,
          connections: [],
        });
      }
    });

    console.log(
      `Found ${this.corridorNodes.size} corridor segments and ${this.junctionNodes.length} junctions`
    );
  }

  /**
   * Build navigation graph by connecting corridors and junctions
   * @private
   */
  buildNavGraph() {
    // Connect corridors to junctions
    for (const [corridorId, corridor] of this.corridorNodes) {
      // For each junction, check if it's close to this corridor
      for (const junction of this.junctionNodes) {
        if (this.isPointInCorridor(junction.position, corridor.bounds)) {
          // Add bidirectional connections
          corridor.connections.push(junction.id);
          junction.connections.push(corridorId);
        }
      }
    }

    // Connect junctions to other junctions if they share a corridor
    for (let i = 0; i < this.junctionNodes.length; i++) {
      const junctionA = this.junctionNodes[i];

      for (let j = i + 1; j < this.junctionNodes.length; j++) {
        const junctionB = this.junctionNodes[j];

        // Check if they share any corridor connections
        const sharedCorridors = junctionA.connections.filter((conn) =>
          junctionB.connections.includes(conn)
        );

        if (sharedCorridors.length > 0) {
          // They share at least one corridor, so connect them
          if (!junctionA.connections.includes(junctionB.id)) {
            junctionA.connections.push(junctionB.id);
          }
          if (!junctionB.connections.includes(junctionA.id)) {
            junctionB.connections.push(junctionA.id);
          }
        }
      }
    }
  }

  /**
   * Calculate bounds for a 3D object
   * @param {THREE.Object3D} object The object to calculate bounds for
   * @private
   */
  calculateBounds(object) {
    const boundingBox = new THREE.Box3().setFromObject(object);

    return {
      x: boundingBox.min.x,
      y: boundingBox.min.y,
      z: boundingBox.min.z,
      width: boundingBox.max.x - boundingBox.min.x,
      height: boundingBox.max.y - boundingBox.min.y,
      depth: boundingBox.max.z - boundingBox.min.z,
    };
  }

  /**
   * Check if a point is inside a corridor
   * @param {THREE.Vector3} point The point to check
   * @param {Object} bounds The corridor bounds
   * @private
   */
  isPointInCorridor(point, bounds) {
    return (
      point.x >= bounds.x &&
      point.x <= bounds.x + bounds.width &&
      point.z >= bounds.z &&
      point.z <= bounds.z + bounds.depth
    );
  }

  /**
   * Update corridor bounds - call this after adding new corridors
   */
  updateCorridorBounds() {
    // Re-identify all corridors and update the navigation graph
    this.identifyCorridorElements();
    this.buildNavGraph();
  }

  /**
   * Check if the given point (x,z) is walkable (inside a corridor)
   * @param {number} x X-coordinate
   * @param {number} z Z-coordinate
   * @param {number} radius Collision radius to check
   * @returns {boolean} True if the point is walkable
   */
  isWalkable(x, z, radius = 0.5) {
    // Check if point is within any corridor bounds
    for (const bounds of this.corridorBounds) {
      // Use expanded bounds to account for corridor walls
      const expandedBounds = {
        x: bounds.x + radius,
        z: bounds.z + radius,
        width: bounds.width - radius * 2,
        depth: bounds.depth - radius * 2,
      };

      if (
        x >= expandedBounds.x &&
        x <= expandedBounds.x + expandedBounds.width &&
        z >= expandedBounds.z &&
        z <= expandedBounds.z + expandedBounds.depth
      ) {
        // Point is within corridor bounds with radius consideration
        return true;
      }
    }

    // Check if point is within junction radius
    for (const junction of this.junctionNodes) {
      const dx = x - junction.position.x;
      const dz = z - junction.position.z;
      const distanceSquared = dx * dx + dz * dz;
      const junctionRadius = CORRIDOR_WIDTH * 0.75 - radius;

      if (distanceSquared <= junctionRadius * junctionRadius) {
        // Point is within junction area
        return true;
      }
    }

    // Not in any walkable area
    return false;
  }

  /**
   * Dispose of corridor system resources
   */
  dispose() {
    // Clear data structures
    this.corridorNodes.clear();
    this.junctionNodes = [];
    this.corridorBounds = [];
    this.initialized = false;
  }

  createCentralHub() {
    console.log("Creating central hub...");

    const hub = new THREE.Group();
    hub.name = "central_hub";

    // Create octagonal hub
    const radius = CORRIDOR_WIDTH * 2;
    const sides = 8;
    const angle = (2 * Math.PI) / sides;

    // Create floor
    const floorShape = new THREE.Shape();
    for (let i = 0; i < sides; i++) {
      const x = radius * Math.cos(i * angle);
      const z = radius * Math.sin(i * angle);
      if (i === 0) {
        floorShape.moveTo(x, z);
      } else {
        floorShape.lineTo(x, z);
      }
    }
    floorShape.closePath();

    const floorGeometry = new THREE.ShapeGeometry(floorShape);
    const floor = new THREE.Mesh(floorGeometry, this.materials.floor);
    floor.rotation.x = -Math.PI / 2;
    hub.add(floor);

    // Create walls
    for (let i = 0; i < sides; i++) {
      const wallGeometry = new THREE.PlaneGeometry(
        2 * radius * Math.sin(angle / 2),
        CORRIDOR_HEIGHT
      );
      const wall = new THREE.Mesh(wallGeometry, this.materials.wall);

      const x = radius * Math.cos(i * angle + angle / 2);
      const z = radius * Math.sin(i * angle + angle / 2);
      wall.position.set(x, CORRIDOR_HEIGHT / 2, z);
      wall.lookAt(0, CORRIDOR_HEIGHT / 2, 0);

      hub.add(wall);
    }

    // Add ceiling light
    const lightGeometry = new THREE.CircleGeometry(radius * 0.5, sides);
    const light = new THREE.Mesh(lightGeometry, this.materials.light);
    light.position.y = CORRIDOR_HEIGHT - 0.1;
    light.rotation.x = Math.PI / 2;
    hub.add(light);

    // Add to scene and spatial grid
    this.scene.add(hub);
    this.spatialGrid.addObject(hub, {
      x: -radius,
      z: -radius,
      width: radius * 2,
      depth: radius * 2,
    });

    return hub;
  }

  createMDRDepartment(x = CORRIDOR_WIDTH * 4, y = 0, z = 0) {
    console.log("Creating MDR department with Severance aesthetic...");

    const mdr = new THREE.Group();
    mdr.position.set(x, y, z);

    // Create room geometry - intentionally oppressive
    const roomWidth = CORRIDOR_WIDTH * 4;
    const roomLength = SEGMENT_LENGTH * 2;
    const roomHeight = CORRIDOR_HEIGHT;

    // Add floor with iconic white tiles and subtle reflection
    const floorGeometry = new THREE.PlaneGeometry(roomWidth, roomLength);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: FLOOR_COLOR,
      roughness: 0.3,
      metalness: FLOOR_REFLECTIVITY,
      envMapIntensity: 0.5,
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    mdr.add(floor);

    // Add walls with department-specific color tint
    const wallGeometry = new THREE.PlaneGeometry(roomWidth, roomHeight);
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: WALL_COLOR,
      roughness: WALL_ROUGHNESS,
      metalness: 0.1,
      envMapIntensity: 0.3,
    });

    // Add walls with subtle department color accent at trim
    const walls = [
      { position: [0, roomHeight / 2, roomLength / 2], rotation: [0, 0, 0] },
      {
        position: [0, roomHeight / 2, -roomLength / 2],
        rotation: [0, Math.PI, 0],
      },
      {
        position: [-roomWidth / 2, roomHeight / 2, 0],
        rotation: [0, Math.PI / 2, 0],
      },
      {
        position: [roomWidth / 2, roomHeight / 2, 0],
        rotation: [0, -Math.PI / 2, 0],
      },
    ];

    walls.forEach(({ position, rotation }) => {
      const wall = new THREE.Mesh(wallGeometry, wallMaterial);
      wall.position.set(...position);
      wall.rotation.set(...rotation);
      mdr.add(wall);

      // Add department color trim
      const trimGeometry = new THREE.BoxGeometry(
        wall.rotation.y % Math.PI === 0 ? roomWidth : CORRIDOR_TRIM_HEIGHT,
        CORRIDOR_TRIM_HEIGHT,
        wall.rotation.y % Math.PI === 0 ? CORRIDOR_TRIM_HEIGHT : roomLength
      );
      const trimMaterial = new THREE.MeshStandardMaterial({
        color: DEPARTMENT_COLORS.MDR,
        metalness: TRIM_METALNESS,
        roughness: 0.3,
      });
      const trim = new THREE.Mesh(trimGeometry, trimMaterial);
      trim.position.set(position[0], CORRIDOR_TRIM_HEIGHT / 2, position[2]);
      trim.rotation.set(...rotation);
      mdr.add(trim);
    });

    // Create workstation cluster in 2x2 grid
    const workstationPositions = [
      { x: -1.5, z: -1.5 },
      { x: 1.5, z: -1.5 },
      { x: -1.5, z: 1.5 },
      { x: 1.5, z: 1.5 },
    ];

    workstationPositions.forEach((pos, index) => {
      const workstation = this.createRefinementWorkstation();
      workstation.position.set(pos.x, 0, pos.z);
      // Rotate workstations to face center
      workstation.rotation.y = Math.atan2(-pos.z, -pos.x);
      mdr.add(workstation);
    });

    // Add recessed ceiling lights
    const lightPositions = [
      { x: -roomWidth / 4, z: -roomLength / 4 },
      { x: roomWidth / 4, z: -roomLength / 4 },
      { x: -roomWidth / 4, z: roomLength / 4 },
      { x: roomWidth / 4, z: roomLength / 4 },
    ];

    lightPositions.forEach((pos) => {
      // Light fixture
      const fixtureGeometry = new THREE.BoxGeometry(1, 0.1, 1);
      const fixtureMaterial = new THREE.MeshStandardMaterial({
        color: 0xcccccc,
        metalness: 0.8,
        roughness: 0.2,
      });
      const fixture = new THREE.Mesh(fixtureGeometry, fixtureMaterial);
      fixture.position.set(pos.x, roomHeight - 0.05, pos.z);
      mdr.add(fixture);

      // Add actual light source
      const light = new THREE.PointLight(LIGHT_COLOR, LIGHTING_INTENSITY, 8);
      light.position.set(pos.x, roomHeight - 0.1, pos.z);
      mdr.add(light);
    });

    // Add ambient light for base illumination
    const ambientLight = new THREE.AmbientLight(LIGHT_COLOR, AMBIENT_INTENSITY);
    mdr.add(ambientLight);

    this.scene.add(mdr);
    this.spatialGrid.addObject(mdr, {
      x: x - roomWidth / 2,
      z: z - roomLength / 2,
      width: roomWidth,
      depth: roomLength,
    });

    return mdr;
  }

  // Helper method to create a refinement workstation
  createRefinementWorkstation() {
    const workstation = new THREE.Group();

    // Create retro-style desk
    const deskGeometry = new THREE.BoxGeometry(1.2, 0.05, 0.8);
    const deskMaterial = new THREE.MeshStandardMaterial({
      color: 0xf0f0f0,
      roughness: 0.3,
      metalness: 0.2,
    });
    const desk = new THREE.Mesh(deskGeometry, deskMaterial);
    desk.position.y = 0.73;
    workstation.add(desk);

    // Add cubicle dividers
    const dividerGeometry = new THREE.BoxGeometry(0.05, 1.2, 1.2);
    const dividerMaterial = new THREE.MeshStandardMaterial({
      color: 0xe0e0e0,
      roughness: 0.7,
      metalness: 0.1,
    });

    // Add dividers on three sides
    const dividerPositions = [
      { x: 0.6, z: 0, rotation: 0 },
      { x: 0, z: 0.6, rotation: Math.PI / 2 },
      { x: -0.6, z: 0, rotation: 0 },
    ];

    dividerPositions.forEach(({ x, z, rotation }) => {
      const divider = new THREE.Mesh(dividerGeometry, dividerMaterial);
      divider.position.set(x, 0.6, z);
      divider.rotation.y = rotation;
      workstation.add(divider);
    });

    // Add retro computer terminal
    const terminal = this.createRetroTerminal();
    terminal.position.set(0, 0.75, 0);
    workstation.add(terminal);

    return workstation;
  }

  // Helper method to create a retro terminal
  createRetroTerminal() {
    const terminal = new THREE.Group();

    // Monitor
    const monitorGeometry = new THREE.BoxGeometry(0.5, 0.4, 0.1);
    const monitorMaterial = new THREE.MeshStandardMaterial({
      color: 0xd0d0d0,
      roughness: 0.5,
      metalness: 0.2,
    });
    const monitor = new THREE.Mesh(monitorGeometry, monitorMaterial);
    monitor.position.y = 0.2;
    terminal.add(monitor);

    // Screen
    const screenGeometry = new THREE.PlaneGeometry(0.45, 0.35);
    const screenMaterial = new THREE.MeshStandardMaterial({
      color: 0x000000,
      emissive: 0x113311,
      emissiveIntensity: 0.2,
      roughness: 0.1,
    });
    const screen = new THREE.Mesh(screenGeometry, screenMaterial);
    screen.position.set(0, 0.2, 0.051);
    terminal.add(screen);

    // Keyboard
    const keyboardGeometry = new THREE.BoxGeometry(0.4, 0.05, 0.2);
    const keyboardMaterial = new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      roughness: 0.8,
    });
    const keyboard = new THREE.Mesh(keyboardGeometry, keyboardMaterial);
    keyboard.position.set(0, 0, 0.2);
    terminal.add(keyboard);

    return terminal;
  }

  createBreakRoom(x = -CORRIDOR_WIDTH * 4, y = 0, z = 0) {
    console.log("Creating break room - the most psychologically intense space");

    const breakRoom = new THREE.Group();
    breakRoom.position.set(x, y, z);

    // Create room geometry - intentionally oppressive
    const roomWidth = CORRIDOR_WIDTH * 2;
    const roomLength = SEGMENT_LENGTH;
    const roomHeight = CORRIDOR_HEIGHT * 0.9; // Lower ceiling for psychological effect

    // Add darker floor
    const floorGeometry = new THREE.PlaneGeometry(roomWidth, roomLength);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0xe0e0e0,
      metalness: 0.2,
      roughness: 0.9,
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    breakRoom.add(floor);

    // Add walls with slightly redder tint
    const wallGeometry = new THREE.PlaneGeometry(roomWidth, roomHeight);
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0xffe5e5,
      metalness: 0.1,
      roughness: 0.9,
    });

    // Add walls
    const walls = [
      { position: [0, roomHeight / 2, roomLength / 2], rotation: [0, 0, 0] },
      {
        position: [0, roomHeight / 2, -roomLength / 2],
        rotation: [0, Math.PI, 0],
      },
      {
        position: [-roomWidth / 2, roomHeight / 2, 0],
        rotation: [0, Math.PI / 2, 0],
      },
      {
        position: [roomWidth / 2, roomHeight / 2, 0],
        rotation: [0, -Math.PI / 2, 0],
      },
    ];

    walls.forEach(({ position, rotation }) => {
      const wall = new THREE.Mesh(wallGeometry, wallMaterial);
      wall.position.set(...position);
      wall.rotation.set(...rotation);
      breakRoom.add(wall);
    });

    // Add the iconic break room table and chair
    const table = this.createBreakRoomTable();
    table.position.set(0, 0, 0);
    breakRoom.add(table);

    // Add harsh overhead lighting
    const light = new THREE.SpotLight(0xffffff, 1.5);
    light.position.set(0, roomHeight - 0.1, 0);
    light.angle = Math.PI / 6;
    light.penumbra = 0.1;
    light.decay = 1.5;
    breakRoom.add(light);

    this.scene.add(breakRoom);
    this.spatialGrid.addObject(breakRoom, {
      x: x - roomWidth / 2,
      z: z - roomLength / 2,
      width: roomWidth,
      depth: roomLength,
    });

    return breakRoom;
  }

  createBreakRoomTable() {
    const table = new THREE.Group();

    // Simple metal table
    const tableGeometry = new THREE.BoxGeometry(0.8, 0.02, 0.8);
    const tableMaterial = new THREE.MeshStandardMaterial({
      color: 0x808080,
      metalness: 0.8,
      roughness: 0.2,
    });
    const tableTop = new THREE.Mesh(tableGeometry, tableMaterial);
    tableTop.position.y = 0.7;
    table.add(tableTop);

    // Uncomfortable chair
    const chairGeometry = new THREE.BoxGeometry(0.4, 0.04, 0.4);
    const chair = new THREE.Mesh(chairGeometry, tableMaterial);
    chair.position.set(0, 0.45, 0.6);
    table.add(chair);

    return table;
  }

  createWellnessCenter(x = CORRIDOR_WIDTH * 4, y = 0, z = -SEGMENT_LENGTH * 4) {
    console.log("Creating the deceptively peaceful Wellness Center");

    const wellnessCenter = new THREE.Group();
    wellnessCenter.position.set(x, y, z);

    // Wellness center has a more open, calming layout
    const roomWidth = CORRIDOR_WIDTH * 3;
    const roomLength = SEGMENT_LENGTH * 2.5;
    const roomHeight = CORRIDOR_HEIGHT;

    // Floor - slightly warmer tone
    const floorGeometry = new THREE.PlaneGeometry(roomWidth, roomLength);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0xfff8f0,
      roughness: 0.15,
      metalness: 0.05,
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    wellnessCenter.add(floor);

    // Add walls with warmer tone
    const wallGeometry = new THREE.PlaneGeometry(roomWidth, roomHeight);
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0xfff5eb,
      metalness: 0.1,
      roughness: 0.8,
    });

    // Add walls
    const walls = [
      { position: [0, roomHeight / 2, roomLength / 2], rotation: [0, 0, 0] },
      {
        position: [0, roomHeight / 2, -roomLength / 2],
        rotation: [0, Math.PI, 0],
      },
      {
        position: [-roomWidth / 2, roomHeight / 2, 0],
        rotation: [0, Math.PI / 2, 0],
      },
      {
        position: [roomWidth / 2, roomHeight / 2, 0],
        rotation: [0, -Math.PI / 2, 0],
      },
    ];

    walls.forEach(({ position, rotation }) => {
      const wall = new THREE.Mesh(wallGeometry, wallMaterial);
      wall.position.set(...position);
      wall.rotation.set(...rotation);
      wellnessCenter.add(wall);
    });

    // Add Ms. Casey's desk
    const desk = this.createWellnessDesk();
    desk.position.set(-roomWidth / 4, 0, -roomLength / 4);
    wellnessCenter.add(desk);

    // Add session area
    const sessionArea = this.createWellnessSessionArea();
    sessionArea.position.set(roomWidth / 4, 0, roomLength / 4);
    wellnessCenter.add(sessionArea);

    // Add softer, more natural lighting
    const ambientLight = new THREE.AmbientLight(0xfff0e0, 0.5);
    wellnessCenter.add(ambientLight);

    const mainLight = new THREE.PointLight(0xfff0e0, 0.8, 8);
    mainLight.position.set(0, roomHeight - 0.2, 0);
    wellnessCenter.add(mainLight);

    this.scene.add(wellnessCenter);
    this.spatialGrid.addObject(wellnessCenter, {
      x: x - roomWidth / 2,
      z: z - roomLength / 2,
      width: roomWidth,
      depth: roomLength,
    });

    return wellnessCenter;
  }

  createWellnessDesk() {
    const desk = new THREE.Group();

    // Desk top
    const topGeometry = new THREE.BoxGeometry(1.4, 0.05, 0.8);
    const top = new THREE.Mesh(topGeometry, this.materials.metalTrim);
    top.position.y = 0.73;
    desk.add(top);

    // Desk legs
    const legGeometry = new THREE.BoxGeometry(0.05, 0.73, 0.05);
    const legPositions = [
      { x: 0.65, z: 0.35 },
      { x: -0.65, z: 0.35 },
      { x: 0.65, z: -0.35 },
      { x: -0.65, z: -0.35 },
    ];

    legPositions.forEach((pos) => {
      const leg = new THREE.Mesh(legGeometry, this.materials.metalTrim);
      leg.position.set(pos.x, 0.365, pos.z);
      desk.add(leg);
    });

    // Add chair
    const chair = this.createWellnessChair();
    chair.position.z = -0.4;
    desk.add(chair);

    return desk;
  }

  createWellnessChair() {
    const chair = new THREE.Group();

    // More comfortable seat
    const seatGeometry = new THREE.BoxGeometry(0.6, 0.08, 0.6);
    const seatMaterial = new THREE.MeshStandardMaterial({
      color: 0x2b5329,
      roughness: 0.7,
    });
    const seat = new THREE.Mesh(seatGeometry, seatMaterial);
    seat.position.y = 0.45;
    chair.add(seat);

    // Cushioned back
    const backGeometry = new THREE.BoxGeometry(0.6, 0.7, 0.08);
    const back = new THREE.Mesh(backGeometry, seatMaterial);
    back.position.set(0, 0.8, -0.26);
    chair.add(back);

    // Base and pole
    const baseGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.05, 8);
    const base = new THREE.Mesh(baseGeometry, this.materials.metalTrim);
    base.position.y = 0.025;
    chair.add(base);

    const poleGeometry = new THREE.CylinderGeometry(0.04, 0.04, 0.4, 8);
    const pole = new THREE.Mesh(poleGeometry, this.materials.metalTrim);
    pole.position.y = 0.225;
    chair.add(pole);

    return chair;
  }

  createWellnessSessionArea() {
    const area = new THREE.Group();

    // Two comfortable chairs facing each other
    const chairs = [
      { position: [-0.8, 0, 0], rotation: 0 },
      { position: [0.8, 0, 0], rotation: Math.PI },
    ];

    chairs.forEach(({ position, rotation }) => {
      const chair = this.createWellnessChair();
      chair.position.set(...position);
      chair.rotation.y = rotation;
      area.add(chair);
    });

    // Small table between chairs
    const tableGeometry = new THREE.CylinderGeometry(0.3, 0.25, 0.5, 8);
    const tableMaterial = new THREE.MeshStandardMaterial({
      color: 0x3d3d3d,
      roughness: 0.4,
    });
    const table = new THREE.Mesh(tableGeometry, tableMaterial);
    table.position.y = 0.25;
    area.add(table);

    return area;
  }

  createPerpetuityWing(x = 0, y = 0, z = -SEGMENT_LENGTH * 12) {
    console.log("Creating the Perpetuity Wing - Kier's propaganda space");

    const perpetuityWing = new THREE.Group();
    perpetuityWing.position.set(x, y, z);

    // Grand, imposing layout
    const roomWidth = CORRIDOR_WIDTH * 5;
    const roomLength = SEGMENT_LENGTH * 4;
    const roomHeight = CORRIDOR_HEIGHT * 1.2; // Higher ceilings for grandeur

    // Floor - polished marble effect
    const floorGeometry = new THREE.PlaneGeometry(roomWidth, roomLength);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0xf8f8f8,
      roughness: 0.05,
      metalness: 0.2,
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    perpetuityWing.add(floor);

    // Add walls
    const wallGeometry = new THREE.PlaneGeometry(roomWidth, roomHeight);
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.1,
      metalness: 0.1,
    });

    const walls = [
      { position: [0, roomHeight / 2, roomLength / 2], rotation: [0, 0, 0] },
      {
        position: [0, roomHeight / 2, -roomLength / 2],
        rotation: [0, Math.PI, 0],
      },
      {
        position: [-roomWidth / 2, roomHeight / 2, 0],
        rotation: [0, Math.PI / 2, 0],
      },
      {
        position: [roomWidth / 2, roomHeight / 2, 0],
        rotation: [0, -Math.PI / 2, 0],
      },
    ];

    walls.forEach(({ position, rotation }) => {
      const wall = new THREE.Mesh(wallGeometry, wallMaterial);
      wall.position.set(...position);
      wall.rotation.set(...rotation);
      perpetuityWing.add(wall);
    });

    // Add Kier's statue
    const statue = this.createKierStatue();
    statue.position.set(0, 0, -roomLength / 3);
    perpetuityWing.add(statue);

    // Add display cases
    const displayPositions = [
      { x: -roomWidth / 3, z: roomLength / 4 },
      { x: roomWidth / 3, z: roomLength / 4 },
      { x: -roomWidth / 3, z: -roomLength / 4 },
      { x: roomWidth / 3, z: -roomLength / 4 },
    ];

    displayPositions.forEach((pos) => {
      const display = this.createDisplayCase();
      display.position.set(pos.x, 0, pos.z);
      perpetuityWing.add(display);
    });

    // Add dramatic lighting
    const spotlights = [
      { x: -roomWidth / 4, z: -roomLength / 3 }, // Lighting Kier's statue
      { x: roomWidth / 4, z: -roomLength / 3 },
      { x: -roomWidth / 3, z: roomLength / 4 }, // Lighting display cases
      { x: roomWidth / 3, z: roomLength / 4 },
    ];

    spotlights.forEach((pos) => {
      const light = new THREE.SpotLight(0xffffff, 1.0);
      light.position.set(pos.x, roomHeight - 0.1, pos.z);
      light.target.position.set(pos.x, 0, pos.z);
      light.angle = Math.PI / 6;
      light.penumbra = 0.2;
      perpetuityWing.add(light);
      perpetuityWing.add(light.target);
    });

    this.scene.add(perpetuityWing);
    this.spatialGrid.addObject(perpetuityWing, {
      x: x - roomWidth / 2,
      z: z - roomLength / 2,
      width: roomWidth,
      depth: roomLength,
    });

    return perpetuityWing;
  }

  createKierStatue() {
    const statue = new THREE.Group();

    // Base
    const baseGeometry = new THREE.BoxGeometry(1, 0.2, 1);
    const baseMaterial = new THREE.MeshStandardMaterial({
      color: 0x404040,
      roughness: 0.2,
      metalness: 0.8,
    });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    statue.add(base);

    // Simple representation of Kier
    const bodyGeometry = new THREE.CylinderGeometry(0.2, 0.3, 2, 8);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0x808080,
      roughness: 0.3,
      metalness: 0.7,
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 1.1;
    statue.add(body);

    return statue;
  }

  createDisplayCase() {
    const display = new THREE.Group();

    // Glass case
    const glassGeometry = new THREE.BoxGeometry(1, 1.5, 0.5);
    const glassMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.3,
      roughness: 0.1,
    });
    const glass = new THREE.Mesh(glassGeometry, glassMaterial);
    glass.position.y = 0.75;
    display.add(glass);

    // Base
    const baseGeometry = new THREE.BoxGeometry(1.2, 0.1, 0.7);
    const baseMaterial = new THREE.MeshStandardMaterial({
      color: 0x404040,
      roughness: 0.2,
    });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = 0.05;
    display.add(base);

    return display;
  }

  createTestingRoom(x = SEGMENT_LENGTH * 4, y = 0, z = -SEGMENT_LENGTH * 12) {
    console.log("Creating the mysterious Testing Room");

    const testingRoom = new THREE.Group();
    testingRoom.position.set(x, y, z);

    // Clinical testing room dimensions
    const roomWidth = CORRIDOR_WIDTH * 2.5;
    const roomLength = SEGMENT_LENGTH * 2;
    const roomHeight = CORRIDOR_HEIGHT;

    // Floor - clinical white
    const floorGeometry = new THREE.PlaneGeometry(roomWidth, roomLength);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.1,
      metalness: 0.1,
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    testingRoom.add(floor);

    // Add walls
    const wallGeometry = new THREE.PlaneGeometry(roomWidth, roomHeight);
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.1,
      metalness: 0.1,
    });

    const walls = [
      { position: [0, roomHeight / 2, roomLength / 2], rotation: [0, 0, 0] },
      {
        position: [0, roomHeight / 2, -roomLength / 2],
        rotation: [0, Math.PI, 0],
      },
      {
        position: [-roomWidth / 2, roomHeight / 2, 0],
        rotation: [0, Math.PI / 2, 0],
      },
      {
        position: [roomWidth / 2, roomHeight / 2, 0],
        rotation: [0, -Math.PI / 2, 0],
      },
    ];

    walls.forEach(({ position, rotation }) => {
      const wall = new THREE.Mesh(wallGeometry, wallMaterial);
      wall.position.set(...position);
      wall.rotation.set(...rotation);
      testingRoom.add(wall);
    });

    // Add testing equipment
    const equipment = this.createTestingEquipment();
    equipment.position.set(0, 0, 0);
    testingRoom.add(equipment);

    // Harsh, clinical lighting
    const mainLight = new THREE.PointLight(0xffffff, 1.2, 8);
    mainLight.position.set(0, roomHeight - 0.2, 0);
    testingRoom.add(mainLight);

    this.scene.add(testingRoom);
    this.spatialGrid.addObject(testingRoom, {
      x: x - roomWidth / 2,
      z: z - roomLength / 2,
      width: roomWidth,
      depth: roomLength,
    });

    return testingRoom;
  }

  createTestingEquipment() {
    const equipment = new THREE.Group();

    // Main testing console
    const consoleGeometry = new THREE.BoxGeometry(1.2, 1, 0.6);
    const consoleMaterial = new THREE.MeshStandardMaterial({
      color: 0x333333,
      roughness: 0.2,
      metalness: 0.8,
    });
    const console = new THREE.Mesh(consoleGeometry, consoleMaterial);
    console.position.y = 0.5;
    equipment.add(console);

    // Screen
    const screenGeometry = new THREE.PlaneGeometry(0.8, 0.6);
    const screenMaterial = new THREE.MeshStandardMaterial({
      color: 0x000000,
      emissive: 0x222222,
      roughness: 0.1,
    });
    const screen = new THREE.Mesh(screenGeometry, screenMaterial);
    screen.position.set(0, 0.7, 0.31);
    equipment.add(screen);

    return equipment;
  }

  // Add a method to get department by name
  getDepartment(name) {
    return this.departments.get(name);
  }
}
