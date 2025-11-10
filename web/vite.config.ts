import { defineConfig } from 'vite';

// Dev proxy for convenience; you can also set VITE_BACKEND_URL in .env and session.ts will use it directly.
export default defineConfig({
  server: {
    host: 'localhost',
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8000',
      '/ws': { target: 'http://localhost:8000', ws: true }
    }
  }
});
