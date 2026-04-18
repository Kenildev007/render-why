import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { createElement } from 'react';
import { Provider } from 'react-redux';
import { createStore } from 'redux';
import { trackedSelector } from '../src/adapters/redux';
import { setReporter, __flushNow, clearRenderHistory } from '../src';
import type { RenderEvent } from '../src';

type State = { user: { id: number; name: string }; counter: number };
const initial: State = { user: { id: 1, name: 'Ada' }, counter: 0 };
const reducer = (s: State = initial, a: { type: string }): State => {
  if (a.type === 'bump') return { ...s, counter: s.counter + 1 };
  return s;
};

describe('trackedSelector (redux)', () => {
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

  it('flags a selector that returns a fresh object every call', () => {
    const store = createStore(reducer);
    // Deliberately bad selector: returns a new object on every invocation
    const selectUserObj = (s: State) => ({ ...s.user });

    const C = () => {
      const u = trackedSelector(selectUserObj, 'selectUserObj');
      return createElement('span', null, u.name);
    };

    const { rerender } = render(
      createElement(Provider, { store, children: createElement(C) }),
    );
    store.dispatch({ type: 'bump' });
    rerender(createElement(Provider, { store, children: createElement(C) }));
    __flushNow();

    const hit = events.find((e) => e.component === 'selector:selectUserObj');
    expect(hit).toBeDefined();
    expect(hit!.diff.renderKind).toBe('some-changed-ref');
  });
});
