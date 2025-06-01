// Severance Floor Map Visualization
// Inspired by Mr. Doob's minimalist approach

class FloorMapVisualizer {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.error(`Container with ID ${containerId} not found`);
      return;
    }

    // Create canvas element
    this.canvas = document.createElement("canvas");
    this.canvas.id = "floorMapCanvas";
    this.canvas.className = "floor-map-canvas";
    this.container.appendChild(this.canvas);

    // Initialize properties
    this.ctx = this.canvas.getContext("2d");
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    // Colors (minimalist Lumon palette)
    this.colors = {
      background: "#0a0a0a",
      lines: "rgba(255, 255, 255, 0.25)",
      nodes: "rgba(255, 255, 255, 0.6)",
      highlight: "rgba(92, 222, 211, 0.8)",
      text: "rgba(255, 255, 255, 0.4)",
    };

    // Simplified floor map data (nodes and connections)
    this.floorMap = {
      nodes: [
        { id: "elevator", x: 0.5, y: 0.9, label: "ELEVATORS" },
        { id: "waiting", x: 0.5, y: 0.8, label: "WAITING ROOM" },
        { id: "central", x: 0.5, y: 0.6, label: "CENTRAL HUB" },
        { id: "mdr", x: 0.2, y: 0.5, label: "MDR" },
        { id: "optics", x: 0.8, y: 0.5, label: "OPTICS" },
        { id: "conference", x: 0.2, y: 0.3, label: "CONFERENCE" },
        { id: "wellness", x: 0.8, y: 0.3, label: "WELLNESS" },
        { id: "break", x: 0.8, y: 0.4, label: "BREAK ROOM" },
        { id: "security", x: 0.5, y: 0.5, label: "SECURITY" },
        { id: "testing", x: 0.5, y: 0.2, label: "TESTING" },
        { id: "perpetuity", x: 0.5, y: 0.1, label: "PERPETUITY WING" },
      ],
      connections: [
        ["elevator", "waiting"],
        ["waiting", "central"],
        ["central", "mdr"],
        ["central", "optics"],
        ["central", "security"],
        ["central", "conference"],
        ["central", "wellness"],
        ["security", "break"],
        ["wellness", "testing"],
        ["testing", "perpetuity"],
      ],
    };

    // Animation properties
    this.particles = [];
    this.pathways = [];
    this.activeNode = null;
    this.time = 0;
    this.isInitialized = false;

    // Bind methods
    this.resize = this.resize.bind(this);
    this.animate = this.animate.bind(this);
    this.drawMap = this.drawMap.bind(this);

    // Add event listeners
    window.addEventListener("resize", this.resize);
  }

  // Initialize the visualization
  init() {
    // Create pathways between nodes
    this.createPathways();
    // Create particles for animation
    this.createParticles(80);
    // Start animation loop
    this.isInitialized = true;
    this.animate();

    // Start with elevator as active node
    this.setActiveNode("elevator");

    // Cycle through highlighting different nodes
    this.startNodeCycle();
  }

  // Start cycling through nodes
  startNodeCycle() {
    const nodeIds = this.floorMap.nodes.map((n) => n.id);
    let currentIndex = 0;

    setInterval(() => {
      this.setActiveNode(nodeIds[currentIndex]);
      currentIndex = (currentIndex + 1) % nodeIds.length;
    }, 3000);
  }

  // Set active node
  setActiveNode(nodeId) {
    this.activeNode = nodeId;
  }

  // Create pathways between nodes
  createPathways() {
    this.pathways = this.floorMap.connections
      .map((connection) => {
        const fromNode = this.floorMap.nodes.find(
          (n) => n.id === connection[0]
        );
        const toNode = this.floorMap.nodes.find((n) => n.id === connection[1]);

        if (!fromNode || !toNode) return null;

        return {
          from: fromNode,
          to: toNode,
          points: this.createPathPoints(
            fromNode.x * this.width,
            fromNode.y * this.height,
            toNode.x * this.width,
            toNode.y * this.height,
            5 + Math.floor(Math.random() * 3)
          ),
        };
      })
      .filter((p) => p !== null);
  }

  // Create slightly curved path points between two points
  createPathPoints(x1, y1, x2, y2, numPoints) {
    const points = [];
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    const offset = (Math.random() - 0.5) * 50;

    for (let i = 0; i < numPoints; i++) {
      const t = i / (numPoints - 1);
      // Quadratic bezier curve
      const x =
        (1 - t) * (1 - t) * x1 + 2 * (1 - t) * t * (midX + offset) + t * t * x2;
      const y =
        (1 - t) * (1 - t) * y1 + 2 * (1 - t) * t * (midY + offset) + t * t * y2;
      points.push({ x, y });
    }

    return points;
  }

  // Create particles for animation
  createParticles(count) {
    this.particles = [];

    for (let i = 0; i < count; i++) {
      // Choose a random pathway
      const pathwayIndex = Math.floor(Math.random() * this.pathways.length);
      const pathway = this.pathways[pathwayIndex];

      this.particles.push({
        pathwayIndex,
        progress: Math.random(),
        speed: 0.0005 + Math.random() * 0.001,
        size: 1 + Math.random() * 2,
        opacity: 0.3 + Math.random() * 0.6,
        direction: Math.random() > 0.5 ? 1 : -1,
      });
    }
  }

  // Handle window resize
  resize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    if (this.isInitialized) {
      // Recreate pathways with new dimensions
      this.createPathways();
    }
  }

  // Animation loop
  animate() {
    requestAnimationFrame(this.animate);

    // Clear canvas
    this.ctx.fillStyle = this.colors.background;
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Update time
    this.time += 0.01;

    // Draw the map
    this.drawMap();

    // Update and draw particles
    this.updateParticles();
  }

  // Draw the floor map
  drawMap() {
    // Draw connections
    this.pathways.forEach((pathway) => {
      const isActive =
        pathway.from.id === this.activeNode ||
        pathway.to.id === this.activeNode;

      this.ctx.beginPath();
      this.ctx.moveTo(pathway.points[0].x, pathway.points[0].y);

      for (let i = 1; i < pathway.points.length; i++) {
        this.ctx.lineTo(pathway.points[i].x, pathway.points[i].y);
      }

      this.ctx.strokeStyle = isActive
        ? this.colors.highlight
        : this.colors.lines;
      this.ctx.lineWidth = isActive ? 1.5 : 0.8;
      this.ctx.stroke();
    });

    // Draw nodes
    this.floorMap.nodes.forEach((node) => {
      const isActive = node.id === this.activeNode;
      const x = node.x * this.width;
      const y = node.y * this.height;

      // Draw node
      this.ctx.beginPath();
      this.ctx.arc(x, y, isActive ? 6 : 4, 0, Math.PI * 2);
      this.ctx.fillStyle = isActive ? this.colors.highlight : this.colors.nodes;
      this.ctx.fill();

      // Draw label
      this.ctx.font = isActive ? "13px Helvetica Neue" : "11px Helvetica Neue";
      this.ctx.fillStyle = isActive ? this.colors.highlight : this.colors.text;
      this.ctx.textAlign = "center";
      this.ctx.fillText(node.label, x, y - 15);
    });
  }

  // Update and draw particles
  updateParticles() {
    this.particles.forEach((particle) => {
      // Update particle progress
      particle.progress += particle.speed * particle.direction;

      // Reset if out of bounds
      if (particle.progress > 1) {
        particle.progress = 0;
      } else if (particle.progress < 0) {
        particle.progress = 1;
      }

      // Get current pathway
      const pathway = this.pathways[particle.pathwayIndex];
      if (!pathway) return;

      // Calculate position along the path
      const position = this.getPositionAlongPath(
        pathway.points,
        particle.progress
      );

      // Check if current pathway connects to active node
      const isOnActivePath =
        pathway.from.id === this.activeNode ||
        pathway.to.id === this.activeNode;

      // Draw particle
      this.ctx.beginPath();
      this.ctx.arc(position.x, position.y, particle.size, 0, Math.PI * 2);

      // Use highlight color if on active path
      const particleColor = isOnActivePath
        ? this.colors.highlight
        : `rgba(255, 255, 255, ${particle.opacity})`;

      this.ctx.fillStyle = particleColor;
      this.ctx.fill();
    });
  }

  // Get position along a path based on progress (0-1)
  getPositionAlongPath(points, progress) {
    if (points.length < 2) return { x: 0, y: 0 };

    // Calculate which segment we're on
    const numSegments = points.length - 1;
    const segmentIndex = Math.min(
      Math.floor(progress * numSegments),
      numSegments - 1
    );

    // Calculate progress within this segment
    const segmentProgress = progress * numSegments - segmentIndex;

    // Get the points for this segment
    const p1 = points[segmentIndex];
    const p2 = points[segmentIndex + 1];

    // Interpolate between the points
    return {
      x: p1.x + (p2.x - p1.x) * segmentProgress,
      y: p1.y + (p2.y - p1.y) * segmentProgress,
    };
  }
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  // Add styling for the floor map canvas
  const style = document.createElement("style");
  style.innerHTML = `
    .floor-map-canvas {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 5;
      pointer-events: none;
    }
  `;
  document.head.appendChild(style);

  // Create global variable for the floor map visualizer
  window.floorMapVisualizer = new FloorMapVisualizer("lumon-welcome");

  // Initialize after the original animation has started
  setTimeout(() => {
    window.floorMapVisualizer.init();
  }, 1000);

  // Instead of replacing startGame, we'll listen for the gameStart event
  document.addEventListener("gameStart", () => {
    console.log("Floor map visualizer detected game start event");
    // Any floor map visualizer specific initialization that needs to happen after game start
  });
});

// Remove the startGameTransition function and replace with a cleaner approach
// This function can be called directly if needed
function showFloorMapTransition() {
  console.log("Showing floor map transition...");
  // Fade out the welcome screen
  const welcomeScreen = document.getElementById("lumon-welcome");
  welcomeScreen.style.opacity = 0;

  // After transition, redirect or initialize game
  setTimeout(() => {
    // Hide welcome screen
    welcomeScreen.style.display = "none";

    // Show game HUD
    const gameHud = document.getElementById("game-hud");
    if (gameHud) {
      gameHud.style.display = "block";
    }

    // Initialize elevator sequence
    const elevator = document.getElementById("lumon-elevator");
    if (elevator) {
      elevator.classList.add("active");
    }

    // Start elevator door animation after a delay
    setTimeout(() => {
      const elevatorDoor = document.querySelector(".elevator-door");
      if (elevatorDoor) {
        elevatorDoor.classList.add("open");
      }

      // After the elevator door animation, call the game initialization
      setTimeout(() => {
        // Make sure the elevator transition is complete before starting the game
        document.getElementById("lumon-elevator").style.opacity = "0";

        // Remove any potential blocking elements or reset styles that might affect visibility
        document.body.style.backgroundColor = "#000"; // Ensure proper background

        // Ensure shader containers don't block the 3D view
        const shaderContainer = document.getElementById("shader-container");
        if (shaderContainer) {
          shaderContainer.style.display = "none";
        }

        // Create/show the 3D container if it doesn't exist
        let threeContainer = document.getElementById("three-container");
        if (!threeContainer) {
          threeContainer = document.createElement("div");
          threeContainer.id = "three-container";
          threeContainer.style.position = "absolute";
          threeContainer.style.top = "0";
          threeContainer.style.left = "0";
          threeContainer.style.width = "100%";
          threeContainer.style.height = "100%";
          threeContainer.style.zIndex = "100"; // Increased z-index to be above other elements
          document.body.appendChild(threeContainer);
        }
        threeContainer.style.display = "block";
        threeContainer.style.backgroundColor = "transparent"; // Make sure it's not black

        // Clear any existing canvases that might be blocking view
        const existingCanvases = threeContainer.querySelectorAll("canvas");
        existingCanvases.forEach((canvas) => {
          // Don't remove but ensure they're visible
          canvas.style.display = "block";
        });

        console.log("Calling game initialization...");
        // Call the new initialization function
        if (typeof window.initializeGame === "function") {
          try {
            window.initializeGame();
            console.log("Game state set to gameplay");

            // Make additional adjustments to ensure visibility
            setTimeout(() => {
              // Final check after small delay to ensure rendering is started
              if (window.debugLumon) {
                window.debugLumon.log("Final visibility check");
                window.debugLumon.checkElements();
              }

              // Force a window resize event to ensure Three.js renderer adjusts properly
              window.dispatchEvent(new Event("resize"));
            }, 500);
          } catch (error) {
            console.error("Error in game initialization:", error);
          }
        } else {
          console.error("initializeGame function not found!");
          // Fallback - try to initialize using the game object directly
          if (window.game && typeof window.game.init === "function") {
            console.log("Attempting to initialize game directly...");
            window.game.init("three-container");
          }
        }
      }, 2000);
    }, 2000);
  }, 2000);
}
