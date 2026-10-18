import { loadRemote, registerRemotes } from '@module-federation/runtime';

/** remote name → URL of its remoteEntry.js, from /mfe-manifest.json */
type MfeManifest = Record<string, string>;

let ready: Promise<MfeManifest> | null = null;

/**
 * Reads the manifest once and registers every remote with the Module Federation
 * runtime. The shell is never rebuilt to change a remote: deploy the remote,
 * then point its line in the manifest to the new version (rollback = point back).
 */
export function initRemotes(): Promise<MfeManifest> {
  ready ??= (async () => {
    const res = await fetch('/mfe-manifest.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`Cannot load /mfe-manifest.json (HTTP ${res.status})`);
    const manifest = (await res.json()) as MfeManifest;
    registerRemotes(
      Object.entries(manifest).map(([name, entry]) => ({ name, entry, type: 'module' as const })),
    );
    return manifest;
  })().catch((err: unknown) => {
    ready = null; // let the next attempt try again
    throw err;
  });
  return ready;
}

/** Loads one exposed module, e.g. loadRemoteModule('cart', './CartBadge'). */
export async function loadRemoteModule<T>(remote: string, exposed: string): Promise<T> {
  await initRemotes();
  const mod = await loadRemote<T>(`${remote}/${exposed.replace(/^\.\//, '')}`);
  if (!mod) throw new Error(`Remote module ${remote}/${exposed} is empty`);
  return mod;
}
