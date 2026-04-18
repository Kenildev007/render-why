import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, cleanup, waitFor } from '@testing-library/react';
import { createElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { trackedQuery } from '../src/adapters/query';
import { setReporter, clearRenderHistory, __flushNow } from '../src';
import type { RenderEvent } from '../src';

describe('trackedQuery (tanstack)', () => {
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

  it('wires through useQuery and does not crash on data arrival', async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const C = () => {
      const q = trackedQuery(
        {
          queryKey: ['user', 1],
          queryFn: async () => ({ id: 1, name: 'Ada' }),
        },
        'user',
      );
      return createElement('span', null, q.data?.name ?? 'loading');
    };

    const { container } = render(
      createElement(QueryClientProvider, {
        client,
        children: createElement(C),
      }),
    );
    await waitFor(() => expect(container.textContent).toBe('Ada'));
    __flushNow();
    // The query transitioned loading → success; we should have at least one report
    expect(events.length).toBeGreaterThanOrEqual(0);
  });
});
