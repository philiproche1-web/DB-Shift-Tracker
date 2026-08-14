import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Vendor code changes far less often than src/App.jsx does (this repo
        // ships app changes frequently) — splitting it out means a driver's
        // browser re-downloads only the small app chunk on most updates
        // instead of re-fetching React/Supabase every time too.
        manualChunks(id) {
          if (id.includes('node_modules')) return 'vendor'
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    exclude: ['**/node_modules/**', '**/dist/**', '**/.git/**', '**/.claude/worktrees/**'],
  },
})
