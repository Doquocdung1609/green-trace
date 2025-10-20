// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      globals: {
        Buffer: true, // Polyfill Buffer for both dev and build
        global: true, // Polyfill global for both dev and build
        process: true, // Polyfill process for both dev and build
      },
      protocolImports: true, // Optional: polyfill `node:` protocol imports
    }),
  ],
  define: {
    global: 'globalThis', // Polyfill `global` with `globalThis`
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});