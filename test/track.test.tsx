import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { createElement } from 'react';
import {
  track,
  trackMemo,
  setReporter,
  clearRenderHistory,
  __flushNow,
  enableWhyRender,
  disableWhyRender,
} from '../src';
import type { RenderEvent } from '../src';

describe('track HOC', () => {
  let events: RenderEvent[];
  beforeEach(() => {
    events = [];
    setReporter((e) => events.push(e));
    clearRenderHistory();
  });
  afterEach(() => {
    cleanup();
    setReporter(null);
    disableWhyRender();
  });

  it('wraps a component and reports new function refs', () => {
    type Props = { onClick: () => void };
    const Base = (_: Props) => createElement('span');
    Base.displayName = 'Base';
    const Tracked = track(Base);

    const { rerender } = render(createElement(Tracked, { onClick: () => {} }));
    rerender(createElement(Tracked, { onClick: () => {} }));
    __flushNow();

    expect(events.length).toBeGreaterThan(0);
    expect(events[0].component).toBe('Base');
  });

  it('respects custom name via opts', () => {
    const Anon = (_: { x: number }) => createElement('span');
    const Tracked = track(Anon, { name: 'MyCard' });

    const { rerender } = render(createElement(Tracked, { x: 1 }));
    rerender(createElement(Tracked, { x: 1 }));
    __flushNow();

    expect(events.some((e) => e.component === 'MyCard')).toBe(true);
  });

  it('trackMemo prevents re-render when props are shallow-equal', () => {
    const spy = vi.fn(() => createElement('span'));
    type Props = { n: number };
    const Base = (_p: Props) => spy();
    Base.displayName = 'MemoBase';

    const Tracked = trackMemo(Base);
    const { rerender } = render(createElement(Tracked, { n: 1 }));
    rerender(createElement(Tracked, { n: 1 }));
    // memo compares shallow: same n → Base body shouldn't re-run
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('global include filter applies to tracked components', () => {
    enableWhyRender({ include: [/^Allowed/] });
    const A = (_: { n: number }) => createElement('span');
    A.displayName = 'AllowedOne';
    const B = (_: { n: number }) => createElement('span');
    B.displayName = 'OtherOne';
    const TA = track(A);
    const TB = track(B);

    const rA = render(createElement(TA, { n: 1 }));
    rA.rerender(createElement(TA, { n: 1 }));
    const rB = render(createElement(TB, { n: 1 }));
    rB.rerender(createElement(TB, { n: 1 }));
    __flushNow();

    expect(events.some((e) => e.component === 'AllowedOne')).toBe(true);
    expect(events.some((e) => e.component === 'OtherOne')).toBe(false);
  });
});
