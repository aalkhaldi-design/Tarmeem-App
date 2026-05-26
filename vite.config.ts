import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    __BUILD_ID__: JSON.stringify(
      new Date().toLocaleString('en-GB', { timeZone: 'Asia/Riyadh', hour12: false })
    ),
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
