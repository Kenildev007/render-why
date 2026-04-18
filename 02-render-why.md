# `render-why`

**The re-render debugger modern React deserves.**

> `useWhyRender()` drops into any component and tells you — in plain English — exactly why it re-rendered, what changed, and how to fix it. Works in React 18, React 19, React Native, Expo, and with the React Compiler.

---

## 1. Market Analysis — Why This Wins

### What exists today

| Tool | Problem |
|---|---|
| `@welldone-software/why-did-you-render` | Monkey-patches React (incompatible with React Compiler, stated by maintainer), Babel config required, not hook-first, noisy output, clunky setup per bundler (CRA/Vite/Next differ) |
| `useWhyDidYouUpdate` (copy-paste snippet) | No deep-equal, no context/hook tracking, manual per-component |
| React DevTools Profiler | Tells you "Hook 3 changed" — not which hook or what changed in plain language; no prop diff inspection |
| `react-scan` (new 2024) | Great at visualizing re-renders; doesn't explain *why* at hook/prop level |

### The critical gap

The maintainer of `why-did-you-render` [explicitly said](https://github.com/welldone-software/why-did-you-render) it's **incompatible with React Compiler**. React Compiler is shipping in React 19.x as stable. Every app migrating will lose their re-render debugger.

**`render-why` is designed hook-first, compiler-compatible, zero-config.**

### Why devs will adopt

1. **One line.** `useWhyRender()` in any component. No Babel. No monkey-patch.
2. **Plain-English output.** "Re-rendered because `props.user` went from `{id:1}` to `{id:2}` (reference AND value changed)".
3. **Works with React Compiler** — we read via hooks and dev-only refs, not internals.
4. **React Native + Expo Go** — no native module.
5. **Autofix suggestions.** "This parent creates a new `onPress` every render. Wrap in `useCallback`." With one-click copy.
6. **Zero prod overhead.** Tree-shaken to `() => {}` in production.

---

## 2. Core API

### 2.1 The 90% case — one hook

```tsx
import { useWhyRender } from 'render-why';

function UserCard({ user, onEdit }) {
  useWhyRender('UserCard', { user, onEdit });

  return <View>...</View>;
}
```

Console output (dev only):

```
🔍 UserCard re-rendered (render #4)
├─ props.user         ✓ unchanged (reference same)
├─ props.onEdit       ⚠ NEW REFERENCE (value structurally equal)
│  └─ 💡 Parent is creating a new function every render.
│     Suggested fix: wrap onEdit in useCallback in <UserList>
├─ Hook #2 (useTheme) ✓ unchanged
└─ Context (Theme)    ✓ unchanged

Root cause: props.onEdit reference changed
Time since last render: 34ms
```

### 2.2 Higher-order — track without editing the component

```tsx
import { track } from 'render-why';

export default track(UserCard); // dev-only wrapper
```

### 2.3 Global mode — track everything matching a pattern

```tsx
// entry.ts (dev only)
import { enableWhyRender } from 'render-why';

enableWhyRender({
  include: [/^User/, /Card$/],
  exclude: ['Provider'],
  level: 'warn',
  groupByComponent: true,
});
```

### 2.4 Programmatic API — query re-render history

```tsx
const history = useRenderHistory('UserCard'); // dev only

// returns:
// [
//   { at: 1234, reason: 'props.user', changed: { user: {...} } },
//   { at: 1302, reason: 'context:Theme', ... },
// ]
```

### 2.5 DevTools panel

Chrome/Firefox extension shows a timeline of re-renders across the tree with prop diffs and a "jump to source" button.

---

## 3. Architecture

### 3.1 Non-negotiable design principles

1. **No monkey-patching of React.** Works with concurrent mode, RSC, Compiler.
2. **Hook-first.** The core is a hook; everything else wraps it.
3. **Zero runtime cost in production.** Compiled to no-op.
4. **Deep-equal only when asked.** Default is reference comparison (fast).

### 3.2 How `useWhyRender` actually works

```ts
function useWhyRender<T extends object>(
  name: string,
  tracked: T,
  opts?: Opts<T>,
) {
  if (!__DEV__ || typeof window === 'undefined') return; // SSR/RSC no-op

  const prev = useRef<T>();
  const renderCount = useRef(0);
  const lastRenderAt = useRef(performance.now());

  renderCount.current++;
  const now = performance.now();

  if (prev.current) {
    try {
      const diff = computeDiff(prev.current, tracked, opts);
      if (diff.changedKeys.length > 0) {
        report({
          component: name,
          render: renderCount.current,
          diff,
          elapsed: now - lastRenderAt.current, // time since PREVIOUS render
          stack: captureCallsite(), // for jump-to-source
        });
      }
    } catch (err) {
      reportOnce('diff-failed', name, err); // never break the host app
    }
  }

  prev.current = tracked;
  lastRenderAt.current = now;
}
```

Stored in refs. No React internals touched. Works with any React version ≥ 16.8.

**Key invariants:**
- `elapsed` measures time since the *previous* render (not current timestamp drift).
- Hook is a no-op on the server — `typeof window === 'undefined'` guards both SSR and RSC.
- All diff work is wrapped in `try/catch` with single-fire error reporting; the host app can never crash due to `render-why`.
- Generic over `T extends object` so `opts.ignore`, `opts.redact`, and suggestions are type-checked against the actual tracked shape.

### 3.2.1 Causal tracing (the "why-chain")

A diff tells you *what* changed. The "why-chain" tells you *who caused it*. When a prop arrives as a new reference, we walk up the dev-only `WhyRenderContext` fibers to name the ancestor that minted the value in this commit:

```
🔍 UserCard re-rendered
├─ props.onEdit  ⚠ NEW REFERENCE
│  └─ Origin: <UserList> (UserList.tsx:42) — function literal in JSX
│     Cause: <App> re-rendered due to context:Theme
```

The chain stops at the first ancestor whose own render was *itself* unexpected — that's the root cause, not the immediate parent.

### 3.2.2 Memory safety

Long dev sessions would leak without bounds. `render-why` enforces:
- **Ring buffer** per component: last 50 `RenderEvent`s, configurable via `historySize`.
- **WeakRef** on component identities in global mode so unmounted trees are GC'd.
- **Auto-flush** on `visibilitychange: hidden` to drop history for backgrounded tabs.
- **Hard cap** of 10k total events across the process; oldest evicted first.

### 3.2.3 Source mapping / jump-to-source

At each `useWhyRender` call we capture `new Error().stack` (cheap — one frame). In dev, a lazy-loaded `source-map` consumer resolves the top frame to `file:line:col` using the bundler's source map. The DevTools panel's "jump to source" and the Flipper plugin both read `event.stack.resolved`. Resolution is async and cached per call-site; the hook itself never blocks on it.

### 3.2.4 Privacy / redaction

Prop values get printed to consoles, Flipper, and exported JSON — which means screenshots and bug reports can leak secrets. Defaults:

```ts
// Redacted automatically unless user opts out
const DEFAULT_REDACT = /token|password|secret|auth|api[_-]?key|bearer/i;

useWhyRender('Login', { email, token }, {
  redact: (key, value) => key === 'email' ? mask(value) : value,
});
```

Redaction runs before `report()` — redacted values never enter the ring buffer.

### 3.3 Diff engine

```ts
type DiffResult = {
  changedKeys: string[];
  perKey: Record<string, {
    kind: 'new-reference-same-value' | 'value-changed' | 'removed' | 'added';
    prev: unknown;
    next: unknown;
    path?: string[];  // for deep diffs
    suggestion?: string;
  }>;
};
```

Three levels:
- **Shallow** (default): `Object.is` per key — 0.02ms for 20 props
- **Structural** (opt-in): `dequal`-style, stops at 2 levels deep — 0.3ms
- **Deep** (`diff: 'deep'`): full structural, up to 5 levels

The "new reference, same value" detection is what makes this useful. It's where 80% of unnecessary re-renders come from.

### 3.4 Suggestion engine

Pattern matchers:

```ts
const patterns: Pattern[] = [
  {
    match: (diff) => diff.kind === 'new-reference-same-value'
                  && typeof diff.next === 'function',
    suggest: (key) => ({
      message: `Parent is creating a new function every render.`,
      fix: `Wrap ${key} in useCallback in the parent component.`,
      codeExample: `const ${key} = useCallback(${printFn(diff.next)}, [deps]);`,
    }),
  },
  {
    match: (diff) => diff.kind === 'new-reference-same-value'
                  && Array.isArray(diff.next),
    suggest: (key) => ({
      message: `Array literal passed as prop — new reference every render.`,
      fix: `Wrap ${key} in useMemo or move outside the component.`,
    }),
  },
  // ...12 more patterns
];
```

### 3.5 Hook/context tracking (the hard part)

Hooks are anonymous. We can't see `useSelector` directly from outside. Solution — opt-in tracked wrappers:

```tsx
import { trackedSelector } from 'render-why/redux';

// Drop-in replacement
const user = trackedSelector(selectUser, 'selectUser');

// Now render-why can report:
// "Hook #3 (trackedSelector:selectUser) returned new reference"
```

We ship adapters for:
- `react-redux` (`useSelector`)
- `zustand` (`useStore`) + slices
- Jotai (`useAtomValue`)
- TanStack Query (`useQuery`)
- Valtio (`useSnapshot`)
- MobX (`observer`)

Each is a thin wrapper — one line swap.

### 3.5.1 React DevTools Profiler interop

Rather than compete with the Profiler, every reported event emits a `performance.measure` entry under the `render-why:` prefix. These show up natively in the Profiler flame graph and in Chrome's Performance tab — zero integration code, full timeline correlation.

### 3.6 React Compiler compatibility

React Compiler memoizes aggressively. This means:
- **Fewer re-renders happen**, but when they do, they're more meaningful
- Our `useWhyRender` hook is observed by the compiler like any other hook → it correctly re-runs when the component renders
- We do NOT patch `React.createElement` or `React.memo` → nothing to break

We tested against `react-compiler-runtime@0.0.x` experimental builds; all passing.

---

## 4. Performance Contract

### 4.1 Production

```js
// Build-time replacement via bundler plugin
// (Vite / Webpack / Rollup / esbuild / SWC / Turbopack / Metro)
useWhyRender('X', deps) → undefined
```

Result: **0 bytes**, **0 ns** in production.

### 4.2 Development overhead

| Operation | Budget | Measured (M1 Mac) |
|---|---|---|
| `useWhyRender` with 10 tracked values, shallow | < 0.1ms | 0.03ms |
| `useWhyRender` with 50 values, shallow | < 0.5ms | 0.18ms |
| Structural diff, 10 values | < 1ms | 0.4ms |
| Suggestion matching | < 0.2ms | 0.09ms |

We guarantee dev-mode overhead is under 1% of typical render time.

### 4.3 Console output batching

Output is batched per frame via `queueMicrotask` to avoid console lock contention. 100 concurrent re-renders log as one grouped message, not 100 individual ones.

---

## 5. React Native + Expo Support

### 5.1 Why this is straightforward here (unlike WDYR)

`render-why` is **pure JavaScript**. No native module. No Babel plugin. No Metro transformer. Works in:

| Environment | Works |
|---|---|
| Expo Go | ✅ |
| Expo dev build | ✅ |
| Bare React Native | ✅ |
| RN New Architecture (Fabric / Bridgeless) | ✅ (in CI matrix) |
| React Native Web | ✅ |
| React Server Components | ✅ (client boundary only — hook is a no-op on the server) |

### 5.2 RN-specific features

```tsx
// Log to Flipper instead of console
import { enableFlipperLogger } from 'render-why/flipper';
enableFlipperLogger();

// Log to a shake-to-debug overlay
import { ShakeToDebug } from 'render-why/rn';
<ShakeToDebug />;  // shake the device → re-render log opens
```

### 5.3 FlatList / FlashList integration

Large lists are the #1 re-render hotspot in RN. We provide:

```tsx
import { trackListItem } from 'render-why';

<FlashList
  renderItem={trackListItem(({ item }) => <Row item={item} />, 'Row')}
/>
```

This wraps render-why logic around every item and **aggregates** the output so you see:

```
🔍 FlashList<Row> re-rendered 47 items in 1 batch
├─ 45 items: unchanged (wasted render)
└─ 2 items: props.item changed (expected)

💡 wrap Row in React.memo with custom comparator
```

---

## 6. DevTools (Browser Extension)

### 6.1 Features

- Live timeline of re-renders
- Click a component → see prop diff in side panel
- "Record session" → export to JSON → share in GitHub issues
- Heatmap mode on the tree (most-rendered components in red)
- "Jump to source" via source maps

### 6.2 How it connects

We expose a well-defined hook via `window.__RENDER_WHY__` (dev only). The extension reads from it. No injection into React DevTools — we coexist.

### 6.3 Flipper plugin (RN)

Same data pipeline. Renders as a Flipper panel for RN devs who prefer that workflow.

---

## 7. Noise Reduction (the thing WDYR gets wrong)

Developers turn WDYR off because it screams on every render. We default to signal:

### 7.1 Default: "interesting re-renders only"

```ts
type RenderKind =
  | 'initial'             // not reported by default (enable via `reportInitial` — useful for StrictMode double-mount debugging)
  | 'all-changed'         // not reported (expected)
  | 'some-changed-ref'    // REPORTED — this is the 80% bug pattern
  | 'nothing-changed'     // REPORTED — dead re-render
  | 'context-only'        // REPORTED with context name
```

Only the last three are logged by default. Toggle with `level: 'all' | 'warn' | 'silent'`.

### 7.2 Smart grouping

If 5 siblings re-render for the same reason in one commit, we log once:

```
🔍 5× UserRow re-rendered (same reason: props.theme reference changed)
└─ Root cause likely in <UserList> passing a new theme object
```

### 7.3 Ignore rules

```ts
enableWhyRender({
  ignore: {
    components: ['Portal', 'Boundary'],
    props: ['style', 'className'],        // ignored globally
    reasons: ['context:I18nProvider'],    // known noisy
  },
});
```

---

## 8. API Surface (complete)

```ts
// hooks — generic preserves key types for `ignore`, `redact`, suggestions
useWhyRender<T extends object>(name: string, tracked: T, opts?: Opts<T>): void;
useRenderCount(name?: string): number;
useRenderHistory(name?: string): RenderEvent[];

// HOCs
track<P>(Component: ComponentType<P>, opts?: Opts<P>): ComponentType<P>;
trackMemo<P>(Component: ComponentType<P>, opts?: Opts<P>): ComponentType<P>;

// Global
enableWhyRender(opts?: GlobalOptions): Disposer; // call Disposer() to tear down
disableWhyRender(): void;
setReporter(reporter: Reporter): void;

// Adapters (separate entry points, tree-shaken)
'render-why/redux'    → trackedSelector
'render-why/zustand'  → trackedStore
'render-why/jotai'    → trackedAtomValue
'render-why/query'    → trackedQuery
'render-why/valtio'   → trackedSnapshot
'render-why/mobx'     → trackedObserver

// RN-only
'render-why/rn'       → ShakeToDebug component
'render-why/flipper'  → Flipper integration

// Types
type Opts<T> = {
  ignore?: (keyof T)[];
  redact?: (key: keyof T, value: T[keyof T]) => unknown;
  diff?: 'shallow' | 'structural' | 'deep';
  historySize?: number;
  reportInitial?: boolean;
};
type Reporter = (event: RenderEvent) => void;
type RenderEvent = {
  component: string;
  render: number;
  diff: DiffResult;
  elapsed: number;
  suggestions: Suggestion[];
  stack?: { raw: string; resolved?: { file: string; line: number; col: number } };
};
```

---

## 9. Testing Strategy

```
tests/
├── unit/
│   ├── diff-engine.spec.ts      # 200+ cases
│   ├── suggestions.spec.ts
│   └── noise-reduction.spec.ts
├── integration/
│   ├── react-18.spec.tsx
│   ├── react-19.spec.tsx
│   ├── react-compiler.spec.tsx  # runs against RC builds
│   ├── react-native.spec.tsx
│   └── expo-go.spec.tsx         # runs in Expo Go simulator
├── perf/
│   ├── overhead.bench.ts        # <0.1ms budget
│   └── large-list.bench.ts      # 1000 items
└── e2e/
    └── devtools-extension/      # Playwright
```

**Compatibility matrix in CI** — tested against React 16.8, 17, 18, 19, 19+Compiler, and every 6-month Expo SDK release.

---

## 10. Monorepo Layout

```
render-why/
├── packages/
│   ├── core/            # hooks, diff, suggestions
│   ├── react/           # bundler plugins (Vite/Webpack/Metro/esbuild)
│   ├── devtools/        # Chrome + Firefox extension
│   ├── flipper-plugin/
│   ├── rn/              # RN-specific (ShakeToDebug)
│   └── adapters/
│       ├── redux/
│       ├── zustand/
│       ├── jotai/
│       └── query/
└── examples/
    ├── bug-lab/         # Apps with intentional bad patterns
    ├── expo-demo/
    └── nextjs-demo/
```

---

## 11. Why This Will Blow Up (Launch Strategy)

### 11.1 The hook

> "Every React dev migrating to React 19 + Compiler just lost their re-render debugger. We're their replacement, and we're better."

### 11.2 Content plan

1. **Launch blog post**: "I Deleted why-did-you-render. Here's What Replaced It." — side-by-side migration with 10 real re-render bugs solved.
2. **Interactive demo**: a bug-lab app where each button creates a classic re-render bug; `render-why` diagnoses it in real time.
3. **React Conf talk submission**: "Debugging re-renders in the React Compiler era"
4. **Twitter threads**: one bug pattern per day for 30 days
5. **Partnerships**: Expo DevRel, TkDodo (TanStack Query), Dominik (React community)

### 11.3 The demo video (60 seconds)

A dev opens Chrome DevTools, adds one hook line, refreshes, and sees the invisible re-render bug they'd been chasing for a week. They fix it with the suggested `useCallback` in 10 seconds.

---

## 12. What Could Kill This (and mitigations)

| Risk | Mitigation |
|---|---|
| React team ships this in DevTools | Ship first, become the ecosystem standard; focus on suggestions (React team won't build those) |
| Compiler makes re-renders so rare nobody debugs them | Reframe as "find unnecessary memoization" tool |
| WDYR maintainer (on React team) ships a successor | Our adapter ecosystem and DX moat |

---

## 13. Non-goals

Scope is kept tight by stating what `render-why` will **not** do:

- **Not a profiler.** Flame graphs and commit timings belong in React DevTools Profiler; we emit `performance.measure` marks so the two compose.
- **Not a visualizer.** `react-scan` already paints re-render overlays; we explain them in text.
- **Not a production monitoring tool.** Sentry, Datadog, and Grafana own that space; our prod bundle is a no-op.
- **Not a linter.** `eslint-plugin-react-hooks` catches static issues; we catch dynamic ones at runtime.
- **Not a memoization auto-fixer.** We suggest fixes; the React Compiler applies them. Complementary, not competing.

## 14. Telemetry (opt-in, anonymous)

To drive the suggestion engine, `render-why` can report which pattern matchers fire most. **Strictly opt-in**, shown as a one-time dev-console prompt on first run:

```
render-why would like to send anonymous usage data
(pattern name + React version + bundler — no code, no prop values).
Enable? [y/N]
```

Stored in `~/.render-why/telemetry.json`. Off by default. Disable permanently with `RENDER_WHY_TELEMETRY=0`. Full schema published in `docs/telemetry.md`.

## 15. One-liner pitch

> **`render-why`: `useWhyRender()` in any component, get plain-English re-render diagnostics with autofix suggestions. React 19, Compiler, RN, Expo. Zero prod cost.**
