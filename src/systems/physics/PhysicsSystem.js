import * as CANNON from 'cannon-es';
import { THREE } from '@utils/ThreeJSLoader.js';

/**
 * Physics system using cannon-es
 * @class PhysicsSystem
 */
export class PhysicsSystem {
  constructor(options = {}) {
    this.options = {
      gravity: new CANNON.Vec3(0, -9.82, 0),
      defaultMaterial: {
        friction: 0.3,
        restitution: 0.3,
      },
      ...options,
    };

    this.world = new CANNON.World({
      gravity: this.options.gravity,
    });

    this.bodies = new Map();
    this._stepSize = 1 / 60;
    this._debugMeshes = new Map();
    this._defaultMaterial = new CANNON.Material("default");

    // Set default contact material
    const defaultContactMaterial = new CANNON.ContactMaterial(
      this._defaultMaterial,
      this._defaultMaterial,
      {
        friction: this.options.defaultMaterial.friction,
        restitution: this.options.defaultMaterial.restitution,
      }
    );
    this.world.addContactMaterial(defaultContactMaterial);
    this.world.defaultContactMaterial = defaultContactMaterial;
  }

  /**
   * Initialize the physics system
   * @param {Engine} engine - Game engine instance
   */
  init(engine) {
    this.engine = engine;
  }

  /**
   * Create a physics body for a mesh
   * @param {THREE.Mesh} mesh - Three.js mesh
   * @param {Object} options - Body options
   * @returns {CANNON.Body} Physics body
   */
  createBody(mesh, options = {}) {
    const defaults = {
      mass: 0,
      type: CANNON.Body.STATIC,
      position: mesh.position,
      material: this._defaultMaterial,
    };

    const bodyOptions = { ...defaults, ...options };
    const shape = this._createShapeFromMesh(mesh);

    const body = new CANNON.Body({
      mass: bodyOptions.mass,
      type: bodyOptions.type,
      position: new CANNON.Vec3(
        bodyOptions.position.x,
        bodyOptions.position.y,
        bodyOptions.position.z
      ),
      material: bodyOptions.material,
    });

    body.addShape(shape);
    this.world.addBody(body);
    this.bodies.set(mesh.uuid, body);

    if (this.engine.options.debug) {
      this._createDebugMesh(body, shape);
    }

    return body;
  }

  /**
   * Create a physics shape from a Three.js mesh
   * @private
   * @param {THREE.Mesh} mesh - Three.js mesh
   * @returns {CANNON.Shape} Physics shape
   */
  _createShapeFromMesh(mesh) {
    // Get the bounding box
    const bbox = new THREE.Box3().setFromObject(mesh);
    const size = bbox.getSize(new THREE.Vector3());

    // For now, we'll just use box shapes
    // TODO: Add support for other shape types
    return new CANNON.Box(
      new CANNON.Vec3(size.x * 0.5, size.y * 0.5, size.z * 0.5)
    );
  }

  /**
   * Create a debug mesh for a physics body
   * @private
   * @param {CANNON.Body} body - Physics body
   * @param {CANNON.Shape} shape - Physics shape
   */
  _createDebugMesh(body, shape) {
    let geometry;

    if (shape instanceof CANNON.Box) {
      geometry = new THREE.BoxGeometry(
        shape.halfExtents.x * 2,
        shape.halfExtents.y * 2,
        shape.halfExtents.z * 2
      );
    } else {
      // Default to box for unsupported shapes
      const size = 0.3;
      geometry = new THREE.BoxGeometry(size, size, size);
    }

    const material = new THREE.MeshBasicMaterial({
      wireframe: true,
      color: 0x00ff00,
    });

    const mesh = new THREE.Mesh(geometry, material);
    this.engine.scene.add(mesh);
    this._debugMeshes.set(body, mesh);
  }

  /**
   * Update physics simulation
   * @param {number} deltaTime - Time since last update
   */
  update(deltaTime) {
    // Step the physics world
    this.world.step(this._stepSize, deltaTime);

    // Update debug meshes if enabled
    if (this.engine.options.debug) {
      for (const [body, mesh] of this._debugMeshes) {
        mesh.position.copy(body.position);
        mesh.quaternion.copy(body.quaternion);
      }
    }

    // Update meshes based on physics bodies
    for (const [meshId, body] of this.bodies) {
      const mesh = this.engine.scene.getObjectByProperty("uuid", meshId);
      if (mesh) {
        mesh.position.copy(body.position);
        mesh.quaternion.copy(body.quaternion);
      }
    }
  }

  /**
   * Remove a physics body
   * @param {string} meshId - Mesh UUID
   */
  removeBody(meshId) {
    const body = this.bodies.get(meshId);
    if (body) {
      this.world.removeBody(body);
      this.bodies.delete(meshId);

      if (this._debugMeshes.has(body)) {
        const debugMesh = this._debugMeshes.get(body);
        this.engine.scene.remove(debugMesh);
        debugMesh.geometry.dispose();
        debugMesh.material.dispose();
        this._debugMeshes.delete(body);
      }
    }
  }

  /**
   * Clean up resources
   */
  dispose() {
    // Remove all bodies
    for (const [meshId] of this.bodies) {
      this.removeBody(meshId);
    }

    // Clear maps
    this.bodies.clear();
    this._debugMeshes.clear();

    // Clear world
    this.world = null;
  }
}
