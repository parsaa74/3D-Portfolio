import { THREE } from "./utils/ThreeJSLoader.js";

// Game constants
export const gameConstants = {
  CORRIDOR_WIDTH: 2.5,
  CORRIDOR_HEIGHT: 3.5,
  WALL_HEIGHT: 3.5,
  SEGMENT_LENGTH: 6.0,
  WALL_COLOR: 0xf6f6f6,
  FLOOR_COLOR: 0xeeeeee,
  CEILING_COLOR: 0xf8f8f8,
  WALL_THICKNESS: 0.1,
  CORRIDOR_BASEBOARD_COLOR: 0x232323,
  CORRIDOR_TRIM_HEIGHT: 0.1,
  LIGHTING_INTENSITY: 0.5,
  LIGHT_COLOR: 0xf7f7ef,
};

// WebGL compatibility check
export function checkWebGL() {
  const canvas = document.createElement("canvas");
  const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");

  if (!gl) {
    const errorMsg =
      "WebGL not supported. Please enable WebGL in your browser settings.";
    console.error(errorMsg);
    document.getElementById("emergency-instructions").innerHTML = `
      <strong>WebGL Not Available</strong><br>
      ${errorMsg}<br>
      <strong>How to fix:</strong><br>
      1. Enable WebGL in your browser settings<br>
      2. Try using Chrome or Firefox<br>
      3. Check if your graphics drivers are up to date<br>
      <button onclick="window.location.reload()" style="background: #5CDED3; border: none; color: black; padding: 5px; margin-top: 5px; cursor: pointer;">Retry</button>
    `;
    document.getElementById("emergency-instructions").style.display = "block";
    return false;
  }

  // Check WebGL capabilities and log them
  const capabilities = {
    maxTexSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
    maxVaryings: gl.getParameter(gl.MAX_VARYING_VECTORS),
    vendor: gl.getParameter(gl.VENDOR),
    renderer: gl.getParameter(gl.RENDERER),
    version: gl.getParameter(gl.VERSION),
  };

  console.log("WebGL capabilities:", capabilities);

  // Check if we have enough resources
  if (capabilities.maxTexSize < 2048 || capabilities.maxVaryings < 8) {
    console.warn(
      "Limited WebGL capabilities detected. Performance may be reduced."
    );
  }

  // Store capabilities for later use
  window.webglCapabilities = capabilities;

  return true;
}

// Memory monitoring
export const memoryMonitor = {
  interval: null,
  start(intervalMs = 5000) {
    this.stop(); // Clear any existing monitor

    // Only run if the performance API supports memory stats
    if (performance.memory) {
      this.interval = setInterval(() => {
        const used = Math.round(performance.memory.usedJSHeapSize / 1048576);
        const total = Math.round(performance.memory.totalJSHeapSize / 1048576);
        const limit = Math.round(performance.memory.jsHeapSizeLimit / 1048576);

        // Log memory usage
        console.log(`Memory: ${used}MB / ${total}MB (Limit: ${limit}MB)`);

        // Warn if memory usage is high (over 80% of limit)
        if (used > limit * 0.8) {
          console.warn("High memory usage detected!");

          // Try to force garbage collection if available
          if (window.gc) window.gc();
        }
      }, intervalMs);
    }
  },
  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  },
};
