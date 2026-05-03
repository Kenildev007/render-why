import type { RenderKind } from './types';

export type Level = 'all' | 'warn' | 'silent';

export type GlobalOptions = {
  include?: Array<string | RegExp>;
  exclude?: Array<string | RegExp>;
  level?: Level;
  enableInProduction?: boolean;
  ignore?: {
    components?: string[];
    props?: string[];
    reasons?: string[];
  };
  groupByComponent?: boolean;
};

export type Disposer = () => void;

let config: GlobalOptions | null = null;

export const enableWhyRender = (opts: GlobalOptions = {}): Disposer => {
  config = opts;
  return () => {
    if (config === opts) config = null;
  };
};

export const disableWhyRender = (): void => {
  config = null;
};

export const getGlobalConfig = (): GlobalOptions | null => config;

export const isProductionTrackingEnabled = (): boolean =>
  config?.enableInProduction === true;

const matchOne = (name: string, m: string | RegExp): boolean =>
  typeof m === 'string' ? m === name : m.test(name);

const matchAny = (
  name: string,
  matchers: Array<string | RegExp> | undefined,
): boolean => {
  if (!matchers || matchers.length === 0) return false;
  for (const m of matchers) if (matchOne(name, m)) return true;
  return false;
};

export const shouldTrack = (name: string): boolean => {
  if (!config) return true;
  if (config.ignore?.components?.includes(name)) return false;
  if (config.include && !matchAny(name, config.include)) return false;
  if (config.exclude && matchAny(name, config.exclude)) return false;
  return true;
};

export const getLevel = (): Level => config?.level ?? 'warn';

export const getGlobalIgnoredProps = (): readonly string[] =>
  config?.ignore?.props ?? [];

export const isReasonIgnored = (reason: string): boolean =>
  config?.ignore?.reasons?.includes(reason) ?? false;

export const isRenderKindReportable = (kind: RenderKind): boolean => {
  const level = getLevel();
  if (level === 'silent') return false;
  if (level === 'all') return kind !== 'initial';
  // 'warn' (default): report interesting cases only
  return (
    kind === 'some-changed-ref' ||
    kind === 'nothing-changed' ||
    kind === 'context-only'
  );
};
