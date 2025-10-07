import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'tesseract.js': path.resolve(__dirname, 'node_modules/tesseract.js/dist/tesseract.esm.min.js'),
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
