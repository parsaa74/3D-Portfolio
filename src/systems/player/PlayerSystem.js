import { THREE } from "@utils/ThreeJSLoader.js";
import * as CANNON from "cannon-es";

/**
 * Player system for handling character movement and interaction
 * @class PlayerSystem
 */
export class PlayerSystem {
  constructor(options = {}) {
    this.options = {
      height: 1.8,
      radius: 0.3,
      mass: 70,
      movementSpeed: 5,
      jumpForce: 4,
      mouseSensitivity: 0.002,
      ...options,
    };

    // Player state
    this.velocity = new THREE.Vector3();
    this.rotation = new THREE.Euler(0, 0, 0, "YXZ");
    this.isGrounded = false;
    this.canJump = false;

    // Debug logging
    this._debugMove = this._debugMove.bind(this);
  }

  /**
   * Initialize the player system
   * @param {Engine} engine - Game engine instance
   */
  async init(engine) {
    this.engine = engine;

    // Get required systems first
    this.input = this.engine.getSystem("input");
    this.physics = this.engine.getSystem("physics");

    if (!this.physics) {
      throw new Error("Physics system is required for PlayerSystem");
    }

    // Create player mesh
    this.mesh = this._createPlayerMesh();

    // Add mesh to scene
    this.engine.scene.add(this.mesh);

    // Create physics body
    this._createPhysicsBody();

    // Setup camera
    this.engine.camera.position.y = this.options.height;
    this.mesh.add(this.engine.camera);

    // Setup input handlers
    this.input.on("mousemove", this._onMouseMove.bind(this));

    // Add debug listener
    this.input.on("mousemove", this._debugMove);
  }

  /**
   * Create player mesh
   * @private
   * @returns {THREE.Object3D} Player mesh
   */
  _createPlayerMesh() {
    // Create a simple capsule mesh for the player
    const geometry = new THREE.CapsuleGeometry(
      this.options.radius,
      this.options.height - this.options.radius * 2,
      4,
      8
    );
    const material = new THREE.MeshPhongMaterial({
      color: 0x00ff00,
      wireframe: true,
      visible: this.engine?.options.debug,
    });

    return new THREE.Mesh(geometry, material);
  }

  /**
   * Create physics body for player
   * @private
   */
  _createPhysicsBody() {
    // Create a capsule shape
    const shape = new CANNON.Cylinder(
      this.options.radius,
      this.options.radius,
      this.options.height,
      8
    );

    // Create body
    this.body = this.physics.createBody(this.mesh, {
      mass: this.options.mass,
      type: CANNON.Body.DYNAMIC,
      shape,
      material: this.physics._defaultMaterial,
      fixedRotation: true, // Prevent body from rotating
      linearDamping: 0.9, // Add some drag
      position: new CANNON.Vec3(0, this.options.height / 2, 0),
    });

    // Add contact event listener for ground check
    this.body.addEventListener("collide", this._onCollide.bind(this));
  }

  /**
   * Handle mouse movement
   * @private
   * @param {Object} event - Mouse event data
   */
  _onMouseMove(event) {
    // Only update if we have pointer lock
    if (document.pointerLockElement === this.engine.renderer.domElement) {
      // Invert the mouse movement for more natural controls
      this.rotation.y -= event.dx * this.options.mouseSensitivity;
      this.rotation.x -= event.dy * this.options.mouseSensitivity;

      // Clamp vertical rotation
      this.rotation.x = Math.max(
        -Math.PI / 2,
        Math.min(Math.PI / 2, this.rotation.x)
      );

      // Update both mesh and camera rotation
      this.mesh.rotation.y = this.rotation.y;
      this.engine.camera.rotation.x = this.rotation.x;
    }
  }

  /**
   * Handle collision events
   * @private
   * @param {Object} event - Collision event
   */
  _onCollide(event) {
    // Check if collision is with ground (assuming y-normal close to 1)
    const contact = event.contact;
    const normal = contact.ni;

    if (normal.y > 0.5) {
      this.isGrounded = true;
      this.canJump = true;
    }
  }

  /**
   * Update player movement
   * @private
   * @param {number} deltaTime - Time since last update
   */
  _updateMovement(deltaTime) {
    // Get movement input
    const forward = this.input.isKeyPressed("KeyW")
      ? -1
      : this.input.isKeyPressed("KeyS")
      ? 1
      : 0;
    const right = this.input.isKeyPressed("KeyD")
      ? 1
      : this.input.isKeyPressed("KeyA")
      ? -1
      : 0;

    if (forward !== 0 || right !== 0) {
      // Create movement vector
      const moveDirection = new THREE.Vector3();

      // Add forward/backward movement
      moveDirection.z = forward;

      // Add left/right movement
      moveDirection.x = right;

      // Normalize the movement vector
      moveDirection.normalize();

      // Apply the player's rotation to the movement direction
      moveDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.rotation.y);

      // Scale by movement speed and mass
      const force = moveDirection.multiplyScalar(
        this.options.movementSpeed * this.options.mass
      );

      // Apply the force to the physics body
      this.body.applyForce(
        new CANNON.Vec3(force.x, 0, force.z),
        new CANNON.Vec3()
      );

      // Apply damping to prevent sliding
      this.body.velocity.x *= 0.95;
      this.body.velocity.z *= 0.95;
    }

    // Handle jumping
    if (this.input.isKeyPressed("Space") && this.canJump) {
      this.body.velocity.y = this.options.jumpForce;
      this.canJump = false;
      this.isGrounded = false;
    }

    // Reset grounded state each frame (will be set by collision if still grounded)
    this.isGrounded = false;
  }

  /**
   * Update player system
   * @param {number} deltaTime - Time since last update
   */
  update(deltaTime) {
    this._updateMovement(deltaTime);

    // Update mesh position from physics body
    this.mesh.position.copy(this.body.position);
  }

  /**
   * Clean up resources
   */
  dispose() {
    // Remove mesh from scene
    this.engine.scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();

    // Remove physics body
    if (this.body) {
      this.physics.removeBody(this.mesh.uuid);
    }

    // Remove event listeners
    this.input.off("mousemove", this._onMouseMove);
  }

  _debugMove(event) {
    console.log("PlayerSystem received mouse move:", event.dx, event.dy);
  }
}
