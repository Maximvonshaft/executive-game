import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  build: {
    sourcemap: true
  },
  server: {
    port: 5173,
    host: '0.0.0.0'
  }
});
