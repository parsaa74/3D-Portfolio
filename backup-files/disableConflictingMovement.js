/**
 * Utility to disable conflicting movement systems
 * This file should be imported early in the app initialization
 */

// Set global flags to disable other movement systems
window.USE_PLAYER_SYSTEM = false;
window.USE_CORRIDOR_MOVEMENT = false;

// Override problematic movement functions if they exist
export function disableConflictingMovement() {
  console.log("Disabling conflicting movement systems");

  // Create backup of any existing handlers
  const originalKeyHandlers = {
    keydown: [],
    keyup: [],
    mousemove: [],
  };

  // Store original event handlers
  const originalAddEventListener = document.addEventListener;

  // Override addEventListener to intercept and filter movement-related listeners
  document.addEventListener = function (type, handler, options) {
    if (type === "keydown" || type === "keyup") {
      // Store original handler
      originalKeyHandlers[type].push(handler);

      // Create a wrapped handler that filters WASD/arrow keys
      const wrappedHandler = (event) => {
        // Skip if it's a movement key and we have an active movement controller
        if (
          window.activeMovementController &&
          [
            "KeyW",
            "KeyA",
            "KeyS",
            "KeyD",
            "ArrowUp",
            "ArrowDown",
            "ArrowLeft",
            "ArrowRight",
          ].includes(event.code)
        ) {
          return;
        }

        // Call original handler for other keys
        return handler(event);
      };

      // Call original addEventListener with our wrapped handler
      originalAddEventListener.call(document, type, wrappedHandler, options);
    } else {
      // For other event types, proceed normally
      originalAddEventListener.call(document, type, handler, options);
    }
  };

  // Disable specific movement systems if detected
  if (window.playerSystem) {
    console.log("Disabling PlayerSystem movement");
    window.playerSystem.enabled = false;
  }

  if (window.corridorMovement) {
    console.log("Disabling CorridorMovement system");
    window.corridorMovement.enabled = false;
  }

  // Check for any game engine movement systems
  if (window.engine && window.engine.systems) {
    if (window.engine.systems.has("player")) {
      console.log("Disabling Engine player system");
      const playerSystem = window.engine.systems.get("player");
      playerSystem._updateMovement = () => {}; // Replace with empty function
    }
  }

  console.log(
    "Movement systems disabled. UnifiedMovementController will handle all movement."
  );
}

// Automatically run when imported
disableConflictingMovement();

// Export a function to restore movement systems if needed (for debugging)
export function restoreMovementSystems() {
  console.log("Restoring original movement systems");
  document.addEventListener = originalAddEventListener;
}
