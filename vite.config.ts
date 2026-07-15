import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react(), tailwindcss()],
  // GitHub Pages serves this as a project site at /delphi/,
  // not the domain root. Dev server keeps using "/" so `npm run dev` is unaffected.
  base: command === 'build' ? '/delphi/' : '/',
}))
