import { useSnapshot } from 'valtio';
import { useWhyRender } from '../useWhyRender';

/**
 * Drop-in replacement for `useSnapshot` that reports when the snapshot is
 * a new reference with structurally the same value.
 */
export function trackedSnapshot<T extends object>(
  proxy: T,
  name = 'snapshot',
): T {
  const snap = useSnapshot(proxy);
  useWhyRender(
    `valtio:${name}`,
    { snap: snap as unknown as object },
    { diff: 'structural' },
  );
  return snap as T;
}
