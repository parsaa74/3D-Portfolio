// vite.config.js
import { defineConfig } from 'vite'

export default defineConfig({
  base: './', // Important for GitHub Pages
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true
  },
  publicDir: 'public'
})
