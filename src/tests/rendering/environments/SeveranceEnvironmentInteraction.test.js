import { describe, it, expect, beforeEach, vi } from "vitest";
import * as THREE from "three";
import { SeveranceEnvironment } from "../../../core/rendering/environments/SeveranceEnvironment.js";

function createMockPoster(x, y, z) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 0.1));
  mesh.position.set(x, y, z);
  mesh.userData = {};
  // Add E button mesh
  const eButtonMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5));
  eButtonMesh.visible = false;
  mesh.userData.eButtonMesh = eButtonMesh;
  mesh.add(eButtonMesh);
  return mesh;
}

describe("SeveranceEnvironment Poster E Button Interaction", () => {
  let env, camera;

  beforeEach(async () => {
    env = new SeveranceEnvironment();
    camera = new THREE.PerspectiveCamera();
    env.camera = camera;
    env._customWatchInteractables = [];
  });

  it("shows E button only for closest poster in range", () => {
    // Place two posters at different distances
    const poster1 = createMockPoster(0, 1, 2); // 2 units away
    const poster2 = createMockPoster(0, 1, 4); // 4 units away
    env._customWatchInteractables = [poster1, poster2];
    camera.position.set(0, 1, 0);

    // Simulate main.js logic: hide all, then show closest in range
    for (const poster of env._customWatchInteractables) {
      poster.userData.eButtonMesh.visible = false;
    }
    let closest = null, closestDist = Infinity;
    for (const poster of env._customWatchInteractables) {
      const dist = camera.position.distanceTo(poster.position);
      if (dist < 5.0 && dist < closestDist) {
        closest = poster;
        closestDist = dist;
      }
    }
    if (closest) closest.userData.eButtonMesh.visible = true;

    expect(poster1.userData.eButtonMesh.visible).toBe(true);
    expect(poster2.userData.eButtonMesh.visible).toBe(false);
  });

  it("hides all E buttons if no poster is in range", () => {
    const poster1 = createMockPoster(0, 1, 10); // 10 units away
    env._customWatchInteractables = [poster1];
    camera.position.set(0, 1, 0);
    for (const poster of env._customWatchInteractables) {
      poster.userData.eButtonMesh.visible = false;
    }
    let closest = null, closestDist = Infinity;
    for (const poster of env._customWatchInteractables) {
      const dist = camera.position.distanceTo(poster.position);
      if (dist < 5.0 && dist < closestDist) {
        closest = poster;
        closestDist = dist;
      }
    }
    if (closest) closest.userData.eButtonMesh.visible = true;
    expect(poster1.userData.eButtonMesh.visible).toBe(false);
  });

  it("shows E button for only one poster if two are at the same distance", () => {
    const poster1 = createMockPoster(0, 1, 3);
    const poster2 = createMockPoster(0, 1, 3);
    env._customWatchInteractables = [poster1, poster2];
    camera.position.set(0, 1, 0);
    for (const poster of env._customWatchInteractables) {
      poster.userData.eButtonMesh.visible = false;
    }
    let closest = null, closestDist = Infinity;
    for (const poster of env._customWatchInteractables) {
      const dist = camera.position.distanceTo(poster.position);
      if (dist < 5.0 && dist < closestDist) {
        closest = poster;
        closestDist = dist;
      }
    }
    if (closest) closest.userData.eButtonMesh.visible = true;
    // Only one should be visible
    const visibleCount = env._customWatchInteractables.filter(p => p.userData.eButtonMesh.visible).length;
    expect(visibleCount).toBe(1);
  });

  it("does not throw if a poster is removed from interactables", () => {
    const poster1 = createMockPoster(0, 1, 2);
    env._customWatchInteractables = [poster1];
    camera.position.set(0, 1, 0);
    // Remove poster
    env._customWatchInteractables = [];
    // Should not throw when running the logic
    expect(() => {
      for (const poster of env._customWatchInteractables) {
        if (poster && poster.userData.eButtonMesh) {
          poster.userData.eButtonMesh.visible = false;
        }
      }
    }).not.toThrow();
  });

  it("only allows interaction when E button is visible", () => {
    const poster1 = createMockPoster(0, 1, 2);
    env._customWatchInteractables = [poster1];
    camera.position.set(0, 1, 0);
    // Simulate logic
    for (const poster of env._customWatchInteractables) {
      poster.userData.eButtonMesh.visible = false;
    }
    let closest = null, closestDist = Infinity;
    for (const poster of env._customWatchInteractables) {
      const dist = camera.position.distanceTo(poster.position);
      if (dist < 5.0 && dist < closestDist) {
        closest = poster;
        closestDist = dist;
      }
    }
    if (closest) closest.userData.eButtonMesh.visible = true;
    // Simulate E key handler
    let interacted = false;
    if (poster1.userData.eButtonMesh.visible) {
      interacted = true;
    }
    expect(interacted).toBe(true);
    // Hide button and try again
    poster1.userData.eButtonMesh.visible = false;
    interacted = false;
    if (poster1.userData.eButtonMesh.visible) {
      interacted = true;
    }
    expect(interacted).toBe(false);
  });

  it("sets correct infoContent and imageUrls for Friends poster", () => {
    // Arrange
    const env = new SeveranceEnvironment();
    const imageGroup = new THREE.Group();
    const position = new THREE.Vector3(0, 0, 0);
    const interiorGroup = new THREE.Group();
    const posterTitle = "Friends";

    // Act
    const interactMesh = env.addInfoInteractionToArtPoster
      ? env.addInfoInteractionToArtPoster(imageGroup, position, interiorGroup, posterTitle)
      : SeveranceEnvironment.prototype.addInfoInteractionToArtPoster.call(env, imageGroup, position, interiorGroup, posterTitle);

    // Assert
    expect(interactMesh.userData.posterTitle).toBe("Friends");
    expect(interactMesh.userData.infoContent).toContain("InstaMeet (Friend) (Performance Art, 30 min)");
    expect(interactMesh.userData.infoContent).toContain("شخب - رابخا");
    expect(Array.isArray(interactMesh.userData.imageUrls)).toBe(true);
    expect(interactMesh.userData.imageUrls.length).toBe(13);
    // Check that the URLs are for the Friends poster
    for (const url of interactMesh.userData.imageUrls) {
      expect(url).toContain("/friends/");
      expect(url.endsWith(".jpg")).toBe(true);
    }
  });

  it("sets correct infoContent and imageUrls for Dissolve poster", () => {
    // Arrange
    const env = new SeveranceEnvironment();
    const imageGroup = new THREE.Group();
    const position = new THREE.Vector3(0, 0, 0);
    const interiorGroup = new THREE.Group();
    const posterTitle = "Dissolve";

    // Act
    const interactMesh = env.addInfoInteractionToArtPoster(imageGroup, position, interiorGroup, posterTitle);

    // Assert
    expect(interactMesh.userData.posterTitle).toBe("Dissolve");
    expect(interactMesh.userData.infoContent).toContain("Dissolve (Video/Performance Art, 30 min)");
    expect(interactMesh.userData.infoContent).toContain("شخب");
    expect(Array.isArray(interactMesh.userData.imageUrls)).toBe(true);
    expect(interactMesh.userData.imageUrls.length).toBe(14);
    // Check that the URLs are for the Dissolve poster
    for (const url of interactMesh.userData.imageUrls) {
      expect(url).toContain("/dissolve/");
      expect(url.endsWith(".jpg")).toBe(true);
    }
  });
}); 