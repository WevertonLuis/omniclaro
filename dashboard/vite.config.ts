import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const backend = process.env.BACKEND_URL ?? 'http://localhost:3000';

// No GitHub Codespaces a pagina chega por https://<nome>-5173.app.github.dev.
// O Vite recusa hosts desconhecidos por padrao, e o HMR precisa usar a porta
// 443 do tunel em vez da 5173 local. Fora do Codespaces nada muda.
const noCodespaces = process.env.CODESPACES === 'true';

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: noCodespaces ? ['.app.github.dev'] : undefined,
    hmr: noCodespaces ? { clientPort: 443 } : undefined,
    proxy: {
      '/api': { target: backend, changeOrigin: true },
      '/socket.io': { target: backend, ws: true, changeOrigin: true },
    },
  },
});
