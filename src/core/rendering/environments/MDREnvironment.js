import * as THREE from "three";
import { BaseEnvironment } from "./BaseEnvironment.js";

export class MDREnvironment extends BaseEnvironment {
  constructor(options = {}) {
    super({
      ...options,
      usePostProcessing: true, // MDR requires post-processing for the fluorescent light effect
      usePerformanceMonitoring: true,
    });

    // MDR-specific properties
    this.desks = new Map();
    this.computers = new Map();
    this.lights = new Map();
  }

  async initializeScene() {
    await super.initializeScene();

    // Set MDR-specific scene properties
    this.scene.background = new THREE.Color(0x1a1a1a); // Dark office environment
    this.scene.fog = new THREE.Fog(0x1a1a1a, 10, 20); // Add fog for atmosphere

    // Setup MDR-specific lighting
    this.setupLighting();

    // Setup office environment
    await this.setupOfficeEnvironment();
  }

  setupLighting() {
    // Ambient light for base illumination
    const ambient = new THREE.AmbientLight(0xffffff, 0.3);
    this.scene.add(ambient);
    this.lights.set("ambient", ambient);

    // Fluorescent lights
    const createFluorescentLight = (position) => {
      const light = new THREE.RectAreaLight(0xf7f7ef, 3, 1.2, 0.3);
      light.position.copy(position);
      light.rotation.x = -Math.PI / 2;
      this.scene.add(light);
      return light;
    };

    // Add grid of fluorescent lights
    for (let x = -5; x <= 5; x += 2.5) {
      for (let z = -5; z <= 5; z += 2.5) {
        this.lights.set(
          `fluorescent_${x}_${z}`,
          createFluorescentLight(new THREE.Vector3(x, 3, z))
        );
      }
    }
  }

  async setupOfficeEnvironment() {
    // Create floor
    const floorGeometry = new THREE.PlaneGeometry(20, 20);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x333333,
      roughness: 0.8,
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Create ceiling
    const ceilingGeometry = new THREE.PlaneGeometry(20, 20);
    const ceilingMaterial = new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      roughness: 0.9,
    });
    const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = 3;
    ceiling.receiveShadow = true;
    this.scene.add(ceiling);

    // Add walls
    this.createWalls();

    // Add office furniture (placeholder for now)
    await this.createOfficeFurniture();
  }

  createWalls() {
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0xe0e0e0,
      roughness: 0.9,
    });

    // North wall
    const northWall = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 3),
      wallMaterial
    );
    northWall.position.z = -10;
    northWall.position.y = 1.5;
    this.scene.add(northWall);

    // South wall
    const southWall = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 3),
      wallMaterial
    );
    southWall.position.z = 10;
    southWall.position.y = 1.5;
    southWall.rotation.y = Math.PI;
    this.scene.add(southWall);

    // East wall
    const eastWall = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 3),
      wallMaterial
    );
    eastWall.position.x = 10;
    eastWall.position.y = 1.5;
    eastWall.rotation.y = -Math.PI / 2;
    this.scene.add(eastWall);

    // West wall
    const westWall = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 3),
      wallMaterial
    );
    westWall.position.x = -10;
    westWall.position.y = 1.5;
    westWall.rotation.y = Math.PI / 2;
    this.scene.add(westWall);
  }

  async createOfficeFurniture() {
    // Placeholder for office furniture
    // This will be replaced with actual 3D models later
    const deskGeometry = new THREE.BoxGeometry(1.2, 0.8, 0.6);
    const deskMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b4513,
      roughness: 0.8,
    });

    // Create a grid of desks
    for (let x = -4; x <= 4; x += 2) {
      for (let z = -4; z <= 4; z += 2) {
        const desk = new THREE.Mesh(deskGeometry, deskMaterial);
        desk.position.set(x, 0.4, z);
        desk.castShadow = true;
        desk.receiveShadow = true;
        this.scene.add(desk);
        this.desks.set(`desk_${x}_${z}`, desk);
      }
    }
  }

  update(deltaTime) {
    super.update(deltaTime);

    // Add MDR-specific updates here
    // For example, flickering fluorescent lights
    this.lights.forEach((light, key) => {
      if (key.startsWith("fluorescent_") && Math.random() < 0.01) {
        light.intensity = 2.8 + Math.random() * 0.4;
      }
    });
  }

  dispose() {
    super.dispose();

    // Clean up MDR-specific resources
    this.desks.forEach((desk) => {
      desk.geometry.dispose();
      desk.material.dispose();
    });
    this.desks.clear();

    this.computers.forEach((computer) => {
      computer.geometry.dispose();
      computer.material.dispose();
    });
    this.computers.clear();

    this.lights.forEach((light) => {
      this.scene.remove(light);
    });
    this.lights.clear();
  }

  /**
   * Returns an array of meshes that the player can interact with.
   * Currently, MDR has no interactables, so returns an empty array.
   * @returns {THREE.Object3D[]} List of interactable objects (empty)
   */
  getInteractableObjects() {
    return [];
  }
}
