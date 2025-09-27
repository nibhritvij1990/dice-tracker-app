import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '',
  plugins: [react()],
  optimizeDeps: {
    // Limit pre-bundle scan to our entry to avoid crawling android build assets
    entries: ['index.html'],
    // Silence optional deps that might appear in built bundles
    exclude: ['@emotion/is-prop-valid'],
  },
})
