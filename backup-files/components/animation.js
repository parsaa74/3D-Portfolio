// Animation sequence
document.addEventListener("DOMContentLoaded", function () {
  // Setup number grid
  const numberGrid = document.getElementById("numberGrid");
  numberGrid.innerHTML = "";
  for (let i = 0; i < 256; i++) {
    const cell = document.createElement("div");
    cell.className = "number-cell";
    cell.textContent = Math.floor(Math.random() * 10);
    numberGrid.appendChild(cell);
  }

  // Create binary streams
  for (let i = 0; i < 20; i++) {
    createBinaryStream();
  }

  // Initialize particle system
  initParticles();

  // Start animation sequence
  setTimeout(startSequence, 500);

  // Override the nuclear button approach
  const emergencyButton = document.getElementById("emergency-button");
  if (emergencyButton) {
    emergencyButton.style.display = "none";
  }
});

function createBinaryStream() {
  const stream = document.createElement("div");
  stream.className = "binary-stream";

  // Random position
  const x = Math.random() * window.innerWidth;
  const y = Math.random() * window.innerHeight * 0.8;

  stream.style.left = x + "px";
  stream.style.top = y + "px";

  // Generate binary content
  let content = "";
  const length = 20 + Math.floor(Math.random() * 30);
  for (let i = 0; i < length; i++) {
    content += Math.random() > 0.5 ? "1" : "0";
    if (i < length - 1) content += " ";
  }

  stream.textContent = content;
  document.getElementById("lumon-welcome").appendChild(stream);

  // Animate
  setTimeout(() => {
    stream.style.opacity = "1";
  }, Math.random() * 2000 + 2000);

  // Make it disappear after some time
  setTimeout(() => {
    stream.style.opacity = "0";
    setTimeout(() => {
      if (stream.parentNode) {
        stream.remove();
        createBinaryStream(); // Create a new one
      }
    }, 1000);
  }, Math.random() * 5000 + 7000);
}

function startSequence() {
  // Fade in logo container
  const logoContainer = document.querySelector(".logo-container");
  logoContainer.style.opacity = "1";
  logoContainer.style.transform = "scale(1)";

  // Animate logo circle
  setTimeout(() => {
    const logoCircle = document.getElementById("logoCircle");
    logoCircle.style.transform = "scale(1)";
  }, 500);

  // Fade in logo
  setTimeout(() => {
    const logoImage = document.getElementById("logoImage");
    logoImage.style.opacity = "1";
  }, 1500);

  // Show number grid with delay
  setTimeout(() => {
    const numberGrid = document.getElementById("numberGrid");
    numberGrid.style.opacity = "0.15";

    // Animate individual cells
    const cells = document.querySelectorAll(".number-cell");
    cells.forEach((cell, index) => {
      setTimeout(() => {
        cell.style.transform = "scale(1)";

        // Occasionally highlight cells
        if (Math.random() > 0.7) {
          setTimeout(() => {
            cell.style.color = "rgba(255, 255, 255, 0.8)";
            setTimeout(() => {
              cell.style.color = "rgba(255, 255, 255, 0.2)";

              // Change number
              cell.textContent = Math.floor(Math.random() * 10);
            }, 300);
          }, Math.random() * 2000);
        }
      }, index * 10);
    });
  }, 1000);

  // Animate separators
  setTimeout(() => {
    const separatorTop = document.getElementById("separatorTop");
    const separatorBottom = document.getElementById("separatorBottom");

    separatorTop.style.height = "40px";
    separatorBottom.style.height = "40px";
  }, 2000);

  // Show text elements
  setTimeout(() => {
    const textElement1 = document.getElementById("textElement1");
    textElement1.style.opacity = "1";
    textElement1.style.transform = "translateY(0)";
  }, 2500);

  setTimeout(() => {
    const textElement2 = document.getElementById("textElement2");
    textElement2.style.opacity = "1";
    textElement2.style.transform = "translateY(0)";
  }, 3000);

  // Show quote with typing effect
  setTimeout(() => {
    const quote = document.getElementById("quote");
    quote.style.opacity = "1";
    quote.style.transform = "translateY(0)";
  }, 4000);

  // Show enter button
  setTimeout(() => {
    const startButton = document.getElementById("start-button");
    startButton.style.opacity = "1";
    startButton.style.transform = "translateY(0)";
  }, 5000);

  // Change background color
  setTimeout(() => {
    document.getElementById("lumon-welcome").style.backgroundColor = "#0a0a0a";
  }, 1000);
}

// Particle system
function initParticles() {
  const canvas = document.getElementById("particleCanvas");
  const ctx = canvas.getContext("2d");

  // Make canvas full screen
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  // Particles array
  const particles = [];
  const particleCount = 100;

  // Create particles
  for (let i = 0; i < particleCount; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      radius: Math.random() * 1.5 + 0.1,
      color: `rgba(255, 255, 255, ${Math.random() * 0.1 + 0.02})`,
      vx: Math.random() * 0.2 - 0.1,
      vy: Math.random() * 0.2 - 0.1,
    });
  }

  // Animation loop
  function animate() {
    requestAnimationFrame(animate);

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Update and draw particles
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      // Move particles
      p.x += p.vx;
      p.y += p.vy;

      // Wrap around edges
      if (p.x < 0) p.x = canvas.width;
      if (p.x > canvas.width) p.x = 0;
      if (p.y < 0) p.y = canvas.height;
      if (p.y > canvas.height) p.y = 0;

      // Draw particle
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
    }
  }

  animate();

  // Handle window resize
  window.addEventListener("resize", function () {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  });
}
