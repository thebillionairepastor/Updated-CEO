
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load environment variables from .env files, but also look at process.env (Netlify)
  // Fix: Property 'cwd' does not exist on type 'Process'. Use casting to access the Node.js process.cwd() method.
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  // Prioritize actual environment variables (set in Netlify dashboard)
  const apiKey = process.env.API_KEY || env.API_KEY || '';

  return {
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(apiKey),
      'process.env.NODE_ENV': JSON.stringify(mode),
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      rollupOptions: {
        input: './index.html'
      }
    },
    server: {
      port: 3000
    }
  };
});
