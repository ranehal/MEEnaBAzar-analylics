import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' keeps assets relative so the built site works from any
// sub-path, including a GitHub Pages project page like /repo-name/.
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})