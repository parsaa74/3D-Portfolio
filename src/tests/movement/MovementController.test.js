import { describe, it, expect, beforeEach, vi } from "vitest";
import { UnifiedMovementController } from "../../systems/movement/UnifiedMovementController.js";

function createMockCamera() {
  return {
    fov: 60,
    position: { x: 0, y: 1.8, z: 0, clone() { return { ...this }; }, copy() {} },
    rotation: { x: 0, y: 0, z: 0 },
    up: { set: () => {} },
    updateProjectionMatrix: vi.fn(),
    getWorldDirection: () => ({ x: 0, y: 0, z: -1, clone() { return { ...this }; } }),
    quaternion: { clone: () => ({ slerp: () => ({}) }) },
    lookAt: () => {},
    copy: () => {},
  };
}

describe("UnifiedMovementController", () => {
  let controller;
  let camera;
  let environment;

  beforeEach(() => {
    camera = createMockCamera();
    environment = { gameState: { isPlaying: true } };
    controller = new UnifiedMovementController(camera, environment);
    camera.rotation.y = 0; // Reset camera rotation
  });

  describe("zoom (scroll-to-zoom)", () => {
    it("should zoom in and out with scroll wheel and clamp FOV", () => {
      window.playerCanMove = true;
      // Initial FOV
      expect(camera.fov).toBe(60);
      // Simulate scroll up (zoom in)
      controller.handleWheel({ deltaY: -100, preventDefault: () => {} });
      // Debug log
      console.log('zoomFOV after scroll up:', controller.zoomFOV, 'playerCanMove:', window.playerCanMove, 'isPlaying:', controller.environment?.gameState?.isPlaying);
      expect(controller.zoomFOV).toBeLessThan(60);
      // Simulate scroll down (zoom out)
      controller.handleWheel({ deltaY: 100, preventDefault: () => {} });
      // Debug log
      console.log('zoomFOV after scroll down:', controller.zoomFOV);
      expect(controller.zoomFOV).toBeGreaterThanOrEqual(controller.baseFOV);
      // Zoom in to min
      for (let i = 0; i < 20; i++) controller.handleWheel({ deltaY: -100, preventDefault: () => {} });
      // Debug log
      console.log('zoomFOV after many scroll up:', controller.zoomFOV);
      expect(controller.zoomFOV).toBeGreaterThanOrEqual(controller.minZoomFOV);
      expect(controller.zoomFOV).toBeLessThanOrEqual(controller.baseFOV);
      // Zoom out to max
      for (let i = 0; i < 20; i++) controller.handleWheel({ deltaY: 100, preventDefault: () => {} });
      // Debug log
      console.log('zoomFOV after many scroll down:', controller.zoomFOV);
      expect(controller.zoomFOV).toBeLessThanOrEqual(controller.maxZoomFOV);
      expect(controller.zoomFOV).toBeGreaterThanOrEqual(controller.baseFOV);
    });

    it("should smoothly interpolate camera FOV toward zoomFOV in update", () => {
      window.playerCanMove = true;
      controller.zoomFOV = 30;
      camera.fov = 60;
      controller.update(0.016);
      expect(camera.fov).toBeLessThan(60);
      // Simulate several frames
      for (let i = 0; i < 30; i++) controller.update(0.016);
      expect(Math.abs(camera.fov - 30)).toBeLessThan(1.5);
    });
  });
});
