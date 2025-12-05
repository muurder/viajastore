import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
  },
  build: {
    rollupOptions: {
      // CORREÇÃO DEFINITIVA: Adicionado 'jspdf-autotable' à lista de externos
      external: ['jspdf', 'jspdf-autotable'], 
      output: {
        globals: {
          jspdf: 'jsPDF',
          'jspdf-autotable': 'jspdf_autotable' // Define o nome global para o importmap
        }
      }
    }
  }
});