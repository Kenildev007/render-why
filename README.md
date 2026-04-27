# render-why

**The re-render debugger modern React deserves.**

[![npm](https://img.shields.io/npm/v/render-why)](https://www.npmjs.com/package/render-why)
[![npm downloads](https://img.shields.io/npm/dm/render-why)](https://www.npmjs.com/package/render-why)
[![license](https://img.shields.io/npm/l/render-why)](./LICENSE)

Drop `useWhyRender()` into any component and get a plain-English explanation of why it re-rendered, what changed, and how to fix it — with one-line autofix suggestions.

- One hook. No Babel. No monkey-patching React.
- Works with **React 18, React 19, the React Compiler, React Native, and Expo Go**.
- Zero production cost (tree-shaken via `process.env.NODE_ENV`).
- Adapters for Redux, Zustand, Jotai, TanStack Query, Valtio, MobX.

**[View on npm](https://www.npmjs.com/package/render-why) · [GitHub](https://github.com/Kenildev007/render-why)**

---

## Install

```bash
npm install render-why
```

That's it. No bundler plugin, no config file, no Babel step.

---

## 30-second example

```tsx
import { useWhyRender } from 'render-why';

function UserCard({ user, onEdit }) {
  useWhyRender('UserCard', { user, onEdit });

  return <div>{user.name}</div>;
}
```

Now in dev, the moment `UserCard` re-renders for an avoidable reason, you see:

```
🔍 UserCard re-rendered (render #4)
├─ user      ⚠ NEW REFERENCE (value structurally equal)
└─ onEdit    ⚠ NEW REFERENCE (value structurally equal)
└─ 💡 Parent is creating a new function every render.
   Wrap `onEdit` in useCallback in the parent component.
   const onEdit = useCallback(onEditImpl, [/* deps */]);
   time since last render: 34ms · kind: some-changed-ref
```

Plain-English. One line away from the fix.

---

## Why this exists

`@welldone-software/why-did-you-render` served React dev for years, but:

- It monkey-patches React and [is incompatible with the React Compiler](https://github.com/welldone-software/why-did-you-render).
- It requires Babel configuration that's different for every bundler.
- It's noisy by default — most teams end up turning it off.

`render-why` is **hook-first, compiler-compatible, and zero-config**. It never touches React internals. It defaults to "signal only" — it reports the re-renders worth fixing, not every render.

---

## Core API

### `useWhyRender(name, tracked, opts?)`

```tsx
useWhyRender('MyComponent', { prop1, prop2, contextValue }, {
  diff: 'structural',   // 'shallow' (default) | 'structural' | 'deep'
  ignore: ['style'],    // keys to skip
  redact: (k, v) => maskEmail(k, v),
  historySize: 50,
  reportInitial: false, // useful for StrictMode double-mount debugging
});
```

### `track(Component, opts?)` / `trackMemo(Component, opts?)`

Wrap a component without editing it:

```tsx
import { track } from 'render-why';

export default track(UserCard);
```

### `enableWhyRender(opts?)` — global filter

```tsx
import { enableWhyRender } from 'render-why';

enableWhyRender({
  include: [/^User/, 'Header'],
  exclude: [/Provider$/],
  level: 'warn',                       // 'all' | 'warn' | 'silent'
  ignore: {
    components: ['Spinner'],
    props: ['style', 'className'],
    reasons: ['kind:nothing-changed'],
  },
});
```

### `useRenderHistory(name)` / `useRenderCount()`

```tsx
const history = useRenderHistory('UserCard'); // last 50 events
const count = useRenderCount();
```

### `setReporter(fn)`

Pipe events anywhere — Sentry, console, a custom UI, Flipper:

```tsx
import { setReporter } from 'render-why';

setReporter((event) => {
  myLogger.log(event.component, event.diff.renderKind, event.suggestions);
});
```

---

## State library adapters

Drop-in replacements that report when your selectors return new references with structurally equal values — the #1 wasted re-render pattern.

```tsx
import { trackedSelector }   from 'render-why/redux';
import { trackedStore }      from 'render-why/zustand';
import { trackedAtomValue }  from 'render-why/jotai';
import { trackedQuery }      from 'render-why/query';
import { trackedSnapshot }   from 'render-why/valtio';
import { trackedObserver }   from 'render-why/mobx';
```

Example:

```tsx
// before
const user = useSelector(selectUser);

// after
const user = trackedSelector(selectUser, 'selectUser');
```

Each adapter is an optional peer dependency — you only install the libraries you actually use.

---

## React Native + Expo

The core hook is pure JavaScript — it works in Expo Go, bare React Native, React Native Web, Fabric, and Bridgeless without any native module.

```tsx
// Shake the device to see the last 20 re-renders
import { ShakeToDebug } from 'render-why/rn';

<ShakeToDebug />;
```

FlatList / FlashList row instrumentation with automatic grouping:

```tsx
import { trackListItem } from 'render-why/rn';

<FlashList
  renderItem={trackListItem(({ item }) => <Row item={item} />, 'Row')}
  data={data}
/>
```

Flipper integration:

```tsx
import { enableFlipperLogger } from 'render-why/flipper';
enableFlipperLogger();
```

---

## Design principles

1. **No monkey-patching React.** Works with concurrent mode, RSC, and the Compiler.
2. **Hook-first.** The core is a hook; HOCs and adapters are thin wrappers.
3. **Zero production cost.** The entire hook body is gated behind `process.env.NODE_ENV === 'production'` so bundlers tree-shake it out.
4. **Signal over noise.** By default we only report "interesting" re-renders: new-reference-same-value, dead re-renders, and context-only re-renders.
5. **Safe by default.** PII keys (`token`, `password`, `secret`, `auth`, `api_key`, `bearer`) are redacted automatically. Custom `redact` hook for your own rules.
6. **Never break the host.** Every diff is wrapped in `try/catch`; a failed reporter can never crash your app.

---

## Performance

| Operation | Budget | Typical |
|---|---|---|
| `useWhyRender`, 10 shallow props | < 0.1 ms | ~0.03 ms |
| `useWhyRender`, 50 shallow props | < 0.5 ms | ~0.18 ms |
| Structural diff, 10 props | < 1 ms | ~0.4 ms |
| Suggestion matching | < 0.2 ms | ~0.09 ms |

Dev-mode overhead is well under 1% of typical render time. Production: **0 ns, 0 bytes.**

---

## FAQ

**Does it work with the React Compiler?**
Yes. `render-why` uses ordinary hooks and refs. The Compiler treats `useWhyRender` like any other hook — nothing to monkey-patch, nothing to break.

**Does it work with Server Components?**
Yes — on the client boundary, as a no-op on the server.

**Does it work in Expo Go?**
Yes. Pure JavaScript. No native module. No Metro transformer.

**Is it noisy?**
No. The default `level: 'warn'` only reports new-reference-same-value, dead re-renders, and context-only re-renders. Genuine value changes (the ones you expect) stay silent.

**How do I disable in production?**
You don't have to — the hook body is dead code under `process.env.NODE_ENV === 'production'` and modern bundlers tree-shake it out automatically.

---

## License

MIT
