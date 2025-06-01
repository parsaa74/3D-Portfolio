// 3D Utilities for Severance: The Game
// Helper functions for Three.js and 3D operations

/**
 * Creates a text texture for use in Three.js
 * @param {string} text - The text to display
 * @param {Object} options - Configuration options
 * @returns {THREE.CanvasTexture} - The generated texture
 */
window.createTextTexture = function (text, options = {}) {
  const fontSize = options.fontSize || 24;
  const fontFamily = options.fontFamily || "Arial, sans-serif";
  const fillStyle = options.fillStyle || "black";
  const backgroundColor = options.backgroundColor || "white";
  const padding = options.padding || 10;

  // Create a canvas to draw text
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  // Set canvas size - adjust for text size
  const maxWidth = options.maxWidth || 512;
  context.font = `${fontSize}px ${fontFamily}`;

  // Measure text width
  const textMetrics = context.measureText(text);
  const textWidth = Math.min(textMetrics.width + padding * 2, maxWidth);
  const textHeight = fontSize + padding * 2;

  // Set canvas dimensions
  canvas.width = textWidth;
  canvas.height = textHeight;

  // Draw background
  context.fillStyle = backgroundColor;
  context.fillRect(0, 0, canvas.width, canvas.height);

  // Draw text
  context.fillStyle = fillStyle;
  context.font = `${fontSize}px ${fontFamily}`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text, canvas.width / 2, canvas.height / 2);

  // Create texture from canvas
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;

  return texture;
};

/**
 * Add lighting to a Three.js scene
 * @param {THREE.Scene} scene - The scene to add lights to
 * @param {Object} options - Lighting options
 */
window.addSceneLighting = function (scene, options = {}) {
  const ambientIntensity = options.ambientIntensity || 0.4;
  const directionalIntensity = options.directionalIntensity || 0.6;

  // Add ambient light
  const ambientLight = new THREE.AmbientLight(0xffffff, ambientIntensity);
  scene.add(ambientLight);

  // Add directional light
  const directionalLight = new THREE.DirectionalLight(
    0xffffff,
    directionalIntensity
  );
  directionalLight.position.set(1, 1, 1);
  scene.add(directionalLight);

  return {
    ambientLight,
    directionalLight,
  };
};

/**
 * Create a simple material for Three.js objects
 * @param {Object} options - Material properties
 * @returns {THREE.Material} - The created material
 */
window.createMaterial = function (options = {}) {
  const type = options.type || "standard";
  const color = options.color || 0xffffff;
  const roughness = options.roughness !== undefined ? options.roughness : 0.5;
  const metalness = options.metalness !== undefined ? options.metalness : 0.0;

  let material;

  switch (type.toLowerCase()) {
    case "basic":
      material = new THREE.MeshBasicMaterial({
        color: color,
        transparent: options.transparent || false,
        opacity: options.opacity !== undefined ? options.opacity : 1.0,
      });
      break;
    case "phong":
      material = new THREE.MeshPhongMaterial({
        color: color,
        shininess: options.shininess || 30,
        specular: options.specular || 0x111111,
        transparent: options.transparent || false,
        opacity: options.opacity !== undefined ? options.opacity : 1.0,
      });
      break;
    case "standard":
    default:
      material = new THREE.MeshStandardMaterial({
        color: color,
        roughness: roughness,
        metalness: metalness,
        transparent: options.transparent || false,
        opacity: options.opacity !== undefined ? options.opacity : 1.0,
      });
  }

  return material;
};

/**
 * Animate the elevator doors opening or closing
 * @param {boolean} open - Whether to open (true) or close (false) the doors
 */
window.animateElevatorDoors = function (open) {
  // Check if elevator doors exist
  if (!window.elevatorDoors) {
    console.error("Elevator doors not found!");
    return;
  }

  // Check if animation is already in progress
  if (window.elevatorDoors.isAnimating) {
    console.log("Elevator door animation already in progress");
    return;
  }

  // Set animation in progress
  window.elevatorDoors.isAnimating = true;

  // Door animation parameters
  const doorOpenDistance = 0.6; // How far each door moves
  const animationDuration = 1000; // Animation duration in milliseconds
  const fps = 60; // Animation frames per second
  const totalFrames = (animationDuration / 1000) * fps;
  let currentFrame = 0;

  // Store initial positions for animation
  const leftInitialX = window.elevatorDoors.left.position.x;
  const rightInitialX = window.elevatorDoors.right.position.x;
  let leftInsetInitialX, rightInsetInitialX;

  if (window.elevatorDoors.leftInset) {
    leftInsetInitialX = window.elevatorDoors.leftInset.position.x;
  }
  if (window.elevatorDoors.rightInset) {
    rightInsetInitialX = window.elevatorDoors.rightInset.position.x;
  }

  // Check if we need to play a sound
  const soundPlayer = document.getElementById("elevatorDoorSound");
  if (soundPlayer) {
    soundPlayer.currentTime = 0;
    soundPlayer.play().catch((e) => console.error("Error playing sound:", e));
  } else {
    console.log("Elevator door sound element not found");
  }

  // Calculate how much to move on each frame
  const moveStep = doorOpenDistance / totalFrames;

  // Function to animate one frame
  function animateFrame() {
    currentFrame++;

    // Calculate how much to move this frame
    const progress = currentFrame / totalFrames;
    const ease = 0.5 - 0.5 * Math.cos(progress * Math.PI); // Smooth easing
    const moveAmount = doorOpenDistance * ease;

    if (open) {
      // Opening doors - move away from center
      window.elevatorDoors.left.position.x = leftInitialX - moveAmount;
      window.elevatorDoors.right.position.x = rightInitialX + moveAmount;

      if (window.elevatorDoors.leftInset) {
        window.elevatorDoors.leftInset.position.x =
          leftInsetInitialX - moveAmount;
      }
      if (window.elevatorDoors.rightInset) {
        window.elevatorDoors.rightInset.position.x =
          rightInsetInitialX + moveAmount;
      }
    } else {
      // Closing doors - move toward center
      window.elevatorDoors.left.position.x =
        leftInitialX - doorOpenDistance + moveAmount;
      window.elevatorDoors.right.position.x =
        rightInitialX + doorOpenDistance - moveAmount;

      if (window.elevatorDoors.leftInset) {
        window.elevatorDoors.leftInset.position.x =
          leftInsetInitialX - doorOpenDistance + moveAmount;
      }
      if (window.elevatorDoors.rightInset) {
        window.elevatorDoors.rightInset.position.x =
          rightInsetInitialX + doorOpenDistance - moveAmount;
      }
    }

    // Continue animation until done
    if (currentFrame < totalFrames) {
      requestAnimationFrame(animateFrame);
    } else {
      // Animation complete
      window.elevatorDoors.isOpen = open;
      window.elevatorDoors.isAnimating = false;
      console.log(
        "Elevator door animation complete, doors are now " +
          (open ? "open" : "closed")
      );

      // If we're opening doors, make hallway elements visible
      if (open && window.hallwayElements) {
        window.hallwayElements.forEach((element) => {
          element.visible = true;
        });
      }
    }
  }

  // Start animation
  console.log(
    "Starting elevator door animation - " + (open ? "opening" : "closing")
  );
  if (!open && window.hallwayElements) {
    // If closing doors, hide hallway elements
    window.hallwayElements.forEach((element) => {
      element.visible = false;
    });
  }

  animateFrame();
};

/**
 * Animate the second elevator doors opening or closing
 * @param {boolean} open - Whether to open (true) or close (false) the doors
 */
window.animateSecondElevatorDoors = function (open) {
  // Check if second elevator doors exist
  if (!window.secondElevatorDoors) {
    console.error("Second elevator doors not found!");
    return;
  }

  // Check if animation is already in progress
  if (window.secondElevatorDoors.isAnimating) {
    console.log("Second elevator door animation already in progress");
    return;
  }

  // Set animation in progress
  window.secondElevatorDoors.isAnimating = true;

  // Door animation parameters
  const doorOpenDistance = 0.6; // How far each door moves
  const animationDuration = 1000; // Animation duration in milliseconds
  const fps = 60; // Animation frames per second
  const totalFrames = (animationDuration / 1000) * fps;
  let currentFrame = 0;

  // Store initial positions for animation
  const leftInitialX = window.secondElevatorDoors.left.position.x;
  const rightInitialX = window.secondElevatorDoors.right.position.x;
  let leftInsetInitialX, rightInsetInitialX;

  if (window.secondElevatorDoors.leftInset) {
    leftInsetInitialX = window.secondElevatorDoors.leftInset.position.x;
  }
  if (window.secondElevatorDoors.rightInset) {
    rightInsetInitialX = window.secondElevatorDoors.rightInset.position.x;
  }

  // Check if we need to play a sound
  const soundPlayer = document.getElementById("elevatorDoorSound");
  if (soundPlayer) {
    soundPlayer.currentTime = 0;
    soundPlayer.play().catch((e) => console.error("Error playing sound:", e));
  } else {
    console.log("Elevator door sound element not found");
  }

  // Calculate how much to move on each frame
  const moveStep = doorOpenDistance / totalFrames;

  // Function to animate one frame
  function animateFrame() {
    currentFrame++;

    // Calculate how much to move this frame
    const progress = currentFrame / totalFrames;
    const ease = 0.5 - 0.5 * Math.cos(progress * Math.PI); // Smooth easing
    const moveAmount = doorOpenDistance * ease;

    if (open) {
      // Opening doors - move away from center
      window.secondElevatorDoors.left.position.x = leftInitialX - moveAmount;
      window.secondElevatorDoors.right.position.x = rightInitialX + moveAmount;

      if (window.secondElevatorDoors.leftInset) {
        window.secondElevatorDoors.leftInset.position.x =
          leftInsetInitialX - moveAmount;
      }
      if (window.secondElevatorDoors.rightInset) {
        window.secondElevatorDoors.rightInset.position.x =
          rightInsetInitialX + moveAmount;
      }
    } else {
      // Closing doors - move toward center
      window.secondElevatorDoors.left.position.x =
        leftInitialX - doorOpenDistance + moveAmount;
      window.secondElevatorDoors.right.position.x =
        rightInitialX + doorOpenDistance - moveAmount;

      if (window.secondElevatorDoors.leftInset) {
        window.secondElevatorDoors.leftInset.position.x =
          leftInsetInitialX - doorOpenDistance + moveAmount;
      }
      if (window.secondElevatorDoors.rightInset) {
        window.secondElevatorDoors.rightInset.position.x =
          rightInsetInitialX + doorOpenDistance - moveAmount;
      }
    }

    // Continue animation until done
    if (currentFrame < totalFrames) {
      requestAnimationFrame(animateFrame);
    } else {
      // Animation complete
      window.secondElevatorDoors.isOpen = open;
      window.secondElevatorDoors.isAnimating = false;
      console.log(
        "Second elevator door animation complete, doors are now " +
          (open ? "open" : "closed")
      );

      // If we're opening doors, make hallway elements visible
      if (open && window.secondElevatorHallwayElements) {
        window.secondElevatorHallwayElements.forEach((element) => {
          element.visible = true;
        });
      }
    }
  }

  // Start animation
  console.log(
    "Starting second elevator door animation - " +
      (open ? "opening" : "closing")
  );
  if (!open && window.secondElevatorHallwayElements) {
    // If closing doors, hide hallway elements
    window.secondElevatorHallwayElements.forEach((element) => {
      element.visible = false;
    });
  }

  animateFrame();
};

console.log("3D Utilities loaded successfully");
