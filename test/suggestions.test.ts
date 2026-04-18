import { describe, it, expect } from 'vitest';
import { buildSuggestions } from '../src/suggestions';

describe('buildSuggestions', () => {
  it('suggests useCallback for new function refs', () => {
    const s = buildSuggestions({
      onClick: {
        kind: 'new-reference-same-value',
        prev: () => {},
        next: () => {},
      },
    });
    expect(s).toHaveLength(1);
    expect(s[0].fix).toMatch(/useCallback/);
    expect(s[0].key).toBe('onClick');
  });

  it('suggests useMemo for new array refs', () => {
    const s = buildSuggestions({
      items: {
        kind: 'new-reference-same-value',
        prev: [],
        next: [1, 2],
      },
    });
    expect(s[0].fix).toMatch(/useMemo/);
  });

  it('suggests useMemo for new object refs', () => {
    const s = buildSuggestions({
      config: {
        kind: 'new-reference-same-value',
        prev: { a: 1 },
        next: { a: 1 },
      },
    });
    expect(s[0].fix).toMatch(/useMemo/);
  });

  it('produces no suggestions for real value changes', () => {
    const s = buildSuggestions({
      count: { kind: 'value-changed', prev: 1, next: 2 },
    });
    expect(s).toHaveLength(0);
  });
});
