import { THREE } from "./three-loader.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Mock FileReader for Node.js environment
global.FileReader = class FileReader {
  readAsArrayBuffer(blob) {
    this.result = blob;
    this.onload();
  }
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create models
function createDoorModel() {
  const doorGroup = new THREE.Group();

  // Door panel - slightly recessed, metallic finish
  const doorGeometry = new THREE.BoxGeometry(1.2, 2.4, 0.05);
  const doorMaterial = new THREE.MeshStandardMaterial({
    color: 0x3a3a3a,
    metalness: 0.7,
    roughness: 0.2,
  });
  const doorPanel = new THREE.Mesh(doorGeometry, doorMaterial);
  doorPanel.position.z = -0.02;

  // Door frame - brushed metal finish
  const frameGeometry = new THREE.BoxGeometry(1.4, 2.5, 0.1);
  const frameMaterial = new THREE.MeshStandardMaterial({
    color: 0x4a4a4a,
    metalness: 0.8,
    roughness: 0.3,
  });
  const frame = new THREE.Mesh(frameGeometry, frameMaterial);

  // Door handle - cylindrical, chrome finish
  const handleGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.15, 8);
  const handleMaterial = new THREE.MeshStandardMaterial({
    color: 0x888888,
    metalness: 0.9,
    roughness: 0.1,
  });
  const handle = new THREE.Mesh(handleGeometry, handleMaterial);
  handle.rotation.x = Math.PI / 2;
  handle.position.set(0.4, 0, 0.02);

  doorGroup.add(frame);
  doorGroup.add(doorPanel);
  doorGroup.add(handle);

  return doorGroup;
}

function createChairModel() {
  const chairGroup = new THREE.Group();

  // Seat base - curved shell design
  const seatGeometry = new THREE.BoxGeometry(0.5, 0.05, 0.5);
  const seatMaterial = new THREE.MeshStandardMaterial({
    color: 0x2b2b2b,
    roughness: 0.7,
  });
  const seat = new THREE.Mesh(seatGeometry, seatMaterial);

  // Backrest - slightly curved
  const backGeometry = new THREE.BoxGeometry(0.5, 0.6, 0.05);
  const backrest = new THREE.Mesh(backGeometry, seatMaterial);
  backrest.position.set(0, 0.3, -0.225);
  backrest.rotation.x = -Math.PI * 0.1;

  // Chair base - five-star base with wheels
  const baseGeometry = new THREE.CylinderGeometry(0.25, 0.3, 0.05, 5);
  const baseMaterial = new THREE.MeshStandardMaterial({
    color: 0x1a1a1a,
    metalness: 0.7,
    roughness: 0.3,
  });
  const base = new THREE.Mesh(baseGeometry, baseMaterial);
  base.position.y = -0.25;

  // Chair post
  const postGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.5, 8);
  const post = new THREE.Mesh(postGeometry, baseMaterial);
  post.position.y = -0.025;

  chairGroup.add(seat);
  chairGroup.add(backrest);
  chairGroup.add(base);
  chairGroup.add(post);

  return chairGroup;
}

function createDeskModel() {
  const deskGroup = new THREE.Group();

  // Desk top - clean, minimal surface
  const topGeometry = new THREE.BoxGeometry(1.4, 0.05, 0.8);
  const deskMaterial = new THREE.MeshStandardMaterial({
    color: 0xf0f0f0,
    roughness: 0.8,
    metalness: 0.1,
  });
  const top = new THREE.Mesh(topGeometry, deskMaterial);
  top.position.y = 0.75;

  // Desk legs - sleek metal frame
  const legGeometry = new THREE.BoxGeometry(0.05, 1.5, 0.05);
  const legMaterial = new THREE.MeshStandardMaterial({
    color: 0x2a2a2a,
    metalness: 0.7,
    roughness: 0.3,
  });

  // Create four legs
  const positions = [
    [-0.65, 0, 0.35],
    [0.65, 0, 0.35],
    [-0.65, 0, -0.35],
    [0.65, 0, -0.35],
  ];

  positions.forEach((pos) => {
    const leg = new THREE.Mesh(legGeometry, legMaterial);
    leg.position.set(pos[0], pos[1], pos[2]);
    deskGroup.add(leg);
  });

  // Add modesty panel
  const modestyGeometry = new THREE.BoxGeometry(1.3, 0.3, 0.02);
  const modestyPanel = new THREE.Mesh(modestyGeometry, legMaterial);
  modestyPanel.position.set(0, 0.2, -0.35);

  deskGroup.add(top);
  deskGroup.add(modestyPanel);

  return deskGroup;
}

// Create a scene to hold the models
const scene = new THREE.Scene();

// Add lights (using only point lights)
const light1 = new THREE.PointLight(0xffffff, 1);
light1.position.set(5, 5, 5);
scene.add(light1);

const light2 = new THREE.PointLight(0xffffff, 0.8);
light2.position.set(-5, 5, -5);
scene.add(light2);

// Create models
const models = {
  door: createDoorModel(),
  chair: createChairModel(),
  desk: createDeskModel(),
};

// Ensure the models directory exists
const modelsDir = path.join(__dirname, "..", "public", "assets", "models");
if (!fs.existsSync(modelsDir)) {
  fs.mkdirSync(modelsDir, { recursive: true });
}

// Export each model as JSON
for (const [name, model] of Object.entries(models)) {
  const outputPath = path.join(modelsDir, `${name}.json`);
  const json = model.toJSON();
  fs.writeFileSync(outputPath, JSON.stringify(json, null, 2));
  console.log(`Exported ${name}.json`);
}
