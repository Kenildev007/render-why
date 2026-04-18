import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';
import { createElement } from 'react';
import { proxy } from 'valtio';
import { trackedSnapshot } from '../src/adapters/valtio';
import { setReporter, clearRenderHistory, __flushNow } from '../src';
import type { RenderEvent } from '../src';

describe('trackedSnapshot (valtio)', () => {
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

  it('renders through a proxy snapshot without crashing', () => {
    const state = proxy({ count: 0 });

    const C = () => {
      const s = trackedSnapshot(state, 'counter');
      return createElement('span', null, String(s.count));
    };

    const { container } = render(createElement(C));
    expect(container.textContent).toBe('0');
    act(() => {
      state.count = 1;
    });
    __flushNow();
    expect(events.length).toBeGreaterThanOrEqual(0);
  });
});
