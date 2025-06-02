export class PerformanceMonitor {
  constructor(options = {}) {
    this.options = {
      showStats: true,
      targetFPS: 60,
      adaptiveQuality: true,
      ...options,
    };

    this.stats = null;
    this.lastTime = performance.now();
    this.frameCount = 0;
    this.currentFPS = 0;
    this.qualityLevel = 1.0;
  }

  begin() {
    // No stats panel
    this.frameCount++;
  }

  end() {
    // No stats panel

    // Update FPS calculation every second
    const currentTime = performance.now();
    const elapsed = currentTime - this.lastTime;

    if (elapsed >= 1000) {
      this.currentFPS = (this.frameCount * 1000) / elapsed;
      this.frameCount = 0;
      this.lastTime = currentTime;

      if (this.options.adaptiveQuality) {
        this.updateQualityLevel();
      }
    }
  }

  updateQualityLevel() {
    const targetFPS = this.options.targetFPS;
    const currentFPS = this.currentFPS;

    if (currentFPS < targetFPS * 0.8) {
      // FPS is too low, reduce quality
      this.qualityLevel = Math.max(0.5, this.qualityLevel - 0.1);
    } else if (currentFPS > targetFPS * 0.9 && this.qualityLevel < 1.0) {
      // FPS is good, try to increase quality
      this.qualityLevel = Math.min(1.0, this.qualityLevel + 0.05);
    }
  }

  getQualityLevel() {
    return this.qualityLevel;
  }

  getFPS() {
    return this.currentFPS;
  }

  dispose() {
    // No stats panel to dispose
  }
} 