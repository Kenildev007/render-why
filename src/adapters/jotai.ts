import { useAtomValue } from 'jotai';
import type { Atom } from 'jotai';
import { useWhyRender } from '../useWhyRender';

/**
 * Drop-in replacement for `useAtomValue` that reports when the atom's
 * value is a new reference with structurally the same value.
 */
export function trackedAtomValue<T>(atom: Atom<T>, name?: string): T {
  const value = useAtomValue(atom);
  const tag =
    name ??
    (atom as { debugLabel?: string }).debugLabel ??
    'atom';
  useWhyRender(
    `jotai:${tag}`,
    { value: value as unknown as object },
    { diff: 'structural' },
  );
  return value;
}
