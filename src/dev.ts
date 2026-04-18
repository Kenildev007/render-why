export const isDev = (): boolean => {
  try {
    return (
      typeof process !== 'undefined' &&
      !!process.env &&
      process.env.NODE_ENV !== 'production'
    );
  } catch {
    return true;
  }
};

// Browser, RN (Hermes exposes window), and RN Web all have `window`.
// Node SSR / RSC server environments do not. We no-op on the server.
export const canRun = (): boolean =>
  isDev() && typeof window !== 'undefined';

const errored = new Set<string>();
export const reportOnce = (tag: string, err: unknown): void => {
  if (errored.has(tag)) return;
  errored.add(tag);
  // eslint-disable-next-line no-console
  console.warn(`[render-why] ${tag}:`, err);
};
