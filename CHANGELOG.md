# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] — 2026-04-13

### Added

- `useWhyRender(name, tracked, opts?)` — the core hook. Reports when a
  component re-rendered for an "interesting" reason and suggests a fix.
- `track(Component, opts?)` and `trackMemo(Component, opts?)` HOCs.
- `useRenderCount()`, `useRenderHistory(name)` query hooks.
- `enableWhyRender({ include, exclude, level, ignore })` global config.
- Diff engine with `shallow` / `structural` / `deep` modes.
- Suggestion engine with patterns for new function / array / object refs.
- PII redaction by default (`token|password|secret|auth|api_key|bearer`) and
  custom `redact` hook.
- Ring-buffer history with global 10k event cap.
- Microtask-batched reporter with smart grouping of identical sibling events.
- Stack capture for jump-to-source.
- `performance.measure` marks under `render-why:*` for React Profiler interop.
- `window.__RENDER_WHY__` devtools hook bridge.
- Adapters: `render-why/redux`, `render-why/zustand`, `render-why/jotai`,
  `render-why/query`, `render-why/valtio`, `render-why/mobx`.
- React Native: `render-why/rn` (`ShakeToDebug`, `trackListItem`) and
  `render-why/flipper` (`enableFlipperLogger`).
- Production DCE guard via `process.env.NODE_ENV === 'production'`.
- SSR / RSC no-op.

[1.0.0]: https://github.com/your-org/render-why/releases/tag/v1.0.0
