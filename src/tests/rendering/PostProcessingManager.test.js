import { describe, it, expect, beforeEach, vi } from "vitest";
import { PostProcessingManager } from "../../core/rendering/postprocessing/PostProcessingManager.js";
import * as THREE from "three";
import {
  EffectComposer,
  RenderPass,
  ShaderPass,
  UnrealBloomPass,
  SMAAPass,
} from "three/addons/postprocessing/EffectComposer.js";

describe("PostProcessingManager", () => {
  let manager;
  let scene;
  let camera;
  let renderer;

  beforeEach(() => {
    // Create mock Three.js objects
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(800, 600);

    // Mock WebGL capabilities
    renderer.capabilities = {
      isWebGL2: true,
    };
    renderer.extensions = {
      get: vi.fn().mockReturnValue(true),
    };

    // Create PostProcessingManager instance
    manager = new PostProcessingManager(scene, camera, renderer);
  });

  describe("initialization", () => {
    it("should initialize with default options", () => {
      expect(manager.scene).toBe(scene);
      expect(manager.camera).toBe(camera);
      expect(manager.renderer).toBe(renderer);
      expect(manager.options).toEqual({
        useBloom: true,
        useColorCorrection: true,
        useAntiAliasing: true,
        bloomStrength: 1.5,
        bloomRadius: 0.4,
        bloomThreshold: 0.85,
      });
    });

    it("should initialize with custom options", () => {
      const customOptions = {
        useBloom: false,
        useColorCorrection: false,
        useAntiAliasing: false,
        bloomStrength: 2.0,
        bloomRadius: 0.5,
        bloomThreshold: 0.9,
      };

      manager = new PostProcessingManager(
        scene,
        camera,
        renderer,
        customOptions
      );
      expect(manager.options).toEqual(customOptions);
    });

    it("should create an EffectComposer during initialization", async () => {
      await manager.initialize();
      expect(manager.composer).toBeInstanceOf(EffectComposer);
    });

    it("should add RenderPass during initialization", async () => {
      await manager.initialize();
      const renderPass = manager.passes.get("render");
      expect(renderPass).toBeInstanceOf(RenderPass);
    });
  });

  describe("post-processing passes", () => {
    it("should setup bloom pass when enabled", async () => {
      manager = new PostProcessingManager(scene, camera, renderer, {
        useBloom: true,
      });
      await manager.initialize();

      const bloomPass = manager.passes.get("bloom");
      expect(bloomPass).toBeInstanceOf(UnrealBloomPass);
      expect(bloomPass.strength).toBe(manager.options.bloomStrength);
      expect(bloomPass.radius).toBe(manager.options.bloomRadius);
      expect(bloomPass.threshold).toBe(manager.options.bloomThreshold);
    });

    it("should not setup bloom pass when disabled", async () => {
      manager = new PostProcessingManager(scene, camera, renderer, {
        useBloom: false,
      });
      await manager.initialize();

      const bloomPass = manager.passes.get("bloom");
      expect(bloomPass).toBeUndefined();
    });

    it("should setup color correction pass when enabled", async () => {
      manager = new PostProcessingManager(scene, camera, renderer, {
        useColorCorrection: true,
      });
      await manager.initialize();

      const colorCorrectionPass = manager.passes.get("colorCorrection");
      expect(colorCorrectionPass).toBeInstanceOf(ShaderPass);
    });

    it("should setup SMAA pass when anti-aliasing is enabled and WebGL2 is not available", async () => {
      renderer.capabilities.isWebGL2 = false;
      renderer.extensions.get.mockReturnValue(false);

      manager = new PostProcessingManager(scene, camera, renderer, {
        useAntiAliasing: true,
      });
      await manager.initialize();

      const smaaPass = manager.passes.get("smaa");
      expect(smaaPass).toBeInstanceOf(SMAAPass);
    });
  });

  describe("runtime modifications", () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it("should update bloom strength", () => {
      const newStrength = 2.0;
      manager.setBloomStrength(newStrength);
      const bloomPass = manager.passes.get("bloom");
      expect(bloomPass.strength).toBe(newStrength);
    });

    it("should update bloom radius", () => {
      const newRadius = 0.6;
      manager.setBloomRadius(newRadius);
      const bloomPass = manager.passes.get("bloom");
      expect(bloomPass.radius).toBe(newRadius);
    });

    it("should update bloom threshold", () => {
      const newThreshold = 0.95;
      manager.setBloomThreshold(newThreshold);
      const bloomPass = manager.passes.get("bloom");
      expect(bloomPass.threshold).toBe(newThreshold);
    });

    it("should update color correction values", () => {
      const powRGB = new THREE.Vector3(1.2, 1.2, 1.2);
      const mulRGB = new THREE.Vector3(1.3, 1.3, 1.3);
      manager.setColorCorrection(powRGB, mulRGB);

      const colorCorrectionPass = manager.passes.get("colorCorrection");
      expect(colorCorrectionPass.uniforms.powRGB.value).toEqual(powRGB);
      expect(colorCorrectionPass.uniforms.mulRGB.value).toEqual(mulRGB);
    });
  });

  describe("resize handling", () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it("should update size of composer and passes", () => {
      const width = 1024;
      const height = 768;
      const composerSpy = vi.spyOn(manager.composer, "setSize");

      manager.setSize(width, height);

      expect(composerSpy).toHaveBeenCalledWith(width, height);

      const bloomPass = manager.passes.get("bloom");
      if (bloomPass) {
        expect(bloomPass.resolution.width).toBe(width);
        expect(bloomPass.resolution.height).toBe(height);
      }

      const smaaPass = manager.passes.get("smaa");
      if (smaaPass) {
        const smaaSetSizeSpy = vi.spyOn(smaaPass, "setSize");
        expect(smaaSetSizeSpy).toHaveBeenCalledWith(width, height);
      }
    });
  });

  describe("cleanup", () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it("should dispose of all passes and clear the passes map", () => {
      const disposeSpy = vi.fn();
      manager.passes.forEach((pass) => {
        pass.dispose = disposeSpy;
      });

      manager.dispose();

      expect(disposeSpy).toHaveBeenCalled();
      expect(manager.passes.size).toBe(0);
    });

    it("should dispose of the composer", () => {
      const composerDisposeSpy = vi.spyOn(manager.composer, "dispose");
      manager.dispose();
      expect(composerDisposeSpy).toHaveBeenCalled();
    });
  });
});
