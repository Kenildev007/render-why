// Captures a short, cheap call-site hint. Full source-map resolution happens
// downstream (DevTools panel, Flipper plugin). We keep this sync and O(1).

const INTERNAL_FRAME = /render-why|node_modules/;

export const captureStack = (): string | undefined => {
  try {
    const err = new Error();
    const raw = err.stack;
    if (!raw) return undefined;
    // Drop the first line ("Error") and our own frames.
    const lines = raw.split('\n').slice(1);
    const user = lines.filter((l) => !INTERNAL_FRAME.test(l)).slice(0, 4);
    return user.length > 0 ? user.join('\n') : lines.slice(0, 4).join('\n');
  } catch {
    return undefined;
  }
};
