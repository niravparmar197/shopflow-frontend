// Serves dist-web like production does (same rules as nginx.conf), and proxies
// /v1 to the gateway. For local checks and the e2e tests:
//   npm run build && npm start          → http://localhost:8080
//   SHOPFLOW_API=http://localhost:3000 PORT=8080
import { createReadStream, existsSync, statSync } from 'node:fs';
import http from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..', 'dist-web');
const port = Number(process.env.PORT ?? 8080);
const api = new URL(process.env.SHOPFLOW_API ?? 'http://localhost:3000');

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

// Hashed files never change → cache 1 year. Entry files must always be fresh,
// or a browser could mix an old remoteEntry.js with new chunks.
const noCache = /(^|\/)(index\.html|remoteEntry\.js|mf-manifest\.json|mfe-manifest\.json)$/;
const cacheControl = (path) =>
  noCache.test(path) ? 'no-cache' : path.includes('/assets/') ? 'public, max-age=31536000, immutable' : 'public, max-age=3600';

function proxy(req, res) {
  const upstream = http.request(
    { host: api.hostname, port: api.port || 80, path: req.url, method: req.method, headers: { ...req.headers, host: api.host } },
    (up) => {
      res.writeHead(up.statusCode ?? 502, up.headers);
      up.pipe(res);
    },
  );
  upstream.on('error', () => {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ code: 'BAD_GATEWAY', message: 'Gateway not reachable', correlationId: 'local' }));
  });
  req.pipe(upstream);
}

http
  .createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    if (url.pathname.startsWith('/v1/')) return proxy(req, res);

    let path = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '');
    let file = join(root, path);
    const isFile = existsSync(file) && statSync(file).isFile();
    if (!isFile) {
      // Missing asset → 404; anything else is an app route → index.html (SPA).
      if (extname(path)) {
        res.writeHead(404).end('Not found');
        return;
      }
      path = '/index.html';
      file = join(root, path);
    }
    res.writeHead(200, {
      'Content-Type': types[extname(file)] ?? 'application/octet-stream',
      'Cache-Control': cacheControl(path),
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    });
    createReadStream(file).pipe(res);
  })
  .listen(port, () => console.log(`ShopFlow web on http://localhost:${port} (API → ${api.origin})`));
