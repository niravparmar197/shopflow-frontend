import { useEffect, useRef, useSyncExternalStore } from 'react';
import { session, type SessionState } from '@shopflow/api';
import { on, type ShopFlowEventName, type ShopFlowEvents } from './events';

/** The login session (same object in the shell and every remote). */
export function useSession(): SessionState {
  return useSyncExternalStore(session.subscribe, session.getState, session.getState);
}

/** Listen to a ShopFlow event while the component is mounted. */
export function useShopFlowEvent<K extends ShopFlowEventName>(
  name: K,
  handler: (detail: ShopFlowEvents[K]) => void,
): void {
  const ref = useRef(handler);
  useEffect(() => {
    ref.current = handler;
  });
  useEffect(() => on(name, (detail) => ref.current(detail)), [name]);
}
