import * as THREE from "three";

/**
 * UnifiedMovementController - Handles all player movement and camera controls
 * using Three.js best practices.
 */
export class UnifiedMovementController {
  constructor(camera, environment) {
    // Core components
    this.camera = camera;
    this.environment = environment;

    // --- Professional Camera Rotation State ---
    // Use explicit yaw/pitch for robust FPS camera
    this.yaw = camera.rotation.y;
    this.pitch = camera.rotation.x;
    this.rotation = new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ'); // Use 'YXZ' order for FPS

    // Movement state
    this.position = camera.position.clone();
    this.velocity = new THREE.Vector3();

    // --- NEW: Movement Dynamics ---
    this.walkSpeed = 4.0; // Base walking speed
    this.runSpeed = 10.0; // Faster running speed
    this.isRunning = false;
    this.headBobTimer = 0;
    this.headBobIntensity = 0.03; // How much the head bobs vertically
    this.runHeadBobIntensity = 0.06; // More vertical bob when running
    this.headBobHorizontalIntensity = 0.02; // How much the head bobs horizontally
    this.runHeadBobHorizontalIntensity = 0.04; // More horizontal bob when running
    this.headBobFrequency = 10.0; // Speed of the bob
    this.runHeadBobFrequency = 15.0; // Faster bob when running
    this.baseFOV = this.camera.fov; // Store original FOV
    this.runFOV = this.camera.fov + 10; // Wider FOV when running
    this.acceleration = 0.1; // How quickly player accelerates
    this.decelerationFactor = 0.92; // How quickly player decelerates (closer to 1 is slower)
    // --- END NEW ---

    // --- ZOOM STATE ---
    this.zoomFOV = this.baseFOV;
    this.minZoomFOV = Math.max(20, this.baseFOV - 25); // Prevent extreme zoom
    this.maxZoomFOV = Math.min(90, this.baseFOV + 10);
    this.zoomStep = 2.5;
    this._wheelEvent = this.handleWheel.bind(this);
    // --- END ZOOM STATE ---

    // Add maze-navigation related properties
    this.currentSegment = null;
    this.lastSegmentChange = 0;
    this.segmentChangeDisorientation = 0;
    this.totalDistanceTraveled = 0;
    this.lastPosition = new THREE.Vector3(0, 1.8, 0);

    // Movement settings
    this.rotationSpeed = 3.0; // Increased rotation speed
    this.maxPitch = Math.PI / 2 - 0.01; // Clamp to ±89° to prevent flipping

    // Collision parameters
    this.playerRadius = 0.3; // Approximate player width/2
    this.playerHeight = 1.8; // Player eye height (already used for initial position)
    this.collisionCheckSteps = 3; // Max recursion depth for sliding

    // Input state
    this.input = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      mouseX: 0,
      mouseY: 0,
      shift: false, // <-- ADDED: Track shift key state
      interact: false, // <-- ADDED: Track 'E' key state for interaction
      arrowUp: false,
      arrowDown: false,
      arrowLeft: false,
      arrowRight: false,
    };

    // --- Camera Effects State (Moved from Environment) ---
    this.cameraEffects = {
        idleTime: 0,
        isIdle: true,
        targetFocus: null, // { position: THREE.Vector3, startTime: number }
        focusDuration: 0.25, // seconds
        lastAppliedBreathingOffset: 0 // Track last offset to apply delta
    };
    this.clock = new THREE.Clock(); // Need a clock for effects timing
    // -----------------------------------------------------

    // Make position and rotation available globally (for compatibility)
    window.playerPosition = this.position;
    window.playerRotation = 0;
    window.cameraPitch = 0;

    // Initialize movement as disabled by default
    // IMPORTANT: This flag determines if player input is processed
    window.playerCanMove = false; 
    
    // Store original reference to prevent multiple calls
    this._keyDownEvent = this.handleKeyDown.bind(this);
    this._keyUpEvent = this.handleKeyUp.bind(this);
    this._mouseMoveEvent = this.handleMouseMove.bind(this);

    // Set up event listeners
    this.setupEventListeners();

    // Create a flag to indicate this is the active controller
    window.activeMovementController = this;

    // Set camera up vector to prevent roll
    this.camera.up.set(0, 1, 0);

    // Add flag to fix first mouse move bug
    this._firstMouseMove = true;

    console.log("✓ UnifiedMovementController constructed and active");
  }

  /**
   * Explicitly enables player movement - call this when the game is ready
   */
  enableMovement() {
    console.log("enableMovement called. playerCanMove:", window.playerCanMove, "isPlaying:", this.environment?.gameState?.isPlaying);
    console.log("📢 ENABLING PLAYER MOVEMENT");
    window.playerCanMove = true;
    
    // Re-setup event listeners to ensure they're working
    this.setupEventListeners();
    
    // Focus the document to help with key capture
    document.body.focus();
    
    // Log the current state
    console.log(`Player movement enabled: playerCanMove=${window.playerCanMove}, isPlaying=${this.environment?.gameState?.isPlaying}`);
  }

  setupEventListeners() {
    // Remove any existing listeners to prevent conflicts
    document.removeEventListener("keydown", this._keyDownEvent);
    document.removeEventListener("keyup", this._keyUpEvent);
    document.removeEventListener("mousemove", this._mouseMoveEvent);
    document.removeEventListener("wheel", this._wheelEvent);

    // Add our listeners
    document.addEventListener("keydown", this._keyDownEvent);
    document.addEventListener("keyup", this._keyUpEvent);
    document.addEventListener("mousemove", this._mouseMoveEvent);
    document.addEventListener("wheel", this._wheelEvent, { passive: false });

    // FIX: Add a global event listener that will work regardless of focus
    window.addEventListener("keydown", (event) => {
      // Special handler for E key that will work even if other listeners fail
      if (event.code === "KeyE" || event.key === "e" || event.key === "E") {
        console.log("[Global Input] 'E' key detected at window level");
        // Use setTimeout to ensure this runs after any event propagation issues
        setTimeout(() => {
          // Force attempt interaction without checking playerCanMove
          try {
            console.log("[Global Input] Forcing interaction attempt");
            this._attemptInteraction();
          } catch (error) {
            console.error("[Global Input] Error in forced interaction:", error);
          }
        }, 0);
      }
    });

    console.log("✓ Movement event listeners installed");
  }

  handleKeyDown(event) {
    console.log("handleKeyDown:", event.code, "playerCanMove:", window.playerCanMove, "isPlaying:", this.environment?.gameState?.isPlaying);
    // --- NEW DEBUG LOG ---
    console.log(`[Input] KeyDown registered: ${event.code}, playerCanMove: ${window.playerCanMove}, isPlaying: ${this.environment?.gameState?.isPlaying}`);
    // --- END NEW DEBUG LOG ---

    console.log(`[Input] handleKeyDown triggered by key: ${event.code}`); // <-- ADD DEBUG LOG AT TOP
    
    // FIX: Special case for E key - process it regardless of movement state
    if (event.code === "KeyE" || event.key === "e" || event.key === "E") {
      console.log("[Input] 'E' key pressed! (Special handling)");
      this.input.interact = true;
      
      // Only attempt interaction if game is actually playing
      if (this.environment?.gameState?.isPlaying) {
        try {
          console.log("[Input] Calling _attemptInteraction...");
          this._attemptInteraction(); // Attempt interaction immediately on press
          console.log("[Input] _attemptInteraction call finished (no error thrown).");
        } catch (error) {
          console.error("[Input] Error calling _attemptInteraction:", error);
        }
      } else {
        console.log("[Input] Game is paused, not attempting interaction");
      }
      return; // Skip the movement check for E key
    }
    
    // --- ARROW KEYS: Set state for smooth rotation ---
    switch (event.code) {
      case "ArrowUp":
        this.input.arrowUp = true;
        return;
      case "ArrowDown":
        this.input.arrowDown = true;
        return;
      case "ArrowLeft":
        this.input.arrowLeft = true;
        return;
      case "ArrowRight":
        this.input.arrowRight = true;
        return;
    }
    
    // Check if movement is allowed
    if (!window.playerCanMove || !this.environment?.gameState?.isPlaying) {
      console.log(`[DEBUG] handleKeyDown returned early: playerCanMove=${window.playerCanMove}, isPlaying=${this.environment?.gameState?.isPlaying}`);
      return;
    }

    switch (event.code) {
      case "KeyW":
        this.input.forward = true;
        break;
      case "KeyS":
        this.input.backward = true;
        break;
      case "KeyA":
        this.input.left = true;
        break;
      case "KeyD":
        this.input.right = true;
        break;
      // --- NEW: Handle Shift Key ---
      case "ShiftLeft":
      case "ShiftRight":
        this.input.shift = true;
        this.isRunning = true; // Start running
        break;
      // --- END NEW ---
    }
  }

  handleKeyUp(event) {
    switch (event.code) {
      case "KeyW":
        this.input.forward = false;
        break;
      case "KeyS":
        this.input.backward = false;
        break;
      case "KeyA":
        this.input.left = false;
        break;
      case "KeyD":
        this.input.right = false;
        break;
      // --- NEW: Handle Shift Key ---
      case "ShiftLeft":
      case "ShiftRight":
        this.input.shift = false;
        this.isRunning = false; // Stop running
        break;
      // --- END NEW ---
      case "KeyE": // <-- ADDED: Reset interaction flag on key up
        this.input.interact = false;
        break;
      // Remove arrow keys from movement input (no-op now)
      case "ArrowUp":
        this.input.arrowUp = false;
        break;
      case "ArrowDown":
        this.input.arrowDown = false;
        break;
      case "ArrowLeft":
        this.input.arrowLeft = false;
        break;
      case "ArrowRight":
        this.input.arrowRight = false;
        break;
    }
  }

  handleMouseMove(event) {
    // Check if movement is allowed
    if (!window.playerCanMove || !this.environment?.gameState?.isPlaying) {
      return;
    }

    // Fix: On first mouse move, sync yaw/pitch to camera and skip delta
    if (this._firstMouseMove) {
      this.yaw = this.camera.rotation.y;
      this.pitch = this.camera.rotation.x;
      this.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
      this._firstMouseMove = false;
      return;
    }

    // Get mouse movement
    const movementX = event.movementX || 0;
    const movementY = event.movementY || 0;

    // Update yaw and pitch
    this.yaw -= movementX * 0.002;
    this.pitch -= movementY * 0.002;
    // Clamp pitch to prevent flipping
    this.pitch = Math.max(-this.maxPitch, Math.min(this.maxPitch, this.pitch));

    // Update rotation Euler (YXZ order for FPS)
    this.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
    window.playerRotation = this.yaw;
    window.cameraPitch = this.pitch;

    // Apply rotation to camera
    this.camera.rotation.copy(this.rotation);
    // Always set up vector to prevent roll
    this.camera.up.set(0, 1, 0);
  }

  handleWheel(event) {
    // Prevent page scroll
    event.preventDefault();
    // Only allow zoom if movement is enabled and game is playing
    if (!window.playerCanMove || !this.environment?.gameState?.isPlaying) return;
    if (event.deltaY < 0) {
      // Zoom in
      this.zoomFOV = Math.max(this.minZoomFOV, this.zoomFOV - this.zoomStep);
    } else if (event.deltaY > 0) {
      // Zoom out
      this.zoomFOV = Math.min(this.maxZoomFOV, this.zoomFOV + this.zoomStep);
    }
  }

  /**
   * Attempts to interact with an object the player is looking at.
   * Called when the interaction key ('E') is pressed.
   * @private
   */
  _attemptInteraction() {
    console.log("[Interaction] _attemptInteraction called."); // <-- ADD DEBUG LOG
    
    // Check if environment exists and has the necessary methods
    console.log("[Interaction] Checking environment..."); // Log before check
    if (!this.environment) {
      console.warn("[Interaction] Environment is null or undefined.");
      return;
    }
    
    if (typeof this.environment.getInteractableObjects !== 'function') {
      console.warn("[Interaction] Environment does not support getInteractableObjects().");
      return;
    }
    console.log("[Interaction] Environment check passed."); // Log after check

    console.log("[Interaction] Calling getInteractableObjects..."); // Log before call
    const interactableObjects = this.environment.getInteractableObjects();
    console.log(`[Interaction] getInteractableObjects returned: ${interactableObjects ? interactableObjects.length : 'null/undefined'} objects`); // Log after call

    if (!interactableObjects || interactableObjects.length === 0) {
      console.log("[Interaction] No interactable objects found."); // Changed to visible log
      return;
    }

    // Find terminal interaction objects specifically looking for the interaction mesh
    const terminalInteractions = interactableObjects.filter(obj => 
      obj && obj.userData && (
        obj.userData.isDevTerminal || // The terminal itself
        obj.name === 'dev_terminal_interaction' // The interaction volume
      )
    );
    
    let isNearTerminal = false;
    if (terminalInteractions.length > 0) {
      // Create a raycaster to check if we're looking at the terminal
      const terminalRaycaster = new THREE.Raycaster();
      const cameraDirection = new THREE.Vector3();
      this.camera.getWorldDirection(cameraDirection);
      terminalRaycaster.set(this.camera.position, cameraDirection);
      terminalRaycaster.far = 10; // Longer distance for easier interaction
      
      // Check if we're looking at the terminal
      const terminalIntersects = terminalRaycaster.intersectObjects(terminalInteractions, true);
      
      if (terminalIntersects.length > 0) {
        // We're looking at the terminal and it's in range
        console.log("[Interaction] Looking at terminal:", terminalIntersects[0].object.name);
        // Also check proximity
        const worldPos = new THREE.Vector3();
        terminalIntersects[0].object.getWorldPosition(worldPos);
        const distToTerminal = this.camera.position.distanceTo(worldPos);
        
        if (distToTerminal <= 5.0) { // Slightly larger distance than the visual E button
          console.log("[Interaction] Terminal in range, distance:", distToTerminal);
          isNearTerminal = true;
          
          // Show the dev terminal overlay and block movement
          if (typeof window.showDevTerminalOverlay === 'function') {
            window.showDevTerminalOverlay();
          } else {
            // Fallback: show the overlay div directly
            const overlay = document.getElementById('dev-terminal-overlay');
            if (overlay) overlay.style.display = 'block';
          }
          // Block movement (disable pointer lock, etc.)
          if (typeof this.disableMovement === 'function') {
            this.disableMovement();
          }
          return; // Do not process doors or other interactions
        }
      } else {
        // We're not looking at the terminal
        console.log("[Interaction] Terminal found but not looking at it");
      }
    }
    
    if (!isNearTerminal) {
      console.log("[Interaction] No terminal in interaction range or not looking at it");
    }

    // FIX: Create a fresh raycaster each time
    const interactionRaycaster = new THREE.Raycaster();
    const cameraDirection = new THREE.Vector3();
    this.camera.getWorldDirection(cameraDirection);

    // FIX: Log camera position and direction
    console.log(`[Interaction] Camera position: (${this.camera.position.x.toFixed(2)}, ${this.camera.position.y.toFixed(2)}, ${this.camera.position.z.toFixed(2)})`);
    console.log(`[Interaction] Camera direction: (${cameraDirection.x.toFixed(2)}, ${cameraDirection.y.toFixed(2)}, ${cameraDirection.z.toFixed(2)})`);

    // FIX: Increase interaction distance for easier testing
    interactionRaycaster.set(this.camera.position, cameraDirection);
    const interactionDistance = 10; // Increased from 5 for easier testing
    interactionRaycaster.far = interactionDistance;

    // FIX: Log object names to check
    console.log(`[Interaction] Checking against the following objects:`);
    interactableObjects.forEach((obj, index) => {
      if (obj && obj.userData) {
        console.log(`  [${index}] ${obj.name || 'unnamed'} (type: ${obj.type}), userData:`, obj.userData);
        // Specifically check for node info objects
        if (obj.userData.isNodeInfo) {
          console.log(`    ^ This is a NODE INFO object!`);
        }
      } else {
        console.log(`  [${index}] Invalid object (missing userData)`);
      }
    });

    // FIX: Set precision to 'standard' for better hit detection
    interactionRaycaster.params.Mesh = interactionRaycaster.params.Mesh || {};
    interactionRaycaster.params.Mesh.threshold = 0.1; // Lower threshold for better hit detection
    
    // Check for intersections
    let intersects;
    try {
      intersects = interactionRaycaster.intersectObjects(interactableObjects, true); // Check descendants
    } catch (error) {
      console.error("[Interaction] Error during raycasting:", error);
      return;
    }

    // --- DEBUG LOGGING: Raycast Results --- 
    if (intersects && intersects.length > 0) {
        console.log(`[DEBUG] Raycast hit ${intersects.length} objects:`, intersects.map(i => i.object.name || 'unnamed'));
        
        // Log details about each hit
        intersects.forEach((hit, index) => {
          console.log(`  [Hit ${index}] Object: ${hit.object.name || 'unnamed'}, distance: ${hit.distance.toFixed(2)}`);
          console.log(`    userData:`, hit.object.userData);
          
          // Get world position of the hit
          const hitPoint = hit.point.clone();
          console.log(`    hit point: (${hitPoint.x.toFixed(2)}, ${hitPoint.y.toFixed(2)}, ${hitPoint.z.toFixed(2)})`);
        });
        
        const hit = intersects[0];
        console.log(`[DEBUG] Closest hit object userData:`, hit.object.userData);
    } else {
        console.log("[DEBUG] Raycast did not hit any interactable objects within range.");
    }
    // --- END DEBUG LOGGING ---

    if (intersects && intersects.length > 0) {
      const closestIntersect = intersects[0];
      const targetObject = closestIntersect.object;

      // === DEV TERMINAL INTERACTION ===
      if (targetObject.userData && targetObject.userData.isDevTerminalEButton) {
        // Show the dev terminal overlay and block movement
        if (typeof window.showDevTerminalOverlay === 'function') {
          window.showDevTerminalOverlay();
        } else {
          // Fallback: show the overlay div directly
          const overlay = document.getElementById('dev-terminal-overlay');
          if (overlay) overlay.style.display = 'block';
        }
        // Block movement (disable pointer lock, etc.)
        if (typeof this.disableMovement === 'function') {
          this.disableMovement();
        }
        return; // Do not process doors or other interactions
      }
      
      // Poster interaction handling (added explicitly)
      if (targetObject.userData && targetObject.userData.isWatchInteractable) {
        console.log("[Interaction] Found poster interactable:", targetObject.userData.filmTitle);
        // trigger the poster interaction in the main app
        if (window.app && typeof window.app.handlePosterInteraction === 'function') {
          window.app.handlePosterInteraction(targetObject);
          return;
        }
        // Fall through to try other methods
      }
      // Art poster info interaction handling
      if (targetObject.userData && targetObject.userData.isArtInfoInteractable) {
        console.log("[Interaction] Found art poster interactable:", targetObject.userData.posterTitle);
        if (window.app && typeof window.app.handleArtPosterInteraction === 'function') {
          window.app.handleArtPosterInteraction(targetObject);
          return;
        }
      }

      // Node info interaction handling
      if (targetObject.userData && targetObject.userData.isNodeInfo) {
        console.log("[Interaction] Found node info interactable:", targetObject.userData.nodeType);
        console.log("[Interaction] Node userData:", targetObject.userData);
        if (window.app && typeof window.app.handleNodeInfoInteraction === 'function') {
          console.log("[Interaction] Calling handleNodeInfoInteraction...");
          window.app.handleNodeInfoInteraction(targetObject);
          return;
        } else {
          console.error("[Interaction] window.app.handleNodeInfoInteraction not found!");
          console.log("[Interaction] window.app:", window.app);
          console.log("[Interaction] handleNodeInfoInteraction type:", typeof window.app?.handleNodeInfoInteraction);
        }
      }

      // FIX: Extract doorName from userData
      const doorName = targetObject.userData?.doorName || 
                       targetObject.parent?.userData?.doorName ||
                       targetObject.name;
      
      console.log(`[Interaction] Found potential door: ${doorName}`);

      // FIX: Check if it's a valid door by asking the environment directly
      if (doorName && typeof this.environment.toggleDoorState === 'function') {
        console.log(`[Interaction] Attempting to toggle door: ${doorName}`);
        try {
          this.environment.toggleDoorState(doorName);
          console.log(`[Interaction] Door toggle successful for: ${doorName}`);
          
          // --- Trigger Focus Hint ---
          const doorInfo = window.doorLocations?.find(d => d.name === doorName);
          if (doorInfo && doorInfo.position) {
            this.cameraEffects.targetFocus = {
              position: doorInfo.position.clone().add(new THREE.Vector3(0, 1.5, 0)),
              startTime: this.clock.getElapsedTime()
            };
            console.log(`[UMC Camera Effect] Triggered focus hint towards ${doorName}`);
          }
          // --- End Focus Hint ---
          
          return; // Successfully interacted
        } catch (error) {
          console.error(`[Interaction] Error toggling door: ${error.message}`);
        }
      } else {
        console.warn(`[Interaction] Target '${targetObject.name}' hit, but could not be toggled. Missing or invalid doorName in userData.`);
      }

      // FIX: Legacy check for name-based matching (fallback)
      const targetName = targetObject.name?.toLowerCase().trim() || '';
      console.log(`[Interaction] Trying legacy name matching with: "${targetName}"`);

      // Only get valid door names once for efficiency
      const doorNames = Array.from(this.environment.doorStates?.keys() || []);
      console.log(`[Interaction] Available door names: ${doorNames.join(', ')}`);

      // Check if any door name contains this target name
      const matchingDoor = doorNames.find(name => 
        targetName.includes(name.toLowerCase()) || 
        name.toLowerCase().includes(targetName)
      );
      
      if (matchingDoor) {
        console.log(`[Interaction] Found matching door by name: ${matchingDoor}`);
        this.environment.toggleDoorState(matchingDoor);
      } else {
        console.log(`[Interaction] No matching door found by name.`);
      }
    } else {
      console.log("[Interaction] Raycast did not hit any interactable objects within range.");
    }
  }

  /**
   * Checks for collisions in the direction of movement and calculates sliding.
   * @param {THREE.Vector3} moveDelta - The intended movement vector for this frame.
   * @param {number} [recursionDepth=0] - Current depth of collision checks.
   * @returns {THREE.Vector3} The adjusted movement vector after collision checks.
   * @private - Renamed to indicate internal use
   */
  _checkCollision(moveDelta, recursionDepth = 0) {
    if (recursionDepth >= Math.min(this.collisionCheckSteps, 3)) {
      console.warn("[Collision] Max recursion depth reached, stopping movement.");
      return new THREE.Vector3(0, 0, 0); // Stop movement if too many bounces
    }

    const moveLength = moveDelta.length();
    if (moveLength < 0.005 || recursionDepth > 0 && moveLength < 0.01) {
      return moveDelta; // Not moving significantly or small slide movement
    }

    if (!this.environment || typeof this.environment.getCollidableWalls !== 'function') {
      console.warn("[Collision] No environment or getCollidableWalls method found.");
      return moveDelta; // Allow movement if no collision system available
    }

    const collidableWalls = this.environment.getCollidableWalls();
    if (collidableWalls.length === 0) {
      return moveDelta; // No walls to collide with
    }

    const currentPosition = this.position.clone();
    const moveDirection = moveDelta.clone().normalize();

    // --- IMPROVED: Multi-directional collision detection ---
    console.log(`[Collision Recur: ${recursionDepth}] Checking move: (${moveDelta.x.toFixed(3)}, ${moveDelta.y.toFixed(3)}, ${moveDelta.z.toFixed(3)})`);
    
    // Create a shell of raycasts around the player for more robust detection
    const raycaster = new THREE.Raycaster();
    const rayDirections = [
      moveDirection.clone(), // Center ray - primary movement direction
      new THREE.Vector3(moveDirection.x + 0.3, moveDirection.y, moveDirection.z + 0.3).normalize(), // Front right
      new THREE.Vector3(moveDirection.x - 0.3, moveDirection.y, moveDirection.z + 0.3).normalize(), // Front left
      new THREE.Vector3(moveDirection.x + 0.3, moveDirection.y, moveDirection.z - 0.3).normalize(), // Back right
      new THREE.Vector3(moveDirection.x - 0.3, moveDirection.y, moveDirection.z - 0.3).normalize()  // Back left
    ];
    
    // Multiple ray origins at different heights
    const rayOrigins = [
      currentPosition.clone(),                                     // At eye level
      currentPosition.clone().setY(currentPosition.y - 0.5),       // At chest level
      currentPosition.clone().setY(currentPosition.y - 1.0),       // At knee level
      currentPosition.clone().setY(currentPosition.y - 1.5)        // At foot level
    ];
    
    // Extended collision detection range
    const rayLength = moveLength + this.playerRadius * 1.5; // Increased safety margin
    
    // Check each ray direction from each origin
    let nearestIntersection = null;
    let nearestDistance = Infinity;
    
    for (const origin of rayOrigins) {
      for (const direction of rayDirections) {
        raycaster.set(origin, direction);
        raycaster.far = rayLength;
        
        const intersections = raycaster.intersectObjects(collidableWalls, false);
        
        for (const intersection of intersections) {
          // Accept any hit with a valid face - we're being conservative with collisions
          if (intersection.face) {
            // Get normalized dot product to favor head-on collisions
            const dotProduct = intersection.face.normal.dot(direction);
            
            // For walls we're moving toward, prioritize those most perpendicular to movement
            if (dotProduct < 0 && intersection.distance < nearestDistance) {
              nearestIntersection = intersection;
              nearestDistance = intersection.distance;
              console.log(`Hit: dist=${intersection.distance.toFixed(3)}, obj=${intersection.object.name}, dot=${dotProduct.toFixed(3)}`);
            }
          }
        }
      }
    }
    
    // If we found a collision within our range
    const epsilon = 0.01; // Increased epsilon for numerical stability
    if (nearestIntersection && nearestDistance <= rayLength + epsilon) {
      // --- Collision Detected ---
      // Calculate how far we can safely move
      const distanceToCollision = Math.max(0, nearestDistance - this.playerRadius * 1.2); // Extra safety margin
      const allowedMove = moveDirection.clone().multiplyScalar(distanceToCollision);

      // --- Sliding Calculation ---
      const remainingMoveDelta = moveDelta.clone().sub(allowedMove); // Vector representing the part of the move that was cut off
      const collisionPoint = nearestIntersection.point;
      const collisionNormal = nearestIntersection.face.normal.clone();

      // Project remaining movement onto the collision plane
      // slideVector = remainingMove - projection_of_remainingMove_onto_normal
      const projection = collisionNormal.multiplyScalar(remainingMoveDelta.dot(collisionNormal));
      let slideVector = remainingMoveDelta.clone().sub(projection);

      // Prevent vertical sliding on wall collision (if normal is mostly vertical wall)
      if (Math.abs(collisionNormal.y) < 0.5) {
        slideVector.y = 0;
      }

      console.log(`[Collision] Detected at distance ${nearestDistance.toFixed(3)}. Allowed move: ${distanceToCollision.toFixed(3)}`);

      // Dampen the slide vector slightly to prevent overshooting/instability
      const slideFriction = 0.9; // Increased friction for stability
      const dampedSlideVector = slideVector.multiplyScalar(slideFriction);

      // Recursively check for collisions along the slide path
      const allowedSlide = this._checkCollision(dampedSlideVector, recursionDepth + 1);

      // Final movement is the allowed path to the wall + the allowed slide along it
      const finalMove = allowedMove.add(allowedSlide);
      return finalMove;

    } else {
      // --- No Collision ---
      return moveDelta;
    }
  }

  update(deltaTime) {
    console.log("update called. playerCanMove:", window.playerCanMove, "isPlaying:", this.environment?.gameState?.isPlaying);
    // Check if movement is allowed
    if (!window.playerCanMove || !this.environment?.gameState?.isPlaying) {
      return;
    }

    // Ensure we have a valid deltaTime value to prevent jumps
    if (!deltaTime || deltaTime > 0.1) deltaTime = 0.016;
    const time = this.clock.getElapsedTime(); // Get current time for effects

    // --- Determine Current Speed ---
    const currentSpeed = this.isRunning ? this.runSpeed : this.walkSpeed;

    // Calculate movement direction
    const moveDirection = new THREE.Vector3();

    if (this.input.forward) moveDirection.z -= 1;
    if (this.input.backward) moveDirection.z += 1;
    if (this.input.left) moveDirection.x -= 1;
    if (this.input.right) moveDirection.x += 1;

    let actualMoveDelta = new THREE.Vector3();

    // Only process movement if there is input
    if (moveDirection.lengthSq() > 0) {
      moveDirection.normalize();

      // Rotate movement direction based on camera yaw
      moveDirection.applyEuler(new THREE.Euler(0, this.rotation.y, 0));

      // Calculate intended velocity for this frame
      const moveSpeed = currentSpeed * deltaTime;
      const intendedVelocity = moveDirection.multiplyScalar(moveSpeed);

      // Check for collisions before applying velocity
      actualMoveDelta = this._checkCollision(intendedVelocity); // Check collision

      // Apply movement with smooth acceleration (using the allowed delta)
      // Note: Lerping might feel weird with hard collision stops. Direct application might be better.
      // this.velocity.lerp(actualMoveDelta, 0.15);
      this.velocity.copy(actualMoveDelta); // Apply the adjusted velocity directly

      // Track distance traveled for maze disorientation effects
      const previousPosition = this.position.clone();

      // Update position using the (potentially adjusted) velocity
      this.position.add(this.velocity);

      // Clamp Y position to playerHeight after movement to prevent flying or falling under floor
      this.position.y = this.playerHeight;

      // Calculate distance traveled this frame
      const distanceTraveled = this.position.distanceTo(previousPosition);
      this.totalDistanceTraveled += distanceTraveled;

      // Update maze segment tracking
      this.updateSegmentTracking();

      // Apply subtle maze disorientation
      this.applyMazeDisorientation(deltaTime);

      // Force player position update in global space
      window.playerPosition.copy(this.position);

      // Update camera position
      this.camera.position.copy(this.position);

      // --- Get Head Bob Settings from Environment --- Moved inside movement block
      let headBobEnabled = true; // Default
      let actualHeadBobIntensity = this.headBobIntensity; // Default
      let actualHeadBobHorizontalIntensity = this.headBobHorizontalIntensity; // Default
      let currentHeadBobFrequency = this.headBobFrequency;
      // let headBobSpeedFactor = 1.0; // Default speed multiplier // Not used anymore

      if (this.environment?.gameState?.settings) {
          headBobEnabled = this.environment.gameState.settings.headBobEnabled ?? true;
          actualHeadBobIntensity = this.environment.gameState.settings.headBobIntensity ?? this.headBobIntensity;
          // Optional: Could also add a speed setting
          // headBobSpeedFactor = this.environment.gameState.settings.headBobSpeedFactor ?? 1.0;
      }

      // --- Head Bob Calculation --- Use environment settings
      const moveDistance = distanceTraveled; // distanceTraveled is calculated from previousPosition to current position AFTER velocity is applied.
      let headBobOffsetY = 0;
      let headBobOffsetX = 0;

      if (headBobEnabled && moveDistance > 0.001) { // Only bob if actually moving & enabled. Threshold reduced for sensitivity.
        const speedFactor = this.isRunning ? 1.5 : 1.0; // Make bob faster when running
        currentHeadBobFrequency = this.isRunning ? this.runHeadBobFrequency : this.headBobFrequency;
        this.headBobTimer += deltaTime * currentHeadBobFrequency * speedFactor;

        const verticalIntensity = this.isRunning ? this.runHeadBobIntensity : this.headBobIntensity;
        const horizontalIntensity = this.isRunning ? this.runHeadBobHorizontalIntensity : this.headBobHorizontalIntensity;

        headBobOffsetY = Math.sin(this.headBobTimer) * verticalIntensity;
        headBobOffsetX = Math.cos(this.headBobTimer * 0.5) * horizontalIntensity; // Horizontal bob at half frequency for a more natural sway

      } else {
        // Reset timer slowly if stopped to avoid jerky stop
        // this.headBobTimer = Math.max(0, this.headBobTimer - deltaTime * 2); // Old reset
        if (this.headBobTimer > 0) {
            this.headBobTimer = Math.max(0, this.headBobTimer - deltaTime * currentHeadBobFrequency * 0.5); // Slow down bob before stopping
             const residualIntensityFactor = this.headBobTimer / (deltaTime * currentHeadBobFrequency * 2); // Fade out intensity
            headBobOffsetY = Math.sin(this.headBobTimer) * actualHeadBobIntensity * 0.5 * residualIntensityFactor;
            headBobOffsetX = Math.cos(this.headBobTimer * 0.5) * actualHeadBobHorizontalIntensity * 0.5 * residualIntensityFactor;
        } else {
             this.headBobTimer = 0; // Ensure timer is fully reset
             headBobOffsetY = 0;
             headBobOffsetX = 0;
        }
        // Dampen bob when stopping, using the setting
        // headBobOffset = Math.sin(this.headBobTimer) * actualHeadBobIntensity * 0.5; // Old dampen
      }
      // --- Store headBobOffset for final calculation --- (don't apply yet)

      // Update camera position (X and Z from controller, Y handled by head bob)
      this.camera.position.x = this.position.x;
      this.camera.position.z = this.position.z;
      // this.camera.position.y = this.position.y; // Replaced by head bob logic above

      // Update global references (if needed)
      window.playerPosition.copy(this.position);
      // Rotation is handled in mouse move

      // Distance tracking (optional)
      this.totalDistanceTraveled += distanceTraveled;
      this.lastPosition.copy(this.position);

      // Update maze/segment tracking
      this.updateSegmentTracking();
      // Apply disorientation effect (if any)
      this.applyMazeDisorientation(deltaTime);

      // --- Camera Effects Calculation (Moved here) ---
      let breathingOffset = 0;
      // 1. Idle Breathing Effect
      if (this.environment?.gameState?.settings?.headBobEnabled && this.cameraEffects.isIdle && this.cameraEffects.idleTime > 0.5) { // Check setting
          const breatheFrequency = 0.5;
          const breatheAmplitude = 0.008;
          breathingOffset = Math.sin(this.cameraEffects.idleTime * breatheFrequency * Math.PI * 2) * breatheAmplitude;
      }
      const breathingOffsetDelta = breathingOffset - this.cameraEffects.lastAppliedBreathingOffset;
      this.cameraEffects.lastAppliedBreathingOffset = breathingOffset;

      // 2. Interaction Focus Hint Application
      let focusRotationApplied = false;
      if (this.cameraEffects.targetFocus) {
          const focusElapsed = time - this.cameraEffects.targetFocus.startTime;
          if (focusElapsed < this.cameraEffects.focusDuration) {
              const focusProgress = focusElapsed / this.cameraEffects.focusDuration;
              const targetQuat = new THREE.Quaternion();
              const lookMatrix = new THREE.Matrix4().lookAt(this.camera.position, this.cameraEffects.targetFocus.position, this.camera.up);
              targetQuat.setFromRotationMatrix(lookMatrix);
              const nudgeAmount = Math.sin(focusProgress * Math.PI) * 0.1;
              // Apply nudge directly to the base rotation before final camera update
              this.rotation.setFromQuaternion(this.camera.quaternion.clone().slerp(targetQuat, nudgeAmount * 0.05));
              focusRotationApplied = true;
              window.playerRotation = this.rotation.y; // Update global if needed
              window.cameraPitch = this.rotation.x;
          } else {
              this.cameraEffects.targetFocus = null; // Focus duration ended
          }
      }

      // --- Final Camera Update --- Apply all offsets and rotations
      this.camera.position.copy(this.position);
      // Apply head bob and breathing offsets relative to the calculated base position
      // this.camera.position.y += (headBobOffset ?? 0) + breathingOffsetDelta; // Old headbob application

      this.camera.position.y += headBobOffsetY + breathingOffsetDelta;
      // Clamp camera Y position to playerHeight plus offsets to prevent flying or going under
      this.camera.position.y = Math.max(this.playerHeight - 0.2, Math.min(this.camera.position.y, this.playerHeight + 0.3));
      // Apply horizontal head bob by creating a vector in camera's local right direction
      const rightVector = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
      this.camera.position.addScaledVector(rightVector, headBobOffsetX);

      // Apply rotation (either from mouse or focus hint)
      if (!focusRotationApplied) {
          // Apply standard mouse rotation if focus hint didn't override
          this.camera.rotation.copy(this.rotation);
          this.camera.up.set(0, 1, 0); // Always enforce up vector
      } else {
          // If focus hint applied rotation, ensure the internal `this.rotation` matches the camera's current state
          this.rotation.setFromQuaternion(this.camera.quaternion, 'YXZ');
          this.yaw = this.rotation.y;
          this.pitch = this.rotation.x;
          window.playerRotation = this.yaw; // Update globals again
          window.cameraPitch = this.pitch;
          this.camera.up.set(0, 1, 0); // Always enforce up vector
      }

    } else {
      // Decelerate when no input
      this.velocity.multiplyScalar(this.decelerationFactor);
      // Gradually reduce headbob when stopping if player was moving
        if (this.headBobTimer > 0) {
            const currentFreq = this.isRunning ? this.runHeadBobFrequency : this.headBobFrequency; // Use last active frequency
            this.headBobTimer = Math.max(0, this.headBobTimer - deltaTime * currentFreq * 0.5);
            const verticalIntensity = this.isRunning ? this.runHeadBobIntensity : this.headBobIntensity;
            const horizontalIntensity = this.isRunning ? this.runHeadBobHorizontalIntensity : this.headBobHorizontalIntensity;
            const residualIntensityFactor = Math.min(1, this.headBobTimer / (deltaTime * currentFreq * 2)); // Ensure factor doesn't exceed 1

            let headBobOffsetY = Math.sin(this.headBobTimer) * verticalIntensity * 0.5 * residualIntensityFactor;
            let headBobOffsetX = Math.cos(this.headBobTimer * 0.5) * horizontalIntensity * 0.5 * residualIntensityFactor;

            this.camera.position.y += headBobOffsetY;
            // Clamp camera Y position to playerHeight plus offsets to prevent flying or going under
            this.camera.position.y = Math.max(this.playerHeight - 0.2, Math.min(this.camera.position.y, this.playerHeight + 0.3));
            const rightVector = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
            this.camera.position.addScaledVector(rightVector, headBobOffsetX);
        } else {
            this.headBobTimer = 0; // Ensure timer is fully reset if it wasn't already
        }
    }
    // --- FOV Adjustment (always runs, even when not moving) ---
    let targetFOV = this.zoomFOV;
    if (this.isRunning) {
      targetFOV = Math.min(this.runFOV, this.zoomFOV);
    }
    if (Math.abs(this.camera.fov - targetFOV) > 0.1) {
      // Smoothly interpolate FOV
      this.camera.fov += (targetFOV - this.camera.fov) * deltaTime * 5.0;
      this.camera.updateProjectionMatrix();
    }
    // --- END FOV Adjustment ---

    // --- Smooth camera rotation with arrow keys ---
    const ARROW_ROTATE_SPEED = 2.5; // radians per second (tweak for feel)
    let arrowRotated = false;
    if (this.input.arrowUp) {
      this.pitch += ARROW_ROTATE_SPEED * deltaTime;
      arrowRotated = true;
    }
    if (this.input.arrowDown) {
      this.pitch -= ARROW_ROTATE_SPEED * deltaTime;
      arrowRotated = true;
    }
    if (this.input.arrowLeft) {
      this.yaw += ARROW_ROTATE_SPEED * deltaTime;
      arrowRotated = true;
    }
    if (this.input.arrowRight) {
      this.yaw -= ARROW_ROTATE_SPEED * deltaTime;
      arrowRotated = true;
    }
    if (arrowRotated) {
      // Clamp pitch to prevent flipping
      this.pitch = Math.max(-this.maxPitch, Math.min(this.maxPitch, this.pitch));
      // Update rotation Euler (YXZ order for FPS)
      this.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
      window.playerRotation = this.yaw;
      window.cameraPitch = this.pitch;
      // Apply rotation to camera
      this.camera.rotation.copy(this.rotation);
      this.camera.up.set(0, 1, 0);
    }
  }

  /**
   * Gets the current corridor segment or department player is in
   * This helps with maze disorientation and tracking
   * @returns {Object} Information about the current segment
   */
  getCurrentSegment() {
    // If there's an active environment with the necessary methods
    if (
      this.environment &&
      typeof this.environment.getCurrentSegment === "function"
    ) {
      return this.environment.getCurrentSegment();
    }

    // Check if there's a global corridorSegments map we can use
    if (window.corridorSegments && this.position) {
      // Use a simple distance check to each corridor segment's center
      let closestSegment = null;
      let closestDistance = Infinity;

      for (const [id, segment] of window.corridorSegments) {
        if (segment && segment.position) {
          const distance = this.position.distanceTo(segment.position);
          if (distance < closestDistance) {
            closestDistance = distance;
            closestSegment = { id: id, position: segment.position };
          }
        }
      }

      if (closestSegment) {
        return closestSegment;
      }
    }

    // Fallback if no better information is available
    return {
      id: "unknown",
      position: this.position.clone(),
      isJunction: false,
    };
  }

  /**
   * Updates tracking of which corridor segment the player is in
   * This enables disorientation effects when changing segments
   */
  updateSegmentTracking() {
    const currentSegment = this.getCurrentSegment();

    // Check if segment has changed
    if (
      this.currentSegment &&
      currentSegment &&
      currentSegment.id !== this.currentSegment.id
    ) {
      // Player has moved to a new segment
      this.lastSegmentChange = performance.now();

      // Create stronger disorientation effect in junctions and secret passages
      const segmentId = currentSegment.id?.toLowerCase() || "";

      if (
        segmentId.includes("junction") ||
        segmentId.includes("secret") ||
        segmentId.includes("loop") ||
        segmentId.includes("parallel")
      ) {
        // Higher disorientation in maze-specific areas
        this.segmentChangeDisorientation = 0.03;
      } else {
        // Normal disorientation for regular segment changes
        this.segmentChangeDisorientation = 0.01;
      }
    }

    // Update current segment
    this.currentSegment = currentSegment;
  }

  /**
   * Applies subtle disorientation effects when navigating the maze
   * Creates the psychological feeling of being slightly lost
   * @param {number} deltaTime Time since last frame
   */
  applyMazeDisorientation(deltaTime) {
    const now = performance.now();
    const timeSinceSegmentChange = now - this.lastSegmentChange;

    // Apply disorientation effect for a short period after segment change
    if (timeSinceSegmentChange < 2000 && this.segmentChangeDisorientation > 0) {
      // Calculate decreasing intensity
      const intensity =
        this.segmentChangeDisorientation * (1 - timeSinceSegmentChange / 2000);

      // Apply subtle rotation change
      if (Math.random() > 0.7) {
        // Only apply occasionally for subtle effect
        this.rotation.y += (Math.random() - 0.5) * intensity * deltaTime;
      }
    }

    // Every 100 units traveled, add tiny disorientation to create maze-like feel
    if (this.totalDistanceTraveled > 100) {
      this.totalDistanceTraveled = 0;
      this.rotation.y += (Math.random() - 0.5) * 0.01;
    }
  }

  /**
   * Returns the current velocity vector.
   * @returns {THREE.Vector3} The current velocity.
   */
  getVelocity() {
      return this.velocity.clone(); // Return a clone to prevent external modification
  }

  dispose() {
    // Remove event listeners
    document.removeEventListener("keydown", this._keyDownEvent);
    document.removeEventListener("keyup", this._keyUpEvent);
    document.removeEventListener("mousemove", this._mouseMoveEvent);
    document.removeEventListener("wheel", this._wheelEvent);

    // Clear active controller flag
    if (window.activeMovementController === this) {
      window.activeMovementController = null;
    }
  }
}
