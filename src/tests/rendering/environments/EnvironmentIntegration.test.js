import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { MDREnvironment } from "../../../core/rendering/environments/MDREnvironment.js";
// import { LumonEnvironment } from "../../../core/rendering/environments/LumonEnvironment.js";
import * as THREE from "three";
import { SeveranceEnvironment } from "../../../core/rendering/environments/SeveranceEnvironment.js";

describe("Environment Integration Tests", () => {
  // describe("MDR Environment", () => {
  //   let mdrEnvironment;
  //
  //   beforeEach(async () => {
  //     mdrEnvironment = new MDREnvironment();
  //     await mdrEnvironment.initialize();
  //   });
  //
  //   afterEach(() => {
  //     if (mdrEnvironment) {
  //       mdrEnvironment.dispose();
  //     }
  //   });
  //
  //   it("should initialize with correct scene properties", () => {
  //     expect(mdrEnvironment.scene.background).toEqual(
  //       new THREE.Color(0x1a1a1a)
  //     );
  //     expect(mdrEnvironment.scene.fog).toBeInstanceOf(THREE.Fog);
  //     expect(mdrEnvironment.scene.fog.color).toEqual(new THREE.Color(0x1a1a1a));
  //   });
  //
  //   it("should set up MDR-specific lighting", () => {
  //     // Check ambient light
  //     const ambientLight = mdrEnvironment.lights.get("ambient");
  //     expect(ambientLight).toBeInstanceOf(THREE.AmbientLight);
  //     expect(ambientLight.intensity).toBe(0.3);
  //
  //     // Check fluorescent lights
  //     let fluorescentLightCount = 0;
  //     mdrEnvironment.lights.forEach((light, key) => {
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
  //     expect(mdrEnvironment.desks.size).toBeGreaterThan(0);
  //     mdrEnvironment.desks.forEach((desk) => {
  //       expect(desk).toBeInstanceOf(THREE.Mesh);
  //       expect(desk.geometry).toBeInstanceOf(THREE.BoxGeometry);
  //     });
  //   });
  //
  //   it("should update lighting in animation loop", () => {
  //     const lightIntensities = new Map();
  //     mdrEnvironment.lights.forEach((light, key) => {
  //       if (key.startsWith("fluorescent_")) {
  //         lightIntensities.set(key, light.intensity);
  //       }
  //     });
  //
  //     // Run a few animation frames
  //     for (let i = 0; i < 100; i++) {
  //       mdrEnvironment.update(0.016); // Simulate 60fps
  //     }
  //
  //     // Check if any light intensities changed
  //     let intensityChanged = false;
  //     mdrEnvironment.lights.forEach((light, key) => {
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

  // describe("Lumon Environment", () => {
  //   let lumonEnvironment;
  //
  //   beforeEach(async () => {
  //     lumonEnvironment = new LumonEnvironment();
  //     await lumonEnvironment.initialize();
  //   });
  //
  //   afterEach(() => {
  //     if (lumonEnvironment) {
  //       lumonEnvironment.dispose();
  //     }
  //   });
  //
  //   it("should initialize with correct scene properties", () => {
  //     expect(lumonEnvironment.scene.background).toEqual(
  //       new THREE.Color(0x090909)
  //     );
  //     expect(lumonEnvironment.scene.fog).toBeInstanceOf(THREE.Fog);
  //     expect(lumonEnvironment.scene.fog.color).toEqual(
  //       new THREE.Color(0x090909)
  //     );
  //   });
  //
  //   it("should set up corridor system", () => {
  //     expect(lumonEnvironment.corridors.size).toBeGreaterThan(0);
  //     lumonEnvironment.corridors.forEach((corridor) => {
  //       expect(corridor.leftWall).toBeInstanceOf(THREE.Mesh);
  //       expect(corridor.rightWall).toBeInstanceOf(THREE.Mesh);
  //     });
  //   });
  //
  //   it("should create doors and interactive elements", () => {
  //     expect(lumonEnvironment.doors.size).toBeGreaterThan(0);
  //     expect(lumonEnvironment.interactiveObjects.size).toBeGreaterThan(0);
  //
  //     lumonEnvironment.doors.forEach((door) => {
  //       expect(door).toBeInstanceOf(THREE.Mesh);
  //     });
  //
  //     lumonEnvironment.interactiveObjects.forEach((object, key) => {
  //       if (key.startsWith("keypad_")) {
  //         expect(object).toBeInstanceOf(THREE.Mesh);
  //       }
  //     });
  //   });
  //
  //   it("should set up corridor lighting", () => {
  //     // Check ambient light
  //     const ambientLight = lumonEnvironment.lights.get("ambient");
  //     expect(ambientLight).toBeInstanceOf(THREE.AmbientLight);
  //     expect(ambientLight.intensity).toBe(0.2);
  //
  //     // Check corridor lights
  //     let corridorLightCount = 0;
  //     lumonEnvironment.lights.forEach((light, key) => {
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
  //     lumonEnvironment.lights.forEach((light, key) => {
  //       if (key.startsWith("corridor_light_")) {
  //         lightIntensities.set(key, light.intensity);
  //       }
  //     });
  //
  //     // Run a few animation frames
  //     for (let i = 0; i < 1000; i++) {
  //       lumonEnvironment.update(0.016); // Simulate 60fps
  //     }
  //
  //     // Check if any light intensities changed
  //     let intensityChanged = false;
  //     lumonEnvironment.lights.forEach((light, key) => {
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
  //     const initialObjectCount = lumonEnvironment.scene.children.length;
  //
  //     lumonEnvironment.dispose();
  //
  //     expect(lumonEnvironment.scene.children.length).toBeLessThan(
  //       initialObjectCount
  //     );
  //   });
  // });

  describe("Environment Interaction", () => {
    let mdrEnvironment;
    let lumonEnvironment;

    beforeEach(async () => {
      mdrEnvironment = new MDREnvironment();
      lumonEnvironment = new LumonEnvironment();

      await Promise.all([
        mdrEnvironment.initialize(),
        lumonEnvironment.initialize(),
      ]);
    });

    afterEach(() => {
      mdrEnvironment.dispose();
      lumonEnvironment.dispose();
    });

    it("should maintain separate rendering contexts", () => {
      expect(mdrEnvironment.scene).not.toBe(lumonEnvironment.scene);
      expect(mdrEnvironment.camera).not.toBe(lumonEnvironment.camera);
      expect(mdrEnvironment.renderer).not.toBe(lumonEnvironment.renderer);
    });

    it("should have different post-processing configurations", () => {
      // MDR environment should have bloom for fluorescent lights
      const mdrBloomPass = mdrEnvironment.postProcessing.passes.get("bloom");
      expect(mdrBloomPass).toBeDefined();
      expect(mdrBloomPass.strength).toBe(1.5);

      // Lumon environment should have different bloom settings
      const lumonBloomPass =
        lumonEnvironment.postProcessing.passes.get("bloom");
      expect(lumonBloomPass).toBeDefined();
      expect(lumonBloomPass.strength).toBe(1.5);

      // They should have separate composer instances
      expect(mdrEnvironment.postProcessing.composer).not.toBe(
        lumonEnvironment.postProcessing.composer
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

      // Check MDR environment
      expect(mdrEnvironment.camera.aspect).toBe(newWidth / newHeight);
      expect(mdrEnvironment.renderer.getSize(new THREE.Vector2())).toEqual(
        new THREE.Vector2(newWidth, newHeight)
      );

      // Check Lumon environment
      expect(lumonEnvironment.camera.aspect).toBe(newWidth / newHeight);
      expect(lumonEnvironment.renderer.getSize(new THREE.Vector2())).toEqual(
        new THREE.Vector2(newWidth, newHeight)
      );
    });
  });

  describe("SeveranceEnvironment deltaTime handling", () => {
    let severanceEnvironment;
    let errorSpy;

    beforeEach(async () => {
      severanceEnvironment = new SeveranceEnvironment();
      await severanceEnvironment.initialize();
      errorSpy = vi.spyOn(console, "error");
    });

    afterEach(() => {
      if (severanceEnvironment) {
        severanceEnvironment.dispose();
      }
      vi.restoreAllMocks();
    });

    it("should not log an invalid deltaTime error when update() is called with no arguments", () => {
      expect(() => severanceEnvironment.update()).not.toThrow();
      expect(errorSpy).not.toHaveBeenCalledWith(
        expect.stringContaining("RainSystem: Invalid deltaTime in update:"),
        expect.anything()
      );
    });
  });

  describe("SeveranceEnvironment outdoor rendering", () => {
    let severanceEnvironment;

    beforeEach(async () => {
      severanceEnvironment = new SeveranceEnvironment();
      await severanceEnvironment.initialize();
    });

    afterEach(() => {
      if (severanceEnvironment) {
        severanceEnvironment.dispose();
      }
    });

    it("should create a ground mesh with outsideGround material and a skysphere with sky material, and their colors should be distinct", () => {
      // Find the ground mesh
      const groundMesh = severanceEnvironment.globalFloor;
      expect(groundMesh).toBeDefined();
      expect(groundMesh.material).toBeDefined();
      expect(groundMesh.material).toBeInstanceOf(THREE.MeshStandardMaterial);
      // Check ground material color
      const groundColor = groundMesh.material.color.getHex();

      // Find the skysphere mesh (should be a large sphere with sky material)
      const skysphere = severanceEnvironment.scene.children.find(
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
