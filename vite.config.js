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
      '/modrinth-api': {
        target: 'https://api.modrinth.com/v2',
        changeOrigin: true,
        secure: true,
        headers: { 'User-Agent': 'LumenLauncher/1.0.1 (https://github.com/zxcwmd/launcher)' },
        rewrite: (path) => path.replace(/^\/modrinth-api/, ''),
      },
      '/github-api': {
        target: 'https://api.github.com',
        changeOrigin: true,
        secure: true,
        headers: { 'User-Agent': 'LumenLauncher/1.0.1 (https://github.com/zxcwmd/launcher)' },
        rewrite: (path) => path.replace(/^\/github-api/, ''),
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    allowedHosts: true,
  },
});
