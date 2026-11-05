import { defineConfig } from 'vite';

// base: './' keeps asset URLs relative so a later desktop wrap (Tauri/Electron,
// file:// origin) works without config changes. Do NOT add the wrap now — Phase 3
// only needs `npm run dev` / `npm run build`.
export default defineConfig({
  base: './',
  // PORT env (when set, e.g. by a preview harness) wins over vite's default 5173.
  server: { open: false, port: process.env.PORT ? Number(process.env.PORT) : 5173 },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1600, // phaser is a large single dep; silence the noise
  },
});
