import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // MapLibre loads its worker through a relative URL that pre-bundling breaks.
  optimizeDeps: { exclude: ['maplibre-gl'] },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
