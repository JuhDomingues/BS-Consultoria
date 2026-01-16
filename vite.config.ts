import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      // SDR endpoints go to port 3002
      '/api/conversations': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
      '/api/sdr-stats': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
      // All other API endpoints go to port 3003
      '/api': {
        target: 'http://localhost:3003',
        changeOrigin: true,
      },
    },
    cors: {
      origin: '*',
      credentials: true,
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
