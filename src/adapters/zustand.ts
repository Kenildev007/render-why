import { useWhyRender } from '../useWhyRender';

type UseStore<S> = {
  <T>(selector: (state: S) => T): T;
  (): S;
};

/**
 * Wraps a zustand store hook + selector and reports when the selected slice
 * is a new reference with structurally the same value.
 *
 * @example
 *   const user = trackedStore(useUserStore, (s) => s.user, 'user');
 */
export function trackedStore<S, T>(
  useStore: UseStore<S>,
  selector: (state: S) => T,
  name?: string,
): T {
  const result = useStore(selector);
  const tag =
    name ??
    (selector as { name?: string }).name ??
    'slice';
  useWhyRender(
    `zustand:${tag}`,
    { result: result as unknown as object },
    { diff: 'structural' },
  );
  return result;
}
