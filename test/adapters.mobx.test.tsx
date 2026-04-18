import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';
import { createElement } from 'react';
import { makeAutoObservable } from 'mobx';
import { trackedObserver } from '../src/adapters/mobx';
import { setReporter, clearRenderHistory, __flushNow } from '../src';
import type { RenderEvent } from '../src';

class Counter {
  n = 0;
  constructor() {
    makeAutoObservable(this);
  }
  bump(): void {
    this.n += 1;
  }
}

describe('trackedObserver (mobx)', () => {
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

  it('re-renders on observable change via observer subscription', () => {
    const c = new Counter();
    const View = trackedObserver(
      (props: { counter: Counter }) =>
        createElement('span', null, String(props.counter.n)),
      { name: 'CounterView' },
    );

    const { container } = render(createElement(View, { counter: c }));
    expect(container.textContent).toBe('0');
    act(() => c.bump());
    // observer drives the re-render internally — DOM should update
    expect(container.textContent).toBe('1');
  });

  it('reports parent-driven wasted re-renders', () => {
    const c = new Counter();
    const View = trackedObserver(
      (props: { counter: Counter; cb: () => void }) => {
        void props.cb;
        return createElement('span', null, String(props.counter.n));
      },
      { name: 'WastedView' },
    );

    const { rerender } = render(
      createElement(View, { counter: c, cb: () => {} }),
    );
    rerender(createElement(View, { counter: c, cb: () => {} }));
    __flushNow();

    const hit = events.find((e) => e.component === 'WastedView');
    expect(hit).toBeDefined();
    expect(hit!.diff.changedKeys).toContain('cb');
  });
});
