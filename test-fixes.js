#!/usr/bin/env node

/**
 * Simple test script to validate our fixes
 */

console.log("🧪 Testing AudioContext Fix...");

// Test 1: Verify AudioManager doesn't immediately create AudioContext
import { AudioManager } from './src/core/audio/AudioManager.js';

try {
  const audioManager = new AudioManager();
  console.log("✅ AudioManager created without throwing AudioContext errors");
  console.log("   - isInitialized:", audioManager.isInitialized);
  console.log("   - toneContext:", audioManager.toneContext === null ? "null (good)" : "initialized too early");
} catch (error) {
  console.error("❌ AudioManager creation failed:", error.message);
}

console.log("\n🧪 Testing Collision System Parameters...");

// Test 2: Verify collision system has correct parameters
import { UnifiedMovementController } from './src/systems/movement/UnifiedMovementController.js';

try {
  // Create a mock camera and environment
  const mockCamera = { 
    position: { copy: () => {}, set: () => {} },
    up: { set: () => {} },
    updateProjectionMatrix: () => {}
  };
  const mockEnvironment = { 
    gameState: { isPlaying: true },
    getCollidableWalls: () => []
  };
  
  const controller = new UnifiedMovementController(mockCamera, mockEnvironment);
  console.log("✅ UnifiedMovementController created successfully");
  console.log("   - collisionCheckSteps:", controller.collisionCheckSteps);
  console.log("   - playerRadius:", controller.playerRadius);
  
  if (controller.collisionCheckSteps === 5) {
    console.log("✅ Collision recursion depth increased correctly");
  } else {
    console.log("❌ Collision recursion depth not updated");
  }
} catch (error) {
  console.error("❌ UnifiedMovementController creation failed:", error.message);
}

console.log("\n🧪 Testing File Syntax...");

// Test 3: Check if the main files compile without syntax errors
try {
  import('./src/core/rendering/environments/SeveranceEnvironment.js').then(() => {
    console.log("✅ SeveranceEnvironment.js imports successfully (no syntax errors)");
  }).catch(error => {
    console.error("❌ SeveranceEnvironment.js has syntax errors:", error.message);
  });
} catch (error) {
  console.error("❌ Failed to test SeveranceEnvironment.js import:", error.message);
}

console.log("\n🎉 Basic validation complete!");
console.log("📋 Summary of fixes:");
console.log("   1. AudioContext deferred until user interaction");
console.log("   2. Collision recursion depth increased from 3 to 5");
console.log("   3. Better collision exit conditions to prevent micro-bouncing");
console.log("   4. Reduced logging noise in collision system"); 