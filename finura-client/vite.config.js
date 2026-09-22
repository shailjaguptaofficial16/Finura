import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/setupTests.js',
    css: true,
  },

  server: {
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
        rewrite: (path) => path,
      },
    },
  },

  preview: {
    port: 4173,
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
        rewrite: (path) => path,
      },
    },
  },

  // Force Vite to pre-bundle prop-types so react-csv can find it
  optimizeDeps: {
    include: [
      "prop-types",
      "react-csv",
    ],
  },

  build: {
    // Silence the chunk-size warning (not an error)
    chunkSizeWarningLimit: 2500,
    rolldownOptions: {
      output: {
        codeSplitting: true,
      },
    },
  },
});
