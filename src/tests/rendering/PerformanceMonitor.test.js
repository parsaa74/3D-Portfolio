import { describe, it, expect, beforeEach, vi } from "vitest";
import { PerformanceMonitor } from "../../core/rendering/performance/PerformanceMonitor.js";

describe("PerformanceMonitor", () => {
  let monitor;

  beforeEach(() => {
    monitor = new PerformanceMonitor({
      showStats: false, // Disable stats panel for testing
    });
  });

  describe("initialization", () => {
    it("should initialize with default options", () => {
      const defaultMonitor = new PerformanceMonitor();
      expect(defaultMonitor.options.targetFPS).toBe(60);
      expect(defaultMonitor.options.adaptiveQuality).toBe(true);
    });

    it("should respect custom options", () => {
      const customMonitor = new PerformanceMonitor({
        targetFPS: 30,
        adaptiveQuality: false,
      });
      expect(customMonitor.options.targetFPS).toBe(30);
      expect(customMonitor.options.adaptiveQuality).toBe(false);
    });
  });

  describe("performance tracking", () => {
    it("should track frame count", () => {
      const initialFrameCount = monitor.frameCount;
      monitor.begin();
      expect(monitor.frameCount).toBe(initialFrameCount + 1);
    });

    it("should calculate FPS correctly", () => {
      // Mock performance.now()
      const originalNow = performance.now;
      let time = 0;
      performance.now = () => time;

      // Simulate 60 frames over 1 second
      time = 0;
      monitor.begin();
      monitor.end();

      for (let i = 0; i < 59; i++) {
        time += 1000 / 60; // Add time for each frame
        monitor.begin();
        monitor.end();
      }

      time = 1000; // Exactly 1 second
      monitor.begin();
      monitor.end();

      expect(Math.round(monitor.getFPS())).toBe(60);

      // Restore original performance.now
      performance.now = originalNow;
    });
  });

  describe("quality adaptation", () => {
    it("should lower quality when FPS is too low", () => {
      // Mock low FPS scenario
      monitor.currentFPS = 30; // Half of target FPS
      monitor.qualityLevel = 1.0;

      monitor.updateQualityLevel();

      expect(monitor.qualityLevel).toBeLessThan(1.0);
    });

    it("should increase quality when FPS is good", () => {
      // Mock good FPS scenario
      monitor.currentFPS = 58; // Close to target FPS
      monitor.qualityLevel = 0.8;

      monitor.updateQualityLevel();

      expect(monitor.qualityLevel).toBeGreaterThan(0.8);
    });

    it("should not increase quality beyond maximum", () => {
      monitor.currentFPS = 60;
      monitor.qualityLevel = 1.0;

      monitor.updateQualityLevel();

      expect(monitor.qualityLevel).toBe(1.0);
    });

    it("should not decrease quality below minimum", () => {
      monitor.currentFPS = 20;
      monitor.qualityLevel = 0.5;

      monitor.updateQualityLevel();

      expect(monitor.qualityLevel).toBe(0.5);
    });
  });

  describe("cleanup", () => {
    it("should clean up stats panel if it exists", () => {
      const monitorWithStats = new PerformanceMonitor({ showStats: true });
      const mockStats = {
        dom: document.createElement("div"),
      };
      document.body.appendChild(mockStats.dom);
      monitorWithStats.stats = mockStats;

      monitorWithStats.dispose();

      expect(document.body.contains(mockStats.dom)).toBe(false);
    });
  });
});
