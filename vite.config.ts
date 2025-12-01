import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
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
