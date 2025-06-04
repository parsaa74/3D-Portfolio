import { describe, it, expect, beforeEach, vi } from "vitest";
import { BaseEnvironment } from "../../core/rendering/environments/BaseEnvironment.js";
import * as THREE from "three";

describe("BaseEnvironment", () => {
  let environment;
  let mockContainer;

  beforeEach(() => {
    // Mock container element
    mockContainer = document.createElement("div");
    mockContainer.id = "three-container";
    document.body.appendChild(mockContainer);

    // Create environment instance
    environment = new BaseEnvironment({
      usePostProcessing: false,
      usePerformanceMonitoring: false,
    });
  });

  describe("initialization", () => {
    it("should initialize scene and camera", async () => {
      await environment.initialize();

      expect(environment.scene).toBeInstanceOf(THREE.Scene);
      expect(environment.camera).toBeInstanceOf(THREE.PerspectiveCamera);
      expect(environment.renderer).toBeInstanceOf(THREE.WebGLRenderer);
    });

    it("should handle missing container gracefully", async () => {
      document.body.removeChild(mockContainer);
      const result = await environment.initialize();
      expect(result).toBe(false);
    });

    it("should set up renderer with correct options", async () => {
      await environment.initialize();

      expect(environment.renderer.shadowMap.enabled).toBe(true);
      expect(environment.renderer.shadowMap.type).toBe(THREE.PCFSoftShadowMap);
    });
  });

  describe("asset management", () => {
    it("should properly manage assets", () => {
      expect(environment.assets.models).toBeInstanceOf(Map);
      expect(environment.assets.textures).toBeInstanceOf(Map);
      expect(environment.assets.geometries).toBeInstanceOf(Map);
      expect(environment.assets.materials).toBeInstanceOf(Map);
    });
  });

  describe("window resizing", () => {
    it("should handle window resize events", async () => {
      await environment.initialize();

      const originalWidth = window.innerWidth;
      const originalHeight = window.innerHeight;

      // Simulate resize
      window.innerWidth = 1024;
      window.innerHeight = 768;
      environment.onWindowResize();

      expect(environment.camera.aspect).toBe(1024 / 768);

      // Restore original dimensions
      window.innerWidth = originalWidth;
      window.innerHeight = originalHeight;
    });
  });

  describe("rendering loop", () => {
    it("should call update and render in animation loop", async () => {
      await environment.initialize();

      const updateSpy = vi.spyOn(environment, "update");
      const renderSpy = vi.spyOn(environment, "render");

      environment.animate();

      expect(updateSpy).toHaveBeenCalled();
      expect(renderSpy).toHaveBeenCalled();
    });
  });

  describe("cleanup", () => {
    it("should properly dispose of resources", async () => {
      await environment.initialize();

      const disposeSpy = vi.spyOn(environment.renderer, "dispose");

      environment.dispose();

      expect(disposeSpy).toHaveBeenCalled();
      expect(environment.assets.models.size).toBe(0);
      expect(environment.assets.textures.size).toBe(0);
      expect(environment.assets.geometries.size).toBe(0);
      expect(environment.assets.materials.size).toBe(0);
    });
  });
});
