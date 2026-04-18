import { observer } from 'mobx-react-lite';
import type { FunctionComponent } from 'react';
import { track } from '../track';
import type { Opts } from '../types';

/**
 * Wraps a MobX function component with `observer` (so it actually subscribes
 * to the observables it reads) and then with render-why's `track`. Parent-
 * driven re-renders (new prop refs, dead re-renders) fire render-why; MobX-
 * driven local updates stay quiet because observer handles them internally
 * via forceUpdate, which is exactly what you want.
 */
export function trackedObserver<P extends object>(
  Component: FunctionComponent<P>,
  opts?: Opts<P> & { name?: string },
): FunctionComponent<P> {
  const observed = observer(Component) as unknown as FunctionComponent<P>;
  return track(observed, opts) as unknown as FunctionComponent<P>;
}
