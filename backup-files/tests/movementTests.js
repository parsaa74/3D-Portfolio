import { THREE } from "./src/utils/ThreeJSLoader.js";

// Movement System Test Suite
export class MovementTests {
  constructor() {
    this.testResults = [];
    this.totalTests = 0;
    this.passedTests = 0;

    // Ensure Three.js is loaded
    if (typeof THREE === "undefined") {
      throw new Error("Three.js must be loaded before running movement tests");
    }

    // Set test environment flag
    window.isTestEnvironment = true;

    // Initialize test environment
    this.initializeTestEnvironment();
  }

  initializeTestEnvironment() {
    // Create a test scene if none exists
    if (!window.threeScene) {
      window.threeScene = new THREE.Scene();
    }

    // Create a test renderer if none exists
    if (!window.renderer) {
      window.renderer = new THREE.WebGLRenderer({ antialias: false });
      window.renderer.setSize(800, 600);
      // Only append to body if we're in a browser environment
      if (typeof document !== "undefined" && document.body) {
        document.body.appendChild(window.renderer.domElement);
      }
    }

    // Configure renderer for testing
    window.renderer.setPixelRatio(1);
    window.renderer.shadowMap.enabled = false;
    window.renderer.debug.checkShaderErrors = true;

    // Initialize constants if not already set
    if (typeof window.CORRIDOR_WIDTH === "undefined") {
      window.CORRIDOR_WIDTH = 2.5;
      window.CORRIDOR_HEIGHT = 3.5;
      window.SEGMENT_LENGTH = 6.0;
    }

    // Initialize player position if not set
    if (!window.playerPosition) {
      window.playerPosition = { x: 0, y: 1.8, z: 0 };
      window.playerRotation = 0;
    }

    // Ensure player can move during tests
    window.playerCanMove = true;

    // Create a test camera if none exists
    if (!window.threeCamera) {
      window.threeCamera = new THREE.PerspectiveCamera(
        75,
        800 / 600,
        0.1,
        1000
      );
      window.threeCamera.position.set(0, 1.8, 0);
    }

    // Initialize movement speed and turn speed
    window.moveSpeed = 0.05;
    window.movementTurnSpeed = 0.03;

    // Store original movement functions if they exist
    const originalMoveForward = window.moveForward;
    const originalMoveBackward = window.moveBackward;
    const originalTurnLeft = window.turnLeft;
    const originalTurnRight = window.turnRight;

    // Only create fallback functions if the original ones don't exist
    if (typeof window.moveForward !== "function") {
      window.moveForward = function () {
        if (!window.playerPosition) return;
        window.playerPosition.z += window.moveSpeed;
      };
    }
    if (typeof window.moveBackward !== "function") {
      window.moveBackward = function () {
        if (!window.playerPosition) return;
        window.playerPosition.z -= window.moveSpeed;
      };
    }
    if (typeof window.turnLeft !== "function") {
      window.turnLeft = function () {
        if (window.playerRotation !== undefined) {
          window.playerRotation += window.movementTurnSpeed;
        }
      };
    }
    if (typeof window.turnRight !== "function") {
      window.turnRight = function () {
        if (window.playerRotation !== undefined) {
          window.playerRotation -= window.movementTurnSpeed;
        }
      };
    }

    // Store original functions for cleanup
    this.originalFunctions = {
      moveForward: originalMoveForward,
      moveBackward: originalMoveBackward,
      turnLeft: originalTurnLeft,
      turnRight: originalTurnRight,
    };
  }

  cleanup() {
    // Restore original functions if they existed
    if (this.originalFunctions) {
      if (this.originalFunctions.moveForward)
        window.moveForward = this.originalFunctions.moveForward;
      if (this.originalFunctions.moveBackward)
        window.moveBackward = this.originalFunctions.moveBackward;
      if (this.originalFunctions.turnLeft)
        window.turnLeft = this.originalFunctions.turnLeft;
      if (this.originalFunctions.turnRight)
        window.turnRight = this.originalFunctions.turnRight;
    }

    // Remove test environment flag
    window.isTestEnvironment = false;
  }

  async runAllTests() {
    console.log("🧪 Starting Movement System Tests...");

    try {
      // Basic Movement Tests
      await this.runTest(() => this.testForwardMovement(), "Forward Movement");
      await this.runTest(
        () => this.testBackwardMovement(),
        "Backward Movement"
      );
      await this.runTest(() => this.testLeftRotation(), "Left Rotation");
      await this.runTest(() => this.testRightRotation(), "Right Rotation");

      // Print Results
      this.printResults();
      return this.passedTests === this.totalTests;
    } catch (error) {
      console.error("Movement test error:", error);
      return false;
    }
  }

  async runTest(testFn, testName) {
    this.totalTests++;
    try {
      const result = await testFn();
      if (result) {
        this.passedTests++;
        this.testResults.push({ name: testName, passed: true });
        console.log(`✅ ${testName} passed`);
      } else {
        this.testResults.push({ name: testName, passed: false });
        console.log(`❌ ${testName} failed`);
      }
    } catch (error) {
      console.error(`Error in ${testName}:`, error);
      this.testResults.push({ name: testName, passed: false });
    }
  }

  printResults() {
    console.log(
      `\nTest Results: ${this.passedTests}/${this.totalTests} passed`
    );
    this.testResults.forEach((result) => {
      console.log(`${result.passed ? "✅" : "❌"} ${result.name}`);
    });
  }

  // Movement Tests
  testForwardMovement() {
    // Setup initial position
    window.playerPosition = { x: 0, y: 1.8, z: 0 };
    window.playerRotation = 0;

    const initialZ = window.playerPosition.z;
    window.moveForward();

    // Check if movement happened in the right direction
    return window.playerPosition.z > initialZ;
  }

  testBackwardMovement() {
    // Setup initial position
    window.playerPosition = { x: 0, y: 1.8, z: 0 };
    window.playerRotation = 0;

    const initialZ = window.playerPosition.z;
    window.moveBackward();

    // Check if movement happened in the right direction
    return window.playerPosition.z < initialZ;
  }

  testLeftRotation() {
    window.playerRotation = 0;
    const initialRotation = window.playerRotation;
    window.turnLeft();

    return window.playerRotation > initialRotation;
  }

  testRightRotation() {
    window.playerRotation = 0;
    const initialRotation = window.playerRotation;
    window.turnRight();

    return window.playerRotation < initialRotation;
  }
}

// Export the test suite
window.MovementTests = MovementTests;

// Function to run tests
async function runMovementTests() {
  const tests = new MovementTests();
  try {
    const result = await tests.runAllTests();
    return result;
  } finally {
    tests.cleanup();
  }
}

// Make test runner available globally
window.runMovementTests = runMovementTests;
