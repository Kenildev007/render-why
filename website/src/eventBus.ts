import { setReporter, type RenderEvent } from 'render-why';

type Listener = (e: RenderEvent) => void;
const listeners = new Set<Listener>();

// Install a single global reporter that fans out to local subscribers.
setReporter((event) => {
  for (const l of listeners) {
    try {
      l(event);
    } catch {
      /* swallow */
    }
  }
});

export const subscribeEvents = (fn: Listener): (() => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};
