import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  server: {
    port: 3000,
    open: true,
    cors: true,
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
    fs: {
      allow: [".."],
    },
  },
  build: {
    outDir: "dist",
    assetsDir: "assets",
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      input: {
        main: "index.html",
      },
    },
    sourcemap: true,
  },
  resolve: {
    alias: {
      three: resolve(__dirname, "node_modules/three"),
      "@": resolve(__dirname, "src"),
      "cannon-es": "cannon-es",
      "stats.js": "stats.js",
      "@utils": resolve(__dirname, "src/utils"),
      "@core": resolve(__dirname, "src/core"),
      "@systems": resolve(__dirname, "src/systems"),
      "@assets": resolve(__dirname, "src/assets"),
    },
  },
  optimizeDeps: {
    include: [
      "three",
      "three/examples/jsm/controls/OrbitControls",
      "three/examples/jsm/controls/PointerLockControls",
      "three/examples/jsm/loaders/GLTFLoader",
      "three/examples/jsm/loaders/DRACOLoader",
      "three/examples/jsm/loaders/RGBELoader",
      "three/examples/jsm/exporters/GLTFExporter",
      "three/examples/jsm/postprocessing/EffectComposer",
      "three/examples/jsm/postprocessing/RenderPass",
      "three/examples/jsm/postprocessing/ShaderPass",
      "three/examples/jsm/postprocessing/UnrealBloomPass",
      "three/examples/jsm/shaders/CopyShader",
      "three/examples/jsm/shaders/ColorCorrectionShader",
    ],
  },
  assetsInclude: ["**/*.glsl"],
  publicDir: "public",
});
