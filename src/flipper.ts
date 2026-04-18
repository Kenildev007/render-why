import { setReporter } from './reporter';
import type { RenderEvent, Reporter } from './types';

type FlipperClient = {
  send: (method: string, data: unknown) => void;
};

type FlipperModule = {
  addPlugin: (plugin: {
    getId: () => string;
    onConnect: (conn: FlipperClient) => void;
    onDisconnect: () => void;
    runInBackground?: () => boolean;
  }) => void;
};

const loadFlipper = (): FlipperModule | null => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('react-native-flipper') as FlipperModule;
  } catch {
    return null;
  }
};

let conn: FlipperClient | null = null;
let installed = false;

const flipperReporter: Reporter = (event: RenderEvent) => {
  if (!conn) return;
  try {
    conn.send('event', event);
  } catch {
    // swallow — never break the host app
  }
};

/**
 * Routes render-why events to the React Native Flipper plugin.
 *
 *   import { enableFlipperLogger } from 'render-why/flipper';
 *   enableFlipperLogger();
 */
export const enableFlipperLogger = (): void => {
  if (installed) return;
  const flipper = loadFlipper();
  if (!flipper) return;
  flipper.addPlugin({
    getId: () => 'render-why',
    onConnect: (c) => {
      conn = c;
    },
    onDisconnect: () => {
      conn = null;
    },
    runInBackground: () => true,
  });
  setReporter(flipperReporter);
  installed = true;
};

export const disableFlipperLogger = (): void => {
  setReporter(null);
  conn = null;
  installed = false;
};
