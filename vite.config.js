import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    allowedHosts: true,
    proxy: {
      // Used only to fetch the public Minecraft version catalog in the browser preview.
      '/minecraft-meta': {
        target: 'https://piston-meta.mojang.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/minecraft-meta/, ''),
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    allowedHosts: true,
  },
});
