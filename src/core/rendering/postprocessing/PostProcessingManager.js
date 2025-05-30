import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { SMAAPass } from "three/examples/jsm/postprocessing/SMAAPass.js";
import { ColorCorrectionShader } from "three/examples/jsm/shaders/ColorCorrectionShader.js";
import * as THREE from "three";

export class PostProcessingManager {
  constructor(scene, camera, renderer, options = {}) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;

    this.options = {
      useBloom: true,
      useColorCorrection: true,
      useAntiAliasing: true,
      bloomStrength: 1.0, // Reduced bloom strength for subtlety
      bloomRadius: 0.4,
      bloomThreshold: 0.85,
      ...options,
    };

    this.composer = null;
    this.passes = new Map();
  }

  async initialize() {
    this.composer = new EffectComposer(this.renderer);

    // Add render pass
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);
    this.passes.set("render", renderPass);

    // Add optional passes based on options
    if (this.options.useBloom) {
      await this.setupBloom();
    }

    if (this.options.useColorCorrection) {
      await this.setupColorCorrection();
    }

    if (this.options.useAntiAliasing) {
      await this.setupAntiAliasing();
    }
  }

  async setupBloom() {
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      this.options.bloomStrength,
      this.options.bloomRadius,
      this.options.bloomThreshold
    );
    this.composer.addPass(bloomPass);
    this.passes.set("bloom", bloomPass);
  }

  async setupColorCorrection() {
    const colorCorrectionPass = new ShaderPass(ColorCorrectionShader);
    // Adjust for cooler, slightly desaturated Severance look
    colorCorrectionPass.uniforms.powRGB.value = new THREE.Vector3(
      1.0, // Less power adjustment overall
      1.0,
      1.05 // Slight boost to blue power
    );
    colorCorrectionPass.uniforms.mulRGB.value = new THREE.Vector3(
      0.95, // Slightly reduce red contribution
      1.0,  // Keep green contribution
      1.05  // Slightly boost blue contribution
    );
    this.composer.addPass(colorCorrectionPass);
    this.passes.set("colorCorrection", colorCorrectionPass);
  }

  async setupAntiAliasing() {
    if (
      !this.renderer.capabilities.isWebGL2 &&
      !this.renderer.extensions.get("MSAA")
    ) {
      const smaaPass = new SMAAPass(
        window.innerWidth * this.renderer.getPixelRatio(),
        window.innerHeight * this.renderer.getPixelRatio()
      );
      this.composer.addPass(smaaPass);
      this.passes.set("smaa", smaaPass);
    }
  }

  setSize(width, height) {
    this.composer.setSize(width, height);

    // Update individual passes if needed
    const bloomPass = this.passes.get("bloom");
    if (bloomPass) {
      bloomPass.resolution.set(width, height);
    }

    const smaaPass = this.passes.get("smaa");
    if (smaaPass) {
      smaaPass.setSize(width, height);
    }
  }

  render() {
    this.composer.render();
  }

  dispose() {
    this.passes.forEach((pass) => {
      if (pass.dispose) {
        pass.dispose();
      }
    });

    this.passes.clear();

    if (this.composer) {
      this.composer.dispose();
    }
  }

  // Utility methods for runtime modifications
  setBloomStrength(strength) {
    const bloomPass = this.passes.get("bloom");
    if (bloomPass) {
      bloomPass.strength = strength;
    }
  }

  setBloomRadius(radius) {
    const bloomPass = this.passes.get("bloom");
    if (bloomPass) {
      bloomPass.radius = radius;
    }
  }

  setBloomThreshold(threshold) {
    const bloomPass = this.passes.get("bloom");
    if (bloomPass) {
      bloomPass.threshold = threshold;
    }
  }

  setColorCorrection(powRGB, mulRGB) {
    const colorCorrectionPass = this.passes.get("colorCorrection");
    if (colorCorrectionPass) {
      if (powRGB) colorCorrectionPass.uniforms.powRGB.value.copy(powRGB);
      if (mulRGB) colorCorrectionPass.uniforms.mulRGB.value.copy(mulRGB);
    }
  }

  /**
   * Set quality level for adaptive post-processing
   * @param {number} quality - 0.0 to 1.0
   */
  setQualityLevel(quality) {
    // Bloom and AA off if quality < 0.7
    const bloomPass = this.passes.get("bloom");
    if (bloomPass) bloomPass.enabled = quality >= 0.7;
    const smaaPass = this.passes.get("smaa");
    if (smaaPass) smaaPass.enabled = quality >= 0.7;
    // Color correction off if quality < 0.5
    const colorCorrectionPass = this.passes.get("colorCorrection");
    if (colorCorrectionPass) colorCorrectionPass.enabled = quality >= 0.5;
  }
}
