import * as THREE from "three";
import { EventEmitter } from "events";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { getAssetPath } from '../../utils/assetPath.js';

/**
 * Asset loading system for managing game assets
 * @class AssetLoader
 */
export class AssetLoader extends EventEmitter {
  constructor() {
    super();

    // Initialize loaders
    this.textureLoader = new THREE.TextureLoader();
    this.gltfLoader = new GLTFLoader();
    this.dracoLoader = new DRACOLoader();

    // Setup Draco decoder
    this.dracoLoader.setDecoderPath("/draco/");
    this.gltfLoader.setDRACOLoader(this.dracoLoader);

    // Asset storage
    this.textures = new Map();
    this.models = new Map();
    this.materials = new Map();
    this.geometries = new Map();

    // Loading state
    this.totalAssets = 0;
    this.loadedAssets = 0;
    this.isLoading = false;
  }

  /**
   * Initialize the asset loader
   * @param {Engine} engine - Game engine instance
   */
  init(engine) {
    this.engine = engine;
  }

  /**
   * Load all required game assets
   * @returns {Promise} Promise that resolves when all assets are loaded
   */
  async loadAssets() {
    if (this.isLoading) return;
    this.isLoading = true;
    this.totalAssets = 0;
    this.loadedAssets = 0;

    try {
      // Load textures
      const texturePromises = this._loadTextures();
      this.totalAssets += texturePromises.length;

      // Load models
      const modelPromises = this._loadModels();
      this.totalAssets += modelPromises.length;

      // Load materials
      const materialPromises = this._createMaterials();
      this.totalAssets += materialPromises.length;

      // Wait for all assets to load
      await Promise.all([
        ...texturePromises,
        ...modelPromises,
        ...materialPromises,
      ]);

      this.isLoading = false;
      this.emit("loaded");
      return true;
    } catch (error) {
      console.error("Error loading assets:", error);
      this.isLoading = false;
      this.emit("error", error);
      return false;
    }
  }

  /**
   * Load required textures
   * @private
   * @returns {Promise[]} Array of texture loading promises
   */
  _loadTextures() {
    const texturesToLoad = {
      wall: getAssetPath("/assets/textures/wall.jpg"),
      floor: getAssetPath("/assets/textures/floor.jpg"),
      ceiling: getAssetPath("/assets/textures/ceiling.jpg"),
      door: getAssetPath("/assets/textures/door.jpg"),
      trim: getAssetPath("/assets/textures/trim.jpg"),
    };

    return Object.entries(texturesToLoad).map(([name, path]) => {
      return new Promise((resolve) => {
        // Create a default solid color texture
        const canvas = document.createElement("canvas");
        canvas.width = 1;
        canvas.height = 1;
        const ctx = canvas.getContext("2d");

        // Default colors for each texture
        const colors = {
          wall: "#e0e0e0",
          floor: "#808080",
          ceiling: "#ffffff",
          door: "#4a4a4a",
          trim: "#696969",
        };

        ctx.fillStyle = colors[name];
        ctx.fillRect(0, 0, 1, 1);

        // Try to load the actual texture first
        this.textureLoader.load(
          path,
          (texture) => {
            // Enforce mipmaps and optimal filtering
            function isPowerOfTwo(x) {
              return (x & (x - 1)) === 0;
            }
            if (!isPowerOfTwo(texture.image.width) || !isPowerOfTwo(texture.image.height)) {
              console.warn(`Texture ${name} (${path}) is not power-of-two. This may impact performance.`);
              texture.generateMipmaps = false;
              texture.minFilter = THREE.LinearFilter;
            } else {
              texture.generateMipmaps = true;
              texture.minFilter = THREE.LinearMipmapLinearFilter;
            }
            texture.magFilter = THREE.LinearFilter;
            texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
            this.textures.set(name, texture);
            this.loadedAssets++;
            this.emit("progress", this.loadedAssets / this.totalAssets);
            resolve(texture);
          },
          undefined,
          () => {
            // On error, use the default solid color texture
            console.warn(`Texture ${name} not found, using default color.`);
            const defaultTexture = new THREE.CanvasTexture(canvas);
            defaultTexture.wrapS = defaultTexture.wrapT = THREE.RepeatWrapping;
            this.textures.set(name, defaultTexture);
            this.loadedAssets++;
            this.emit("progress", this.loadedAssets / this.totalAssets);
            resolve(defaultTexture);
          }
        );
      });
    });
  }

  /**
   * Load required models
   * @private
   * @returns {Promise[]} Array of model loading promises
   */
  _loadModels() {
    const modelsToLoad = {
      door: getAssetPath("/assets/models/door.json"),
      chair: getAssetPath("/assets/models/chair.json"),
      desk: getAssetPath("/assets/models/desk.json"),
    };

    return Object.entries(modelsToLoad).map(([name, path]) => {
      return new Promise((resolve, reject) => {
        fetch(path)
          .then((response) => response.json())
          .then((json) => {
            const loader = new THREE.ObjectLoader();
            const model = loader.parse(json);
            this.models.set(name, model);
            this.loadedAssets++;
            this.emit("progress", this.loadedAssets / this.totalAssets);
            resolve(model);
          })
          .catch((error) =>
            reject(new Error(`Failed to load model ${name}: ${error.message}`))
          );
      });
    });
  }

  /**
   * Create required materials
   * @private
   * @returns {Promise[]} Array of material creation promises
   */
  _createMaterials() {
    // Create basic materials
    const materials = {
      wall: new THREE.MeshStandardMaterial({
        color: 0xf6f6f6,
        roughness: 0.7,
        metalness: 0.1,
      }),
      floor: new THREE.MeshStandardMaterial({
        color: 0xeeeeee,
        roughness: 0.8,
        metalness: 0.1,
      }),
      ceiling: new THREE.MeshStandardMaterial({
        color: 0xf8f8f8,
        roughness: 0.6,
        metalness: 0.1,
      }),
      trim: new THREE.MeshStandardMaterial({
        color: 0x232323,
        roughness: 0.5,
        metalness: 0.3,
      }),
    };

    // Store materials
    Object.entries(materials).forEach(([name, material]) => {
      this.materials.set(name, material);
    });

    // Return empty array since material creation is synchronous
    return [];
  }

  /**
   * Get a loaded texture by name
   * @param {string} name - Texture name
   * @returns {THREE.Texture|null} Texture or null if not found
   */
  getTexture(name) {
    return this.textures.get(name) || null;
  }

  /**
   * Get a loaded model by name
   * @param {string} name - Model name
   * @returns {THREE.Object3D|null} Model or null if not found
   */
  getModel(name) {
    const model = this.models.get(name);
    return model ? model.clone() : null;
  }

  /**
   * Get a material by name
   * @param {string} name - Material name
   * @returns {THREE.Material|null} Material or null if not found
   */
  getMaterial(name) {
    return this.materials.get(name) || null;
  }

  /**
   * Clean up resources
   */
  dispose() {
    // Dispose textures
    this.textures.forEach((texture) => texture.dispose());
    this.textures.clear();

    // Dispose materials
    this.materials.forEach((material) => material.dispose());
    this.materials.clear();

    // Dispose geometries
    this.geometries.forEach((geometry) => geometry.dispose());
    this.geometries.clear();

    // Clear models
    this.models.clear();

    // Dispose loaders
    this.dracoLoader.dispose();
  }
}
