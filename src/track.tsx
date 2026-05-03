import { memo, createElement, type ComponentType } from 'react';
import { useWhyRender } from './useWhyRender';
import type { Opts } from './types';
import { isProductionTrackingEnabled } from './global';

type TrackOpts<P extends object> = Opts<P> & { name?: string };

const resolveName = (c: ComponentType<unknown>, override?: string): string =>
  override ??
  (c as { displayName?: string }).displayName ??
  (c as { name?: string }).name ??
  'Anonymous';

export function track<P extends object>(
  Component: ComponentType<P>,
  opts?: TrackOpts<P>,
): ComponentType<P> {
  // In production the whole wrapper collapses to the original component.
  if (
    process.env.NODE_ENV === 'production' &&
    !isProductionTrackingEnabled()
  )
    return Component;

  const name = resolveName(Component as ComponentType<unknown>, opts?.name);

  const Tracked: ComponentType<P> = (props: P) => {
    useWhyRender(name, props as P & object, opts);
    return createElement(Component, props);
  };

  (Tracked as { displayName?: string }).displayName = `track(${name})`;
  return Tracked;
}

export function trackMemo<P extends object>(
  Component: ComponentType<P>,
  opts?: TrackOpts<P>,
): ComponentType<P> {
  if (
    process.env.NODE_ENV === 'production' &&
    !isProductionTrackingEnabled()
  )
    return memo(Component) as unknown as ComponentType<P>;
  const tracked = track(Component, opts);
  const Wrapped = memo(tracked) as unknown as ComponentType<P>;
  (Wrapped as { displayName?: string }).displayName = `trackMemo(${resolveName(
    Component as ComponentType<unknown>,
    opts?.name,
  )})`;
  return Wrapped;
}
