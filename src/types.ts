export type ChangeKind =
  | 'new-reference-same-value'
  | 'value-changed'
  | 'added'
  | 'removed';

export type KeyChange = {
  kind: ChangeKind;
  prev: unknown;
  next: unknown;
  path?: string[];
};

export type RenderKind =
  | 'initial'
  | 'all-changed'
  | 'some-changed-ref'
  | 'nothing-changed'
  | 'context-only';

export type DiffResult = {
  changedKeys: string[];
  perKey: Record<string, KeyChange>;
  renderKind: RenderKind;
};

export type Suggestion = {
  key: string;
  message: string;
  fix: string;
  codeExample?: string;
};

export type StackInfo = {
  raw: string;
  resolved?: { file: string; line: number; col: number };
};

export type RenderEvent = {
  component: string;
  render: number;
  diff: DiffResult;
  elapsed: number;
  suggestions: Suggestion[];
  at: number;
  stack?: StackInfo;
};

export type Reporter = (event: RenderEvent) => void;

export type DiffMode = 'shallow' | 'structural' | 'deep';

export type Opts<T extends object> = {
  ignore?: Array<keyof T & string>;
  redact?: (key: keyof T & string, value: unknown) => unknown;
  diff?: DiffMode;
  historySize?: number;
  reportInitial?: boolean;
};
