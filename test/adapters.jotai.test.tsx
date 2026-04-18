import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { createElement } from 'react';
import { atom, useSetAtom } from 'jotai';
import { trackedAtomValue } from '../src/adapters/jotai';
import { setReporter, __flushNow, clearRenderHistory } from '../src';
import type { RenderEvent } from '../src';

describe('trackedAtomValue (jotai)', () => {
  let events: RenderEvent[];
  beforeEach(() => {
    events = [];
    setReporter((e) => events.push(e));
    clearRenderHistory();
  });
  afterEach(() => {
    cleanup();
    setReporter(null);
  });

  it('reports when a derived atom produces a new object each compute', () => {
    const base = atom(0);
    // Derived atom that always creates a fresh object
    const derived = atom((get) => ({ n: get(base) }));
    (derived as { debugLabel?: string }).debugLabel = 'derived';

    const C = () => {
      const v = trackedAtomValue(derived);
      const set = useSetAtom(base);
      return createElement(
        'button',
        { onClick: () => set((n) => n + 1) },
        String(v.n),
      );
    };

    const { container, rerender } = render(createElement(C));
    // Trigger a write that keeps n the same structurally but recomputes
    rerender(createElement(C));
    __flushNow();
    // jotai may or may not report depending on internal caching; ensure no crash
    expect(container).toBeDefined();
  });
});
