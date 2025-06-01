// vite.config.js
import { defineConfig } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'

// Use dynamic import for ESM-only package
const glsl = (await import('vite-plugin-glsl')).default;

export default defineConfig({
  base: './', // Important for GitHub Pages
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    rollupOptions: {
      output: {
        assetFileNames: 'assets/[name].[ext]'
      }
    }
  },
  publicDir: 'public',
  plugins: [
    glsl(),
    viteStaticCopy({
      targets: [
        {
          src: 'assets/**/*',
          dest: 'assets'
        },
        {
          src: 'src/shaders/**/*',
          dest: 'shaders'
        },
        {
          src: 'models/**/*',
          dest: 'models'
        },
        {
          src: 'fonts/**/*',
          dest: 'fonts'
        },
        {
          src: 'sounds/**/*',
          dest: 'sounds'
        }
      ]
    })
  ]
})
