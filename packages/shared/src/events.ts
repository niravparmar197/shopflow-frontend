/*
 * How micro frontends talk: browser events on window, never imports of each
 * other's code. The catalog says "the cart changed"; the cart remote listens
 * and reloads. Neither knows the other's internals or query keys.
 */
export interface ShopFlowEvents {
  /** Something changed the cart (add, update, remove, order placed). */
  'cart-changed': { itemCount?: number; source?: 'catalog' | 'cart' | 'checkout' };
  /** Show a toast from any remote; the shell renders it. */
  toast: {
    kind: 'success' | 'error' | 'info';
    message: string;
    detail?: string;
    action?: { label: string; href: string };
  };
}

export type ShopFlowEventName = keyof ShopFlowEvents;

const PREFIX = 'shopflow:';

export function emit<K extends ShopFlowEventName>(name: K, detail: ShopFlowEvents[K]): void {
  window.dispatchEvent(new CustomEvent(PREFIX + name, { detail }));
}

export function on<K extends ShopFlowEventName>(
  name: K,
  handler: (detail: ShopFlowEvents[K]) => void,
): () => void {
  const listener = (e: Event) => handler((e as CustomEvent<ShopFlowEvents[K]>).detail);
  window.addEventListener(PREFIX + name, listener);
  return () => window.removeEventListener(PREFIX + name, listener);
}

export const toast = (detail: ShopFlowEvents['toast']) => emit('toast', detail);
