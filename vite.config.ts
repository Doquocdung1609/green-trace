// vite.config.ts
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  return {
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': env.VITE_API_PROXY_TARGET,
      '/storage': env.VITE_API_PROXY_TARGET,
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          solana: ['@solana/web3.js', '@solana/wallet-adapter-react'],
          react: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
  };
});
