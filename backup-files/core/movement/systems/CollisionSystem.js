import { Vector3 } from "three";

/**
 * Handles collision detection and response in the Severance environment
 * @class CollisionSystem
 */
export class CollisionSystem {
  constructor() {
    this.wallOffset = 0.2;
    this.collisionMeshes = [];
  }

  /**
   * Add a mesh to be considered for collisions
   * @param {THREE.Mesh} mesh Mesh to add to collision system
   */
  addCollisionMesh(mesh) {
    this.collisionMeshes.push(mesh);
  }

  /**
   * Check if a position is valid (no collisions)
   * @param {Vector3} position Position to check
   * @returns {boolean} True if position is valid
   */
  isValidPosition(position) {
    // Create a bounding sphere around the position
    const sphere = {
      center: position,
      radius: this.wallOffset,
    };

    // Check collision with all meshes
    for (const mesh of this.collisionMeshes) {
      if (this.sphereIntersectsMesh(sphere, mesh)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if a sphere intersects with a mesh
   * @param {Object} sphere Sphere object with center and radius
   * @param {THREE.Mesh} mesh Mesh to check against
   * @returns {boolean} True if there is an intersection
   */
  sphereIntersectsMesh(sphere, mesh) {
    // Get the mesh's bounding box
    const bbox = mesh.geometry.boundingBox;
    if (!bbox) {
      mesh.geometry.computeBoundingBox();
    }

    // Transform sphere position to mesh local space
    const localSphere = {
      center: sphere.center.clone().applyMatrix4(mesh.matrixWorld.invert()),
      radius: sphere.radius,
    };

    // Check if sphere intersects with bounding box
    const box = mesh.geometry.boundingBox;
    return this.sphereIntersectsBox(localSphere, box);
  }

  /**
   * Check if a sphere intersects with a box
   * @param {Object} sphere Sphere object with center and radius
   * @param {THREE.Box3} box Bounding box
   * @returns {boolean} True if there is an intersection
   */
  sphereIntersectsBox(sphere, box) {
    // Find the closest point on the box to the sphere center
    const closest = new Vector3();
    closest.copy(sphere.center);

    // Clamp to box
    closest.x = Math.max(box.min.x, Math.min(box.max.x, closest.x));
    closest.y = Math.max(box.min.y, Math.min(box.max.y, closest.y));
    closest.z = Math.max(box.min.z, Math.min(box.max.z, closest.z));

    // If the distance is less than the radius, we have a collision
    const distance = closest.distanceTo(sphere.center);
    return distance < sphere.radius;
  }

  /**
   * Get a valid position near an invalid one by sliding along walls
   * @param {Vector3} currentPos Current position
   * @param {Vector3} targetPos Desired position
   * @returns {Vector3} Valid position
   */
  getValidPosition(currentPos, targetPos) {
    // Try sliding along X axis
    const slideX = new Vector3(targetPos.x, currentPos.y, currentPos.z);
    if (this.isValidPosition(slideX)) {
      return slideX;
    }

    // Try sliding along Z axis
    const slideZ = new Vector3(currentPos.x, currentPos.y, targetPos.z);
    if (this.isValidPosition(slideZ)) {
      return slideZ;
    }

    // If no valid position found, return current position
    return currentPos;
  }
}
