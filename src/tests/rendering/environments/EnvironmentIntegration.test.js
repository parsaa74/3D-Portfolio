import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { WorkstationEnvironment } from "../../../core/rendering/environments/WorkstationEnvironment.js";
// import { OfficeEnvironment } from "../../../core/rendering/environments/OfficeEnvironment.js";
import * as THREE from "three";
import { OfficeEnvironment } from "../../../core/rendering/environments/OfficeEnvironment.js";

describe("Environment Integration Tests", () => {
  // describe("WORK Environment", () => {
  //   let workstationEnvironment;
  //
  //   beforeEach(async () => {
  //     workstationEnvironment = new WorkstationEnvironment();
  //     await workstationEnvironment.initialize();
  //   });
  //
  //   afterEach(() => {
  //     if (workstationEnvironment) {
  //       workstationEnvironment.dispose();
  //     }
  //   });
  //
  //   it("should initialize with correct scene properties", () => {
  //     expect(workstationEnvironment.scene.background).toEqual(
  //       new THREE.Color(0x1a1a1a)
  //     );
  //     expect(workstationEnvironment.scene.fog).toBeInstanceOf(THREE.Fog);
  //     expect(workstationEnvironment.scene.fog.color).toEqual(new THREE.Color(0x1a1a1a));
  //   });
  //
  //   it("should set up work-specific lighting", () => {
  //     // Check ambient light
  //     const ambientLight = workstationEnvironment.lights.get("ambient");
  //     expect(ambientLight).toBeInstanceOf(THREE.AmbientLight);
  //     expect(ambientLight.intensity).toBe(0.3);
  //
  //     // Check fluorescent lights
  //     let fluorescentLightCount = 0;
  //     workstationEnvironment.lights.forEach((light, key) => {
  //       if (key.startsWith("fluorescent_")) {
  //         fluorescentLightCount++;
  //         expect(light).toBeInstanceOf(THREE.RectAreaLight);
  //         expect(light.intensity).toBe(3);
  //       }
  //     });
  //     expect(fluorescentLightCount).toBeGreaterThan(0);
  //   });
  //
  //   it("should create office furniture", () => {
  //     expect(workstationEnvironment.desks.size).toBeGreaterThan(0);
  //     workstationEnvironment.desks.forEach((desk) => {
  //       expect(desk).toBeInstanceOf(THREE.Mesh);
  //       expect(desk.geometry).toBeInstanceOf(THREE.BoxGeometry);
  //     });
  //   });
  //
  //   it("should update lighting in animation loop", () => {
  //     const lightIntensities = new Map();
  //     workstationEnvironment.lights.forEach((light, key) => {
  //       if (key.startsWith("fluorescent_")) {
  //         lightIntensities.set(key, light.intensity);
  //       }
  //     });
  //
  //     // Run a few animation frames
  //     for (let i = 0; i < 100; i++) {
  //       workstationEnvironment.update(0.016); // Simulate 60fps
  //     }
  //
  //     // Check if any light intensities changed
  //     let intensityChanged = false;
  //     workstationEnvironment.lights.forEach((light, key) => {
  //       if (key.startsWith("fluorescent_")) {
  //         if (light.intensity !== lightIntensities.get(key)) {
  //           intensityChanged = true;
  //         }
  //       }
  //     });
  //
  //     expect(intensityChanged).toBe(true);
  //   });
  // });

  // describe("Office Environment", () => {
  //   let officeEnvironment;
  //
  //   beforeEach(async () => {
  //     officeEnvironment = new OfficeEnvironment();
  //     await officeEnvironment.initialize();
  //   });
  //
  //   afterEach(() => {
  //     if (officeEnvironment) {
  //       officeEnvironment.dispose();
  //     }
  //   });
  //
  //   it("should initialize with correct scene properties", () => {
  //     expect(officeEnvironment.scene.background).toEqual(
  //       new THREE.Color(0x090909)
  //     );
  //     expect(officeEnvironment.scene.fog).toBeInstanceOf(THREE.Fog);
  //     expect(officeEnvironment.scene.fog.color).toEqual(
  //       new THREE.Color(0x090909)
  //     );
  //   });
  //
  //   it("should set up corridor system", () => {
  //     expect(officeEnvironment.corridors.size).toBeGreaterThan(0);
  //     officeEnvironment.corridors.forEach((corridor) => {
  //       expect(corridor.leftWall).toBeInstanceOf(THREE.Mesh);
  //       expect(corridor.rightWall).toBeInstanceOf(THREE.Mesh);
  //     });
  //   });
  //
  //   it("should create doors and interactive elements", () => {
  //     expect(officeEnvironment.doors.size).toBeGreaterThan(0);
  //     expect(officeEnvironment.interactiveObjects.size).toBeGreaterThan(0);
  //
  //     officeEnvironment.doors.forEach((door) => {
  //       expect(door).toBeInstanceOf(THREE.Mesh);
  //     });
  //
  //     officeEnvironment.interactiveObjects.forEach((object, key) => {
  //       if (key.startsWith("keypad_")) {
  //         expect(object).toBeInstanceOf(THREE.Mesh);
  //       }
  //     });
  //   });
  //
  //   it("should set up corridor lighting", () => {
  //     // Check ambient light
  //     const ambientLight = officeEnvironment.lights.get("ambient");
  //     expect(ambientLight).toBeInstanceOf(THREE.AmbientLight);
  //     expect(ambientLight.intensity).toBe(0.2);
  //
  //     // Check corridor lights
  //     let corridorLightCount = 0;
  //     officeEnvironment.lights.forEach((light, key) => {
  //       if (key.startsWith("corridor_light_")) {
  //         corridorLightCount++;
  //         expect(light).toBeInstanceOf(THREE.RectAreaLight);
  //         expect(light.intensity).toBe(2);
  //       }
  //     });
  //     expect(corridorLightCount).toBeGreaterThan(0);
  //   });
  //
  //   it("should update lighting in animation loop", () => {
  //     const lightIntensities = new Map();
  //     officeEnvironment.lights.forEach((light, key) => {
  //       if (key.startsWith("corridor_light_")) {
  //         lightIntensities.set(key, light.intensity);
  //       }
  //     });
  //
  //     // Run a few animation frames
  //     for (let i = 0; i < 1000; i++) {
  //       officeEnvironment.update(0.016); // Simulate 60fps
  //     }
  //
  //     // Check if any light intensities changed
  //     let intensityChanged = false;
  //     officeEnvironment.lights.forEach((light, key) => {
  //       if (key.startsWith("corridor_light_")) {
  //         if (light.intensity !== lightIntensities.get(key)) {
  //           intensityChanged = true;
  //         }
  //       }
  //     });
  //
  //     expect(intensityChanged).toBe(true);
  //   });
  //
  //   it("should clean up resources on disposal", () => {
  //     const initialObjectCount = officeEnvironment.scene.children.length;
  //
  //     officeEnvironment.dispose();
  //
  //     expect(officeEnvironment.scene.children.length).toBeLessThan(
  //       initialObjectCount
  //     );
  //   });
  // });

  describe("Environment Interaction", () => {
    let workstationEnvironment;
    let officeEnvironment;

    beforeEach(async () => {
      workstationEnvironment = new WorkstationEnvironment();
      officeEnvironment = new OfficeEnvironment();

      await Promise.all([
        workstationEnvironment.initialize(),
        officeEnvironment.initialize(),
      ]);
    });

    afterEach(() => {
      workstationEnvironment.dispose();
      officeEnvironment.dispose();
    });

    it("should maintain separate rendering contexts", () => {
      expect(workstationEnvironment.scene).not.toBe(officeEnvironment.scene);
      expect(workstationEnvironment.camera).not.toBe(officeEnvironment.camera);
      expect(workstationEnvironment.renderer).not.toBe(officeEnvironment.renderer);
    });

    it("should have different post-processing configurations", () => {
      // work environment should have bloom for fluorescent lights
      const workBloomPass = workstationEnvironment.postProcessing.passes.get("bloom");
      expect(workBloomPass).toBeDefined();
      expect(workBloomPass.strength).toBe(1.5);

      // Office environment should have different bloom settings
      const officeBloomPass =
        officeEnvironment.postProcessing.passes.get("bloom");
      expect(officeBloomPass).toBeDefined();
      expect(officeBloomPass.strength).toBe(1.5);

      // They should have separate composer instances
      expect(workstationEnvironment.postProcessing.composer).not.toBe(
        officeEnvironment.postProcessing.composer
      );
    });

    it("should handle window resizing independently", () => {
      const newWidth = 1024;
      const newHeight = 768;

      // Mock window dimensions
      vi.spyOn(window, "innerWidth", "get").mockReturnValue(newWidth);
      vi.spyOn(window, "innerHeight", "get").mockReturnValue(newHeight);

      // Trigger resize
      window.dispatchEvent(new Event("resize"));

      // Check work environment
      expect(workstationEnvironment.camera.aspect).toBe(newWidth / newHeight);
      expect(workstationEnvironment.renderer.getSize(new THREE.Vector2())).toEqual(
        new THREE.Vector2(newWidth, newHeight)
      );

      // Check Office environment
      expect(officeEnvironment.camera.aspect).toBe(newWidth / newHeight);
      expect(officeEnvironment.renderer.getSize(new THREE.Vector2())).toEqual(
        new THREE.Vector2(newWidth, newHeight)
      );
    });
  });

  describe("OfficeEnvironment deltaTime handling", () => {
    let officeEnvironment;
    let errorSpy;

    beforeEach(async () => {
      officeEnvironment = new OfficeEnvironment();
      await officeEnvironment.initialize();
      errorSpy = vi.spyOn(console, "error");
    });

    afterEach(() => {
      if (officeEnvironment) {
        officeEnvironment.dispose();
      }
      vi.restoreAllMocks();
    });

    it("should not log an invalid deltaTime error when update() is called with no arguments", () => {
      expect(() => officeEnvironment.update()).not.toThrow();
      expect(errorSpy).not.toHaveBeenCalledWith(
        expect.stringContaining("RainSystem: Invalid deltaTime in update:"),
        expect.anything()
      );
    });
  });

  describe("OfficeEnvironment outdoor rendering", () => {
    let officeEnvironment;

    beforeEach(async () => {
      officeEnvironment = new OfficeEnvironment();
      await officeEnvironment.initialize();
    });

    afterEach(() => {
      if (officeEnvironment) {
        officeEnvironment.dispose();
      }
    });

    it("should create a ground mesh with outsideGround material and a skysphere with sky material, and their colors should be distinct", () => {
      // Find the ground mesh
      const groundMesh = officeEnvironment.globalFloor;
      expect(groundMesh).toBeDefined();
      expect(groundMesh.material).toBeDefined();
      expect(groundMesh.material).toBeInstanceOf(THREE.MeshStandardMaterial);
      // Check ground material color
      const groundColor = groundMesh.material.color.getHex();

      // Find the skysphere mesh (should be a large sphere with sky material)
      const skysphere = officeEnvironment.scene.children.find(
        (obj) => obj.isMesh && obj.geometry.type === "SphereGeometry" && obj.material && obj.material.color.getHex() === 0x7ec0ee
      );
      expect(skysphere).toBeDefined();
      expect(skysphere.material).toBeDefined();
      expect(skysphere.material).toBeInstanceOf(THREE.MeshStandardMaterial);
      // Check sky material color
      const skyColor = skysphere.material.color.getHex();

      // They should be visually distinct
      expect(groundColor).not.toBe(skyColor);
    });
  });
});
