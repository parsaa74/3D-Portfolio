import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  base: '/3D-Portfolio/',
  plugins: [react()],
  build: {
    assetsInclude: ['**/*.glsl'],
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
      },
      output: {
        assetFileNames: 'assets/[name][extname]',
        entryFileNames: 'js/[name].js',
      }
    }
  },
  server: {
    fs: {
      strict: false,
    }
  }
}); 