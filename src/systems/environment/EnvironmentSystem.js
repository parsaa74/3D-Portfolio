import { THREE } from "../../utils/ThreeJSLoader.js";
import * as CANNON from "cannon-es";

/**
 * Environment system for managing the Severance floor layout
 * @class EnvironmentSystem
 */
export class EnvironmentSystem {
  constructor() {
    // Environment configuration
    this.config = {
      corridorWidth: 2.5,
      corridorHeight: 3.5,
      wallHeight: 3.5,
      segmentLength: 6.0,
      wallThickness: 0.1,
      doorWidth: 1.2,
      doorHeight: 2.4,
      trimHeight: 0.1,
    };

    // Store environment objects
    this.walls = new Set();
    this.doors = new Set();
    this.lights = new Set();
  }

  /**
   * Initialize the environment system
   * @param {Engine} engine - Game engine instance
   */
  init(engine) {
    this.engine = engine;
    this.assets = this.engine.getSystem("assets");
    this.physics = this.engine.getSystem("physics");
  }

  /**
   * Create a corridor segment
   * @param {THREE.Vector3} start - Start position
   * @param {THREE.Vector3} end - End position
   * @param {Object} options - Corridor options
   */
  createCorridorSegment(start, end, options = {}) {
    const direction = end.clone().sub(start).normalize();
    const length = end.distanceTo(start);
    const center = start.clone().add(end).multiplyScalar(0.5);

    // Create walls
    this._createWall(
      center,
      length,
      direction,
      this.config.wallHeight,
      true, // left wall
      options
    );
    this._createWall(
      center,
      length,
      direction,
      this.config.wallHeight,
      false, // right wall
      options
    );

    // Create ceiling
    this._createCeiling(center, length, direction, options);

    // Create floor
    this._createFloor(center, length, direction, options);

    // Add trim
    this._createTrim(center, length, direction, true, options); // left trim
    this._createTrim(center, length, direction, false, options); // right trim

    // Add lights
    this._addCorridorLights(start, end);
  }

  /**
   * Create a wall
   * @private
   */
  _createWall(center, length, direction, height, isLeft, options = {}) {
    const wallGeometry = new THREE.BoxGeometry(
      this.config.wallThickness,
      height,
      length
    );

    // Get wall material, ensuring we have a proper fallback that supports emissive properties
    let wallMaterial =
      this.assets.getMaterial("wallShader") || this.assets.getMaterial("wall");

    // Make sure we're not using a MeshBasicMaterial which doesn't support emissive properties
    if (wallMaterial && wallMaterial.type === "MeshBasicMaterial") {
      console.warn(
        "Wall material is MeshBasicMaterial which doesn't support emissive properties. Using MeshStandardMaterial instead."
      );
      wallMaterial = new THREE.MeshStandardMaterial({
        color: 0xf5f5f5,
        roughness: 0.85,
        metalness: 0.1,
        side: THREE.DoubleSide,
      });
    }

    const wall = new THREE.Mesh(wallGeometry, wallMaterial);

    // Position wall
    const offset = direction.clone().cross(new THREE.Vector3(0, 1, 0));
    offset
      .normalize()
      .multiplyScalar(this.config.corridorWidth * 0.5 * (isLeft ? 1 : -1));
    wall.position.copy(center).add(offset);

    // Rotate wall
    wall.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction);

    // Add to scene
    this.engine.scene.add(wall);
    this.walls.add(wall);

    // Add physics
    this.physics.createBody(wall, {
      mass: 0,
      position: wall.position,
    });
  }

  /**
   * Create ceiling
   * @private
   */
  _createCeiling(center, length, direction, options = {}) {
    const ceilingGeometry = new THREE.PlaneGeometry(
      this.config.corridorWidth,
      length
    );
    const ceilingMaterial = this.assets.getMaterial("ceiling");
    const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);

    // Position ceiling
    ceiling.position
      .copy(center)
      .add(new THREE.Vector3(0, this.config.corridorHeight, 0));
    ceiling.rotation.x = Math.PI / 2;

    // Rotate to align with corridor
    ceiling.quaternion.multiply(
      new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 0, 1),
        direction
      )
    );

    // Add to scene
    this.engine.scene.add(ceiling);
  }

  /**
   * Create floor
   * @private
   */
  _createFloor(center, length, direction, options = {}) {
    const floorGeometry = new THREE.PlaneGeometry(
      this.config.corridorWidth,
      length
    );
    const floorMaterial = this.assets.getMaterial("floor");
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);

    // Position floor
    floor.position.copy(center);
    floor.rotation.x = -Math.PI / 2;

    // Rotate to align with corridor
    floor.quaternion.multiply(
      new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 0, 1),
        direction
      )
    );

    // Add to scene
    this.engine.scene.add(floor);

    // Add physics
    this.physics.createBody(floor, {
      mass: 0,
      position: floor.position,
    });
  }

  /**
   * Create baseboard trim
   * @private
   */
  _createTrim(center, length, direction, isLeft, options = {}) {
    const trimGeometry = new THREE.BoxGeometry(
      this.config.wallThickness,
      this.config.trimHeight,
      length
    );
    const trimMaterial = this.assets.getMaterial("trim");
    const trim = new THREE.Mesh(trimGeometry, trimMaterial);

    // Position trim
    const offset = direction.clone().cross(new THREE.Vector3(0, 1, 0));
    offset
      .normalize()
      .multiplyScalar(this.config.corridorWidth * 0.5 * (isLeft ? 1 : -1));
    trim.position
      .copy(center)
      .add(offset)
      .add(new THREE.Vector3(0, this.config.trimHeight * 0.5, 0));

    // Rotate trim
    trim.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction);

    // Add to scene
    this.engine.scene.add(trim);
  }

  /**
   * Add corridor lights
   * @private
   */
  _addCorridorLights(start, end) {
    const direction = end.clone().sub(start);
    const length = direction.length();
    direction.normalize();

    // Add lights along the corridor
    const spacing = 3; // Light spacing
    const numLights = Math.floor(length / spacing);

    for (let i = 0; i <= numLights; i++) {
      const position = start
        .clone()
        .add(direction.clone().multiplyScalar(i * spacing));
      position.y = this.config.corridorHeight - 0.1;

      const light = new THREE.PointLight(0xf7f7ef, 0.5, 5);
      light.position.copy(position);
      this.engine.scene.add(light);
      this.lights.add(light);

      // Add light fixture (simple mesh)
      const fixtureGeometry = new THREE.BoxGeometry(0.2, 0.1, 0.2);
      const fixtureMaterial = new THREE.MeshStandardMaterial({
        color: 0xcccccc,
      });
      const fixture = new THREE.Mesh(fixtureGeometry, fixtureMaterial);
      fixture.position.copy(position);
      this.engine.scene.add(fixture);
    }
  }

  /**
   * Clean up resources
   */
  dispose() {
    // Remove and dispose walls
    this.walls.forEach((wall) => {
      this.engine.scene.remove(wall);
      wall.geometry.dispose();
      wall.material.dispose();
    });
    this.walls.clear();

    // Remove and dispose doors
    this.doors.forEach((door) => {
      this.engine.scene.remove(door);
    });
    this.doors.clear();

    // Remove lights
    this.lights.forEach((light) => {
      this.engine.scene.remove(light);
    });
    this.lights.clear();
  }
}
