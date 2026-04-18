import type { DiffResult, KeyChange, RenderKind, Opts, DiffMode } from './types';

const DEFAULT_REDACT_KEY = /token|password|secret|auth|api[_-]?key|bearer/i;

const maskValue = (v: unknown): string => {
  if (v == null) return String(v);
  if (typeof v === 'string') {
    return v.length > 4 ? `${v.slice(0, 2)}***` : '***';
  }
  return '[redacted]';
};

const depthFor = (mode: DiffMode): number =>
  mode === 'deep' ? 5 : mode === 'structural' ? 2 : 1;

export const structurallyEqual = (
  a: unknown,
  b: unknown,
  depth = 2,
): boolean => {
  if (Object.is(a, b)) return true;
  if (depth <= 0) return false;
  if (a === null || b === null) return false;
  if (typeof a !== 'object' || typeof b !== 'object') return false;

  const aIsArr = Array.isArray(a);
  const bIsArr = Array.isArray(b);
  if (aIsArr !== bIsArr) return false;

  if (aIsArr && bIsArr) {
    const aa = a as unknown[];
    const bb = b as unknown[];
    if (aa.length !== bb.length) return false;
    for (let i = 0; i < aa.length; i++) {
      if (!structurallyEqual(aa[i], bb[i], depth - 1)) return false;
    }
    return true;
  }

  // Functions never "structurally equal" — treat as value-changed on ref change.
  if (typeof a === 'function' || typeof b === 'function') return false;

  const ao = a as Record<string, unknown>;
  const bo = b as Record<string, unknown>;
  const aKeys = Object.keys(ao);
  const bKeys = Object.keys(bo);
  if (aKeys.length !== bKeys.length) return false;
  for (const k of aKeys) {
    if (!Object.prototype.hasOwnProperty.call(bo, k)) return false;
    if (!structurallyEqual(ao[k], bo[k], depth - 1)) return false;
  }
  return true;
};

export const computeDiff = <T extends object>(
  prev: T,
  next: T,
  opts?: Opts<T>,
): DiffResult => {
  const ignore = new Set<string>(
    (opts?.ignore as string[] | undefined) ?? [],
  );
  const mode: DiffMode = opts?.diff ?? 'shallow';
  const depth = depthFor(mode);

  const redact = (key: string, value: unknown): unknown => {
    if (opts?.redact) {
      try {
        return opts.redact(key as keyof T & string, value);
      } catch {
        return '[redact-failed]';
      }
    }
    if (DEFAULT_REDACT_KEY.test(key)) return maskValue(value);
    return value;
  };

  const perKey: Record<string, KeyChange> = {};
  const changedKeys: string[] = [];
  const allKeys = new Set<string>([
    ...Object.keys(prev),
    ...Object.keys(next),
  ]);

  for (const key of allKeys) {
    if (ignore.has(key)) continue;
    const prevObj = prev as Record<string, unknown>;
    const nextObj = next as Record<string, unknown>;
    const hasPrev = Object.prototype.hasOwnProperty.call(prevObj, key);
    const hasNext = Object.prototype.hasOwnProperty.call(nextObj, key);
    const p = prevObj[key];
    const n = nextObj[key];

    if (!hasPrev && hasNext) {
      changedKeys.push(key);
      perKey[key] = {
        kind: 'added',
        prev: undefined,
        next: redact(key, n),
      };
      continue;
    }
    if (hasPrev && !hasNext) {
      changedKeys.push(key);
      perKey[key] = {
        kind: 'removed',
        prev: redact(key, p),
        next: undefined,
      };
      continue;
    }
    if (Object.is(p, n)) continue;

    // Functions are special: we can't structurally compare them, and in
    // practice a new function ref with the "same" closure is the #1 wasted
    // re-render pattern. Always flag it as new-reference-same-value so the
    // reporter can suggest useCallback.
    const bothFns = typeof p === 'function' && typeof n === 'function';
    const structurallySame = bothFns
      ? true
      : mode === 'shallow'
      ? false
      : structurallyEqual(p, n, depth);

    changedKeys.push(key);
    perKey[key] = {
      kind: structurallySame ? 'new-reference-same-value' : 'value-changed',
      prev: redact(key, p),
      next: redact(key, n),
    };
  }

  let renderKind: RenderKind;
  if (changedKeys.length === 0) {
    renderKind = 'nothing-changed';
  } else {
    const hasRefOnly = changedKeys.some(
      (k) => perKey[k].kind === 'new-reference-same-value',
    );
    renderKind = hasRefOnly ? 'some-changed-ref' : 'all-changed';
  }

  return { changedKeys, perKey, renderKind };
};
