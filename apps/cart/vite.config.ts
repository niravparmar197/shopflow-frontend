import tailwindcss from '@tailwindcss/vite';
import { federation } from '@module-federation/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { apiTarget, ports, shared } from '../../federation.config.ts';

const name = 'cart';
const port = ports.cart;

// A REMOTE: builds remoteEntry.js + its chunks under /mfe/cart/. The shell
// loads it at runtime; `npm run dev` here also runs it alone on :${port}.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? `/mfe/${name}/` : '/',
  plugins: [
    react(),
    tailwindcss(),
    federation({
      name,
      filename: 'remoteEntry.js',
      exposes: {
        './CartPage': './src/CartPage.tsx',
        './CartBadge': './src/CartBadge.tsx',
      },
      shared,
      bundleAllCSS: true, // the remote's own CSS loads with it
      dts: false,
    }),
  ],
  server: {
    port,
    strictPort: true,
    origin: `http://localhost:${port}`,
    proxy: { '/v1': apiTarget },
  },
  preview: { port, strictPort: true },
  build: { target: 'es2022' },
}));
