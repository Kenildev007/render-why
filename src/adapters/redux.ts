import { useSelector } from 'react-redux';
import { useWhyRender } from '../useWhyRender';

/**
 * Drop-in replacement for `useSelector` that reports when the selector
 * returns a *new reference with structurally the same value* — the
 * classic react-redux bug that causes wasted re-renders.
 *
 * @example
 *   // before
 *   const user = useSelector(selectUser);
 *   // after
 *   const user = trackedSelector(selectUser, 'selectUser');
 */
export function trackedSelector<TState, TSelected>(
  selector: (state: TState) => TSelected,
  name?: string,
): TSelected {
  const result = useSelector<TState, TSelected>(selector);
  const tag =
    name ??
    (selector as { name?: string }).name ??
    'selector';
  useWhyRender(
    `selector:${tag}`,
    { result: result as unknown as object },
    { diff: 'structural' },
  );
  return result;
}
