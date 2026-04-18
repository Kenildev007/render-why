import pc from 'picocolors';
import type { RenderEvent, KeyChange, Reporter } from './types';
import { emitToDevtools } from './devtoolsHook';

const emitPerfMark = (event: RenderEvent): void => {
  if (
    typeof performance === 'undefined' ||
    typeof performance.measure !== 'function'
  )
    return;
  try {
    const label = `render-why:${event.component}:${event.diff.renderKind}`;
    const end = performance.now();
    const start = Math.max(0, end - event.elapsed);
    performance.measure(label, { start, end });
  } catch {
    // some environments throw on bad timestamps — ignore
  }
};

const ICON: Record<KeyChange['kind'], string> = {
  'new-reference-same-value': '⚠',
  'value-changed': '●',
  added: '+',
  removed: '-',
};

const truncate = (s: string, max: number): string =>
  s.length > max ? s.slice(0, max - 1) + '…' : s;

const formatValue = (v: unknown, max = 48): string => {
  if (v === undefined) return 'undefined';
  if (v === null) return 'null';
  if (typeof v === 'function') {
    const name = (v as { name?: string }).name;
    return name ? `[Function: ${name}]` : '[Function]';
  }
  if (typeof v === 'string') return truncate(JSON.stringify(v), max);
  if (typeof v === 'number' || typeof v === 'boolean' || typeof v === 'bigint')
    return String(v);
  if (typeof v === 'symbol') return v.toString();
  try {
    return truncate(JSON.stringify(v), max);
  } catch {
    return '[unserializable]';
  }
};

const pad = (s: string, len: number): string =>
  s.length >= len ? s : s + ' '.repeat(len - s.length);

export const formatEvent = (event: RenderEvent): string[] => {
  const lines: string[] = [];
  const { component, render, diff, suggestions, elapsed } = event;

  lines.push(
    `🔍 ${pc.bold(component)} re-rendered ${pc.dim(`(render #${render})`)}`,
  );

  const keys = diff.changedKeys;
  const totalChildren = keys.length + (suggestions.length > 0 ? 1 : 0);

  if (totalChildren === 0) {
    lines.push(`└─ ${pc.dim('nothing changed — dead re-render')}`);
  } else {
    const keyColWidth = Math.min(
      24,
      Math.max(8, ...keys.map((k) => k.length)),
    );

    keys.forEach((key, i) => {
      const isLastKey = i === keys.length - 1 && suggestions.length === 0;
      const branch = isLastKey ? '└─' : '├─';
      const change = diff.perKey[key];
      const icon = ICON[change.kind];
      const label = pad(key, keyColWidth);

      let body: string;
      switch (change.kind) {
        case 'new-reference-same-value':
          body = `${pc.yellow(icon)} ${pc.yellow('NEW REFERENCE')} ${pc.dim(
            '(value structurally equal)',
          )}`;
          break;
        case 'value-changed':
          body = `${pc.cyan(icon)} ${formatValue(change.prev)} ${pc.dim(
            '→',
          )} ${formatValue(change.next)}`;
          break;
        case 'added':
          body = `${pc.green(icon)} added ${pc.dim('→')} ${formatValue(
            change.next,
          )}`;
          break;
        case 'removed':
          body = `${pc.red(icon)} removed (was ${formatValue(change.prev)})`;
          break;
      }

      lines.push(`${branch} ${pc.bold(label)} ${body}`);
    });

    if (suggestions.length > 0) {
      suggestions.forEach((s, i) => {
        const isLast = i === suggestions.length - 1;
        const branch = isLast ? '└─' : '├─';
        lines.push(`${branch} 💡 ${pc.bold(s.message)}`);
        lines.push(`   ${pc.dim(s.fix)}`);
        if (s.codeExample) {
          lines.push(`   ${pc.gray(s.codeExample)}`);
        }
      });
    }
  }

  lines.push(
    pc.dim(
      `   time since last render: ${elapsed.toFixed(0)}ms · kind: ${
        diff.renderKind
      }`,
    ),
  );

  return lines;
};

// --------- batching ---------

type Queued = RenderEvent;

let queue: Queued[] = [];
let scheduled = false;

const schedule = (): void => {
  if (scheduled) return;
  scheduled = true;
  const run = (): void => {
    scheduled = false;
    const events = queue;
    queue = [];
    flush(events);
  };
  if (typeof queueMicrotask === 'function') queueMicrotask(run);
  else Promise.resolve().then(run);
};

const groupSignature = (e: RenderEvent): string =>
  `${e.component}::${e.diff.changedKeys.join(',')}::${e.diff.renderKind}`;

const flush = (events: RenderEvent[]): void => {
  if (events.length === 0) return;
  const groups = new Map<string, RenderEvent[]>();
  for (const e of events) {
    const sig = groupSignature(e);
    const arr = groups.get(sig);
    if (arr) arr.push(e);
    else groups.set(sig, [e]);
  }

  // eslint-disable-next-line no-console
  const log = console.log.bind(console);

  for (const evs of groups.values()) {
    if (evs.length === 1) {
      for (const line of formatEvent(evs[0])) log(line);
    } else {
      log(
        `🔍 ${pc.bold(`${evs.length}×`)} ${pc.bold(
          evs[0].component,
        )} re-rendered ${pc.dim(
          `(same reason: ${
            evs[0].diff.changedKeys.join(', ') || evs[0].diff.renderKind
          })`,
        )}`,
      );
      for (const line of formatEvent(evs[0])) log('  ' + line);
    }
  }
};

export const defaultReporter: Reporter = (event) => {
  emitPerfMark(event);
  emitToDevtools(event);
  queue.push(event);
  schedule();
};

let activeReporter: Reporter = defaultReporter;

export const setReporter = (reporter: Reporter | null): void => {
  activeReporter = reporter ?? defaultReporter;
};

export const report = (event: RenderEvent): void => {
  try {
    activeReporter(event);
  } catch {
    // reporter itself failed — never break the host app
  }
};

// Exposed for tests
export const __flushNow = (): void => {
  const events = queue;
  queue = [];
  scheduled = false;
  flush(events);
};
