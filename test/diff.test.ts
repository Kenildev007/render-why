import { describe, it, expect } from 'vitest';
import { computeDiff, structurallyEqual } from '../src/diff';

describe('structurallyEqual', () => {
  it('handles primitives via Object.is', () => {
    expect(structurallyEqual(1, 1)).toBe(true);
    expect(structurallyEqual('a', 'a')).toBe(true);
    expect(structurallyEqual(1, 2)).toBe(false);
    expect(structurallyEqual(NaN, NaN)).toBe(true);
  });

  it('compares arrays element-wise', () => {
    expect(structurallyEqual([1, 2, 3], [1, 2, 3])).toBe(true);
    expect(structurallyEqual([1, 2], [1, 2, 3])).toBe(false);
    expect(structurallyEqual([{ a: 1 }], [{ a: 1 }])).toBe(true);
  });

  it('compares plain objects', () => {
    expect(structurallyEqual({ a: 1 }, { a: 1 })).toBe(true);
    expect(structurallyEqual({ a: 1 }, { a: 2 })).toBe(false);
    expect(structurallyEqual({ a: 1, b: 2 }, { a: 1 })).toBe(false);
  });

  it('treats function pairs as not equal', () => {
    expect(structurallyEqual(() => 1, () => 1)).toBe(false);
  });

  it('stops at depth', () => {
    const a = { a: { b: { c: 1 } } };
    const b = { a: { b: { c: 1 } } };
    expect(structurallyEqual(a, b, 2)).toBe(false); // too deep
    expect(structurallyEqual(a, b, 5)).toBe(true);
  });
});

describe('computeDiff', () => {
  it('detects no changes', () => {
    const same = { foo: 1, bar: 'x' };
    const r = computeDiff(same, { ...same });
    expect(r.renderKind).toBe('nothing-changed');
    expect(r.changedKeys).toHaveLength(0);
  });

  it('detects value change', () => {
    const r = computeDiff({ x: 1 }, { x: 2 });
    expect(r.perKey.x.kind).toBe('value-changed');
    expect(r.renderKind).toBe('all-changed');
  });

  it('detects added key', () => {
    const r = computeDiff({ a: 1 } as Record<string, number>, { a: 1, b: 2 });
    expect(r.perKey.b.kind).toBe('added');
  });

  it('detects removed key', () => {
    const r = computeDiff(
      { a: 1, b: 2 } as Record<string, number>,
      { a: 1 } as Record<string, number>,
    );
    expect(r.perKey.b.kind).toBe('removed');
  });

  it('flags new-reference-same-value under structural mode', () => {
    const r = computeDiff(
      { arr: [1, 2] },
      { arr: [1, 2] },
      { diff: 'structural' },
    );
    expect(r.perKey.arr.kind).toBe('new-reference-same-value');
    expect(r.renderKind).toBe('some-changed-ref');
  });

  it('shallow mode marks structurally equal as value-changed', () => {
    const r = computeDiff({ arr: [1, 2] }, { arr: [1, 2] });
    expect(r.perKey.arr.kind).toBe('value-changed');
  });

  it('redacts token-like keys by default', () => {
    const r = computeDiff({ token: 'supersecret' }, { token: 'anothersecret' });
    expect(r.perKey.token.prev).not.toBe('supersecret');
    expect(r.perKey.token.next).not.toBe('anothersecret');
  });

  it('honors custom redact', () => {
    const r = computeDiff(
      { email: 'a@b.com' },
      { email: 'c@d.com' },
      { redact: (k, v) => (k === 'email' ? '***' : v) },
    );
    expect(r.perKey.email.next).toBe('***');
  });

  it('honors ignore list', () => {
    const r = computeDiff(
      { a: 1, style: { color: 'red' } },
      { a: 1, style: { color: 'blue' } },
      { ignore: ['style'] },
    );
    expect(r.changedKeys).toEqual([]);
  });

  it('reports all-changed when every key has a real value change', () => {
    const r = computeDiff({ a: 1, b: 2 }, { a: 2, b: 3 });
    expect(r.renderKind).toBe('all-changed');
  });

  it('reports some-changed-ref when at least one is a ref-only change', () => {
    const r = computeDiff(
      { cfg: { x: 1 }, n: 1 },
      { cfg: { x: 1 }, n: 2 },
      { diff: 'structural' },
    );
    expect(r.renderKind).toBe('some-changed-ref');
  });
});
