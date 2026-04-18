import { useRef } from 'react';
import { computeDiff } from './diff';
import { buildSuggestions } from './suggestions';
import { report } from './reporter';
import { RingBuffer } from './ringBuffer';
import { reportOnce } from './dev';
import { captureStack } from './stack';
import {
  shouldTrack,
  isRenderKindReportable,
  getGlobalIgnoredProps,
  isReasonIgnored,
} from './global';
import type { Opts, RenderEvent, DiffResult } from './types';

const histories = new Map<string, RingBuffer<RenderEvent>>();
const GLOBAL_EVENT_CAP = 10_000;
let globalEventCount = 0;

const pushHistory = (
  name: string,
  size: number,
  event: RenderEvent,
): void => {
  let hist = histories.get(name);
  if (!hist) {
    hist = new RingBuffer<RenderEvent>(size);
    histories.set(name, hist);
  }
  hist.push(event);
  globalEventCount++;
  if (globalEventCount > GLOBAL_EVENT_CAP) {
    const firstKey = histories.keys().next().value;
    if (firstKey !== undefined) {
      const evicted = histories.get(firstKey);
      histories.delete(firstKey);
      if (evicted) globalEventCount -= evicted.length;
    }
  }
};

const now = (): number =>
  typeof performance !== 'undefined' && performance.now
    ? performance.now()
    : Date.now();

// Merge component-level ignore with global ignore — cheap union.
const mergeIgnore = <T extends object>(
  opts: Opts<T> | undefined,
): Array<keyof T & string> | undefined => {
  const globalIgnored = getGlobalIgnoredProps();
  if (globalIgnored.length === 0) return opts?.ignore;
  const local = (opts?.ignore ?? []) as string[];
  return [...new Set([...local, ...globalIgnored])] as Array<keyof T & string>;
};

export function useWhyRender<T extends object>(
  name: string,
  tracked: T,
  opts?: Opts<T>,
): void {
  // Refs always called (Rules of Hooks).
  const prevRef = useRef<T | undefined>(undefined);
  const countRef = useRef(0);
  const lastRef = useRef(0);

  // Bundler-friendly DCE guard: when NODE_ENV === 'production' the whole
  // body below is dead code and gets tree-shaken by Vite/Webpack/Metro/esbuild.
  if (process.env.NODE_ENV === 'production') return;

  // Runtime SSR/RSC guard — server has no window.
  if (typeof window === 'undefined') return;

  // Global filter — when enableWhyRender() sets include/exclude.
  if (!shouldTrack(name)) return;

  countRef.current++;
  const t = now();

  // Initial render
  if (prevRef.current === undefined) {
    if (opts?.reportInitial) {
      const emptyDiff: DiffResult = {
        changedKeys: [],
        perKey: {},
        renderKind: 'initial',
      };
      const event: RenderEvent = {
        component: name,
        render: countRef.current,
        diff: emptyDiff,
        elapsed: 0,
        suggestions: [],
        at: Date.now(),
        stack: wrapStack(captureStack()),
      };
      pushHistory(name, opts?.historySize ?? 50, event);
      report(event);
    }
    prevRef.current = tracked;
    lastRef.current = t;
    return;
  }

  try {
    const effectiveOpts: Opts<T> = {
      ...opts,
      ignore: mergeIgnore(opts),
    };
    const diff = computeDiff(prevRef.current, tracked, effectiveOpts);

    const allKeysIgnored =
      diff.changedKeys.length > 0 &&
      diff.changedKeys.every((k) => isReasonIgnored(`prop:${k}`));
    const reportable =
      isRenderKindReportable(diff.renderKind) &&
      !isReasonIgnored(`kind:${diff.renderKind}`) &&
      !allKeysIgnored;

    if (reportable) {
      const suggestions = buildSuggestions(diff.perKey);
      const event: RenderEvent = {
        component: name,
        render: countRef.current,
        diff,
        elapsed: t - lastRef.current,
        suggestions,
        at: Date.now(),
        stack: wrapStack(captureStack()),
      };

      pushHistory(name, opts?.historySize ?? 50, event);
      report(event);
    }
  } catch (err) {
    reportOnce(`diff-failed:${name}`, err);
  }

  prevRef.current = tracked;
  lastRef.current = t;
}

const wrapStack = (raw: string | undefined): RenderEvent['stack'] =>
  raw ? { raw } : undefined;

export const getRenderHistory = (name: string): RenderEvent[] =>
  histories.get(name)?.toArray() ?? [];

export const clearRenderHistory = (name?: string): void => {
  if (name) {
    const h = histories.get(name);
    if (h) globalEventCount -= h.length;
    histories.delete(name);
  } else {
    histories.clear();
    globalEventCount = 0;
  }
};
