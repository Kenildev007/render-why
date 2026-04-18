import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { createElement } from 'react';
import { create } from 'zustand';
import { trackedStore } from '../src/adapters/zustand';
import { setReporter, __flushNow, clearRenderHistory } from '../src';
import type { RenderEvent } from '../src';

type State = { count: number; bump: () => void; items: number[] };

describe('trackedStore (zustand)', () => {
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

  it('wires through to useStore and reports wasted parent re-renders', () => {
    const useStore = create<State>((set) => ({
      count: 0,
      items: [1, 2, 3],
      bump: () => set((s) => ({ count: s.count + 1 })),
    }));

    const selectCount = (s: State) => s.count;

    const C = () => {
      const count = trackedStore(useStore, selectCount, 'count');
      return createElement('span', null, String(count));
    };

    const { rerender, container } = render(createElement(C));
    expect(container.textContent).toBe('0');
    rerender(createElement(C));
    __flushNow();

    // Re-rendered with same store state → nothing-changed dead re-render
    const hit = events.find((e) => e.component === 'zustand:count');
    expect(hit).toBeDefined();
    expect(hit!.diff.renderKind).toBe('nothing-changed');
  });
});
