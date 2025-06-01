// vite.config.js
import { defineConfig } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'

// Use dynamic import for ESM-only package
const glsl = (await import('vite-plugin-glsl')).default;

export default defineConfig({
  base: './', // Changed from '/3D-Portfolio/' to './' for GitHub Pages - makes URLs relative to current path
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
        },
        // Copy GLB files to root
        {
          src: 'chair.glb',
          dest: './'
        },
        {
          src: 'lamp.glb',
          dest: './'
        },
        {
          src: 'projector.glb',
          dest: './'
        },
        {
          src: 'projector_screen.glb',
          dest: './'
        },
        {
          src: 'severance_tv_show_office.glb',
          dest: './'
        }
      ]
    })
  ]
})
