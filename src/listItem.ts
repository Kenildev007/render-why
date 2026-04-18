import { createElement, memo, type ReactElement } from 'react';
import { useWhyRender } from './useWhyRender';
import type { Opts } from './types';

type RenderItemArg<T> = { item: T; index: number };

/**
 * Wraps a FlatList/FlashList `renderItem` so every visible row gets
 * `useWhyRender` instrumentation. Because rows are rendered many times
 * per scroll, the default reporter's microtask grouping kicks in — 50
 * rows re-rendering for the same reason log once, not fifty times.
 *
 * @example
 *   <FlashList
 *     renderItem={trackListItem(({ item }) => <Row item={item} />, 'Row')}
 *     data={data}
 *   />
 */
export function trackListItem<T>(
  renderItem: (arg: RenderItemArg<T>) => ReactElement | null,
  name: string,
  opts?: Opts<RenderItemArg<T>>,
): (arg: RenderItemArg<T>) => ReactElement | null {
  const Row = memo((props: RenderItemArg<T>): ReactElement | null => {
    useWhyRender(name, props, opts);
    return renderItem(props);
  });
  (Row as { displayName?: string }).displayName = `trackListItem(${name})`;
  return (arg: RenderItemArg<T>) => createElement(Row, arg);
}
