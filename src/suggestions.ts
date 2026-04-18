import type { KeyChange, Suggestion } from './types';

type Pattern = {
  id: string;
  match: (key: string, change: KeyChange) => boolean;
  build: (key: string, change: KeyChange) => Omit<Suggestion, 'key'>;
};

const isFunction = (v: unknown): v is (...args: unknown[]) => unknown =>
  typeof v === 'function';

const isPlainObject = (v: unknown): boolean => {
  if (v === null || typeof v !== 'object') return false;
  if (Array.isArray(v)) return false;
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
};

const PATTERNS: Pattern[] = [
  {
    id: 'new-fn-ref',
    match: (_k, c) =>
      c.kind === 'new-reference-same-value' || c.kind === 'value-changed'
        ? isFunction(c.next)
        : false,
    build: (key) => ({
      message: `Parent is creating a new function every render.`,
      fix: `Wrap \`${key}\` in useCallback in the parent component.`,
      codeExample: `const ${key} = useCallback(${key}Impl, [/* deps */]);`,
    }),
  },
  {
    id: 'new-array-ref',
    match: (_k, c) =>
      c.kind === 'new-reference-same-value' && Array.isArray(c.next),
    build: (key) => ({
      message: `Array literal passed as prop — new reference every render.`,
      fix: `Wrap \`${key}\` in useMemo, or lift it to module scope if constant.`,
      codeExample: `const ${key} = useMemo(() => [/* items */], [/* deps */]);`,
    }),
  },
  {
    id: 'new-object-ref',
    match: (_k, c) =>
      c.kind === 'new-reference-same-value' && isPlainObject(c.next),
    build: (key) => ({
      message: `Object literal passed as prop — new reference every render.`,
      fix: `Wrap \`${key}\` in useMemo, or lift it to module scope if constant.`,
      codeExample: `const ${key} = useMemo(() => ({ /* fields */ }), [/* deps */]);`,
    }),
  },
];

export const buildSuggestions = (
  perKey: Record<string, KeyChange>,
): Suggestion[] => {
  const out: Suggestion[] = [];
  for (const [key, change] of Object.entries(perKey)) {
    for (const pattern of PATTERNS) {
      if (pattern.match(key, change)) {
        out.push({ key, ...pattern.build(key, change) });
        break;
      }
    }
  }
  return out;
};
