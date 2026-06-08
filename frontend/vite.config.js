import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  publicDir: 'public',
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    commonjsOptions: {
      include: [/node_modules/],
    },
  },
  server: {
    port: 5173,
    open: false,
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
})
