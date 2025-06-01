import * as THREE from "three";
import { getAssetPath } from '../../../utils/assetPath.js';
import {
  vertexShader,
  wallVertexShader,
  wallFragmentShader,
  corridorShader,
  corridorFragmentShader
} from '../../shaders/shaderStrings.js';

/**
 * Material system for the Severance aesthetic
 * Manages all materials used in the Severance environment with proper disposal
 */
export class SeveranceMaterials {
  /**
   * @param {THREE.WebGLRenderer} [renderer] - The WebGL renderer to use for shader compilation
   */
  constructor(renderer = null) {
    this.materials = new Map();
    this.shaders = new Map();
    this.textures = new Map();
    this.disposed = false;
    this.initialized = false;
    this.resolutionNeedsUpdate = false;
    this.renderer = renderer;
  }

  /**
   * Initialize the material system
   * @param {THREE.WebGLRenderer} [renderer] - The WebGL renderer to use for shader compilation
   * @returns {Promise<void>}
   */
  async initialize(renderer = null) {
    if (this.initialized) return;

    try {
      console.log("Initializing SeveranceMaterials...");

      // Store renderer for shader validation
      if (renderer && !this.renderer) {
        this.renderer = renderer;
        console.log("Renderer set for shader compilation validation");
      }

      // Initialize basic materials first (no textures/shaders)
      this._initializeBasicMaterials();

      // Try to load textures and enhanced materials
      try {
        await this._loadTextures();
        console.log("Textures loaded successfully");
      } catch (error) {
        console.warn("Failed to load textures, using basic materials:", error);
      }

      // Try to load shaders
      try {
        await this._loadShaders();
        console.log("Shaders loaded successfully");
      } catch (error) {
        console.warn(
          "Failed to load shaders, using standard materials:",
          error
        );
      }

      this.initialized = true;
      console.log("SeveranceMaterials initialized successfully");
    } catch (error) {
      console.error("Failed to initialize materials:", error);
      throw error;
    }
  }

  /**
   * Initialize basic materials without textures
   * @private
   */
  _initializeBasicMaterials() {
    // Wall material - Concrete Look
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0x888888, // Mid-grey for concrete base
      roughness: 0.8, // Higher roughness for concrete
      metalness: 0.1, // Low metalness
      side: THREE.DoubleSide,
    });

    // Floor material - polished with subtle reflection
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0xf0f0f0, // Slightly darker than walls
      metalness: 0.4, // More metallic for reflection
      roughness: 0.2, // Smoother for that waxed/polished look
      envMapIntensity: 0.5, // More reflective
    });

    // Outside ground material - placeholder (use wall.jpg texture or a solid color)
    const outsideGroundMaterial = new THREE.MeshStandardMaterial({
      color: 0xcccccc, // Light gray for outside ground (can be changed to a texture later)
      metalness: 0.2,
      roughness: 0.8,
      envMapIntensity: 0.2,
    });

    // Ceiling material - flat white with subtle texture
    const ceilingMaterial = new THREE.MeshStandardMaterial({
      color: 0xfcfcfc, // Bright white
      metalness: 0.0, // Non-metallic
      roughness: 0.95, // Very rough to diffuse light
    });

    // Trim material - dark black with subtle shine
    const trimMaterial = new THREE.MeshStandardMaterial({
      color: 0x191a1a, // Nearly black
      metalness: 0.6, // Metallic for baseboards
      roughness: 0.3, // Smoother finish
    });

    // Door material - neutral/corporate
    const doorMaterial = new THREE.MeshStandardMaterial({
      color: 0xe0e0e0, // Light gray
      roughness: 0.5,
      metalness: 0.1,
    });

    // Light fixture material - emissive
    const lightMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xc4e0db, // Subtle blue-green fluorescent
      emissiveIntensity: 0.8,
      roughness: 0.3,
      metalness: 0.5,
    });

    // Metal trim material for light fixtures and details
    const metalTrimMaterial = new THREE.MeshStandardMaterial({
      color: 0xdadada, // Light aluminum gray
      metalness: 0.8, // Highly metallic for fixtures
      roughness: 0.2, // Smooth finish
      envMapIntensity: 0.7, // Strong reflections
    });

    // Sky material - clear blue (can be replaced with gradient or skybox texture)
    const skyMaterial = new THREE.MeshStandardMaterial({
      color: 0x7ec0ee, // Sky blue
      metalness: 0.0,
      roughness: 1.0,
      side: THREE.DoubleSide,
    });

    // Store basic materials
    this.materials.set("wall", wallMaterial);
    this.materials.set("floor", floorMaterial);
    this.materials.set("outsideGround", outsideGroundMaterial);
    this.materials.set("ceiling", ceilingMaterial);
    this.materials.set("trim", trimMaterial);
    this.materials.set("door", doorMaterial);
    this.materials.set("light", lightMaterial);
    this.materials.set("metalTrim", metalTrimMaterial);
    this.materials.set("sky", skyMaterial);

    // Initialize department materials
    this._initializeDepartmentMaterials();
  }

  /**
   * Load texture files
   * @private
   */
  async _loadTextures() {
    const textureLoader = new THREE.TextureLoader();
    const texturePaths = {
      wall: getAssetPath("/textures/wall.jpg"),
      floor: getAssetPath("/textures/floor.jpg"),
      ceiling: getAssetPath("/textures/ceiling.jpg"),
      trim: getAssetPath("/textures/trim.jpg"),
      door: getAssetPath("/textures/door.jpg"),
      outsideGround: getAssetPath("/textures/wall.jpg"),
    };

    const loadTexture = (path) => {
      return new Promise((resolve, reject) => {
        textureLoader.load(
          path,
          (texture) => {
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            resolve(texture);
          },
          undefined,
          (error) => reject(error)
        );
      });
    };

    try {
      for (const [name, path] of Object.entries(texturePaths)) {
        try {
          const texture = await loadTexture(path);
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
          this.textures.set(name, texture);

          // Update existing material with texture
          const material = this.materials.get(name);
          if (material) {
            material.map = texture;
            material.needsUpdate = true;
          }
        } catch (error) {
          console.warn(`Failed to load texture ${name}: ${error.message}`);
        }
      }
    } catch (error) {
      console.error("Error in texture loading process:", error);
      throw error;
    }
  }

  /**
   * Load and compile all shaders
   * @private
   */
  async _loadShaders() {
    try {
      console.log("Loading shaders from embedded strings...");

      // Use imported shader strings instead of loading from files
      const commonVertexShader = vertexShader;
      console.log("Using embedded vertex shader");

      // Initialize a default environment map
      const defaultEnvMap = this._createDefaultEnvMap();

      // Use embedded wall shader
      const wallFragmentShaderCode = wallFragmentShader;
      console.log("Using embedded wall shader");

      // Use embedded corridor shader
      const corridorFragmentShaderCode = corridorShader;
      console.log("Using embedded corridor shader");

      // Create corridor wall shader
      console.log("Creating corridor wall shader with embedded fragment shader");
      const corridorWallShader = {
        vertexShader: commonVertexShader,
        fragmentShader: corridorFragmentShaderCode,
        uniforms: {
          lightColor: { value: new THREE.Color(0xffffff) },
          intensity: { value: 1.0 },
          time: { value: 0 },
        },
      };
      this.shaders.set("corridorWall", corridorWallShader);

      await this._createShaderMaterials(commonVertexShader, wallFragmentShaderCode, corridorFragmentShaderCode);

      console.log("Shader loading complete");
    } catch (error) {
      console.error("Error loading shaders:", error);
      throw error;
    }
  }

  /**
   * Check if a shader material compiled successfully
   * @param {THREE.ShaderMaterial} material The material to check
   * @param {string} name Name for logging
   * @returns {boolean} Whether compilation succeeded
   * @private
   */
  _checkShaderCompilation(material, name) {
    if (!this.renderer) {
      console.warn(`No renderer available to check ${name} shader compilation`);
      return true; // Assume success if no renderer
    }

    try {
      // Create a minimal mesh to force shader compilation
      const geometry = new THREE.PlaneGeometry(1, 1);
      const mesh = new THREE.Mesh(geometry, material);
      
      // Create a minimal scene and camera
      const scene = new THREE.Scene();
      scene.add(mesh);
      const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
      camera.position.z = 5;
      
      // Force compilation by rendering
      this.renderer.compile(scene, camera);
      
      // Clean up
      geometry.dispose();
      scene.remove(mesh);
      
      console.log(`${name} shader compiled successfully`);
      return true;
    } catch (error) {
      console.error(`Error compiling ${name} shader:`, error);
      return false;
    }
  }

  /**
   * Load a shader file
   * @param {string} path Path to shader file
   * @returns {Promise<string>} Shader source code
   * @private 
   */
  async _loadShaderFile(path) {
    try {
      console.log(`Attempting to load shader from: ${path}`);
      const response = await fetch(path);
      if (!response.ok) {
        console.error(`Failed to load shader at ${path}. Status: ${response.status}`);
        throw new Error(`Failed to load shader at ${path}`);
      }
      const text = await response.text();
      console.log(`Successfully loaded shader from: ${path} (${text.length} bytes)`);
      return text;
    } catch (error) {
      console.error(`Error loading shader from ${path}:`, error);
      throw error;
    }
  }

  /**
   * Creates shader materials for walls and corridors
   * @private
   */
  async _createShaderMaterials(commonVertexShader, wallFragmentShaderCode, corridorFragmentShaderCode) {
    try {
      // Create wall material with embedded shaders
      let wallVertexShader = commonVertexShader;
      
      try {
        console.log('Creating wall shader material with embedded shaders');
        
        // Create wall material with uniforms
        const wallMaterial = new THREE.ShaderMaterial({
          uniforms: {
            wallColor: { value: new THREE.Color(0xf5f5f5) },
            wallRoughness: { value: 0.85 },
            time: { value: 0.0 }
          },
          vertexShader: wallVertexShader,
          fragmentShader: wallFragmentShaderCode,
          side: THREE.DoubleSide,
          transparent: false
        });

        // Validate wall shader compilation
        if (!this._checkShaderCompilation(wallMaterial, 'Wall')) {
          throw new Error('Wall shader compilation failed');
        }
        
        this.materials.set('wall', wallMaterial);
        console.log('Wall shader material created successfully');
        
      } catch (error) {
        console.warn('Failed to create wall shader material, using fallback material:', error);
        this.materials.set('wall', new THREE.MeshStandardMaterial({
          color: 0xf5f5f5,
          roughness: 0.85,
          metalness: 0.1,
          side: THREE.DoubleSide
        }));
      }

      // Create corridor material with embedded shaders
      let corridorVertexShader = commonVertexShader;
      
      try {
        console.log('Creating corridor shader material with embedded shaders');
        
        // Create corridor material with uniforms
        const corridorMaterial = new THREE.ShaderMaterial({
          uniforms: {
            lightColor: { value: new THREE.Color(0xffffff) },
            lightIntensity: { value: 1.0 },
            ambientLight: { value: new THREE.Color(0x404040) },
            time: { value: 0.0 }
          },
          vertexShader: corridorVertexShader,
          fragmentShader: corridorFragmentShaderCode,
          transparent: false,
          side: THREE.DoubleSide
        });

        // Validate corridor shader compilation
        if (!this._checkShaderCompilation(corridorMaterial, 'Corridor')) {
          throw new Error('Corridor shader compilation failed');
        }
        
        this.materials.set('corridor', corridorMaterial);
        console.log('Corridor shader material created successfully');
        
      } catch (error) {
        console.warn('Failed to create corridor shader material, using fallback material:', error);
        this.materials.set('corridor', new THREE.MeshStandardMaterial({
          color: 0xffffff,
          emissive: 0xffffff,
          emissiveIntensity: 0.5,
          transparent: true,
          opacity: 0.5
        }));
      }

      // Create corridor wall material with embedded shaders
      try {
        console.log('Creating corridor wall shader material with embedded shaders');
        
        // Create corridor wall material with uniforms
        const corridorWallMaterial = new THREE.ShaderMaterial({
          uniforms: {
            lightColor: { value: new THREE.Color(0xffffff) },
            lightIntensity: { value: 1.0 },
            ambientLight: { value: new THREE.Color(0x404040) },
            time: { value: 0.0 }
          },
          vertexShader: commonVertexShader,
          fragmentShader: corridorFragmentShaderCode,
          side: THREE.DoubleSide,
          transparent: false
        });

        // Validate corridor wall shader compilation
        if (!this._checkShaderCompilation(corridorWallMaterial, 'CorridorWall')) {
          throw new Error('CorridorWall shader compilation failed');
        }
        
        this.materials.set('corridorWall', corridorWallMaterial);
        console.log('CorridorWall shader material created successfully');
        
      } catch (error) {
        console.warn('Failed to create corridor wall shader material, using fallback material:', error);
        this.materials.set('corridorWall', new THREE.MeshStandardMaterial({
          color: 0xe10600,
          roughness: 0.5,
          metalness: 0.2,
          side: THREE.DoubleSide
        }));
      }
      
    } catch (error) {
      console.error('Error creating shader materials:', error);
      throw error;
    }
  }

  /**
   * Initialize department-specific materials
   * @private
   */
  _initializeDepartmentMaterials() {
    // MDR Department - Blue-green tint (based on show)
    const mdrMaterial = new THREE.MeshStandardMaterial({
      color: 0xedf2f4,
      metalness: 0.1,
      roughness: 0.9,
      emissive: 0x1a3f4d,
      emissiveIntensity: 0.05,
    });

    // O&D Department - Green tint
    const odMaterial = new THREE.MeshStandardMaterial({
      color: 0xf2f4ed,
      metalness: 0.1,
      roughness: 0.9,
      emissive: 0x2b5329,
      emissiveIntensity: 0.05,
    });

    // Break Room - Warm brown undertone
    const breakRoomMaterial = new THREE.MeshStandardMaterial({
      color: 0xf4f2ed,
      metalness: 0.05,
      roughness: 0.95,
      emissive: 0x4d3319,
      emissiveIntensity: 0.05,
    });

    // Perpetuity Wing - Dark gray undertone
    const perpetuityMaterial = new THREE.MeshStandardMaterial({
      color: 0xf0f0f0,
      metalness: 0.15,
      roughness: 0.9,
      emissive: 0x333333,
      emissiveIntensity: 0.05,
    });

    // Testing Floor - Red undertone
    const testingMaterial = new THREE.MeshStandardMaterial({
      color: 0xf4edee,
      metalness: 0.1,
      roughness: 0.9,
      emissive: 0x4d1919,
      emissiveIntensity: 0.05,
    });

    // Store department materials
    this.materials.set("mdr", mdrMaterial);
    this.materials.set("od", odMaterial);
    this.materials.set("breakRoom", breakRoomMaterial);
    this.materials.set("perpetuity", perpetuityMaterial);
    this.materials.set("testing", testingMaterial);
  }

  /**
   * Get a material by name
   * @param {string} name - Name of the material
   * @returns {THREE.Material} The requested material
   */
  getMaterial(name) {
    if (this.disposed) {
      throw new Error("SeveranceMaterials has been disposed");
    }

    if (!this.initialized) {
      throw new Error(
        "SeveranceMaterials not initialized. Call initialize() first"
      );
    }

    const material = this.materials.get(name);
    if (!material) {
      throw new Error(`Material '${name}' not found`);
    }

    return material;
  }

  /**
   * Update environment map for all materials
   * @param {THREE.CubeTexture} envMap - Environment map to use
   */
  updateEnvironmentMap(envMap) {
    if (this.disposed) return;

    this.materials.forEach((material) => {
      if (material.envMap !== undefined) {
        material.envMap = envMap;
        material.needsUpdate = true;
      }
    });
  }

  /**
   * Update shader uniforms
   * @param {number} deltaTime - Time since last frame in seconds
   * @param {THREE.Vector3} playerPosition - Current player position (optional)
   */
  update(deltaTime, playerPosition) {
    if (this.disposed) return;

    // Update time uniforms for all shader materials
    for (const material of this.materials.values()) {
      if (material instanceof THREE.ShaderMaterial && material.uniforms) {
        // Update time uniform if present (handle both naming conventions)
        if (material.uniforms.time) {
          material.uniforms.time.value += deltaTime;
        }
        if (material.uniforms.u_time) {
          material.uniforms.u_time.value += deltaTime;
        }

        // Update player position if present
        if (material.uniforms.playerPos && playerPosition) {
          material.uniforms.playerPos.value.copy(playerPosition);
        }

        // Update mouse position for corridor_wall shader if present
        if (material.uniforms.u_mouse) {
          // Update with current mouse position (normalized)
          if (window.mouseX !== undefined && window.mouseY !== undefined) {
            material.uniforms.u_mouse.value.set(
              window.mouseX / window.innerWidth,
              window.mouseY / window.innerHeight
            );
          }
        }

        // Ensure wallColor is visible (debug help)
        if (material.uniforms.wallColor && material.name === "wall") {
          const color = material.uniforms.wallColor.value;
          // If color is too dark (close to black), reset it
          if (color.r < 0.1 && color.g < 0.1 && color.b < 0.1) {
            console.warn("Wall color is too dark, resetting to default");
            material.uniforms.wallColor.value = new THREE.Color(0xf5f5f5);
          }
        }
      }
    }

    // Update resolution if window was resized
    if (this.resolutionNeedsUpdate) {
      const resolution = new THREE.Vector2(
        window.innerWidth,
        window.innerHeight
      );
      for (const material of this.materials.values()) {
        if (material instanceof THREE.ShaderMaterial) {
          // Update resolution uniform if present (handle both naming conventions)
          if (material.uniforms.resolution) {
            material.uniforms.resolution.value = resolution;
          }
          if (material.uniforms.u_resolution) {
            material.uniforms.u_resolution.value = resolution;
          }
        }
      }
      this.resolutionNeedsUpdate = false;
    }
  }

  /**
   * Handle window resize for shader uniforms
   */
  handleResize() {
    if (this.disposed) return;

    this.resolutionNeedsUpdate = true;
  }

  /**
   * Creates a default environment map for reflections when a real one isn't available
   * @returns {THREE.CubeTexture} A default environment map
   * @private
   */
  _createDefaultEnvMap() {
    const resolution = 16; // Small resolution is fine for a default map
    const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(resolution);
    const cubeCamera = new THREE.CubeCamera(0.1, 1000, cubeRenderTarget);

    // Create a simple scene with gradient background
    const scene = new THREE.Scene();

    // Create a gradient background
    const topColor = new THREE.Color(0xcccccc); // Light gray
    const bottomColor = new THREE.Color(0x666666); // Darker gray

    const canvas = document.createElement("canvas");
    canvas.width = 2;
    canvas.height = 2;
    const context = canvas.getContext("2d");

    // Create a gradient from top to bottom
    const gradient = context.createLinearGradient(0, 0, 0, 2);
    gradient.addColorStop(0, topColor.getStyle());
    gradient.addColorStop(1, bottomColor.getStyle());

    context.fillStyle = gradient;
    context.fillRect(0, 0, 2, 2);

    const texture = new THREE.CanvasTexture(canvas);
    scene.background = texture;

    // Create a dummy camera to render from
    const camera = new THREE.PerspectiveCamera(90, 1, 0.1, 100);
    camera.position.set(0, 0, 0);

    // Render cube map
    cubeCamera.update(new THREE.WebGLRenderer(), scene);

    return cubeRenderTarget.texture;
  }

  /**
   * Clean up all materials
   */
  dispose() {
    if (this.disposed) return;

    this.materials.forEach((material) => {
      if (material.uniforms) {
        // Clean up any shader-specific resources
        Object.values(material.uniforms).forEach((uniform) => {
          if (uniform.value && uniform.value.dispose) {
            uniform.value.dispose();
          }
        });
      }
      if (material.map) {
        material.map.dispose();
      }
      material.dispose();
    });
    this.materials.clear();

    // Dispose of textures
    this.textures.forEach((texture) => texture.dispose());
    this.textures.clear();

    this.shaders.clear();
    this.disposed = true;
  }
}
