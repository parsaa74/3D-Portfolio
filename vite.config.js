import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig(({ command }) => ({
  base: command === 'build' ? "/3D-Portfolio/" : "/", // Only use base path in production
  build: {
    outDir: "dist",
    assetsDir: "assets",
    sourcemap: false,
    rollupOptions: {
      input: resolve(__dirname, "index.html"),
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
      "@utils": resolve(__dirname, "src/utils"),
      "@core": resolve(__dirname, "src/core"),
      "@systems": resolve(__dirname, "src/systems"),
    },
  },
  assetsInclude: ["**/*.glsl"],
  publicDir: "public",
}));
