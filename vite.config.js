import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig(({ command }) => ({
  base: command === 'build' ? "/3D-Portfolio/" : "/", // Only use base path in production
  build: {
    outDir: "dist",
    assetsDir: "assets",
    sourcemap: false,
    // Ensure proper module bundling for GitHub Pages
    rollupOptions: {
      input: resolve(__dirname, "index.html"),
      output: {
        // Better file naming with hashes for cache busting
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    // Ensure proper module resolution
    target: 'esnext',
    minify: 'esbuild'
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
  // Ensure proper MIME types for GitHub Pages
  server: {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control',
    }
  }
}));
