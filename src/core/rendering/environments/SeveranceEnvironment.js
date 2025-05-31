import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"; // Added GLTFLoader import
import { TextureLoader } from "three"; // Add TextureLoader import
import { BaseEnvironment } from "./BaseEnvironment";
import { MapSystem } from "../../../systems/map/MapSystem";
import { SeveranceMaterials } from "../materials/SeveranceMaterials";
import { UnifiedMovementController } from "../../../systems/movement/UnifiedMovementController";
import {
  CorridorSystem,
  CORRIDOR_WIDTH,
  SEGMENT_LENGTH,
  CORRIDOR_HEIGHT,
  CORRIDOR_TRIM_HEIGHT,
} from "../../../systems/corridorSystem";
import { CORRIDOR_MAP } from "../../../systems/map/SeveranceCorridorMap.js";
import PerformanceArtLetterGenerator from '../performance/PerformanceArtLetterGenerator.js';
import { getAssetPath } from '../../../utils/assetPath.js';


const DOORWAY_WIDTH = 1.8; // Widened from 1.2 for a more spacious doorframe


export class SeveranceEnvironment extends BaseEnvironment {
  constructor(options = {}) {
    super({
      ...options,
      usePostProcessing: true, // Enable post-processing for visual effects
      usePerformanceMonitoring: true, // Monitor performance for optimization
    });

    // Add post-processing configuration
    this.postProcessingConfig = {
      bloom: {
        enabled: true,
        strength: 0.5,
        radius: 0.4,
        threshold: 0.8
      },
      chromaticAberration: {
        enabled: true,
        offset: 0.001
      }
    };

    // Initialize game state
    this.gameState = {
      isPlaying: false,
      currentLocation: "entrance",
      playerHealth: 100,
      inventory: [],
      visitedLocations: new Set(["entrance"]),
      objectives: new Map(),
      settings: {
        mouseSensitivity: 0.002,
        volume: 0.8,
        fov: 75,
        headBobEnabled: true,
        headBobIntensity: 0.08,
        headBobSpeed: 1.8
      }
    };

    // Weather state
    this.weatherState = {
      isRaining: false,
      lastWeatherChange: Date.now(),
      minWeatherDuration: 120000, // Minimum 2 minutes between weather changes
    };

    // Store references to doors and interactive objects
    this.doors = new Map();
    this.interactiveObjects = new Map();

    // Environment state
    this.emergencyLighting = false;
    this.lightFlickerIntensity = 0;

    // Corridor segments
    this.corridorSegments = new Map();
    // Store references to all indoor ceiling meshes for rain occlusion
    this.ceilingMeshes = [];

    // Collidable walls
    this.wallMeshes = []; // Added to store wall meshes for collision

    // Initialize materials system
    this.materialSystem = new SeveranceMaterials(this.renderer);

    // Initialize asset collections
    this.assets = {
      lights: new Map(),
      models: new Map(),
      sounds: new Map(),
      materials: new Map(), // Added from LumonEnvironment for consistency
    };

    // Wayfinding elements (from LumonEnvironment)
    this.wayfinding = new Map();
    this.clock = new THREE.Clock(); // Added from LumonEnvironment

    // Door locations for interaction detection
    window.doorLocations = [];

    // Add door animation properties
    this.doorStates = new Map();
    this.DOOR_INTERACTION_DISTANCE = 2.5; // Distance at which doors start opening
    this.DOOR_ANIMATION_SPEED = 1.5; // Speed of door opening/closing
    this.DOOR_MAX_ANGLE = Math.PI / 2; // 90 degrees open
    this.DOOR_OPEN_DIRECTION = 1; // 1 for opening to the right, -1 for opening to the left

    // Trackable objects
    this.doorStates = new Map(); // Track door state for animation
    this.doors = new Map(); // Store references to door objects
    
    // Add model loaders
    this.gltfLoader = new GLTFLoader();
    this.doorModels = {
        doorFrame: null,
        doorPivot: null,
        cardReader: null
    };
    this.tunnelWallMeshes = []; // Store tunnel wall meshes for uniform updates
  }

  /**
   * Initialize environment systems
   * @protected
   * @override
   */
  async initializeSystems() {
    await super.initializeSystems();

    // Initialize material system first
    await this.materialSystem.initialize(this.renderer);

    // Initialize core gameplay systems (corridor must be set before setupEnvironment)
    this.systems.set(
      "corridor",
      new CorridorSystem(this.scene, this.materialSystem)
    );

    // Set up the environment before creating other systems
    await this.setupEnvironment();

    // Load door models before creating any doors
    await this.loadDoorModels();

    // Initialize movement controller
    if (!window.activeMovementController) {
      console.log("Initializing UnifiedMovementController");
      this.movementController = new UnifiedMovementController(this.camera, this);
      window.activeMovementController = this.movementController;
    } else {
      console.log("Using existing UnifiedMovementController");
      this.movementController = window.activeMovementController;
    }

    // Initialize each system
    for (const [name, system] of this.systems) {
      if (system.initialize) {
        await system.initialize(this.container);
      }
    }

    // Set up portfolio sections using the new method
    this.setupPortfolioSections();

    // Build the new, simplified corridor layout
    await this.buildNewCorridorLayout();

    // Optionally create wayfinding elements if needed
    await this.createWayfinding();

    // Initialize post-processing effects
    if (this.composer) {
      const { EffectComposer } = await import('three/examples/jsm/postprocessing/EffectComposer.js');
      const { RenderPass } = await import('three/examples/jsm/postprocessing/RenderPass.js');
      const { UnrealBloomPass } = await import('three/examples/jsm/postprocessing/UnrealBloomPass.js');
      const { ShaderPass } = await import('three/examples/jsm/postprocessing/ShaderPass.js');

      // Custom chromatic aberration shader
      const chromaticAberrationShader = {
        uniforms: {
          "tDiffuse": { value: null },
          "offset": { value: this.postProcessingConfig.chromaticAberration.offset }
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform sampler2D tDiffuse;
          uniform float offset;
          varying vec2 vUv;
          void main() {
            vec4 cr = texture2D(tDiffuse, vUv + vec2(offset, 0));
            vec4 cg = texture2D(tDiffuse, vUv);
            vec4 cb = texture2D(tDiffuse, vUv - vec2(offset, 0));
            gl_FragColor = vec4(cr.r, cg.g, cb.b, cg.a);
          }
        `
      };

      // Add bloom effect
      const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        this.postProcessingConfig.bloom.strength,
        this.postProcessingConfig.bloom.radius,
        this.postProcessingConfig.bloom.threshold
      );

      // Add chromatic abberation
      const chromaticAberrationPass = new ShaderPass(chromaticAberrationShader);

      // Add passes to composer
      this.composer.addPass(bloomPass);
      this.composer.addPass(chromaticAberrationPass);

      // Store passes for later adjustment
      this.postProcessingPasses = {
        bloom: bloomPass,
        chromaticAberration: chromaticAberrationPass
      };
    }

    console.log("✓ Environment systems initialized."); // Example log

    // ---> SET isPlaying TO TRUE HERE <---
    this.gameState.isPlaying = true;
    window.playerCanMove = true; // Also ensure playerCanMove is true here
    console.log(`[GAME STATE] Set isPlaying=${this.gameState.isPlaying}, playerCanMove=${window.playerCanMove}`);
  }

  // Add new method to load door models
  async loadDoorModels() {
    try {
        console.log("[Door Models] Starting to load door models...");
        
        // Load door frame model
        console.log("[Door Models] Loading door frame model...");
        const doorFrameResult = await new Promise((resolve, reject) => {
            this.gltfLoader.load(
                getAssetPath('/assets/models/glb/door-frame.glb'),
                resolve,
                (progress) => {
                    console.log(`[Door Models] Frame loading progress: ${Math.round(progress.loaded / progress.total * 100)}%`);
                },
                (error) => {
                    console.error("[Door Models] Error loading door frame:", error);
                    reject(error);
                }
            );
        });
        this.doorModels.doorFrame = doorFrameResult.scene;
        console.log("[Door Models] Door frame loaded successfully");
        
        // Load door pivot model
        console.log("[Door Models] Loading door pivot model...");
        const doorPivotResult = await new Promise((resolve, reject) => {
            this.gltfLoader.load(
                getAssetPath('/assets/models/glb/door-pivot.glb'),
                resolve,
                (progress) => {
                    console.log(`[Door Models] Pivot loading progress: ${Math.round(progress.loaded / progress.total * 100)}%`);
                },
                (error) => {
                    console.error("[Door Models] Error loading door pivot:", error);
                    reject(error);
                }
            );
        });
        this.doorModels.doorPivot = doorPivotResult.scene;
        console.log("[Door Models] Door pivot loaded successfully");
        
        // Load card reader model
        console.log("[Door Models] Loading card reader model...");
        const cardReaderResult = await new Promise((resolve, reject) => {
            this.gltfLoader.load(
                getAssetPath('/assets/models/glb/card-reader.glb'),
                resolve,
                (progress) => {
                    console.log(`[Door Models] Card reader loading progress: ${Math.round(progress.loaded / progress.total * 100)}%`);
                },
                (error) => {
                    console.error("[Door Models] Error loading card reader:", error);
                    reject(error);
                }
            );
        });
        this.doorModels.cardReader = cardReaderResult.scene;
        console.log("[Door Models] Card reader loaded successfully");
        
        // Verify all models loaded correctly
        if (!this.doorModels.doorFrame || !this.doorModels.doorPivot) {
            throw new Error("Required door models failed to load");
        }
        
        console.log("[Door Models] All door models loaded successfully");
        return true;
    } catch (error) {
        console.error("[Door Models] Critical error loading door models:", error);
        console.error("[Door Models] Stack trace:", error.stack);
        // Don't throw here - let the application continue with fallback behavior
        return false;
    }
  }

  /**
   * Set up the initial environment
   * @private
   */
  async setupEnvironment() {
    console.log("Setting up Severance environment...");

    // Remove default background and fog, will use a skybox instead
    // this.scene.background = new THREE.Color(0xffffff);
    // this.scene.fog = new THREE.Fog(0xffffff, 20, 40);

    // Initialize materials first
    await this.materialSystem.initialize();

    // Set initial camera position to start at the elevator entrance
    // Position further into the hallway to avoid any walls
    // this.camera.position.set(
    //   0,
    //   this.options.cameraHeight,
    //   SEGMENT_LENGTH * 1.5
    // );
    this.camera.rotation.set(0, Math.PI, 0); // Looking toward the end of the corridor (-Z direction)

    
    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    this.scene.add(ambientLight);
    this.assets.lights.set("ambient", ambientLight);

    // Set up lighting with shader-based fluorescent lights
    await this.setupLighting();

    // Update all materials with environment map if needed
    if (this.environmentMap) {
      this.materialSystem.updateEnvironmentMap(this.environmentMap);
    }

    // Remove global floor plane - the skybox bottom will serve as the ground
    // {
    //   const floorGeometry = new THREE.PlaneGeometry(200, 200);
    //   let floorMaterial = this.materialSystem.getMaterial("outsideGround");
    //   if (this.isPlayerOutdoors && typeof this.isPlayerOutdoors === 'function' && !this.isPlayerOutdoors()) {
    //     floorMaterial = this.materialSystem.getMaterial("floor");
    //   }
    //   this.globalFloor = new THREE.Mesh(floorGeometry, floorMaterial);
    //   this.globalFloor.rotation.x = -Math.PI / 2;
    //   this.globalFloor.receiveShadow = true;
    //   this.scene.add(this.globalFloor);
    // }

    // Build the corridor layout using the improved method that handles all 
    // corridor systems and connections properly
    await this.buildNewCorridorLayout();
    
    // Create a skysphere using the sky material (distinct from ground)
    const skyMaterial = this.materialSystem.getMaterial("sky");
    if (skyMaterial) {
        const sphereRadius = 250; // Large radius
        const sphereGeometry = new THREE.SphereGeometry(sphereRadius, 60, 40);
        // Flip geometry normals to face inward
        sphereGeometry.scale(-1, 1, 1);

        const sphereMaterial = skyMaterial.clone(); // Clone to avoid side effects
        sphereMaterial.side = THREE.DoubleSide; // Use DoubleSide for inverted sphere
        sphereMaterial.needsUpdate = true;

        const skysphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
        // Position sphere centered around the origin (or player start)
        skysphere.position.set(0, 0, 0);
        this.scene.add(skysphere);
        console.log("Added skysphere using distinct sky material.");
    } else {
        console.warn("Sky material not found for skysphere, using fallback color background.");
        this.scene.background = new THREE.Color(0x808080); // Fallback gray
    }

    // Add a large ground plane at y=0 using the outsideGround material
    const groundMaterial = this.materialSystem.getMaterial("outsideGround");
    if (groundMaterial) {
        const groundSize = 400; // Large enough to cover visible area
        const groundGeometry = new THREE.PlaneGeometry(groundSize, groundSize);
        const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
        groundMesh.rotation.x = -Math.PI / 2; // Make it horizontal
        groundMesh.position.y = 0; // Place at ground level
        groundMesh.receiveShadow = true;
        this.scene.add(groundMesh);
        this.globalFloor = groundMesh;
        this.globalFloor.visible = false; // Start hidden, will be toggled in update
        console.log("Added distinct outside ground plane.");
    } else {
        console.warn("Outside ground material not found, ground plane not added.");
    }

    console.log("Environment setup complete");
  }

  /**
   * Initialize the rendering materials with custom shaders for the Severance aesthetic
   * @private
   */
  async initializeMaterials() {
    // Get the custom wall material from the material system instead of creating a new one
    try {
      this.wallMaterial = this.materialSystem.getMaterial("wall");
      console.log(
        "Successfully got wall material from material system:",
        this.wallMaterial.type
      );
    } catch (error) {
      console.warn(
        "Could not get 'wall' material from material system, creating fallback",
        error
      );

      // Fallback implementation - this shouldn't normally happen
      try {
        this.wallMaterial = new THREE.ShaderMaterial({
          uniforms: {
            wallColor: { value: new THREE.Color(0x888888) }, // Mid-grey for concrete base
            wallRoughness: { value: 0.8 }, // Higher roughness for concrete
            time: { value: 0.0 },
          },
          // Use material system to load vertex shader instead of inline definition
          // This ensures we're following the project organization guidelines
          vertexShader: await this.materialSystem._loadShaderFile(
            getAssetPath("./src/shaders/common/vertex.txt")
          ),
          fragmentShader: await this.materialSystem._loadShaderFile(
            getAssetPath("./src/shaders/wall.txt")
          ),
          side: THREE.DoubleSide,
        });

        console.log("Created fallback ShaderMaterial for walls");
      } catch (shaderError) {
        console.error(
          "Failed to create shader material fallback, using basic material",
          shaderError
        );

        // Ultra fallback - basic material if all else fails
        this.wallMaterial = new THREE.MeshStandardMaterial({
          color: 0xffffff,
          roughness: 0.75,
          side: THREE.DoubleSide,
        });

        console.log("Created basic MeshStandardMaterial for walls");
      }
    }

    // Make sure the wall material's side is set correctly
    if (this.wallMaterial) {
      this.wallMaterial.side = THREE.DoubleSide;
    }

    // Initialize corridor lighting shader material - using Severance's clinical lighting
    // Get lighting material from material system if available
    try {
      this.corridorLightingMaterial = this.materialSystem.getMaterial("light");
      console.log("Successfully got light material from material system");
    } catch (error) {
      console.warn(
        "Could not get 'light' shader material, creating fallback",
        error
      );

      try {
        this.corridorLightingMaterial = new THREE.ShaderMaterial({
          uniforms: {
            lightColor: { value: new THREE.Color(0xf0f7ff) }, // Subtle cool light
            intensity: { value: 0.8 }, // Brighter intensity for clinical look
            time: { value: 0.0 },
          },
          // Use material system to load vertex shader instead of inline definition
          vertexShader: await this.materialSystem._loadShaderFile(
            getAssetPath("./src/shaders/common/vertex.txt")
          ),
          fragmentShader: await this.materialSystem._loadShaderFile(
            getAssetPath("./src/shaders/corridor.txt")
          ),
          transparent: true,
          blending: THREE.AdditiveBlending,
        });

        console.log("Created fallback ShaderMaterial for corridor lighting");
      } catch (shaderError) {
        console.error(
          "Failed to create shader material for lighting, using basic material",
          shaderError
        );

        // Ultra fallback for lighting
        this.corridorLightingMaterial = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.2,
          blending: THREE.AdditiveBlending,
        });

        console.log("Created basic MeshBasicMaterial for corridor lighting");
      }
    }
  }

  /**
   * Creates a corridor network based on the Severance show layout
   * @private
   */
  createCorridorNetwork() {
    if (!this.corridorSegments || !this.scene) {
      console.error('Required properties not initialized');
      return;
    }

    // Clean up any old corridor or junction meshes
    this.corridorSegments.clear();
    if (this.scene.userData.junctionPositions) {
      this.scene.userData.junctionPositions.length = 0;
    }
    
    // Remove existing corridor elements
    const toRemove = [];
    this.scene.traverse((child) => {
      if (child.name && (child.name.startsWith('junction_') || child.name.startsWith('corridor_'))) {
        toRemove.push(child);
      }
    });
    toRemove.forEach(child => this.scene.remove(child));

    console.log("Creating Severance corridor network from CORRIDOR_MAP...");

    // Only allow main corridor nodes
    const mainCorridorNodeIds = new Set(['ELV', 'C1', 'C2', 'C3', 'C4', 'C5']);

    // Generate junctions for main corridor only
    for (const node of CORRIDOR_MAP.nodes) {
      if (!mainCorridorNodeIds.has(node.id)) {
        continue;
      }
      const worldX = node.pos[0] * SEGMENT_LENGTH;
      const worldZ = -node.pos[1] * SEGMENT_LENGTH;
      const position = new THREE.Vector3(worldX, 0, worldZ);
      this.createCorridorJunction(position, `junction_${node.id}`);
    }

    // Generate corridor segments for main corridor only
    for (const edge of CORRIDOR_MAP.edges) {
      if (!mainCorridorNodeIds.has(edge.from) || !mainCorridorNodeIds.has(edge.to)) {
        continue;
      }
      const fromNode = CORRIDOR_MAP.nodes.find((n) => n.id === edge.from);
      const toNode = CORRIDOR_MAP.nodes.find((n) => n.id === edge.to);
      if (!fromNode || !toNode) continue;
      const start = new THREE.Vector3(
        fromNode.pos[0] * SEGMENT_LENGTH,
        0,
        -fromNode.pos[1] * SEGMENT_LENGTH
      );
      const end = new THREE.Vector3(
        toNode.pos[0] * SEGMENT_LENGTH,
        0,
        -toNode.pos[1] * SEGMENT_LENGTH
      );
      const segmentId = `${edge.from}_${edge.to}`;
      this.createCorridorSegment(start, end, segmentId);
    }
  }

  /**
   * Adds a mesh to the list of collidable walls.
   * @param {THREE.Mesh} mesh The wall mesh to add.
   * @private
   */
  _addCollidableWall(mesh) {
    if (mesh instanceof THREE.Mesh) {
        this.wallMeshes.push(mesh);
        // Detailed logging for added walls
        const wallName = mesh.name || 'Unnamed Wall';
        const worldPos = new THREE.Vector3();
        mesh.getWorldPosition(worldPos);
        console.log(`[Env Collision] Added collidable wall: ${wallName} at world pos (${worldPos.x.toFixed(2)}, ${worldPos.y.toFixed(2)}, ${worldPos.z.toFixed(2)})`);
    } else {
        console.warn("Attempted to add non-Mesh object to collidable walls:", mesh);
    }
  }


  /**
   * Creates the floor for a corridor segment.
   * @param {number} length Length of the segment.
   * @param {THREE.Material} floorMaterial Material for the floor.
   * @returns {THREE.Mesh} The floor mesh.
   * @private
   */
  _createSegmentFloor(length, floorMaterial) {
    const floorGeometry = new THREE.PlaneGeometry(CORRIDOR_WIDTH, length);
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0; // Floor level
    // floor.position.z = length / 2; // Position set in createCorridorSegment
    return floor;
  }

  /**
   * Creates the ceiling for a corridor segment.
   * @param {number} length Length of the segment.
   * @param {THREE.Material} ceilingMaterial Material for the ceiling.
   * @returns {THREE.Mesh} The ceiling mesh.
   * @private
   */
  _createSegmentCeiling(length, ceilingMaterial) {
    const ceilingGeometry = new THREE.PlaneGeometry(CORRIDOR_WIDTH, length);
    const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = CORRIDOR_HEIGHT; // Position at ceiling height
    // ceiling.position.z = length / 2; // Position set in createCorridorSegment
    return ceiling;
  }

  /**
   * Creates the walls for a corridor segment.
   * @param {number} length Length of the segment geometry.
   * @param {THREE.Material} wallMaterial Material for the walls.
   * @param {THREE.Group} segmentGroup The group to add walls to.
   * @param {number} centerZ The adjusted center Z position for the geometry.
   * @private
   */
  _createSegmentWalls(length, wallMaterial, segmentGroup, centerZ) {
    const wallThickness = 0.1;
    const wallGeometry = new THREE.BoxGeometry(length, CORRIDOR_HEIGHT, wallThickness);

    // Use Tim Rodenbröker-inspired corridor wall material
    const segmentWallMaterial = this.materialSystem.getMaterial('corridorWall').clone();

    // Check for doorways near this segment
    const doorways = this.getDoorwaysForSegment(segmentGroup.position, length, segmentGroup); // Pass segmentGroup

    // Create left wall segments (with gaps for doors)
    this.createWallWithDoorways(
      -CORRIDOR_WIDTH / 2 - wallThickness / 2,
      centerZ,
      length,
      wallGeometry,
      segmentWallMaterial,
      segmentGroup,
      doorways.left,
      Math.PI / 2
    );

    // Create right wall segments (with gaps for doors)
    this.createWallWithDoorways(
      CORRIDOR_WIDTH / 2 + wallThickness / 2,
      centerZ,
      length,
      wallGeometry,
      segmentWallMaterial,
      segmentGroup,
      doorways.right,
      -Math.PI / 2
    );
  }

  // New helper method to create wall segments with doorways
  createWallWithDoorways(xPos, zPos, length, wallGeometry, material, parentGroup, doorways, rotation) {
    if (!doorways || doorways.length === 0) {
      // No doorways, create single wall
      const wall = new THREE.Mesh(
        wallGeometry,
        material
      );
      wall.position.set(xPos, CORRIDOR_HEIGHT / 2, zPos);
      wall.rotation.y = rotation;
      parentGroup.add(wall);
      this._addCollidableWall(wall);
      // Set wallScale and add to tunnelWallMeshes for uniform updates
      if (wall.material.uniforms && wall.material.uniforms.wallScale) {
        wall.material.uniforms.wallScale.value.set(wallGeometry.parameters.width, wallGeometry.parameters.height);
      }
      this.tunnelWallMeshes.push(wall);
      return;
    }

    console.log(`Creating wall with ${doorways.length} doorways at x:${xPos.toFixed(2)}, z:${zPos.toFixed(2)}, rotation:${rotation.toFixed(2)}`);

    // Sort doorways by position
    doorways.sort((a, b) => a.position.z - b.position.z);

    // Add small gap buffer to prevent z-fighting and tiny wall segments
    const minSegmentSize = 0.2;
    let currentZ = -length / 2;

    // Create wall segments between doorways
    doorways.forEach((doorway, index) => {
      const doorStart = doorway.position.z - doorway.width / 2;
      const doorEnd = doorway.position.z + doorway.width / 2;

      console.log(`Door ${index} spans local z: ${doorStart.toFixed(2)} to ${doorEnd.toFixed(2)}`);

      // Create wall segment before door if needed and if segment would be large enough
      if (doorStart > currentZ + minSegmentSize) {
        const segmentLength = doorStart - currentZ;
        const wallGeom = new THREE.BoxGeometry(segmentLength, CORRIDOR_HEIGHT, 0.1);
        const wallSegment = new THREE.Mesh(wallGeom, material);
        
        // Position the wall segment correctly
        wallSegment.position.set(
          xPos,
          CORRIDOR_HEIGHT / 2,
          currentZ + segmentLength / 2
        );
        wallSegment.rotation.y = rotation;
        
        parentGroup.add(wallSegment);
        this._addCollidableWall(wallSegment);
        console.log(`Created wall segment before door ${index}, length: ${segmentLength.toFixed(2)}`);
        // Set wallScale and add to tunnelWallMeshes for uniform updates
        if (wallSegment.material.uniforms && wallSegment.material.uniforms.wallScale) {
          wallSegment.material.uniforms.wallScale.value.set(segmentLength, CORRIDOR_HEIGHT);
        }
        this.tunnelWallMeshes.push(wallSegment);
      } else {
        console.log(`Skipping small wall segment before door ${index}, would be ${(doorStart - currentZ).toFixed(2)} units`);
      }

      currentZ = doorEnd;
    });

    // Create final wall segment after last door if needed
    if (currentZ < length / 2 - minSegmentSize) {
      const segmentLength = length / 2 - currentZ;
      const wallGeom = new THREE.BoxGeometry(segmentLength, CORRIDOR_HEIGHT, 0.1);
      const wallSegment = new THREE.Mesh(wallGeom, material);
      wallSegment.position.set(
        xPos,
        CORRIDOR_HEIGHT / 2,
        currentZ + segmentLength / 2
      );
      wallSegment.rotation.y = rotation;
      parentGroup.add(wallSegment);
      this._addCollidableWall(wallSegment);
      console.log(`Created final wall segment, length: ${segmentLength.toFixed(2)}`);
      // Set wallScale and add to tunnelWallMeshes for uniform updates
      if (wallSegment.material.uniforms && wallSegment.material.uniforms.wallScale) {
        wallSegment.material.uniforms.wallScale.value.set(segmentLength, CORRIDOR_HEIGHT);
      }
      this.tunnelWallMeshes.push(wallSegment);
    } else {
      console.log(`Skipping small final wall segment, would be ${(length/2 - currentZ).toFixed(2)} units`);
    }
  }

  // New helper method to find doorways for a corridor segment
  getDoorwaysForSegment(segmentPosition, length, segmentGroup) {
    const doorways = {
      left: [],
      right: []
    };

    // Check all doors
    for (const [name, doorState] of this.doorStates) {
      const doorInfo = window.doorLocations.find(d => d.name === name);
      if (!doorInfo) continue;

      // Calculate door position relative to segment
      // --- Transform world door position to segment's local space ---
      const localDoorPos = new THREE.Vector3();
      segmentGroup.worldToLocal(localDoorPos.copy(doorInfo.position)); // Use segmentGroup passed to _createSegmentWalls
      
      // Extended doorway check - ensure we're within segment length
      const halfLength = length / 2;
      if (Math.abs(localDoorPos.z) > halfLength) {
        // Door is outside this segment's Z range
        continue;
      }

      // Check if door is near this wall segment
      const doorwayWidth = DOORWAY_WIDTH; // Increased from 1.5 for wider doorways
      const doorwayInfo = {
        position: localDoorPos, // Use local position for Z calculation
        width: doorwayWidth
      };

      // Increased detection threshold for wall alignment
      const detectionThreshold = 1.2; // Increased further from 0.8

      // Determine which wall this door belongs to based on LOCAL X
      if (Math.abs(localDoorPos.x - CORRIDOR_WIDTH/2) < detectionThreshold) {
        doorways.right.push(doorwayInfo);
        console.log(`Doorway detected for segment ${segmentGroup.name || 'unnamed'}: ${name} on RIGHT wall at local Z: ${localDoorPos.z.toFixed(2)}`);
      } else if (Math.abs(localDoorPos.x + CORRIDOR_WIDTH/2) < detectionThreshold) {
        doorways.left.push(doorwayInfo);
        console.log(`Doorway detected for segment ${segmentGroup.name || 'unnamed'}: ${name} on LEFT wall at local Z: ${localDoorPos.z.toFixed(2)}`);
      }
    }

    console.log(`Segment ${segmentGroup.name || 'unnamed'} has ${doorways.left.length} left doorways and ${doorways.right.length} right doorways`);
    return doorways;
  }

  /**
   * Creates the baseboard trim for a corridor segment.
   * @param {number} length Length of the segment geometry.
   * @param {THREE.Material} trimMaterial Material for the trim.
   * @param {THREE.Group} segmentGroup The group to add trim to.
   * @param {number} centerZ The adjusted center Z position for the geometry.
   * @private
   */
  _createSegmentTrim(length, trimMaterial, segmentGroup, centerZ) {
    const trimHeight = CORRIDOR_TRIM_HEIGHT;
    const trimDepth = 0.05; // Small depth for the trim
    // Geometry length matches the effective segment length
    const baseboardGeometry = new THREE.BoxGeometry(length, trimHeight, trimDepth);

    // Left baseboard
    const leftBaseboard = new THREE.Mesh(baseboardGeometry, trimMaterial);
    leftBaseboard.position.set(
      -CORRIDOR_WIDTH / 2 + trimDepth / 2, // Offset slightly inward
      trimHeight / 2, // Position at floor level
      centerZ // Use adjusted center Z
    );
    leftBaseboard.rotation.y = Math.PI / 2; // Align with wall
    segmentGroup.add(leftBaseboard);

    // Right baseboard
    const rightBaseboard = new THREE.Mesh(baseboardGeometry, trimMaterial);
    rightBaseboard.position.set(
      CORRIDOR_WIDTH / 2 - trimDepth / 2, // Offset slightly inward
      trimHeight / 2,
      centerZ // Use adjusted center Z
    );
    rightBaseboard.rotation.y = -Math.PI / 2; // Align with wall
    segmentGroup.add(rightBaseboard);
  }

  /**
   * Creates a corridor segment between two points
   * @param {THREE.Vector3} start Start position
   * @param {THREE.Vector3} end End position
   * @param {string} id Segment identifier
   * @private
   */
  createCorridorSegment(start, end, id) {
    console.log(`Creating corridor segment ${id}`);

    // Create container for the segment
    const segment = new THREE.Group();
    segment.name = `corridor_${id}`;

    // Store start and end points in userData for corridor connectivity
    segment.userData = {
      startPoint: start.clone(),
      endPoint: end.clone(),
      id: id,
    };

    // Calculate segment length and direction
    const direction = new THREE.Vector3().subVectors(end, start);
    const length = direction.length();
    direction.normalize();

    // Calculate segment orientation
    const horizontalDir = new THREE.Vector3(
      direction.x,
      0,
      direction.z
    ).normalize();
    const quaternion = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      horizontalDir
    );

    // Apply rotation to the segment
    segment.quaternion.copy(quaternion);
    segment.position.copy(start);

    // --- Geometry Adjustment for Junctions ---
    const junctionOffset = CORRIDOR_WIDTH / 2; // Reduced from CORRIDOR_WIDTH/1.5 to align with junction size
    const isStartJunction = this._isNearJunction(start);
    const isEndJunction = this._isNearJunction(end);

    let adjustedStart = 0;
    let adjustedEnd = 0;

    if (isStartJunction) {
        adjustedStart = junctionOffset;
        console.log(`Segment ${id}: Adjusting start by ${adjustedStart} units (junction detected)`);
    }
    if (isEndJunction) {
        adjustedEnd = junctionOffset;
        console.log(`Segment ${id}: Adjusting end by ${adjustedEnd} units (junction detected)`);
    }

    const effectiveLength = length - adjustedStart - adjustedEnd;
    // Calculate the Z position for the center of the *shortened* geometry
    // It starts at adjustedStart and extends for effectiveLength
    const geometryCenterZ = adjustedStart + effectiveLength / 2;

    // Ensure effectiveLength is positive before creating geometry
    if (effectiveLength <= 0) {
        console.warn(`Segment ${id} has zero or negative effective length after junction adjustment. Skipping geometry.`);
        // Add segment to scene and store reference (even if empty, for consistency)
        this.scene.add(segment);
        this.corridorSegments.set(id, segment);
        return segment; // Return early
    }

    // Get materials from the system
    const wallMaterial = this.materialSystem.getMaterial("wall");
    const floorMaterial = this.materialSystem.getMaterial("floor"); // Always use corridor floor
    const ceilingMaterial = this.materialSystem.getMaterial("ceiling");
    const trimMaterial = this.materialSystem.getMaterial("trim");

    // Create and add components using helper methods, passing adjusted values
    const floor = this._createSegmentFloor(effectiveLength, floorMaterial);
    floor.position.z = geometryCenterZ; // Adjust position
    segment.add(floor);

    const ceiling = this._createSegmentCeiling(effectiveLength, ceilingMaterial);
    ceiling.position.z = geometryCenterZ; // Adjust position
    segment.add(ceiling);
    // Record corridor ceiling for indoors detection
    this.ceilingMeshes.push(ceiling);

    // Skip walls for key corridor segments we've unblocked:
    // - C5 -> C6 (starting main corridor)
    // - C6 -> C7 (main corridor beyond C6)
    // - C6 -> Perpetuity (MP)
    // - C6 -> Security wing and C6 -> Testing wing (crossing corridor)
    const skipWallSegmentIds = new Set([
      'C5_C6', 'C6_C7', 'C6_PERP1',
      'C6_J_SEC', 'C6_J_TEST',
      'J_SEC_SEC1', 'J_TEST_TEST1'
    ]);
    if (!skipWallSegmentIds.has(id)) {
      this._createSegmentWalls(effectiveLength, wallMaterial, segment, geometryCenterZ);
    }
    this._createSegmentTrim(effectiveLength, trimMaterial, segment, geometryCenterZ);

    // Add segment to scene and store reference
    this.scene.add(segment);
    this.corridorSegments.set(id, segment);

    return segment;
  }

  /**
   * Checks if a given position is close to any known junction point.
   * @param {THREE.Vector3} position The position to check.
   * @param {number} threshold Optional distance squared threshold.
   * @returns {boolean} True if the position is near a junction, false otherwise.
   * @private
   */
  _isNearJunction(position, threshold = 1.0) { // Increased from 0.1 to 1.0 for better junction detection
    if (!this.scene.userData.junctionPositions) {
      return false;
    }
    for (const junctionPos of this.scene.userData.junctionPositions) {
      if (position.distanceToSquared(junctionPos) < threshold) {
        return true;
      }
    }
    return false;
  }

  /**
   * Creates the floor for a corridor junction.
   * @param {number} junctionSize Size of the junction area.
   * @param {THREE.Material} floorMaterial Material for the floor.
   * @returns {THREE.Mesh} The floor mesh.
   * @private
   */
   _createJunctionFloor(junctionSize, floorMaterial) {
    const floorGeometry = new THREE.PlaneGeometry(junctionSize, junctionSize);
    // Always use corridor floor for junctions
    const mat = this.materialSystem.getMaterial("floor");
    const floor = new THREE.Mesh(floorGeometry, mat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0.01; // Slight offset to prevent z-fighting
    return floor;
   }

   /**
    * Creates the ceiling for a corridor junction.
    * @param {number} junctionSize Size of the junction area.
    * @param {THREE.Material} ceilingMaterial Material for the ceiling.
    * @returns {THREE.Mesh} The ceiling mesh.
    * @private
    */
   _createJunctionCeiling(junctionSize, ceilingMaterial) {
    const ceilingGeometry = new THREE.PlaneGeometry(junctionSize, junctionSize);
    const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = CORRIDOR_HEIGHT;
    return ceiling;
   }

   /**
    * Creates the ceiling light fixture for a corridor junction.
    * @param {number} junctionSize Size of the junction area.
    * @param {THREE.Material} lightMaterial Material for the light fixture.
    * @returns {THREE.Mesh} The light fixture mesh.
    * @private
    */
   _createJunctionLightFixture(junctionSize, lightMaterial) {
    const lightGeometry = new THREE.CircleGeometry(junctionSize / 4, 16);
    const lightFixture = new THREE.Mesh(lightGeometry, lightMaterial);
    lightFixture.rotation.x = Math.PI / 2;
    lightFixture.position.y = CORRIDOR_HEIGHT - 0.05;
    return lightFixture;
   }

   /**
    * Creates the floor marking for a corridor junction.
    * @param {string} id Identifier for the junction (used to generate text).
    * @returns {THREE.Mesh} The floor marking mesh.
    * @private
    */
   _createJunctionMarking(id) {
    // Extract the node ID and add a prefix based on type
    const nodeId = id.split("_")[1];
    let markingText = nodeId;
    
    // Add prefixes based on junction type
    if (nodeId.startsWith('C')) {
        markingText = 'MC' + nodeId.substring(1); // Main Corridor
    } else if (nodeId.startsWith('J_')) {
        markingText = 'JC' + nodeId.substring(2); // Junction Connector
    } else if (nodeId === 'ELV') {
        markingText = 'EL1'; // Elevator
    } else {
        markingText = 'RM' + nodeId.substring(0, 2); // Room/Area
    }
    
    const markingPosition = new THREE.Vector3(0, 0.01, 0);
    const markingScale = 0.4;
    return this.createFloorMarking(markingText, markingPosition, markingScale);
  }

  /**
   * Creates a corridor junction/intersection for visual interest at corridor connections
   * @param {THREE.Vector3} position Position of the junction
   * @param {string} id Identifier for the junction
   * @private
   */
  createCorridorJunction(position, id) {
    console.log(`Creating corridor junction ${id}`);

    const junction = new THREE.Group();
    junction.name = `junction_${id}`;
    junction.position.copy(position);

    // Store junction data for corridor connection checks
    junction.userData = {
      id: id,
      position: position.clone(),
      isJunction: true,
      radius: CORRIDOR_WIDTH * 1.8,
    };

    // Create a larger floor area for the junction
    const junctionSize = CORRIDOR_WIDTH * 1.0;
    const floorMaterial = this.materialSystem.getMaterial("floor");
    const ceilingMaterial = this.materialSystem.getMaterial("ceiling");
    const lightMaterial = this.materialSystem.getMaterial("light");

    // Create and add components using helper methods
    const floor = this._createJunctionFloor(junctionSize, floorMaterial);
    junction.add(floor);

    const ceiling = this._createJunctionCeiling(junctionSize, ceilingMaterial);
    junction.add(ceiling);
    // Record junction ceiling for indoors detection
    this.ceilingMeshes.push(ceiling);

    const lightFixture = this._createJunctionLightFixture(junctionSize, lightMaterial);
    junction.add(lightFixture);

    // --- IMPROVED: Junction Wall System ---
    const junctionWallMaterial = this.materialSystem.getMaterial('corridorWall').clone();
    if (junctionWallMaterial.uniforms && junctionWallMaterial.uniforms.wallColor) {
      junctionWallMaterial.uniforms.wallColor.value = new THREE.Color(0xffffff);
      junctionWallMaterial.needsUpdate = true;
    } else if (junctionWallMaterial.color) {
      junctionWallMaterial.color.setHex(0xffffff);
    }

    const wallThickness = 0.1;
    const wallHeight = CORRIDOR_HEIGHT;
    const halfSize = junctionSize / 2;
    
    // Determine which directions have corridor or room connections
    const nodeId = id.split("_")[1];
    const connections = {
      north: false,
      south: false,
      east: false,
      west: false
    };
    
    for (const edge of CORRIDOR_MAP.edges) {
      if (edge.from === nodeId || edge.to === nodeId) {
        const otherNodeId = edge.from === nodeId ? edge.to : edge.from;
        const otherNode = CORRIDOR_MAP.nodes.find(n => n.id === otherNodeId);
        const thisNode = CORRIDOR_MAP.nodes.find(n => n.id === nodeId);
        if (otherNode && thisNode) {
          const dx = otherNode.pos[0] - thisNode.pos[0];
          const dz = otherNode.pos[1] - thisNode.pos[1];
          if (Math.abs(dx) > Math.abs(dz)) {
            if (dx > 0) connections.east = true;
            else connections.west = true;
          } else {
            if (dz > 0) connections.south = true;
            else connections.north = true;
          }
        }
      }
    }
    
    // Also check for direct room connections (room nodes adjacent to this junction)
    const roomNodeIds = new Set(['MDR1', 'OD1', 'WELL1', 'BREAK1']);
    for (const roomNodeId of roomNodeIds) {
      const roomNode = CORRIDOR_MAP.nodes.find(n => n.id === roomNodeId);
      const thisNode = CORRIDOR_MAP.nodes.find(n => n.id === nodeId);
      if (roomNode && thisNode) {
        const dx = roomNode.pos[0] - thisNode.pos[0];
        const dz = roomNode.pos[1] - thisNode.pos[1];
        if (Math.abs(dx) > Math.abs(dz)) {
          if (dx > 0) connections.east = true;
          else if (dx < 0) connections.west = true;
        } else {
          if (dz > 0) connections.south = true;
          else if (dz < 0) connections.north = true;
        }
      }
    }

    console.log(`Junction ${nodeId} connections (corridor/room):`, connections);
    
    const wallLength = junctionSize;

    // Helper to create a full side wall
    const createSideWall = (posX, posZ, rotationY, dirName) => {
        const geom = new THREE.BoxGeometry(wallLength, wallHeight, wallThickness);
        const wall = new THREE.Mesh(geom, junctionWallMaterial.clone());
        wall.position.set(posX, wallHeight / 2, posZ);
        wall.rotation.y = rotationY;
        junction.add(wall);
        this._addCollidableWall(wall);
        console.log(`Created wall for junction ${nodeId} at (${posX.toFixed(2)}, ${posZ.toFixed(2)}), rotation ${rotationY.toFixed(2)} [${dirName}]`);
    };

    // Only add walls where there is truly no corridor or room connection
    if (!connections.north) {
        // Special case: open MC5 (C5) to outside by skipping north wall
        if (nodeId === "C5") {
            console.log("Skipping north wall for MC5 (C5) to allow exit to outside.");
        } else {
            createSideWall(0, halfSize, Math.PI, 'north'); // North Wall (facing South)
        }
    }
    if (!connections.south) {
        createSideWall(0, -halfSize, 0, 'south');    // South Wall (facing North)
    }
    if (!connections.east) {
        createSideWall(halfSize, 0, -Math.PI / 2, 'east'); // East Wall (facing West)
    }
    if (!connections.west) {
        createSideWall(-halfSize, 0, Math.PI / 2, 'west');  // West Wall (facing East)
    }

    // Store junction position for corridor connectivity
    if (!this.scene.userData.junctionPositions) {
      this.scene.userData.junctionPositions = [];
    }
    this.scene.userData.junctionPositions.push(position.clone());

    this.scene.add(junction);
    return junction;
  }

  /**
   * Creates an elevator vestibule at the entrance of the corridor network
   * @param {THREE.Vector3} position Position of the elevator vestibule
   * @private
   */
  createElevatorVestibule(position) {
    console.log("Creating Elevator Vestibule at:", position);

    const vestibule = new THREE.Group();
    vestibule.name = "elevator_vestibule";
    vestibule.position.copy(position);

    const hallWidth = CORRIDOR_WIDTH * 1.5; // Make the hall slightly wider than corridor
    const hallDepth = SEGMENT_LENGTH * 0.5; // Depth of the hall area
    const hallHeight = CORRIDOR_HEIGHT;

    // --- Create Hall Geometry ---
    let wallMaterial = this.materialSystem.getMaterial('corridorWall').clone();
    const wallThickness = 0.1; // Define wall thickness
    // Clone, ensure DoubleSide, and force color via NEW uniform value if possible
    wallMaterial = wallMaterial.clone();
    if (wallMaterial.uniforms && wallMaterial.uniforms.wallColor) {
      wallMaterial.uniforms.wallColor.value = new THREE.Color(0xffffff);
      wallMaterial.needsUpdate = true;
    } else if (wallMaterial.color) {
      wallMaterial.color.setHex(0xffffff);
    }

    // Back Wall (opposite elevator)
    const backWallGeometry = new THREE.BoxGeometry(hallWidth, hallHeight, wallThickness);
    const backWall = new THREE.Mesh(backWallGeometry, wallMaterial);
    backWall.position.y = hallHeight / 2;
    backWall.position.z = -hallDepth - wallThickness / 2; // Position at the back of the vestibule
    vestibule.add(backWall);
    this._addCollidableWall(backWall); // Add vestibule back wall

    // Add baseboard trim
    const trimGeometry = new THREE.BoxGeometry(
        hallWidth, // Use hallWidth
        CORRIDOR_TRIM_HEIGHT,
        0.05
    );
    const trimMaterial = this.materialSystem.getMaterial("trim");

    const trim = new THREE.Mesh(trimGeometry, trimMaterial);
    trim.position.set(0, CORRIDOR_TRIM_HEIGHT / 2, -0.025);

    // Add ceiling light
    const lightGeometry = new THREE.PlaneGeometry(hallWidth * 0.5, 0.4);
    const lightMaterial = this.materialSystem.getMaterial("light");

    const light = new THREE.Mesh(lightGeometry, lightMaterial);
    light.position.set(0, hallHeight - 0.05, -hallDepth / 2);
    light.rotation.x = Math.PI / 2;
    vestibule.add(light);

    // Add ceiling
    const ceilingGeometry = new THREE.PlaneGeometry(hallWidth, hallDepth);
    const ceilingMaterial = this.materialSystem.getMaterial("ceiling");
    const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(0, hallHeight, -hallDepth / 2);
    vestibule.add(ceiling);
    
    // Add ceiling to ceilingMeshes for indoor detection
    this.ceilingMeshes.push(ceiling);

    // Create side walls using BoxGeometry
    const sideWallGeometry = new THREE.BoxGeometry(hallDepth, hallHeight, wallThickness);
    // Left vestibule wall
    const leftWall = new THREE.Mesh(sideWallGeometry, wallMaterial);
    leftWall.position.x = -hallWidth / 2 - wallThickness / 2;
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.y = hallHeight / 2;
    leftWall.position.z = -hallDepth / 2;
    vestibule.add(leftWall);
    this._addCollidableWall(leftWall);
    // Right vestibule wall
    const rightWall = new THREE.Mesh(sideWallGeometry, wallMaterial);
    rightWall.position.x = hallWidth / 2 + wallThickness / 2;
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.position.y = hallHeight / 2;
    rightWall.position.z = -hallDepth / 2;
    vestibule.add(rightWall);
    this._addCollidableWall(rightWall);

    this.scene.add(vestibule);
    return vestibule;
  }

  /**
   * Creates a wall-mounted detail (sign, artwork etc.)
   * @param {THREE.Vector3} position Position of the detail
   * @returns {THREE.Group} The wall detail object
   * @private
   */
  createWallMountedDetail(position) {
    const detail = new THREE.Group();
    detail.position.copy(position);

    // Choose detail type randomly - now only 2 options (was 3)
    const detailType = Math.floor(Math.random() * 2);

    if (detailType === 0) {
      // Framed artwork/certificate
      const frameGeometry = new THREE.BoxGeometry(0.5, 0.7, 0.04);
      const frameMaterial = new THREE.MeshStandardMaterial({
        color: 0x222222,
        roughness: 0.5,
        metalness: 0.2,
      });

      const frame = new THREE.Mesh(frameGeometry, frameMaterial);
      detail.add(frame);

      // Add artwork/certificate inside frame
      const artGeometry = new THREE.PlaneGeometry(0.45, 0.65);
      const artMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.9,
        metalness: 0.0,
      });

      const art = new THREE.Mesh(artGeometry, artMaterial);
      art.position.z = 0.021;
      detail.add(art);
    } else {
      // Small sign
      const signGeometry = new THREE.BoxGeometry(0.4, 0.2, 0.02);
      const signMaterial = new THREE.MeshStandardMaterial({
        color: 0xcccccc,
        roughness: 0.3,
        metalness: 0.7,
      });

      const sign = new THREE.Mesh(signGeometry, signMaterial);
      detail.add(sign);
    }

    return detail;
  }

  /**
   * Creates a floor marking (number or text)
   * @param {string|number} text Text or number to display
   * @param {THREE.Vector3} position Position of the marking
   * @param {number} scale Scale of the marking (default: 0.2)
   * @returns {THREE.Mesh} The floor marking mesh
   * @private
   */
  createFloorMarking(text, position, scale = 0.2) {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const context = canvas.getContext("2d");

    // Draw the text on canvas
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.fillStyle = "#333333";
    context.font = "bold 80px Arial";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(text.toString(), canvas.width / 2, canvas.height / 2);

    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);

    // Create marking plane - use MeshLambertMaterial instead of MeshBasicMaterial
    // as it works better for floor markings without needing emissive properties
    const markingGeometry = new THREE.PlaneGeometry(scale, scale);
    const markingMaterial = new THREE.MeshLambertMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
    });

    const marking = new THREE.Mesh(markingGeometry, markingMaterial);
    marking.position.copy(position);
    marking.rotation.x = -Math.PI / 2;

    return marking;
  }

  /**
   * Create a department door with frame and sign (non-blocking)
   * @param {Object} sectionConfig - Configuration for the portfolio section
   * @private
   */
  async createPortfolioSectionDoor(sectionConfig) {
    console.log(`[Door Creation] Creating portfolio section door for ${sectionConfig.name}...`);

    // Check if door models were loaded successfully
    if (!this.doorModels.doorFrame || !this.doorModels.doorPivot) {
        console.error(`[Door Creation] Door models not loaded for ${sectionConfig.name}. Skipping door creation.`);
        return null;
    }

    const doorGroup = new THREE.Group();
    doorGroup.name = `door_${sectionConfig.name}`;
    
    let doorFrameModel, doorPivotModel, cardReaderModel, doorPanelMesh, doorPivotContainer;

    // --- Door Frame --- 
    console.log(`[Door Creation] Using GLB frame model for ${sectionConfig.name}`);
    doorFrameModel = this.doorModels.doorFrame.clone();
    doorFrameModel.position.y = 0; // GLB origin at base
    doorGroup.add(doorFrameModel);
    
    // --- Door Pivot and Panel --- 
    console.log(`[Door Creation] Using GLB pivot/panel model for ${sectionConfig.name}`);
    doorPivotModel = this.doorModels.doorPivot.clone();
    doorPivotContainer = doorPivotModel; // Now doorPivotContainer is properly declared
    
    // Find the actual door panel mesh within the loaded model
    doorPivotModel.traverse(child => {
        if (child.isMesh && !doorPanelMesh) {
            doorPanelMesh = child;
            console.log(`[Door Creation] Found door panel mesh in GLB: ${child.name || 'Unnamed'}`);
        }
    });

    if (!doorPanelMesh) {
        console.error(`[Door Creation] Could not find mesh inside door pivot model for ${sectionConfig.name}!`);
        return null;
    }

    // Apply material to the door panel mesh
    let doorMaterial = this.materialSystem.getMaterial("door").clone();
    doorMaterial.transparent = true;
    doorMaterial.opacity = 1.0;
    doorMaterial.depthWrite = true;
    doorMaterial.side = THREE.DoubleSide;
    
    // Apply interior color tint if specified
    if (doorMaterial instanceof THREE.MeshStandardMaterial && sectionConfig.interiorColor) {
        const baseColor = doorMaterial.color.clone();
        const interiorColor = new THREE.Color(sectionConfig.interiorColor);
        doorMaterial.color.lerp(interiorColor, 0.2);
    }
    
    doorPanelMesh.material = doorMaterial;
    doorPanelMesh.userData.originalMaterial = doorMaterial;
    doorPanelMesh.userData.doorFrame = doorFrameModel;
    
    // --- Hinge Pivot Setup ---
    // Create a new Group to act as the actual pivot point (hinge)
    const hingePivot = new THREE.Group();
    // Position the hinge at the edge of the doorframe (where the physical hinges would be)
    hingePivot.position.x = -DOORWAY_WIDTH / 2; 
    // The door width value for positioning
    const doorWidth = DOORWAY_WIDTH;
    // Position door pivot model so it aligns with the frame while still rotating around the hinge
    doorPivotModel.position.x = doorWidth / 2; 
    // Add the door model container to the hinge
    hingePivot.add(doorPivotModel);
    // --- End Hinge Pivot Setup ---

    // Add the hinge pivot (which now contains the door model) to the main door group
    doorGroup.add(hingePivot); // Changed from doorPivotContainer
    console.log(`[Door Creation] Added HINGE container for ${sectionConfig.name} at local pos:`, hingePivot.position); // Log hinge position
    
    // Initialize door state - PIVOT IS NOW THE HINGE GROUP
    this.doorStates.set(sectionConfig.name, {
        isOpen: false,
        currentAngle: 0,
        targetAngle: 0,
        pivot: hingePivot, // Use the new hinge group as the pivot
        openDirection: this.DOOR_OPEN_DIRECTION
    });
    
    // Link state to the hinge pivot for potential future reference
    hingePivot.userData.doorState = this.doorStates.get(sectionConfig.name); 

    // --- Card Reader --- 
    if (this.doorModels.cardReader) {
        console.log(`[Door Creation] Using GLB card reader model for ${sectionConfig.name}`);
        cardReaderModel = this.doorModels.cardReader.clone();
        cardReaderModel.position.set(DOORWAY_WIDTH/2 + 0.15, 2.5/2, 0.1);
        doorGroup.add(cardReaderModel);
    }

    // Add indicator light
    const indicatorGeometry = new THREE.CircleGeometry(0.02, 8);
    const indicatorMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x00ff00, 
        emissive: 0x00ff00, 
        emissiveIntensity: 0.5, 
        roughness: 0.3, 
        metalness: 0.2 
    });
    const indicator = new THREE.Mesh(indicatorGeometry, indicatorMaterial);
    indicator.position.copy(cardReaderModel ? cardReaderModel.position : new THREE.Vector3(DOORWAY_WIDTH/2 + 0.15, 2.5/2, 0.1));
    indicator.position.y += 0.06;
    indicator.position.z += 0.03;
    doorGroup.add(indicator);

    // --- Sign --- 
    const signGeometry = new THREE.PlaneGeometry(DOORWAY_WIDTH - 0.2, 0.3);
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 128;
    const context = canvas.getContext("2d");
    context.fillStyle = "#000000";
    context.fillRect(0, 0, canvas.width, canvas.height);
    const mainText = sectionConfig.floorMarking || sectionConfig.name.toUpperCase().substring(0, 4);
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.font = "bold 72px Arial";
    context.fillStyle = "#FFFFFF";
    context.fillText(mainText, canvas.width/2, canvas.height/2 - 10);
    context.font = "bold 24px Arial";
    context.fillStyle = "#FFFFFF";
    context.fillText(sectionConfig.description || sectionConfig.name.replace("_", " "), canvas.width/2, canvas.height/2 + 35);
    const textTexture = new THREE.CanvasTexture(canvas);
    textTexture.anisotropy = 1;
    textTexture.needsUpdate = true;
    const signMaterial = new THREE.MeshBasicMaterial({ map: textTexture, transparent: true, side: THREE.DoubleSide });
    const sign = new THREE.Mesh(signGeometry, signMaterial);
    sign.position.y = 2.5 + 0.5;
    sign.position.z = 0.15;
    doorGroup.add(sign);
    const signLight = new THREE.PointLight(0xffffff, 2.0, 1.5);
    signLight.position.copy(sign.position);
    signLight.position.z += 0.2;
    doorGroup.add(signLight);

    // --- Add invisible interaction mesh in the doorway ---
    const interactionGeometry = new THREE.BoxGeometry(DOORWAY_WIDTH, 2.5, 0.3); // Doorway size
    const interactionMaterial = new THREE.MeshBasicMaterial({ visible: false });
    const interactionMesh = new THREE.Mesh(interactionGeometry, interactionMaterial);
    interactionMesh.position.set(0, 2.5/2, 0); // Centered in the doorway
    interactionMesh.userData.doorName = sectionConfig.name;
    interactionMesh.userData.interactable = true;
    interactionMesh.name = sectionConfig.name + '_interaction';
    doorGroup.add(interactionMesh);
    // Store reference for getInteractableObjects
    if (!this._doorInteractionMeshes) this._doorInteractionMeshes = new Map();
    this._doorInteractionMeshes.set(sectionConfig.name, interactionMesh);

    // Set final position and rotation
    doorGroup.position.copy(sectionConfig.position);
    doorGroup.rotation.y = sectionConfig.rotation;
    this.scene.add(doorGroup);

    // Store references
    this.doors.set(sectionConfig.name, {
        doorGroup,
        frame: doorFrameModel,
        doorPanel: doorPanelMesh,
        doorPivot: hingePivot, // Store reference to the hinge pivot
        sign,
        cardReader: cardReaderModel,
        openDirection: this.DOOR_OPEN_DIRECTION,
    });

    // Add interactable object reference
    if (window.doorLocations) {
        doorPanelMesh.userData.interactable = true;
        doorPanelMesh.userData.doorName = sectionConfig.name;
        
        window.doorLocations.push({
            name: sectionConfig.name,
            position: sectionConfig.position.clone(),
            radius: 1.5,
            description: sectionConfig.description || sectionConfig.name.replace("_", " "),
            openDirection: this.DOOR_OPEN_DIRECTION,
            mesh: doorPanelMesh
        });
    }

    console.log(`[Door Creation] Successfully created door for ${sectionConfig.name}`);
    return doorGroup;
  }

  // --- Portfolio Section Configuration ---
  portfolioSectionsConfig = {
      DESIGN: {
        nodeId: "MDR1",
        name: "Interaction_Design",
        description: "UX/UI & Interaction Projects",
        rotation: -Math.PI / 2, // Changed from Math.PI / 2 to face corridor
        size: new THREE.Vector3(12, 4, 12),
        interiorColor: 0x4285f4,
        material: "default",
        floorMarking: "DESIGN",
        interiorType: "DESIGN",
        doorOffset: new THREE.Vector3(0, 0, 0) // Changed from (0,0,-1.5)
      },
      DEV: {
        nodeId: "OD1",
        name: "Development",
        description: "Code & Software Projects",
        rotation: Math.PI / 2,
        size: new THREE.Vector3(15, 4, 10),
        interiorColor: 0x34a853,
        material: "default",
        floorMarking: "CODE",
        interiorType: "DEV",
        doorOffset: new THREE.Vector3(0, 0, 0)
      },
      FILM: {
        nodeId: "WELL1",
        name: "Film_Cinema",
        description: "Filmmaking & Cinematography",
        rotation: -Math.PI / 2, // Keep facing -X (towards corridor)
        size: new THREE.Vector3(10, 4, 15),
        interiorColor: 0xfbbc05,
        material: "default",
        floorMarking: "FILM",
        interiorType: "FILM",
        doorOffset: new THREE.Vector3(-0.5, 0, 0) // Slight offset towards corridor for better connection
      },
      ART: {
        nodeId: "BREAK1",
        name: "Performance_Art",
        description: "Performance Pieces & Documentation",
        rotation: Math.PI / 2,
        size: new THREE.Vector3(10, 4, 10),
        interiorColor: 0xea4335,
        material: "default",
        floorMarking: "ART",
        interiorType: "ART",
        doorOffset: new THREE.Vector3(0, 0, 0) // Match Film_Cinema door position
      },
  };

  /**
   * Calculates the appropriate door position offset from an anchor node.
   * @param {THREE.Vector3} position Anchor node position.
   * @param {number} rotation Intended door rotation.
   * @returns {THREE.Vector3} Calculated door position.
   * @private
   */
  _calculateDoorPosition(position, rotation, config) {
    const doorPosition = position.clone();
    const doorOffsetDistance = CORRIDOR_WIDTH / 2 + 0.1; // Place slightly outside corridor

    // Apply any custom door offset if specified in the config
    if (config && config.doorOffset) {
      doorPosition.add(config.doorOffset);
    }

    // Determine offset based on rotation (simplified logic)
    if (Math.abs(rotation) < 0.1) { // Rotation 0 (Facing +Z)
      doorPosition.z += doorOffsetDistance;
    } else if (Math.abs(rotation - Math.PI) < 0.1) { // Rotation PI (Facing -Z)
      doorPosition.z -= doorOffsetDistance;
    } else if (Math.abs(rotation - Math.PI / 2) < 0.1) { // Rotation PI/2 (Facing +X)
      doorPosition.x += doorOffsetDistance;
    } else if (Math.abs(rotation + Math.PI / 2) < 0.1) { // Rotation -PI/2 (Facing -X)
      doorPosition.x -= doorOffsetDistance;
    }
    return doorPosition;
  }

  /**
   * Helper to get world position from map node ID.
   * @param {string} nodeId The ID of the node in CORRIDOR_MAP.
   * @returns {THREE.Vector3 | null} The world position or null if not found.
   * @private
   */
  _getNodeWorldPosition(nodeId) {
      const node = CORRIDOR_MAP.nodes.find((n) => n.id === nodeId);
      if (!node) {
        console.error(`Node ${nodeId} not found in CORRIDOR_MAP`);
        return null;
      }
      return new THREE.Vector3(
        node.pos[0] * SEGMENT_LENGTH,
        0,
        -node.pos[1] * SEGMENT_LENGTH // Negative Z extends away from elevator
      );
  }


  /**
   * Sets up the portfolio sections, defining their locations and properties.
   * This replaces the old setupDepartments method.
   * @private
   */
  setupPortfolioSections() {
    console.log("Setting up Portfolio Sections...");

    // Create geometry and doors for each section defined in config
    for (const config of Object.values(this.portfolioSectionsConfig)) {
      const anchorPosition = this._getNodeWorldPosition(config.nodeId);
      if (!anchorPosition) {
        console.warn(`Skipping section ${config.name} due to missing node position for ${config.nodeId}.`);
        continue;
      }

      console.log(`Setting up portfolio section: ${config.name} at node ${config.nodeId}`);

      // Define bounds (assuming anchorPosition is the center for now)
      const halfSize = config.size.clone().multiplyScalar(0.5);
      const bounds = new THREE.Box3(
        anchorPosition.clone().sub(halfSize),
        anchorPosition.clone().add(halfSize)
      );
      bounds.min.y = 0;
      bounds.max.y = config.size.y;

      const sectionData = {
        ...config,
        position: anchorPosition,
        bounds: bounds,
      };

      // Add section to map system if available
      const mapSystem = this.systems.get("map");
      if (mapSystem && mapSystem.defineZone) {
        mapSystem.defineZone(sectionData.name, sectionData.bounds, config.interiorColor || '#ffffff');
      }

      // --- Door positioning using junction-based approach for all doors ---
      let doorPosition;
      
      // Get the junction related to this section
      const junctionMapping = {
        "Interaction_Design": "J_MDR",
        "Development": "J_OD",
        "Film_Cinema": "J_WELL",
        "Performance_Art": "J_BREAK"
      };
      
      const junctionNodeId = junctionMapping[config.name];
      if (junctionNodeId) {
        console.log(`[Door Positioning] Calculating ${config.name} door position based on ${junctionNodeId}.`);
        const junctionPosition = this._getNodeWorldPosition(junctionNodeId);
        
        if (junctionPosition) {
          // Position door near the junction, facing the corridor
          doorPosition = junctionPosition.clone();
          
          // Apply appropriate offset based on the door's rotation
          if (Math.abs(config.rotation - Math.PI / 2) < 0.1) { // Facing +X
            doorPosition.x += CORRIDOR_WIDTH / 2;
          } else if (Math.abs(config.rotation + Math.PI / 2) < 0.1) { // Facing -X
            doorPosition.x -= CORRIDOR_WIDTH / 2;
          } else if (Math.abs(config.rotation) < 0.1) { // Facing +Z
            doorPosition.z += CORRIDOR_WIDTH / 2;
          } else if (Math.abs(config.rotation - Math.PI) < 0.1) { // Facing -Z
            doorPosition.z -= CORRIDOR_WIDTH / 2;
          }
          
          console.log(`[Door Positioning] Calculated ${config.name} door position: (${doorPosition.x.toFixed(2)}, ${doorPosition.y.toFixed(2)}, ${doorPosition.z.toFixed(2)}) based on ${junctionNodeId}.`);
          
          // Add a small outward offset for all doors calculated this way
          // This helps prevent clipping with potentially misaligned corridor ends
          const outwardOffset = 0.1; // Offset distance - Using a slightly larger offset for better visibility
          if (Math.abs(config.rotation - Math.PI / 2) < 0.1) { // Facing +X
            doorPosition.x += outwardOffset;
          } else if (Math.abs(config.rotation + Math.PI / 2) < 0.1) { // Facing -X
            doorPosition.x -= outwardOffset;
          } else if (Math.abs(config.rotation) < 0.1) { // Facing +Z
            doorPosition.z += outwardOffset;
          } else if (Math.abs(config.rotation - Math.PI) < 0.1) { // Facing -Z
            doorPosition.z -= outwardOffset;
          }
          console.log(`[Door Positioning] Applied outward offset (${outwardOffset}), new pos: (${doorPosition.x.toFixed(2)}, ${doorPosition.y.toFixed(2)}, ${doorPosition.z.toFixed(2)})`);

        } else {
          console.warn(`[Door Positioning] Could not find junction ${junctionNodeId} for ${config.name} door placement. Falling back.`);
          // Fallback to original calculation if junction not found
          doorPosition = this._calculateDoorPosition(anchorPosition, config.rotation, config);
        }
      } else {
        // Default calculation for doors without junction mapping
        doorPosition = this._calculateDoorPosition(anchorPosition, config.rotation, config);
      }
      // --------------------------------------------------

      this.createPortfolioSectionDoor({ ...sectionData, position: doorPosition });

      // Create interior space
      // Pass the calculated doorPosition to interior creation for wall checking
      this.createPortfolioSectionInteriors(sectionData.name, anchorPosition, sectionData.size, sectionData.interiorType, doorPosition);

      // --- Create tunnel from main corridor to door ---
      // Find the nearest corridor wall point to the door
      const nearestCorridorWall = this._findNearestCorridorWallPoint(doorPosition);
      if (nearestCorridorWall) {
        // Use the same width and height as the door/vestibule
        this._createCorridorToDoorTunnel(nearestCorridorWall.point, doorPosition, 1.2, CORRIDOR_HEIGHT);
      }

      // --- Create vestibule wall connecting door to room doorway ---
      // Find the doorway position (project door position onto room wall plane)
      // Use the same logic as in _createSectionWalls to find the wall and doorway center
      const doorwayWidth = 1.2;
      const wallHeight = config.size.y;
      // Find which wall is closest to the door
      const halfSizeX = config.size.x / 2;
      const halfSizeZ = config.size.z / 2;
      const wallPositions = [
        { name: 'back',  position: new THREE.Vector3(anchorPosition.x, anchorPosition.y + wallHeight / 2, anchorPosition.z + halfSizeZ), length: config.size.x, axis: 'x', rotationY: 0 },
        { name: 'front', position: new THREE.Vector3(anchorPosition.x, anchorPosition.y + wallHeight / 2, anchorPosition.z - halfSizeZ), length: config.size.x, axis: 'x', rotationY: Math.PI },
        { name: 'left',  position: new THREE.Vector3(anchorPosition.x - halfSizeX, anchorPosition.y + wallHeight / 2, anchorPosition.z), length: config.size.z, axis: 'z', rotationY: Math.PI / 2 },
        { name: 'right', position: new THREE.Vector3(anchorPosition.x + halfSizeX, anchorPosition.y + wallHeight / 2, anchorPosition.z), length: config.size.z, axis: 'z', rotationY: -Math.PI / 2 }
      ];
      let minDist = Infinity;
      let doorWall = null;
      wallPositions.forEach((wallData) => {
        const dist = wallData.position.distanceTo(doorPosition);
        if (dist < minDist) {
          minDist = dist;
          doorWall = wallData;
        }
      });
      // Project door position onto wall axis to get doorway center
      let doorwayCenter = doorWall.position.clone();
      if (doorWall.axis === 'x') {
        doorwayCenter.x = doorPosition.x;
      } else {
        doorwayCenter.z = doorPosition.z;
      }
      // The vestibule wall runs from doorPosition to doorwayCenter
      this._createDoorVestibuleWall(doorPosition, doorwayCenter, doorwayWidth, wallHeight, doorWall.rotationY);

      // Add floor markings at the anchor node position
      // const markingPosition = anchorPosition.clone();
      // markingPosition.y = 0.015;
      // const floorMarking = this.createFloorMarking(
      //   sectionData.floorMarking || sectionData.name.substring(0, 3),
      //   markingPosition,
      //   0.8
      // );
      // this.scene.add(floorMarking);
    }

    console.log("Portfolio Sections setup completed");
    
    // Add door frames after sections are created
    this.createDoorFrameWalls();
  }

  /**
   * Creates a vestibule wall connecting the corridor door to the room's doorway.
   * @param {THREE.Vector3} doorPos - Position of the door (corridor side)
   * @param {THREE.Vector3} doorwayPos - Position of the doorway (room wall)
   * @param {number} width - Width of the doorway/vestibule
   * @param {number} height - Height of the wall
   * @param {number} rotationY - Y rotation of the wall
   */
  _createDoorVestibuleWall(doorPos, doorwayPos, width, height, rotationY) {
    const depth = doorPos.distanceTo(doorwayPos);
    if (depth < 0.05) return; // No need if already touching
    const wallThickness = 0.12; // Thickness for side walls and ceiling
    // Clamp the tunnel height to a maximum of 2.5 (door height)
    const ceilingHeight = height; // Place ceiling at top of wall
    // Widen tunnel to fit both corridor and room wall, plus a small overlap to prevent leaks
    const vestibuleWidth = Math.max(width, CORRIDOR_WIDTH) + 0.15;
    // Calculate direction vector from door to doorway
    const dir = new THREE.Vector3().subVectors(doorwayPos, doorPos).normalize();
    // Midpoint for center reference
    const mid = new THREE.Vector3().addVectors(doorPos, doorwayPos).multiplyScalar(0.5);
    // Find right vector (perpendicular to dir, in XZ plane)
    const up = new THREE.Vector3(0, 1, 0);
    const right = new THREE.Vector3().crossVectors(dir, up).normalize();
    // --- Ceiling ---
    const ceilingGeom = new THREE.BoxGeometry(vestibuleWidth, wallThickness, depth);
    const wallMaterial = this.materialSystem.getMaterial("corridorWall").clone();
    if (wallMaterial.uniforms && wallMaterial.uniforms.wallColor) {
      wallMaterial.uniforms.wallColor.value = new THREE.Color(0xffffff);
      wallMaterial.needsUpdate = true;
    } else if (wallMaterial.color) {
      wallMaterial.color.setHex(0xffffff);
    }
    const ceiling = new THREE.Mesh(ceilingGeom, wallMaterial.clone());
    // Place ceiling at top
    ceiling.position.copy(mid);
    ceiling.position.y = doorPos.y + ceilingHeight - wallThickness/2;
    // Orient ceiling to connect the two points
    ceiling.lookAt(doorwayPos.x, ceiling.position.y, doorwayPos.z);
    ceiling.rotation.y = rotationY;
    this.scene.add(ceiling);
    this._addCollidableWall(ceiling);
    // Add ceiling to ceilingMeshes for rain/snow occlusion
    this.ceilingMeshes.push(ceiling);
    // --- Add vestibule floor with chevron pattern ---
    const floorMaterial = this.materialSystem.getMaterial('floor');
    const floorGeom = new THREE.BoxGeometry(vestibuleWidth, wallThickness, depth);
    const floor = new THREE.Mesh(floorGeom, floorMaterial);
    floor.position.copy(mid);
    floor.position.y = doorPos.y + wallThickness/2; // At ground level
    floor.lookAt(doorwayPos.x, floor.position.y, doorwayPos.z);
    floor.rotation.y = rotationY;
    this.scene.add(floor);
    // --- Side Walls ---
    const sideGeom = new THREE.BoxGeometry(wallThickness, ceilingHeight, depth);
    // Left wall
    const leftWall = new THREE.Mesh(sideGeom, wallMaterial.clone());
    leftWall.position.copy(mid);
    leftWall.position.add(right.clone().multiplyScalar(-(vestibuleWidth/2 - wallThickness/2)));
    leftWall.position.y = doorPos.y + ceilingHeight/2;
    leftWall.lookAt(doorwayPos.x, leftWall.position.y, doorwayPos.z);
    leftWall.rotation.y = rotationY;
    this.scene.add(leftWall);
    this._addCollidableWall(leftWall);
    // Right wall
    const rightWallMesh = new THREE.Mesh(sideGeom, wallMaterial.clone());
    rightWallMesh.position.copy(mid);
    rightWallMesh.position.add(right.clone().multiplyScalar((vestibuleWidth/2 - wallThickness/2)));
    rightWallMesh.position.y = doorPos.y + ceilingHeight/2;
    rightWallMesh.lookAt(doorwayPos.x, rightWallMesh.position.y, doorwayPos.z);
    rightWallMesh.rotation.y = rotationY;
    this.scene.add(rightWallMesh);
    this._addCollidableWall(rightWallMesh);
    // Log
    console.log(`[Vestibule] Created tunnel (ceiling + wider sides) from door to room at (${mid.x.toFixed(2)}, ${mid.y.toFixed(2)}, ${mid.z.toFixed(2)})`);
  }

  /**
   * Find the nearest junction to a position
   * @param {THREE.Vector3} position The position to check
   * @returns {THREE.Vector3|null} The nearest junction position or null
   * @private
   */
  findNearestJunction(position) {
    let nearestJunction = null;
    let nearestDistance = Infinity;

    // Find all junctions in the scene
    const junctions = this.scene.children.filter(
      (child) => child.name && child.name.startsWith("junction_")
    );

    // Find the nearest junction
    junctions.forEach((junction) => {
      const distance = position.distanceTo(junction.position);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestJunction = junction.position;
      }
    });

    return nearestJunction ? nearestJunction.clone() : null;
  }

  /**
   * Set up the lighting system to match Severance's clinical aesthetic
   * @private
   */
  async setupLighting() {
    console.log("[Environment] Setting up lighting...");

    // Create ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    this.scene.add(ambientLight);
    
    // Create directional light for subtle shadows
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(50, 50, 50);
    this.scene.add(directionalLight);
    
    // Add the global point light
    const globalLight = new THREE.PointLight(0xffffff, 0.5);
    globalLight.position.set(0, 20, 0);
    this.scene.add(globalLight);
    
    // Add special bright doorway lights with no falloff to ensure interior visibility
    if (window.doorLocations) {
      for (const doorLocation of window.doorLocations) {
        if (!doorLocation.position) continue;
        
        // Create super bright light at doorway
        const doorwayLight = new THREE.PointLight(0xffffff, 5.0, 0); // No distance falloff
        doorwayLight.position.copy(doorLocation.position);
        doorwayLight.position.y += 1.8; // Head height
        
        this.scene.add(doorwayLight);
        console.log(`[Lighting] Added super bright light at doorway: ${doorLocation.name}`);
      }
    }

    // Set up corridor lighting
    this._setupCorridorLighting();

    console.log("[Environment] Lighting setup complete.");
  }

  /**
   * Set up corridor lighting
   * @private
   */
  _setupCorridorLighting() {
    // Create fluorescent panel lights - the iconic ceiling fixtures from the show
    const lightMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xf7faff, // Slightly bluish tint for the Severance look
      emissiveIntensity: 0.9,
      roughness: 0.2,
      metalness: 0.1,
    });
    
    // Store lights for flickering effects
    this.assets.lights.set("fluorescents", new THREE.Group());

    // Add subtle directional light for minimal shadowing
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.2);
    directionalLight.position.set(0, 1, 0);
    directionalLight.castShadow = false;
    this.scene.add(directionalLight);
    
    console.log("[Environment] Corridor lighting set up");
  }

  /**
   * Update the environment state
   * @param {number} deltaTime - Time since last frame in seconds
   * @override
   */
  update(deltaTime) {
    // Ensure deltaTime is always a valid positive number
    if (typeof deltaTime !== "number" || !isFinite(deltaTime) || deltaTime <= 0) {
      deltaTime = this.clock.getDelta();
    }
    
    // Call the parent class update method
    super.update(deltaTime);
    
    // Update corridor controller
    const corridorSystem = this.systems.get("corridor");
    if (corridorSystem && corridorSystem.update) {
      corridorSystem.update(deltaTime);
    }

    // Update movement system
    if (this.movementController && this.movementController.update) {
      this.movementController.update(deltaTime);
    }

    // Doors animation updates
    this.updateDoorAnimations(deltaTime);

    // Update post-processing effects (like chromatic aberration)
    this.updatePostProcessing(deltaTime);

    // Update dynamic lighting
    this.updateLighting(deltaTime);

    // Update weather effects (potentially)
    this.updateWeather(deltaTime);

    // Update any interaction buttons (E to interact)
    if (this.camera) {
      this.updateInteractionButtons(this.camera);
    }

    // Update art room animations
    if (this._artRoomAnimations && this._artRoomAnimations.length > 0) {
      for (const animationFn of this._artRoomAnimations) {
        animationFn(deltaTime);
      }
    }
    
    // Check if there's an active performance art letter generator
    if (this.letterGenerator && this.letterGenerator.update) {
      // Ensure the letter generator gets updated even if not part of _artRoomAnimations
      this.letterGenerator.update(deltaTime);
    }
    
    // Update all systems
    for (const [name, system] of this.systems) {
      if (system.update) {
        system.update(deltaTime);
      }
    }

    // --- Floor visibility fix for corridor flicker ---
    if (this.globalFloor) {
      if (this._wasOutdoors === undefined) this._wasOutdoors = null;
      const isOutdoors = this.isPlayerOutdoors();
      if (isOutdoors !== this._wasOutdoors) {
        this.globalFloor.visible = isOutdoors;
        this._wasOutdoors = isOutdoors;
      }
    }
  }

  /**
   * Update lighting effects
   * @private
   */
  updateLighting(deltaTime) {
    if (this.emergencyLighting) {
      this.lightFlickerIntensity = Math.random() * 0.4 + 0.6;
      const lights = this.assets.lights.get("fluorescents");
      if (lights) {
        lights.children.forEach((light) => {
          light.intensity = this.lightFlickerIntensity;
        });
      }
    }
  }

  /**
   * Set player position and rotation
   * @param {THREE.Vector3} position - New player position
   * @param {THREE.Euler} rotation - New player rotation
   */
  setPlayerPosition(position, rotation) {
    if (this.camera) {
      this.camera.position.copy(position);
      this.camera.rotation.copy(rotation);
    }
    // Also update the movement controller's internal state
    if (this.movementController) {
      this.movementController.position.copy(position);
      this.movementController.rotation.copy(rotation);
      // Optionally update global references if still needed
      window.playerPosition = this.movementController.position;
      window.playerRotation = this.movementController.rotation.y;
      window.cameraPitch = this.movementController.rotation.x;
    }
  }

  /**
   * Get the current player location
   * @returns {string} The current department or corridor name
   */
  getCurrentLocation() {
    if (!this.camera) return "Unknown";

    // If not in a department, must be in a corridor
    return "CORRIDOR";
  }

  /**
   * Get current segment based on player position
   * @returns {Object} Segment information
   */
  getCurrentSegment() {
    // Get player position
    const position = this.camera.position;

    // Find closest corridor segment
    let closestSegment = null;
    let closestDistance = Infinity;

    for (const [id, segment] of this.corridorSegments) {
      // Calculate distance to segment
      const segmentWorldPos = new THREE.Vector3();
      segment.getWorldPosition(segmentWorldPos);
      const distance = position.distanceTo(segmentWorldPos);

      if (distance < closestDistance) {
        closestDistance = distance;
        closestSegment = { id, segment };
      }
    }

    // Get department information - REMOVED departmentBounds check
    /*
    for (const [deptName, bounds] of this.departmentBounds) {
      if (bounds.containsPoint(position)) {
        return {
          department: deptName.toLowerCase(),
          position: position.clone(),
        };
      }
    }
    */

    // TODO: Adapt this to return portfolio section info later.
    // For now, it primarily returns corridor info based on segments.

    // Return corridor segment info if found
    if (closestSegment) {
      const segmentId = closestSegment.id;
      // Extract department from segment ID (e.g., "mdr_hallway" -> "mdr")
      const department = segmentId.includes("_")
        ? segmentId.split("_")[0]
        : "corridor";

      return {
        department: department,
        position: position.clone(),
      };
    }

    return { department: "unknown", position: position.clone() };
  }

  /**
   * Toggle emergency lighting mode
   * @param {boolean} enabled - Whether to enable emergency lighting
   */
  setEmergencyLighting(enabled) {
    this.emergencyLighting = enabled;

    // Update all lights
    this.assets.lights.forEach((light) => {
      if (light instanceof THREE.Group) {
        light.children.forEach((child) => {
          if (child instanceof THREE.Light) {
            child.intensity = enabled ? 0.1 : 1.0;
          }
        });
      } else if (light instanceof THREE.Light) {
        light.intensity = enabled ? 0.1 : 1.0;
      }
    });
  }

  /**
   * Clean up resources
   * @override
   */
  dispose() {
    // Clean up all Three.js resources
    console.log("Disposing SeveranceEnvironment");
    
    // Dispose letter generator if it exists
    if (this.letterGenerator) {
      this.letterGenerator.dispose();
      this.letterGenerator = null;
    }
    
    this.disposeCollidableWalls();
    this.disposeInteractableObjects();

    // Clear animations
    this._artRoomAnimations = [];

    // Clean up systems
    for (const system of this.systems.values()) {
      if (system.dispose) {
        system.dispose();
      }
    }

    // Clear references
    this.systems.clear();
    this.doors.clear();
    this.interactiveObjects.clear();
    // REMOVED: this.departmentBounds.clear();
    this.corridorSegments.clear();
    this.wayfinding.clear(); // Clear wayfinding elements

    // Don't dispose movement controller here as it's managed by main.js

    // Clear global references
    window.doorLocations = [];
  }

  /**
   * Creates the interior walls for a standard rectangular portfolio section.
   * Adds the walls to the collidable mesh list.
   * @param {THREE.Vector3} center Center position of the section.
   * @param {THREE.Vector3} size Size of the section (x, y, z).
   * @param {THREE.Material} wallMaterial The material to use for the walls.
   * @param {THREE.Group} parentGroup The group to add the walls to.
   * @param {THREE.Vector3} doorPosition The position of the door for this section.
   * @private
   */
  _createSectionWalls(center, size, wallMaterial, parentGroup, doorPosition) {
      const halfSizeX = size.x / 2;
      const halfSizeZ = size.z / 2;
      const wallHeight = size.y;
      const doorwayWidth = DOORWAY_WIDTH; // Use the constant for consistency
      const sectionWallMaterial = wallMaterial.clone();
      if (sectionWallMaterial.uniforms && sectionWallMaterial.uniforms.wallColor) {
        sectionWallMaterial.uniforms.wallColor.value = new THREE.Color(0xffffff);
        sectionWallMaterial.needsUpdate = true;
      } else if (sectionWallMaterial.color) {
        sectionWallMaterial.color.setHex(0xffffff);
      }

      // Define potential wall positions and orientations
      const wallPositions = [
          { name: 'back',  position: new THREE.Vector3(center.x, center.y + wallHeight / 2, center.z + halfSizeZ), length: size.x, axis: 'x', geometry: (len) => new THREE.BoxGeometry(len, wallHeight, 0.1), rotationY: 0 },
          { name: 'front', position: new THREE.Vector3(center.x, center.y + wallHeight / 2, center.z - halfSizeZ), length: size.x, axis: 'x', geometry: (len) => new THREE.BoxGeometry(len, wallHeight, 0.1), rotationY: Math.PI },
          { name: 'left',  position: new THREE.Vector3(center.x - halfSizeX, center.y + wallHeight / 2, center.z), length: size.z, axis: 'z', geometry: (len) => new THREE.BoxGeometry(len, wallHeight, 0.1), rotationY: Math.PI / 2 },
          { name: 'right', position: new THREE.Vector3(center.x + halfSizeX, center.y + wallHeight / 2, center.z), length: size.z, axis: 'z', geometry: (len) => new THREE.BoxGeometry(len, wallHeight, 0.1), rotationY: -Math.PI / 2 }
      ];

      // Find the wall closest to the door
      let minDist = Infinity;
      let doorWallIdx = -1;
      wallPositions.forEach((wallData, idx) => {
        const dist = wallData.position.distanceTo(doorPosition);
        if (dist < minDist) {
          minDist = dist;
          doorWallIdx = idx;
        }
      });

      wallPositions.forEach((wallData, idx) => {
        if (idx === doorWallIdx) {
          // This is the wall with the doorway
          // Project door position onto wall axis
          let doorCoord, wallCenterCoord, halfLen;
          if (wallData.axis === 'x') {
            doorCoord = doorPosition.x;
            wallCenterCoord = wallData.position.x;
            halfLen = wallData.length / 2;
          } else {
            doorCoord = doorPosition.z;
            wallCenterCoord = wallData.position.z;
            halfLen = wallData.length / 2;
          }
          // Compute left and right segment lengths
          const leftLen = Math.max(0, (doorCoord - doorwayWidth/2) - (wallCenterCoord - halfLen));
          const rightLen = Math.max(0, (wallCenterCoord + halfLen) - (doorCoord + doorwayWidth/2));
          // Left segment
          if (leftLen > 0.05) {
            const leftGeom = wallData.geometry(leftLen);
            // Clone material and set wallScale for this segment
            const matL = sectionWallMaterial.clone();
            if (matL.uniforms && matL.uniforms.wallScale) {
              matL.uniforms.wallScale.value.set(leftLen, wallHeight);
            }
            const leftMesh = new THREE.Mesh(leftGeom, matL);
            // Position left segment
            if (wallData.axis === 'x') {
              leftMesh.position.set(
                wallCenterCoord - halfLen + leftLen/2,
                wallData.position.y,
                wallData.position.z
              );
            } else {
              leftMesh.position.set(
                wallData.position.x,
                wallData.position.y,
                wallCenterCoord - halfLen + leftLen/2
              );
            }
            leftMesh.rotation.y = wallData.rotationY;
            parentGroup.add(leftMesh);
            this._addCollidableWall(leftMesh);
          }
          // Right segment
          if (rightLen > 0.05) {
            const rightGeom = wallData.geometry(rightLen);
            // Clone material and set wallScale for this segment
            const matR = sectionWallMaterial.clone();
            if (matR.uniforms && matR.uniforms.wallScale) {
              matR.uniforms.wallScale.value.set(rightLen, wallHeight);
            }
            const rightMesh = new THREE.Mesh(rightGeom, matR);
            // Position right segment
            if (wallData.axis === 'x') {
              rightMesh.position.set(
                wallCenterCoord + halfLen - rightLen/2,
                wallData.position.y,
                wallData.position.z
              );
            } else {
              rightMesh.position.set(
                wallData.position.x,
                wallData.position.y,
                wallCenterCoord + halfLen - rightLen/2
              );
            }
            rightMesh.rotation.y = wallData.rotationY;
            parentGroup.add(rightMesh);
            this._addCollidableWall(rightMesh);
          }
          // Log
          console.log(`[Section Walls] Created doorway in wall '${wallData.name}' for section ${parentGroup.name}`);
        } else {
          // Normal wall
          // Clone material and set wallScale for full wall
          const matW = sectionWallMaterial.clone();
          if (matW.uniforms && matW.uniforms.wallScale) {
            matW.uniforms.wallScale.value.set(wallData.length, wallHeight);
          }
          const wall = new THREE.Mesh(wallData.geometry(wallData.length), matW);
              // Adjust position slightly based on thickness and rotation to align outer face
              const offset = new THREE.Vector3(0, 0, 0.05).applyAxisAngle(new THREE.Vector3(0, 1, 0), wallData.rotationY);
              wall.position.copy(wallData.position).add(offset);
              wall.rotation.y = wallData.rotationY;
              parentGroup.add(wall);
              this._addCollidableWall(wall);
              console.log(`[Section Walls] Created wall '${wallData.name}' for section ${parentGroup.name}`);
          }
      });
  }

  /**
   * Creates a basic placeholder interior for a section.
   * @param {THREE.Group} interiorGroup The group to add the placeholder to.
   * @param {THREE.Vector3} center Center position.
   * @param {THREE.Vector3} size Size of the section.
   * @param {THREE.Vector3} doorPosition Position of the door for lighting.
   * @private
   */
  _createPlaceholderInterior(interiorGroup, center, size, doorPosition) {
    // --- Add door entrance lighting if doorPosition is provided ---
    if (doorPosition) {
      // Create vector from door to center
      const doorToCenter = new THREE.Vector3().subVectors(center, doorPosition).normalize();
      
      // Create a special white light at the entryway
      const entryLight = new THREE.SpotLight(0xffffff, 5.0, 8.0, Math.PI/4, 0.5, 1);
      entryLight.position.copy(doorPosition.clone().add(new THREE.Vector3(0, 2.5, 0))); // Above the door
      
      // Point the spotlight into the room
      entryLight.target.position.copy(center);
      entryLight.target.updateMatrixWorld();
      
      interiorGroup.add(entryLight);
      interiorGroup.add(entryLight.target);
    }
    
    // FIX: Add more visible elements to interior
    
    // Create a general interior light
    const interiorLight = new THREE.PointLight(0xffffff, 1.0, 0, 1);
    interiorLight.position.set(center.x, center.y + size.y * 0.8, center.z);
    interiorGroup.add(interiorLight);
    
    // Add some ceiling lights
    const ceilingLightCount = 4;
    for (let i = 0; i < ceilingLightCount; i++) {
      const lightX = center.x + (Math.random() - 0.5) * size.x * 0.8;
      const lightZ = center.z + (Math.random() - 0.5) * size.z * 0.8;
      
      // Create ceiling light fixture
      const lightFixture = new THREE.Group();
      
      // Light housing
      const housingGeometry = new THREE.CylinderGeometry(0.2, 0.2, 0.1, 16);
      const housingMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xcccccc, 
        roughness: 0.5,
        metalness: 0.8 
      });
      const housing = new THREE.Mesh(housingGeometry, housingMaterial);
      housing.position.y = -0.05;
      lightFixture.add(housing);
      
      // Light lens
      const lensGeometry = new THREE.CylinderGeometry(0.18, 0.18, 0.02, 16);
      const lensMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xffffff, 
        emissive: 0xffffff,
        emissiveIntensity: 0.5,
        roughness: 0.1
      });
      const lens = new THREE.Mesh(lensGeometry, lensMaterial);
      lens.position.y = -0.09;
      lightFixture.add(lens);
      
      // Position the fixture
      lightFixture.position.set(lightX, center.y + size.y - 0.05, lightZ);
      interiorGroup.add(lightFixture);
      
      // Add the actual light source below the fixture
      const light = new THREE.PointLight(0xffffee, 1.5, size.y * 1.5, 1);
      light.position.set(lightX, center.y + size.y - 0.2, lightZ);
      interiorGroup.add(light);
    }
    
    // Create furniture
    /*
    const placeholderGeometry = new THREE.BoxGeometry(size.x * 0.8, size.y * 0.75, size.z * 0.8);
    const placeholderMaterial = new THREE.MeshStandardMaterial({
        color: 0x666666,
        roughness: 0.8,
        wireframe: false // Change to solid rather than wireframe
    });
    const placeholderMesh = new THREE.Mesh(placeholderGeometry, placeholderMaterial);
    // Position placeholder centered within the section bounds
    placeholderMesh.position.set(center.x, center.y + size.y * 0.375, center.z);
    interiorGroup.add(placeholderMesh);
    */
    
    console.log(`Added placeholder interior with lighting for ${interiorGroup.name}`);
  }

  // --- Specific Interior Creation Methods --- //

  /** Creates interior for Interaction Design section. */
  _createDesignInterior(interiorGroup, center, size, doorPosition) {
    console.log(`Creating DESIGN interior (Tim Rodenbröker style) at ${center.x}, ${center.z}`);
    
    // Remove any old poster or mural meshes from previous renders
    const toRemove = [];
    interiorGroup.traverse(child => {
      if (child.isMesh && (
        (child.geometry && (child.geometry.type === 'PlaneGeometry' || child.geometry.type === 'BoxGeometry')) &&
        (child.material && (child.material.map instanceof THREE.CanvasTexture || child.material.color?.getHex() === 0x222222))
      )) {
        toRemove.push(child);
      }
    });
    toRemove.forEach(mesh => {
      if (mesh.parent) mesh.parent.remove(mesh);
    });
    
    // Entry and general lighting
    if (doorPosition) {
      const doorToCenter = new THREE.Vector3().subVectors(center, doorPosition).normalize();
      const entryLight = new THREE.SpotLight(0x4285f4, 4.0, 8.0, Math.PI/4, 0.5, 1);
      entryLight.position.copy(doorPosition.clone().add(new THREE.Vector3(0, 2.5, 0)));
      entryLight.target.position.copy(center);
      entryLight.target.updateMatrixWorld();
      interiorGroup.add(entryLight);
      interiorGroup.add(entryLight.target);
    }
    const interiorLight = new THREE.PointLight(0xffffff, 2.0, 0, 1);
    interiorLight.position.set(center.x, center.y + size.y * 0.8, center.z);
    interiorGroup.add(interiorLight);
    
    // --- Professional Gallery Wall with Framed Posters ---
    // Helper to create a framed poster (canvas-based)
    /*
    function createFramedPoster(text, accentColor, width = 1.1, height = 1.6) {
      // Create canvas for poster art
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 768;
      const ctx = canvas.getContext('2d');
      // Background
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      // Accent geometric design
      ctx.save();
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = accentColor;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(canvas.width, 0);
      ctx.lineTo(canvas.width, canvas.height * 0.4);
      ctx.lineTo(0, canvas.height * 0.7);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      // Main text
      ctx.font = 'bold 72px Arial';
      ctx.fillStyle = accentColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, canvas.width/2, canvas.height/2 - 40);
      // Subtitle
      ctx.font = '32px Arial';
      ctx.fillStyle = '#222';
      ctx.fillText('Creative Coding', canvas.width/2, canvas.height/2 + 40);
      // Signature
      ctx.font = 'italic 24px Arial';
      ctx.fillStyle = '#888';
      ctx.fillText('Tim Rodenbröker', canvas.width/2, canvas.height - 50);
      // Texture
      const texture = new THREE.CanvasTexture(canvas);
      // Frame
      const frameDepth = 0.05;
      const frame = new THREE.Mesh(
        new THREE.BoxGeometry(width, height, frameDepth),
        new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.7, metalness: 0.3 })
      );
      // Poster
      const poster = new THREE.Mesh(
        new THREE.PlaneGeometry(width * 0.92, height * 0.92),
        new THREE.MeshStandardMaterial({ map: texture, roughness: 0.5, metalness: 0.1 })
      );
      poster.position.z = frameDepth/2 + 0.001;
      // Group
      const group = new THREE.Group();
      group.add(frame);
      group.add(poster);
      return group;
    }
    */

    // Arrange 4 posters on the back wall (Z), spread along X, facing into the room
    /*
    const posterWallZ = center.z - size.z/2 + 0.08;
    const posterY = center.y + 1.3;
    const posterSpacing = 1.4;
    const accentColors = ['#4285f4', '#ea4335', '#fbbc05', '#34a853'];
    const posterTitles = ['Generative Grid', 'Type & Code', 'Color Systems', 'Motion Design'];
    for (let i = 0; i < 4; i++) {
      const poster = createFramedPoster(posterTitles[i], accentColors[i]);
      poster.position.set(center.x - posterSpacing * 1.5 + i * posterSpacing, posterY, posterWallZ);
      poster.rotation.y = 0;
      interiorGroup.add(poster);
      // Accent spotlight above each poster (slightly in front of the poster)
      const spot = new THREE.SpotLight(accentColors[i], 2.2, 5.0, Math.PI/8, 0.5, 1);
      spot.position.set(poster.position.x, poster.position.y + 1.1, poster.position.z + 0.1);
      spot.target.position.copy(poster.position);
      spot.target.updateMatrixWorld();
      interiorGroup.add(spot);
      interiorGroup.add(spot.target);
    }
    */

    // --- Geometric Mural on Left Wall ---
    // Use a large plane with a canvas texture
    /*
    const muralWidth = size.x * 0.7;
    const muralHeight = size.y * 0.7;
    const muralCanvas = document.createElement('canvas');
    muralCanvas.width = 1024;
    muralCanvas.height = 1024;
    const muralCtx = muralCanvas.getContext('2d');
    muralCtx.fillStyle = '#f4f4f4';
    muralCtx.fillRect(0, 0, muralCanvas.width, muralCanvas.height);
    // Draw geometric pattern (grid + circles)
    muralCtx.strokeStyle = '#4285f4';
    muralCtx.lineWidth = 6;
    for (let i = 1; i < 6; i++) {
      muralCtx.beginPath();
      muralCtx.moveTo(i * 170, 0);
      muralCtx.lineTo(i * 170, muralCanvas.height);
      muralCtx.stroke();
      muralCtx.beginPath();
      muralCtx.moveTo(0, i * 170);
      muralCtx.lineTo(muralCanvas.width, i * 170);
      muralCtx.stroke();
    }
    muralCtx.globalAlpha = 0.18;
    muralCtx.fillStyle = '#ea4335';
    muralCtx.beginPath();
    muralCtx.arc(300, 300, 180, 0, 2 * Math.PI);
    muralCtx.fill();
    muralCtx.globalAlpha = 0.12;
    muralCtx.fillStyle = '#fbbc05';
    muralCtx.beginPath();
    muralCtx.arc(700, 700, 140, 0, 2 * Math.PI);
    muralCtx.fill();
    const muralTexture = new THREE.CanvasTexture(muralCanvas);
    const mural = new THREE.Mesh(
      new THREE.PlaneGeometry(muralWidth, muralHeight),
      new THREE.MeshStandardMaterial({ map: muralTexture, roughness: 0.6, metalness: 0.1 })
    );
    mural.position.set(center.x - size.x/2 + 0.08, center.y + muralHeight/2 + 0.2, center.z);
    mural.rotation.y = Math.PI/2;
    interiorGroup.add(mural);
    // Add a soft white light to wash the mural
    const muralLight = new THREE.SpotLight(0xffffff, 1.2, 7.0, Math.PI/6, 0.7, 1);
    muralLight.position.set(mural.position.x + 0.2, mural.position.y + 1.2, mural.position.z);
    muralLight.target.position.copy(mural.position);
    muralLight.target.updateMatrixWorld();
    interiorGroup.add(muralLight);
    interiorGroup.add(muralLight.target);
    */

    // --- Minimal, Modern Central Table ---
    const tableGeometry = new THREE.BoxGeometry(2.2, 0.09, 1.1);
    const tableMaterial = new THREE.MeshStandardMaterial({ color: 0xf4f4f4, roughness: 0.25, metalness: 0.18 });
    const table = new THREE.Mesh(tableGeometry, tableMaterial);
    table.position.set(center.x, center.y + 0.7, center.z);
    interiorGroup.add(table);
    // Add a blue accent line on the table (as a thin box)
    const accentGeom = new THREE.BoxGeometry(2.0, 0.01, 0.07);
    const accentMat = new THREE.MeshStandardMaterial({ color: 0x4285f4, roughness: 0.2, metalness: 0.5 });
    const accent = new THREE.Mesh(accentGeom, accentMat);
    accent.position.set(center.x, table.position.y + 0.055, center.z);
    interiorGroup.add(accent);

    // --- Subtle Floor Logo/Marking near Entrance ---
    if (doorPosition) {
      const logoCanvas = document.createElement('canvas');
      logoCanvas.width = 256;
      logoCanvas.height = 256;
      const logoCtx = logoCanvas.getContext('2d');
      logoCtx.clearRect(0, 0, 256, 256);
      logoCtx.globalAlpha = 0.18;
      logoCtx.fillStyle = '#4285f4';
      logoCtx.beginPath();
      logoCtx.arc(128, 128, 110, 0, 2 * Math.PI);
      logoCtx.fill();
      logoCtx.globalAlpha = 1.0;
      logoCtx.font = 'bold 48px Arial';
      logoCtx.fillStyle = '#222';
      logoCtx.textAlign = 'center';
      logoCtx.textBaseline = 'middle';
      logoCtx.fillText('DESIGN', 128, 128);
      const logoTexture = new THREE.CanvasTexture(logoCanvas);
      const logoMat = new THREE.MeshStandardMaterial({ map: logoTexture, transparent: true, opacity: 0.7, roughness: 0.4 });
      const logoMesh = new THREE.Mesh(new THREE.CircleGeometry(0.9, 48), logoMat);
      logoMesh.position.copy(doorPosition.clone());
      logoMesh.position.y = center.y + 0.02;
      logoMesh.rotation.x = -Math.PI/2;
      interiorGroup.add(logoMesh);
    }
  }

  /** Creates interior for Development section. */
  async _createDevInterior(interiorGroup, center, size, doorPosition) {
    console.log(`Creating DEV interior at ${center.x}, ${center.z}`);
    // --- Special lighting at door entrance ---
    if (doorPosition) {
      const doorToCenter = new THREE.Vector3().subVectors(center, doorPosition).normalize();
      const entryLight = new THREE.SpotLight(0x34a853, 5.0, 8.0, Math.PI/4, 0.5, 1);
      entryLight.position.copy(doorPosition.clone().add(new THREE.Vector3(0, 2.5, 0)));
      entryLight.target.position.copy(center);
      entryLight.target.updateMatrixWorld();
      interiorGroup.add(entryLight);
      interiorGroup.add(entryLight.target);
    }
    
    // General interior light - modified for more dramatic effect
    const interiorLight = new THREE.PointLight(0xffffff, 1.0, 0, 1);
    interiorLight.position.set(center.x, center.y + size.y * 0.8, center.z);
    interiorGroup.add(interiorLight);
     
    const accentColors = [
      new THREE.Color(0x34a853), // Green
      new THREE.Color(0x4285f4), // Blue
      new THREE.Color(0xfbbc05), // Yellow
      new THREE.Color(0xea4335)  // Red
    ];
    
    // Keep only the blue accent light and sphere (index 1)
    const blueIndex = 1;
    const angle = (blueIndex / 4) * Math.PI * 2;
    const dist = size.x * 0.3;
    const x = center.x + Math.cos(angle) * dist;
    const z = center.z + Math.sin(angle) * dist;

    const accentLight = new THREE.PointLight(accentColors[blueIndex], 2.5, size.x * 0.6, 2);
    accentLight.position.set(x, center.y + 1.0, z);
    interiorGroup.add(accentLight);

    // --- Create Kruger Slogans on Walls (keep this from original) ---
    (async () => {
      const slogans = [
        'YOU COMPILE > YOU FAIL',
        'YOUR CODE IS A MIRROR', 
        'DEBUGGING IS SELF-REFLECTION',
        'ERRORS ARE INSTRUCTIONS'
      ];
      const wallColor = '#fff';
      const krugerColor = '#e10600';
      // Determine which wall has the door to skip text on that wall
      let doorWall = null;
      const eps = 0.1;
      if (doorPosition) {
        // Define wall positions and axes as in _createSectionWalls
        const halfSizeX = size.x / 2;
        const halfSizeZ = size.z / 2;
        const wallHeight = size.y;
        const wallPositions = [
          { name: 'back',  position: new THREE.Vector3(center.x, center.y + wallHeight / 2, center.z + halfSizeZ), axis: 'x' },
          { name: 'front', position: new THREE.Vector3(center.x, center.y + wallHeight / 2, center.z - halfSizeZ), axis: 'x' },
          { name: 'left',  position: new THREE.Vector3(center.x - halfSizeX, center.y + wallHeight / 2, center.z), axis: 'z' },
          { name: 'right', position: new THREE.Vector3(center.x + halfSizeX, center.y + wallHeight / 2, center.z), axis: 'z' }
        ];
        let minDist = Infinity;
        let doorWallName = null;
        wallPositions.forEach((wallData) => {
          const dist = wallData.position.distanceTo(doorPosition);
          if (dist < minDist) {
            minDist = dist;
            doorWallName = wallData.name;
          }
        });
        doorWall = doorWallName;
        console.log('[DEV WALL DETECT] (MATCHED TO GEOMETRY) doorPosition:', doorPosition, 'center:', center, 'size:', size, '=> doorWall:', doorWall);
      }
      // Helper to create a cropped text texture
      function createCroppedKrugerTextTexture(text, cropStart, cropEnd, totalWidth, height, opts) {
        // cropStart and cropEnd are in [0,1] (fraction of totalWidth)
        const canvas = document.createElement('canvas');
        canvas.width = Math.round((cropEnd - cropStart) * totalWidth);
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        // Draw the full text to a temp canvas
        const fullCanvas = document.createElement('canvas');
        fullCanvas.width = totalWidth;
        fullCanvas.height = height;
        const fullCtx = fullCanvas.getContext('2d');
        // Background
        fullCtx.fillStyle = opts.bgColor || '#fff';
        fullCtx.fillRect(0, 0, totalWidth, height);
        // Text
        fullCtx.font = opts.font || 'bold 96px Helvetica Neue, Arial, sans-serif';
        fullCtx.fillStyle = opts.fgColor || '#e10600';
        fullCtx.textAlign = opts.align || 'center';
        fullCtx.textBaseline = opts.vAlign || 'middle';
        // Auto-wrap: split text if too long
        const words = text.split(' ');
        let line = '', lines = [], maxWidth = totalWidth * 0.9;
        for (let w of words) {
          const test = line + w + ' ';
          if (fullCtx.measureText(test).width > maxWidth) {
            lines.push(line);
            line = w + ' ';
          } else {
            line = test;
          }
        }
        lines.push(line);
        const lineHeight = 100;
        const yStart = height/2 - (lines.length-1)*lineHeight/2;
        lines.forEach((l, i) => fullCtx.fillText(l.trim(), totalWidth/2, yStart + i*lineHeight));
        // Copy cropped region to output canvas
        ctx.drawImage(fullCanvas, cropStart*totalWidth, 0, (cropEnd-cropStart)*totalWidth, height, 0, 0, (cropEnd-cropStart)*totalWidth, height);
        return new THREE.CanvasTexture(canvas);
      }
      // Back wall (Z+)
      if (doorWall !== 'back') {
        console.log('[DEV WALL TEXT] Creating full-size back wall mesh');
        const backWall = new THREE.Mesh(
          new THREE.PlaneGeometry(size.x, size.y),
          new THREE.MeshBasicMaterial({ map: createKrugerTextTexture(slogans[0], { width: 2048, height: 512, bgColor: wallColor, fgColor: krugerColor }), side: THREE.DoubleSide })
        );
        backWall.position.set(center.x, center.y + size.y / 2, center.z + size.z / 2 - 0.05);
        backWall.rotation.y = Math.PI;
        interiorGroup.add(backWall);
      } else {
        // Split the wall mesh into two, leaving a gap for the doorway
        const DOORWAY_WIDTH = 1.8; // Should match the constant used elsewhere
        const wallLen = size.x;
        // Doorway center in world X
        const doorCoord = doorPosition.x;
        const wallCenterCoord = center.x;
        const halfLen = wallLen / 2;
        // Compute left and right segment widths
        const leftLen = Math.max(0, (doorCoord - DOORWAY_WIDTH/2) - (wallCenterCoord - halfLen));
        const rightLen = Math.max(0, (wallCenterCoord + halfLen) - (doorCoord + DOORWAY_WIDTH/2));
        const wallY = center.y + size.y / 2;
        const wallZ = center.z + size.z / 2 - 0.05;
        console.log('[DEV WALL SPLIT] doorWall=back, doorPosition:', doorPosition, 'center:', center, 'leftLen:', leftLen, 'rightLen:', rightLen, 'wallLen:', wallLen);
        // Left segment
        if (leftLen > 0.05) {
          console.log('[DEV WALL SPLIT] Creating left segment with width', leftLen);
          const leftGeom = new THREE.PlaneGeometry(leftLen, size.y);
          const leftTex = createCroppedKrugerTextTexture(slogans[0], 0, leftLen/wallLen, 2048, 512, { bgColor: wallColor, fgColor: krugerColor });
          const leftMat = new THREE.MeshBasicMaterial({ map: leftTex, side: THREE.DoubleSide });
          const leftMesh = new THREE.Mesh(leftGeom, leftMat);
          leftMesh.position.set(wallCenterCoord - halfLen + leftLen/2, wallY, wallZ);
          leftMesh.rotation.y = Math.PI;
          interiorGroup.add(leftMesh);
        } else {
          console.log('[DEV WALL SPLIT] Skipping left segment, width too small:', leftLen);
        }
        // Right segment
        if (rightLen > 0.05) {
          console.log('[DEV WALL SPLIT] Creating right segment with width', rightLen);
          const rightGeom = new THREE.PlaneGeometry(rightLen, size.y);
          const rightTex = createCroppedKrugerTextTexture(slogans[0], 1 - rightLen/wallLen, 1, 2048, 512, { bgColor: wallColor, fgColor: krugerColor });
          const rightMat = new THREE.MeshBasicMaterial({ map: rightTex, side: THREE.DoubleSide });
          const rightMesh = new THREE.Mesh(rightGeom, rightMat);
          rightMesh.position.set(wallCenterCoord + halfLen - rightLen/2, wallY, wallZ);
          rightMesh.rotation.y = Math.PI;
          interiorGroup.add(rightMesh);
        } else {
          console.log('[DEV WALL SPLIT] Skipping right segment, width too small:', rightLen);
        }
      }
      // Front wall (Z-)
      if (doorWall !== 'front') {
        console.log('[DEV WALL TEXT] Creating full-size front wall mesh');
        const frontWall = new THREE.Mesh(
          new THREE.PlaneGeometry(size.x, size.y),
          new THREE.MeshBasicMaterial({ map: createKrugerTextTexture(slogans[1], { width: 2048, height: 512, bgColor: wallColor, fgColor: krugerColor }), side: THREE.DoubleSide })
        );
        frontWall.position.set(center.x, center.y + size.y / 2, center.z - size.z / 2 + 0.05);
        frontWall.rotation.y = 0;
        interiorGroup.add(frontWall);
      }
      // Left wall (X-)
      if (doorWall !== 'left') {
        console.log('[DEV WALL TEXT] Creating full-size left wall mesh');
        const leftWall = new THREE.Mesh(
          new THREE.PlaneGeometry(size.z, size.y),
          new THREE.MeshBasicMaterial({ map: createKrugerTextTexture(slogans[2], { width: 2048, height: 512, bgColor: wallColor, fgColor: krugerColor }), side: THREE.DoubleSide })
        );
        leftWall.position.set(center.x - size.x / 2 + 0.05, center.y + size.y / 2, center.z);
        leftWall.rotation.y = Math.PI / 2;
        interiorGroup.add(leftWall);
      }
      // Right wall (X+)
      if (doorWall !== 'right') {
        console.log('[DEV WALL TEXT] Creating full-size right wall mesh');
        const rightWall = new THREE.Mesh(
          new THREE.PlaneGeometry(size.z, size.y),
          new THREE.MeshBasicMaterial({ map: createKrugerTextTexture(slogans[3], { width: 2048, height: 512, bgColor: wallColor, fgColor: krugerColor }), side: THREE.DoubleSide })
        );
        rightWall.position.set(center.x + size.x / 2 - 0.05, center.y + size.y / 2, center.z);
        rightWall.rotation.y = -Math.PI / 2;
        interiorGroup.add(rightWall);
      }
    })();
    
    // --- Tim Rodenbroeker Style: Create Generative Art Floor ---
    // Floor removed to match Severance aesthetic
    
    // Store reference to floor shader for animation updates
    this._codeRoomFloorShader = null;
    
    // --- Tim Rodenbroeker Style: Create Generative Art Nodes ---
    const createGenerativeNode = (position, nodeType) => {
      const nodeGroup = new THREE.Group();
      nodeGroup.position.copy(position);
      
      // Base parameters
      const nodeRadius = 0.2;
      let nodeColor, emissiveColor, particleCount;
      
      switch (nodeType) {
        case 'flow':
          nodeColor = new THREE.Color(0x4285f4); // Blue
          emissiveColor = new THREE.Color(0x4285f4);
          particleCount = 24;
          break;
        case 'data':
          nodeColor = new THREE.Color(0xfbbc05); // Yellow
          emissiveColor = new THREE.Color(0xfbbc05);
          particleCount = 18;
          break;
        case 'compute':
          nodeColor = new THREE.Color(0xea4335); // Red
          emissiveColor = new THREE.Color(0xea4335);
          particleCount = 12;
          break;
        case 'network':
          nodeColor = new THREE.Color(0x9c27b0); // Purple
          emissiveColor = new THREE.Color(0x9c27b0);
          particleCount = 20;
          break;
        default:
          nodeColor = new THREE.Color(0x34a853); // Green
          emissiveColor = new THREE.Color(0x34a853);
          particleCount = 6;
      }
      
      // Create core sphere
      const coreGeom = new THREE.SphereGeometry(nodeRadius, 16, 16);
      const coreMat = new THREE.MeshStandardMaterial({
        color: nodeColor,
        emissive: emissiveColor,
        emissiveIntensity: 0.7,
        roughness: 0.2,
        metalness: 0.8,
        transparent: true,
        opacity: 0.9
      });
      
      const core = new THREE.Mesh(coreGeom, coreMat);
      nodeGroup.add(core);
      
      // Add orbiting particles
      const particleGeom = new THREE.SphereGeometry(nodeRadius * 0.15, 8, 8);
      const particleMat = new THREE.MeshStandardMaterial({
        color: nodeColor,
        emissive: emissiveColor,
        emissiveIntensity: 0.9,
        roughness: 0.1,
        metalness: 0.9
      });
      
      const orbitRadii = [nodeRadius * 2, nodeRadius * 3, nodeRadius * 4];
      
      for (let i = 0; i < particleCount; i++) {
        const particle = new THREE.Mesh(particleGeom, particleMat);
        
        // Determine which orbit
        const orbitIndex = Math.floor(i / (particleCount / orbitRadii.length));
        const orbitRadius = orbitRadii[Math.min(orbitIndex, orbitRadii.length - 1)];
        
        // Position in the orbit
        const angle = (i % (particleCount / orbitRadii.length)) / (particleCount / orbitRadii.length) * Math.PI * 2;
        const x = Math.cos(angle) * orbitRadius;
        const z = Math.sin(angle) * orbitRadius;
        
        // Add some height variation based on angle
        const y = Math.sin(angle * 2) * (orbitRadius * 0.5);
        
        particle.position.set(x, y, z);
        nodeGroup.add(particle);
        
        // Add to animated objects
        const particleId = `node_${nodeType}_particle_${i}`;
        particle.name = particleId;
        
        this._animatedObjects = this._animatedObjects || new Map();
        this._animatedObjects.set(particleId, {
          object: particle,
          centerX: particle.position.x,
          centerZ: particle.position.z,
          radius: orbitRadius,
          speed: 0.6 + (Math.random() * 0.4), // Variable speed
          phase: i * (Math.PI * 2 / particleCount),
          verticalAmplitude: orbitRadius * 0.25,
          verticalFrequency: 1.5 + Math.random()
        });
      }
      
      // Add light
      const nodeLight = new THREE.PointLight(nodeColor, 1.0, nodeRadius * 10, 2);
      nodeGroup.add(nodeLight);
      
      return nodeGroup;
    };
    
    // Create nodes
    const nodes = [
      { type: 'flow', position: new THREE.Vector3(center.x - size.x * 0.3, center.y + 1.2, center.z - size.z * 0.2) },
      { type: 'data', position: new THREE.Vector3(center.x + size.x * 0.3, center.y + 1.2, center.z - size.z * 0.2) },
      { type: 'compute', position: new THREE.Vector3(center.x - size.x * 0.3, center.y + 1.2, center.z + size.z * 0.2) },
      { type: 'network', position: new THREE.Vector3(center.x + size.x * 0.3, center.y + 1.2, center.z + size.z * 0.2) }
    ];
    
    nodes.forEach(node => {
      const nodeGroup = createGenerativeNode(node.position, node.type);
      interiorGroup.add(nodeGroup);
      
      // --- Create Node Info Button ---
      const nodeButtonCanvas = document.createElement('canvas');
      nodeButtonCanvas.width = 320;
      nodeButtonCanvas.height = 100;
      const nodeButtonCtx = nodeButtonCanvas.getContext('2d');
      
      // Style similar to terminal button
      const borderRadius = 8;
      const padding = 10;
      const indicatorSize = 30;
      const indicatorMargin = 15;
      const text = "INFO";
      
      nodeButtonCtx.font = 'bold 28px "Neue Montreal", sans-serif';
      const textMetrics = nodeButtonCtx.measureText(text);
      const textWidth = textMetrics.width;
      const totalWidth = indicatorMargin + indicatorSize + indicatorMargin + textWidth + padding * 2;
      const totalHeight = indicatorSize + padding * 2;
      
      nodeButtonCanvas.width = totalWidth;
      nodeButtonCanvas.height = totalHeight;
      
      // Draw background (dark, semi-transparent)
      nodeButtonCtx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      nodeButtonCtx.beginPath();
      nodeButtonCtx.roundRect(0, 0, totalWidth, totalHeight, borderRadius);
      nodeButtonCtx.fill();
      
      // Draw border (teal)
      nodeButtonCtx.strokeStyle = '#5CDED3';
      nodeButtonCtx.lineWidth = 2;
      nodeButtonCtx.stroke();
      
      // Draw Key Indicator background (teal square)
      const indicatorX = padding;
      const indicatorY = padding;
      nodeButtonCtx.fillStyle = '#5CDED3';
      nodeButtonCtx.beginPath();
      nodeButtonCtx.roundRect(indicatorX, indicatorY, indicatorSize, indicatorSize, 4);
      nodeButtonCtx.fill();
      
      // Draw 'E' inside indicator (black)
      nodeButtonCtx.font = 'bold 24px "Neue Montreal", sans-serif';
      nodeButtonCtx.fillStyle = '#000';
      nodeButtonCtx.textAlign = 'center';
      nodeButtonCtx.textBaseline = 'middle';
      nodeButtonCtx.fillText('E', indicatorX + indicatorSize / 2, indicatorY + indicatorSize / 2 + 1);
      
      // Draw Text ("INFO")
      nodeButtonCtx.font = 'bold 28px "Neue Montreal", sans-serif';
      nodeButtonCtx.fillStyle = '#FFFFFF';
      nodeButtonCtx.textAlign = 'left';
      nodeButtonCtx.textBaseline = 'middle';
      nodeButtonCtx.fillText(text, indicatorX + indicatorSize + indicatorMargin, totalHeight / 2 + 1);
      
      // Create button texture and material
      const nodeButtonTex = new THREE.CanvasTexture(nodeButtonCanvas);
      nodeButtonTex.needsUpdate = true;
      nodeButtonTex.minFilter = THREE.LinearFilter;
      nodeButtonTex.magFilter = THREE.LinearFilter;
      const nodeButtonMat = new THREE.MeshBasicMaterial({ map: nodeButtonTex, transparent: true, side: THREE.DoubleSide });
      
      // Create button mesh
      const buttonAspect = nodeButtonCanvas.width / nodeButtonCanvas.height;
      const buttonHeight = 0.22;
      const buttonWidth = buttonHeight * buttonAspect;
      const nodeButtonMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(buttonWidth, buttonHeight),
        nodeButtonMat
      );
      
      // Position button above and in front of the node
      nodeButtonMesh.position.set(
        node.position.x,
        node.position.y + 1.0,
        node.position.z + 0.8
      );
      nodeButtonMesh.rotation.y = 0;
      nodeButtonMesh.renderOrder = 9999;
      nodeButtonMesh.visible = true;
      nodeButtonMesh.name = 'nodeInfoButton';
      interiorGroup.add(nodeButtonMesh);
      
      // Create interaction mesh for the node
      const nodeInteractionGeom = new THREE.BoxGeometry(1.0, 2.0, 1.0);
      const nodeInteractionMat = new THREE.MeshBasicMaterial({ visible: false });
      const nodeInteractionMesh = new THREE.Mesh(nodeInteractionGeom, nodeInteractionMat);
      nodeInteractionMesh.position.copy(node.position);
      nodeInteractionMesh.userData.interactable = true;
      nodeInteractionMesh.userData.isNodeInfo = true;
      nodeInteractionMesh.userData.nodeType = node.type;
      
      // Set dynamic content based on node type
      switch(node.type) {
        case 'flow':
          nodeInteractionMesh.userData.link = 'https://parsaa74.github.io/Semantic-Biome/index-3d.html';
          nodeInteractionMesh.userData.infoContent = `This is a flow node representing the Semantic Biome - a three-dimensional typographic ecosystem where autonomous character-based organisms coexist and interact. Each entity exists within a complex volumetric ecosystem, governed by algorithmic behaviors that simulate evolutionary patterns and emergent intelligence.\n\nClick the link to explore this digital meditation on how meaning emerges from seemingly random interactions.`;
          break;
        case 'data':
          nodeInteractionMesh.userData.link = 'https://parsaa74.github.io/Philosophical-Toys/';
          nodeInteractionMesh.userData.infoContent = `This is a data node representing Philosophical Toys - an interactive timeline exploring the intersection of philosophy, computation, and creative expression. It demonstrates how datasets and temporal information can be transformed into engaging interactive experiences.\n\nClick the link to explore this collection of philosophical interactive experiments.`;
          break;
        case 'compute':
          nodeInteractionMesh.userData.link = 'https://parsaa74.github.io/Semantic-Biome/index-3d.html';
          nodeInteractionMesh.userData.infoContent = `This is a compute node representing the processing power behind generative algorithms. Like the Semantic Biome, it embodies the mathematical operations that transform code into visual poetry, showcasing how computational systems create emergent typographic ecosystems.\n\nClick the link to explore the Semantic Biome's computational design principles.`;
          break;
        case 'network':
          nodeInteractionMesh.userData.link = 'https://parsaa74.github.io/Semantic-Biome/index-3d.html';
          nodeInteractionMesh.userData.infoContent = `This is a network node representing the interconnected nature of digital systems. It visualizes how individual elements combine to create complex emergent behaviors, much like the autonomous character-based organisms in the Semantic Biome ecosystem.\n\nClick the link to explore network-based interactions in the Semantic Biome.`;
          break;
        default:
          nodeInteractionMesh.userData.link = 'http://parsaa74.github.io/german-art-schools';
          nodeInteractionMesh.userData.infoContent = `This is a generative node representing the intersection of code and creativity. It showcases how mathematical operations can transform into visual experiences.\n\nClick the link to explore more.`;
      }
      
      nodeInteractionMesh.name = 'nodeInfoInteraction';
      interiorGroup.add(nodeInteractionMesh);
      
      // Add to node info interactables for getInteractableObjects
      if (!this._nodeInfoInteractables) this._nodeInfoInteractables = [];
      this._nodeInfoInteractables.push(nodeInteractionMesh);
      
      console.log(`Created info button for ${node.type} node at position (${node.position.x.toFixed(2)}, ${node.position.y.toFixed(2)}, ${node.position.z.toFixed(2)})`);
    });
    
    // --- Create Interactive Terminal (modified from original) ---
    const terminalWidth = 4.0;
    const terminalHeight = 4.0;
    
    // Create a dynamic canvas for the terminal
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    
    // --- NEW: Draw terminal window UI ---
    const drawTerminalWindow = (time) => {
      // Background
      ctx.fillStyle = '#1a1a1a'; // Dark background
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
      // Border
      ctx.strokeStyle = '#33ff33'; // Bright green border
      ctx.lineWidth = 6; // Thicker border
      ctx.strokeRect(0, 0, canvas.width, canvas.height);
      
      // Title Bar
      const titleBarHeight = 60;
      ctx.fillStyle = '#0d0d0d'; // Slightly darker title bar
      ctx.fillRect(ctx.lineWidth / 2, ctx.lineWidth / 2, canvas.width - ctx.lineWidth, titleBarHeight);
      
      // Title Text
      ctx.font = 'bold 32px "Neue Montreal", monospace';
      ctx.fillStyle = '#33ff33';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('tty0', canvas.width / 2, titleBarHeight / 2 + 5); // Changed "TERMINAL" to "tty0"
          
      // Control Buttons (simple circles)
      const buttonRadius = 12;
      const buttonY = titleBarHeight / 2 + 5;
      const buttonSpacing = 40;
      // Close (red)
      ctx.fillStyle = '#ff5f57';
          ctx.beginPath();
      ctx.arc(buttonSpacing, buttonY, buttonRadius, 0, Math.PI * 2);
          ctx.fill();
      // Minimize (yellow)
      ctx.fillStyle = '#febc2e';
                ctx.beginPath();
      ctx.arc(buttonSpacing * 2, buttonY, buttonRadius, 0, Math.PI * 2);
      ctx.fill();
      // Maximize (green)
      ctx.fillStyle = '#28cd41';
      ctx.beginPath();
      ctx.arc(buttonSpacing * 3, buttonY, buttonRadius, 0, Math.PI * 2);
      ctx.fill();
      
      // Terminal Content Area
      const contentStartY = titleBarHeight + ctx.lineWidth / 2 + 20;
      const contentPadding = 40;
      
      // Existing code-like text overlay (adjusted position)
      ctx.font = '18px "JetBrains Mono", monospace'; // Slightly larger font
      ctx.fillStyle = '#33ff33';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top'; // Align text to top of line
      
      const timeOffset = Math.floor(time * 3) % 10;
      const codeLines = [ // Updated content for a more "suckless" feel
        `[${(time*1000).toFixed(0)}] boot_params: ro quiet splash`,
        `[${(time*1000+15).toFixed(0)}] kernel: microcode: updated early to revision 0x01`,
        `[${(time*1000+40).toFixed(0)}] systemd[1]: Starting basic system...`,
        `[${(time*1000+55).toFixed(0)}] /dev/kvm: KVM configured`,
        `--------------------------------------------------`,
        `  #!/bin/sh`,
        `  # simple.sh - a truly minimal script`,
        `  while true; do`,
        `    echo "dwm rocks" > /dev/null`,
        `    sleep 0.1`,
        `  done`,
        `--------------------------------------------------`,
        `[${(time*1000+100).toFixed(0)}] Console: switching to colour frame buffer...`,
        `login:`
      ];
      
      let y = contentStartY;
      codeLines.forEach(line => {
        if (y < canvas.height - ctx.lineWidth - 20) { // Prevent overflow
          ctx.fillText(line, contentPadding, y);
          y += 26; // Line height
        }
      });
    
      // Blinking cursor (optional)
      if (Math.floor(time * 2) % 2 === 0) {
        ctx.fillStyle = '#33ff33';
        ctx.fillRect(contentPadding, y, 10, 20); // Draw cursor
      }
    };
    
    // Initial draw using the new function
    drawTerminalWindow(performance.now() * 0.001);
    // --- END NEW UI DRAWING ---
    
    // Create terminal material with the canvas texture
    const screenTexture = new THREE.CanvasTexture(canvas);
    
    const terminalMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: screenTexture,
      emissive: 0xffffff,
      emissiveMap: screenTexture,
      emissiveIntensity: 0.7,
      metalness: 0.3,
      roughness: 0.4,
      transparent: true
    });
    
    // Rounded rectangle frame (same as original)
    const frameThickness = 0.08;
    const frameRadius = 0.12;
    // Use a rounded rectangle shape for the frame
    const shape = new THREE.Shape();
    const w = terminalWidth + frameThickness;
    const h = terminalHeight + frameThickness;
    shape.absarc(-w/2 + frameRadius, -h/2 + frameRadius, frameRadius, Math.PI, Math.PI/2, true);
    shape.absarc(w/2 - frameRadius, -h/2 + frameRadius, frameRadius, Math.PI/2, 0, true);
    shape.absarc(w/2 - frameRadius, h/2 - frameRadius, frameRadius, 0, -Math.PI/2, true);
    shape.absarc(-w/2 + frameRadius, h/2 - frameRadius, frameRadius, -Math.PI/2, -Math.PI, true);
    const extrudeSettings = { depth: 0.08, bevelEnabled: false };
    const frameGeometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    const frameMaterial = new THREE.MeshStandardMaterial({
      color: 0x22262a,
      metalness: 0.7,
      roughness: 0.25,
      emissive: 0x0a0a1a,
      emissiveIntensity: 0.2
    });
    
//     // Create the terminal screen
    const terminal = new THREE.Mesh(
      new THREE.PlaneGeometry(terminalWidth, terminalHeight),
      terminalMaterial
    );
    terminal.position.set(center.x - size.x/2 + 0.14, center.y + 1.2, center.z);
    terminal.rotation.y = Math.PI/2;
    terminal.name = 'dev_terminal';
    interiorGroup.add(terminal);
    
    // Set up animation for the terminal screen
    this._terminalCanvas = canvas;
    this._terminalTexture = screenTexture;
    this._terminalLastUpdate = performance.now();
    this._terminalUpdateInterval = 500; // Update every 500ms for performance
    this._terminalDrawFunction = drawTerminalWindow; // Store drawing function
    
    // Add floating E button in front of the screen, at the same height (unchanged)
    // --- NEW: Update E button appearance ---
    const eButtonCanvas = document.createElement('canvas');
    // Adjust canvas size for potentially wider button
    eButtonCanvas.width = 320; // Keep width
    eButtonCanvas.height = 100; // Reduce height slightly
    const eButtonCtx = eButtonCanvas.getContext('2d');

    // ... existing code ...
    getAssetPath("./src/shaders/common/vertex.txt")
    // ... existing code ...
  }

  // ... existing code ...
  getAssetPath("./src/shaders/common/vertex.txt")
  // ... existing code ...
  getAssetPath("./src/shaders/wall.txt")
  // ... existing code ...
  getAssetPath("./src/shaders/common/vertex.txt")
  // ... existing code ...
  getAssetPath("./src/shaders/corridor.txt")
  // ... existing code ...
  getAssetPath('assets/models/glb/door-frame.glb'),
  // ... existing code ...