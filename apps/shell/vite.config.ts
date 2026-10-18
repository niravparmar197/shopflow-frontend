import tailwindcss from '@tailwindcss/vite';
import { federation } from '@module-federation/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import { apiTarget, ports, remoteNames, shared } from '../../federation.config.ts';

/*
 * The HOST. It has no build-time remotes: it reads /mfe-manifest.json at startup
 * and registers the remotes then (see src/federation/remotes.ts). In production
 * the file is public/mfe-manifest.json (or one written at deploy time); in dev
 * this plugin serves the localhost URLs of the remote dev servers instead.
 */
const devManifest = (): Plugin => ({
  name: 'shopflow-dev-mfe-manifest',
  apply: 'serve',
  configureServer(server) {
    server.middlewares.use('/mfe-manifest.json', (_req, res) => {
      const manifest = Object.fromEntries(
        remoteNames.map((name) => [name, `http://localhost:${ports[name]}/remoteEntry.js`]),
      );
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'no-store');
      res.end(JSON.stringify(manifest));
    });
  },
});

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    devManifest(),
    federation({
      name: 'shell',
      remotes: {},
      shared,
      dts: false,
    }),
  ],
  server: {
    port: ports.shell,
    strictPort: true,
    proxy: { '/v1': apiTarget },
  },
  preview: { port: ports.shell, strictPort: true, proxy: { '/v1': apiTarget } },
  build: { target: 'es2022' },
});
