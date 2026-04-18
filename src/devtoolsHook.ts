import type { RenderEvent } from './types';

type Listener = (event: RenderEvent) => void;

type Hook = {
  version: 1;
  events: RenderEvent[];
  listeners: Set<Listener>;
  emit(event: RenderEvent): void;
  subscribe(fn: Listener): () => void;
  clear(): void;
};

const HOOK_KEY = '__RENDER_WHY__' as const;

type HostGlobal = typeof globalThis & { [HOOK_KEY]?: Hook };

const getHost = (): HostGlobal | undefined => {
  if (typeof window !== 'undefined')
    return window as unknown as HostGlobal;
  if (typeof globalThis !== 'undefined')
    return globalThis as HostGlobal;
  return undefined;
};

const MAX_EVENTS = 500;

export const getDevtoolsHook = (): Hook | undefined => {
  const host = getHost();
  if (!host) return undefined;
  let hook = host[HOOK_KEY];
  if (!hook) {
    const events: RenderEvent[] = [];
    const listeners = new Set<Listener>();
    hook = {
      version: 1,
      events,
      listeners,
      emit(event: RenderEvent): void {
        events.push(event);
        if (events.length > MAX_EVENTS) events.shift();
        for (const l of listeners) {
          try {
            l(event);
          } catch {
            // don't let a listener crash the host
          }
        }
      },
      subscribe(fn: Listener): () => void {
        listeners.add(fn);
        return () => listeners.delete(fn);
      },
      clear(): void {
        events.length = 0;
      },
    };
    host[HOOK_KEY] = hook;
  }
  return hook;
};

export const emitToDevtools = (event: RenderEvent): void => {
  const hook = getDevtoolsHook();
  hook?.emit(event);
};
