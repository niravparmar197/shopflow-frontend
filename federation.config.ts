/*
 * One place for the Module Federation settings every app shares.
 *
 * - singleton: exactly ONE copy at runtime. Two React copies break hooks; two
 *   copies of @shopflow/api would mean two logins; two React Query copies would
 *   mean two caches.
 * - Remotes are loaded at RUNTIME from /mfe-manifest.json (see apps/shell),
 *   so a remote can be deployed alone, without rebuilding the shell.
 */
export const shared = {
  react: { singleton: true, requiredVersion: '^19.2.0' },
  'react-dom': { singleton: true, requiredVersion: '^19.2.0' },
  'react-router': { singleton: true, requiredVersion: '^7.18.0' },
  '@tanstack/react-query': { singleton: true, requiredVersion: '^5.90.0' },
  '@shopflow/api': { singleton: true, requiredVersion: '^0.1.0' },
  '@shopflow/shared': { singleton: true, requiredVersion: '^0.1.0' },
};

/** Dev ports. In production everything is one origin: /, /mfe/<name>/, /v1. */
export const ports = { shell: 5000, catalog: 5001, cart: 5002, checkout: 5003, admin: 5004 } as const;

export const remoteNames: Array<Exclude<keyof typeof ports, 'shell'>> = ['catalog', 'cart', 'checkout', 'admin'];

/** Where the gateway runs in dev (the ShopFlow backend: npm run start:dev). */
export const apiTarget = process.env.SHOPFLOW_API ?? 'http://localhost:3000';
