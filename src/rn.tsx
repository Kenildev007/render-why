import { useEffect, useState, useCallback, createElement, type ReactElement } from 'react';
import { getDevtoolsHook } from './devtoolsHook';
import { formatEvent } from './reporter';
import type { RenderEvent } from './types';

export { trackListItem } from './listItem';

type RNModule = {
  DeviceEventEmitter?: {
    addListener: (
      event: string,
      cb: () => void,
    ) => { remove: () => void };
  };
};

// Resolve react-native at runtime; the package is an optional peer dep.
const loadRN = (): RNModule | null => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('react-native') as RNModule;
  } catch {
    return null;
  }
};

/**
 * Mount anywhere in your dev tree. When the user shakes the device
 * (via React Native's shake gesture), a transient overlay pops up
 * showing the most recent re-render events captured by render-why.
 *
 *   import { ShakeToDebug } from 'render-why/rn';
 *   <ShakeToDebug />
 *
 * On web this component renders nothing.
 */
export function ShakeToDebug(): ReactElement | null {
  const [visible, setVisible] = useState(false);
  const [events, setEvents] = useState<RenderEvent[]>([]);

  const refresh = useCallback((): void => {
    const hook = getDevtoolsHook();
    if (!hook) return;
    setEvents(hook.events.slice(-20).reverse());
  }, []);

  useEffect(() => {
    const rn = loadRN();
    const emitter = rn?.DeviceEventEmitter;
    if (!emitter) return;
    const sub = emitter.addListener('RCTDeviceEventEmitter.shake', () => {
      refresh();
      setVisible((v) => !v);
    });
    return () => sub.remove();
  }, [refresh]);

  if (!visible) return null;

  // Use plain DOM/RN-agnostic primitives via createElement so this file
  // does not depend on react-native types at compile time.
  const styleBox = {
    position: 'absolute' as const,
    top: 40,
    left: 8,
    right: 8,
    maxHeight: 400,
    backgroundColor: 'rgba(0,0,0,0.88)',
    padding: 12,
    borderRadius: 8,
    zIndex: 9999,
  };
  const styleTitle = {
    color: '#fff',
    fontWeight: '700' as const,
    marginBottom: 6,
    fontSize: 14,
  };
  const styleLine = {
    color: '#ddd',
    fontFamily: 'Menlo, monospace',
    fontSize: 11,
    marginBottom: 2,
  };

  const children: ReactElement[] = [
    createElement(
      'div',
      { key: 'title', style: styleTitle },
      `🔍 render-why — last ${events.length} events`,
    ),
    ...events.map((e, i) =>
      createElement(
        'div',
        { key: i, style: styleLine },
        formatEvent(e)[0].replace(/\u001b\[[0-9;]*m/g, ''),
      ),
    ),
  ];
  return createElement('div', { style: styleBox }, children);
}
