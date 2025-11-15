import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),        // ✅ Ahora puedes usar "@/..."
      '@lib': path.resolve(__dirname, './src/lib'), // ✅ Mantienes "@lib/..."
    },
  },
  server: {
    host: true,
    allowedHosts: [
      'localhost',
    ],
  },
});
