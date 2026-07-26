import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

// Multi-page build:
//   index.html  -> kiosk game client (portrait touchscreen)
//   admin.html  -> event-owner settings console (desktop browser)
// base is relative so the built bundle also works inside Electron (file://).
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        game: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'admin.html'),
      },
    },
  },
  server: {
    port: 5173,
  },
});
