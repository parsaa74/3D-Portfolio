// vite.config.js
export default {
  base: '/3D-Portfolio/',
  build: {
    sourcemap: true,
    assetsDir: 'assets',
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
}
