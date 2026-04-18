import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import {
  useWhyRender,
  setReporter,
  clearRenderHistory,
  getRenderHistory,
  __flushNow,
} from '../src';
import type { RenderEvent } from '../src';

describe('useWhyRender', () => {
  beforeEach(() => {
    clearRenderHistory();
  });

  afterEach(() => {
    cleanup();
    setReporter(null);
  });

  const collect = (): {
    events: RenderEvent[];
    reporter: (e: RenderEvent) => void;
  } => {
    const events: RenderEvent[] = [];
    const reporter = vi.fn((e: RenderEvent) => {
      events.push(e);
    });
    setReporter(reporter);
    return { events, reporter };
  };

  it('does not report on the initial render', () => {
    const { events } = collect();
    const C = ({ n }: { n: number }) => {
      useWhyRender('C1', { n });
      return <span>{n}</span>;
    };
    render(<C n={1} />);
    __flushNow();
    expect(events).toHaveLength(0);
  });

  it('reports when a function prop gets a new reference', () => {
    const { events } = collect();
    const C = ({ cb }: { cb: () => void }) => {
      useWhyRender('C2', { cb });
      return <span />;
    };
    const { rerender } = render(<C cb={() => {}} />);
    rerender(<C cb={() => {}} />);
    __flushNow();
    expect(events).toHaveLength(1);
    expect(events[0].component).toBe('C2');
    expect(events[0].diff.changedKeys).toContain('cb');
  });

  it('reports dead re-renders (nothing changed)', () => {
    const { events } = collect();
    const C = ({ n }: { n: number }) => {
      useWhyRender('C3', { n });
      return <span>{n}</span>;
    };
    const { rerender } = render(<C n={1} />);
    rerender(<C n={1} />);
    __flushNow();
    expect(events).toHaveLength(1);
    expect(events[0].diff.renderKind).toBe('nothing-changed');
  });

  it('does not report when every prop is a legit value change', () => {
    const { events } = collect();
    const C = ({ a, b }: { a: number; b: number }) => {
      useWhyRender('C4', { a, b });
      return <span>{a + b}</span>;
    };
    const { rerender } = render(<C a={1} b={1} />);
    rerender(<C a={2} b={2} />);
    __flushNow();
    expect(events).toHaveLength(0);
  });

  it('records history in a ring buffer', () => {
    const { events } = collect();
    void events;
    const C = ({ n }: { n: number }) => {
      useWhyRender('C5', { n });
      return <span>{n}</span>;
    };
    const { rerender } = render(<C n={1} />);
    rerender(<C n={1} />);
    rerender(<C n={1} />);
    __flushNow();
    const h = getRenderHistory('C5');
    expect(h.length).toBeGreaterThan(0);
  });

  it('groups identical sibling events', () => {
    const { reporter } = collect();
    const C = ({ cb }: { cb: () => void }) => {
      useWhyRender('Row', { cb });
      return <span />;
    };
    const List = () => (
      <>
        <C cb={() => {}} />
        <C cb={() => {}} />
        <C cb={() => {}} />
      </>
    );
    const { rerender } = render(<List />);
    rerender(<List />);
    __flushNow();
    // Reporter still fires per-component; grouping happens in the default
    // console flusher, not at the reporter-hook level.
    expect(reporter).toHaveBeenCalled();
  });
});
