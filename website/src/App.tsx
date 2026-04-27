import { useEffect, useState } from 'react';
import LiveConsole from './LiveConsole';
import {
  Demo1,
  Demo2,
  Demo3,
  Demo4,
  Demo5,
  Demo6,
  Demo7,
  Demo8,
} from './demos';

/* ----------------------- small primitives ----------------------- */

const CopyButton = ({ text }: { text: string }) => {
  const [done, setDone] = useState(false);
  return (
    <button
      className="copy"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1200);
        } catch {
          /* ignore */
        }
      }}
      title="copy"
    >
      {done ? 'copied ✓' : 'copy'}
    </button>
  );
};

const Code = ({ children }: { children: string }) => (
  <div className="code">
    <CopyButton text={children} />
    <pre>{children}</pre>
  </div>
);

/* ----------------------- navbar ----------------------- */

const NAV_LINKS: Array<[string, string]> = [
  ['quickstart', 'Quickstart'],
  ['live', 'Live demos'],
  ['api', 'API'],
  ['adapters', 'Adapters'],
  ['rn', 'React Native'],
  ['compare', 'vs WDYR'],
  ['perf', 'Performance'],
  ['faq', 'FAQ'],
];

function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);

  return (
    <nav className={`nav ${scrolled ? 'nav-scrolled' : ''}`}>
      <div className="wrap nav-inner">
        <a href="#top" className="nav-brand">
          <span className="nav-mark">🔍</span>
          <span className="nav-name">render-why</span>
          <span className="nav-version">v1.0</span>
        </a>
        <div className={`nav-links ${open ? 'open' : ''}`}>
          {NAV_LINKS.map(([id, label]) => (
            <a key={id} href={`#${id}`} onClick={() => setOpen(false)}>
              {label}
            </a>
          ))}
        </div>
        <div className="nav-ext">
          <a
            href="https://www.npmjs.com/package/render-why"
            target="_blank"
            rel="noopener"
            className="nav-pill"
          >
            npm
          </a>
          <a
            href="https://github.com/Kenildev007/render-why"
            target="_blank"
            rel="noopener"
            className="nav-pill"
          >
            GitHub
          </a>
          <button
            className="nav-burger"
            onClick={() => setOpen((v) => !v)}
            aria-label="menu"
          >
            {open ? '×' : '☰'}
          </button>
        </div>
      </div>
    </nav>
  );
}

/* ----------------------- demo card ----------------------- */

const DemoCard = ({
  num,
  title,
  filter,
  desc,
  snippet,
  children,
}: {
  num: number;
  title: string;
  filter: string;
  desc: string;
  snippet: string;
  children: React.ReactNode;
}) => (
  <article className="card">
    <header className="card-head">
      <span className="num">#{num}</span>
      <h3>{title}</h3>
    </header>
    <p className="desc">{desc}</p>
    <div className="card-body">
      <div className="card-demo">{children}</div>
      <div className="card-console">
        <LiveConsole filter={filter} />
      </div>
    </div>
    <details className="snippet">
      <summary>show the code</summary>
      <Code>{snippet}</Code>
    </details>
  </article>
);

/* ----------------------- App ----------------------- */

export default function App() {
  return (
    <>
      <Nav />
      <div id="top" />

      <header className="hero">
        <div className="wrap">
          <div className="badge">v1.0 · MIT · React 18 / 19 / Compiler / RN</div>
          <h1>
            <span className="gradient">render-why</span>
          </h1>
          <p className="tagline">
            The re-render debugger modern React deserves. One hook tells you —
            in plain English — <em>why</em> your component re-rendered, what
            changed, and how to fix it.
          </p>
          <div className="hero-cta">
            <a className="cta primary" href="#quickstart">
              get started
            </a>
            <a className="cta ghost" href="#live">
              see live demos ↓
            </a>
          </div>
          <div className="hero-install">
            <Code>npm install render-why</Code>
          </div>
          <div className="hero-features">
            <span>✓ zero-config</span>
            <span>✓ React Compiler compatible</span>
            <span>✓ React Native / Expo</span>
            <span>✓ 0-byte production</span>
            <span>✓ autofix suggestions</span>
          </div>
        </div>
      </header>

      {/* --------------------- quickstart --------------------- */}

      <section className="section" id="quickstart">
        <div className="wrap">
          <h2>30-second quickstart</h2>
          <p>Drop one hook into any component. That's it.</p>
          <Code>{`import { useWhyRender } from 'render-why';

function UserCard({ user, onEdit }) {
  useWhyRender('UserCard', { user, onEdit });

  return <div>{user.name}</div>;
}`}</Code>
          <p>
            The moment your component re-renders for an avoidable reason,
            render-why logs a plain-English diagnosis with an autofix suggestion
            right to the console.
          </p>
          <pre className="terminal">
{`🔍 UserCard re-rendered (render #4)
├─ onEdit   ⚠ NEW REFERENCE (value structurally equal)
└─ 💡 Parent is creating a new function every render.
   Wrap \`onEdit\` in useCallback in the parent component.
   time since last render: 34ms · kind: some-changed-ref`}
          </pre>
        </div>
      </section>

      {/* --------------------- live demos --------------------- */}

      <section className="section alt" id="live">
        <div className="wrap">
          <h2>Live bug lab</h2>
          <p>
            These are real components running inside this page. Click the
            buttons. Watch the <strong>live console</strong> next to each
            demo — every line you see is a real render-why event, streamed
            through <code>setReporter</code>, exactly as it would appear in
            your devtools.
          </p>

          <div className="cards">
            <DemoCard
              num={1}
              title="Inline function prop"
              filter="Demo1"
              desc="A new arrow function is born every render. The memoized child can't skip re-rendering because its onClick is never the same reference twice."
              snippet={`const Child = memo((props) => {
  useWhyRender('Demo1.Child', props);
  return <button />;
});

function Parent() {
  return <Child onClick={() => {}} />;
  //               ^^^^^^^^^^^^ new function every render
}`}
            >
              <Demo1 />
            </DemoCard>

            <DemoCard
              num={2}
              title="Inline array literal"
              filter="Demo2"
              desc="[1,2,3] looks constant but it's a brand-new array on every render. With structural diff, render-why tells you the values are equal — only the reference isn't."
              snippet={`const Child = memo((props) => {
  useWhyRender('Demo2.Child', props, { diff: 'structural' });
  return <div>{props.items.length}</div>;
});

<Child items={[1, 2, 3, 4]} />
//            ^^^^^^^^^^ new array every render`}
            >
              <Demo2 />
            </DemoCard>

            <DemoCard
              num={3}
              title="Inline object literal"
              filter="Demo3"
              desc="Same story, different shape. Inline objects are a new reference every render. render-why detects it and suggests useMemo."
              snippet={`<Child config={{ theme: 'dark', density: 'comfy' }} />
//              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ new object every render`}
            >
              <Demo3 />
            </DemoCard>

            <DemoCard
              num={4}
              title="Dead re-render (nothing changed)"
              filter="Demo4"
              desc="The parent re-rendered but nothing changed in the child's tracked props. A wasted render. render-why explicitly flags it so you can hunt the cause."
              snippet={`function Child(props) {
  useWhyRender('Demo4.Child', props);
  return <div>{props.value}</div>;
}

// Parent re-renders with identical props → nothing changed`}
            >
              <Demo4 />
            </DemoCard>

            <DemoCard
              num={5}
              title="Fixed version (useCallback + useMemo)"
              filter="Demo5"
              desc="Same child, but now the parent uses useCallback and useMemo to stabilize references. render-why stays silent — exactly what you want in production code."
              snippet={`const onClick = useCallback(() => {}, []);
const items = useMemo(() => [1, 2, 3, 4], []);
const config = useMemo(() => ({ theme: 'dark' }), []);

<Child onClick={onClick} items={items} config={config} />`}
            >
              <Demo5 />
            </DemoCard>

            <DemoCard
              num={6}
              title="Unstable context provider"
              filter="Demo6"
              desc="The provider passes a new value object on every render. Every consumer in the subtree re-renders — even if the actual theme never changes. render-why catches the ref-only change."
              snippet={`<ThemeCtx.Provider value={{ color: 'dark', density: 'comfy' }}>
//                         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ new every render
  <App />
</ThemeCtx.Provider>

// Fix: wrap the value in useMemo`}
            >
              <Demo6 />
            </DemoCard>

            <DemoCard
              num={7}
              title="track() HOC — no component edits"
              filter="Demo7"
              desc="Have a legacy component you don't want to touch? Wrap it in track() and render-why instruments it from the outside with a custom name and diff mode."
              snippet={`// The component — untouched
function Card(props) {
  return <div>{props.user.name}</div>;
}

// Wrap it once — no imports inside Card
export default track(memo(Card), {
  name: 'Card',
  diff: 'structural',
});`}
            >
              <Demo7 />
            </DemoCard>

            <DemoCard
              num={8}
              title="Stable derived prop"
              filter="Demo8"
              desc="Parent state changes, but the derived value it passes down doesn't. The unmemoized child re-renders anyway — a dead re-render that render-why flags explicitly. This is the #1 'selector pattern' gotcha in real apps."
              snippet={`function Parent() {
  const [n, setN] = useState(0);
  const even = n % 2 === 0;         // derived value
  return <Child even={even} />;      // child re-renders even when \`even\` stays true
}

function Child({ even }) {
  useWhyRender('Child', { even });   // → nothing-changed
  return <div>{String(even)}</div>;
}`}
            >
              <Demo8 />
            </DemoCard>
          </div>
        </div>
      </section>

      {/* --------------------- API --------------------- */}

      <section className="section" id="api">
        <div className="wrap">
          <h2>Complete API</h2>
          <h3>Hooks</h3>
          <div className="table">
            <Row
              left="useWhyRender(name, tracked, opts?)"
              right="The core hook. Reports when a tracked component re-rendered for an interesting reason."
            />
            <Row
              left="useRenderCount()"
              right="Dev-only render counter for a component."
            />
            <Row
              left="useRenderHistory(name)"
              right="Ring-buffered history of the last N events for a component."
            />
          </div>
          <h3>HOCs</h3>
          <div className="table">
            <Row
              left="track(Component, opts?)"
              right="Instrument a component from outside — no code changes to the original."
            />
            <Row
              left="trackMemo(Component, opts?)"
              right="Shortcut for memo(track(Component))."
            />
            <Row
              left="trackListItem(renderItem, name)"
              right="FlatList / FlashList row instrumentation with automatic grouping."
            />
          </div>
          <h3>Global</h3>
          <div className="table">
            <Row
              left="enableWhyRender(opts?)"
              right="Install a global filter — include/exclude by name, level, ignored props/components/reasons. Returns a disposer."
            />
            <Row
              left="disableWhyRender()"
              right="Tear down the global config."
            />
            <Row
              left="setReporter(fn)"
              right="Pipe events anywhere — custom UI, Sentry, Flipper, a test spy."
            />
            <Row
              left="getDevtoolsHook()"
              right="Access window.__RENDER_WHY__ directly. Used by DevTools extensions."
            />
          </div>
          <h3>Options</h3>
          <Code>{`useWhyRender('MyComponent', { prop1, prop2 }, {
  diff: 'structural',     // 'shallow' (default) | 'structural' | 'deep'
  ignore: ['style'],      // keys to skip
  redact: (k, v) => v,    // custom PII redaction
  historySize: 50,        // ring buffer size
  reportInitial: false,   // fire on first render (StrictMode debugging)
});

enableWhyRender({
  include: [/^User/, 'Header'],
  exclude: [/Provider$/],
  level: 'warn',           // 'all' | 'warn' (default) | 'silent'
  ignore: {
    components: ['Spinner'],
    props: ['style', 'className'],
    reasons: ['kind:nothing-changed'],
  },
});`}</Code>
          <h3>Custom reporter</h3>
          <p>Pipe every event anywhere you want — Sentry, a custom overlay, a test spy, your own storage.</p>
          <Code>{`import { setReporter } from 'render-why';

setReporter((event) => {
  myLogger.log({
    component: event.component,
    kind: event.diff.renderKind,
    changed: event.diff.changedKeys,
    suggestions: event.suggestions,
    stack: event.stack?.raw,
  });
});`}</Code>
        </div>
      </section>

      {/* --------------------- adapters --------------------- */}

      <section className="section alt" id="adapters">
        <div className="wrap">
          <h2>State library adapters</h2>
          <p>
            Drop-in replacements that flag selectors returning new references
            with structurally equal values — the #1 wasted re-render pattern
            in apps using shared state. Each adapter is a subpath export with
            an optional peer dependency — you only install what you use.
          </p>
          <div className="grid">
            <AdapterCard
              pkg="render-why/redux"
              example={`import { trackedSelector } from 'render-why/redux';

const user = trackedSelector(selectUser, 'selectUser');`}
            />
            <AdapterCard
              pkg="render-why/zustand"
              example={`import { trackedStore } from 'render-why/zustand';

const user = trackedStore(useStore, (s) => s.user, 'user');`}
            />
            <AdapterCard
              pkg="render-why/jotai"
              example={`import { trackedAtomValue } from 'render-why/jotai';

const user = trackedAtomValue(userAtom, 'user');`}
            />
            <AdapterCard
              pkg="render-why/query"
              example={`import { trackedQuery } from 'render-why/query';

const q = trackedQuery({
  queryKey: ['user', 1],
  queryFn: fetchUser,
}, 'user');`}
            />
            <AdapterCard
              pkg="render-why/valtio"
              example={`import { trackedSnapshot } from 'render-why/valtio';

const snap = trackedSnapshot(state, 'counter');`}
            />
            <AdapterCard
              pkg="render-why/mobx"
              example={`import { trackedObserver } from 'render-why/mobx';

const View = trackedObserver(
  (props) => <span>{props.n}</span>,
);`}
            />
          </div>
        </div>
      </section>

      {/* --------------------- RN --------------------- */}

      <section className="section" id="rn">
        <div className="wrap">
          <h2>React Native + Expo</h2>
          <p>
            The core hook is <strong>pure JavaScript</strong> — it works in
            Expo Go, bare React Native, React Native Web, Fabric, and
            Bridgeless without any native module, Metro transformer, or Babel
            plugin.
          </p>

          <h3>Shake to debug</h3>
          <Code>{`import { ShakeToDebug } from 'render-why/rn';

// Mount once anywhere in your dev tree
<ShakeToDebug />`}</Code>
          <p>Shake the device — a transient overlay shows the last 20 re-render events with prop diffs.</p>

          <h3>FlatList / FlashList aggregation</h3>
          <Code>{`import { trackListItem } from 'render-why/rn';

<FlashList
  renderItem={trackListItem(({ item }) => <Row item={item} />, 'Row')}
  data={data}
/>`}</Code>
          <p>Rows get instrumented with automatic per-frame grouping — 50 rows re-rendering for the same reason log once, not fifty times.</p>

          <h3>Flipper plugin</h3>
          <Code>{`import { enableFlipperLogger } from 'render-why/flipper';

enableFlipperLogger();`}</Code>
        </div>
      </section>

      {/* --------------------- comparison --------------------- */}

      <section className="section alt" id="compare">
        <div className="wrap">
          <h2>Why not why-did-you-render?</h2>
          <p>
            <code>@welldone-software/why-did-you-render</code> served React
            dev for years, but modern React has moved on.
          </p>
          <div className="compare">
            <div className="compare-head">
              <div>Capability</div>
              <div className="danger">why-did-you-render</div>
              <div className="win">render-why</div>
            </div>
            <CompareRow
              cap="React Compiler"
              wdyr="❌ explicitly incompatible"
              rw="✅ compiler-compatible"
            />
            <CompareRow
              cap="Setup"
              wdyr="Babel plugin per bundler"
              rw="Zero config — one import"
            />
            <CompareRow
              cap="React internals"
              wdyr="Monkey-patches React"
              rw="Pure hooks + refs"
            />
            <CompareRow
              cap="React Native / Expo Go"
              wdyr="Limited / native module issues"
              rw="✅ works everywhere"
            />
            <CompareRow
              cap="Autofix suggestions"
              wdyr="❌ none"
              rw="✅ useCallback / useMemo / move"
            />
            <CompareRow
              cap="PII redaction"
              wdyr="Manual"
              rw="Auto-redacted by default"
            />
            <CompareRow
              cap="Noise control"
              wdyr="Loud by default"
              rw="Signal-first: reports only what matters"
            />
            <CompareRow
              cap="State library adapters"
              wdyr="Partial"
              rw="Redux · Zustand · Jotai · Query · Valtio · MobX"
            />
            <CompareRow
              cap="Production cost"
              wdyr="Requires removal"
              rw="Tree-shaken to 0 bytes"
            />
          </div>
        </div>
      </section>

      {/* --------------------- performance --------------------- */}

      <section className="section" id="perf">
        <div className="wrap">
          <h2>Performance contract</h2>
          <p>
            Dev-mode overhead is measured, not promised. Production is a
            hard zero because the entire hook body is gated behind{' '}
            <code>process.env.NODE_ENV === 'production'</code>.
          </p>
          <div className="perf">
            <PerfRow op="useWhyRender · 10 shallow props" budget="< 0.1 ms" actual="~0.03 ms" />
            <PerfRow op="useWhyRender · 50 shallow props" budget="< 0.5 ms" actual="~0.18 ms" />
            <PerfRow op="Structural diff · 10 props" budget="< 1 ms" actual="~0.4 ms" />
            <PerfRow op="Suggestion matching" budget="< 0.2 ms" actual="~0.09 ms" />
            <PerfRow op="Production bundle contribution" budget="0 bytes" actual="0 bytes" />
            <PerfRow op="Production runtime" budget="0 ns" actual="0 ns" />
          </div>
          <p>
            Output is batched per frame via <code>queueMicrotask</code> and
            identical sibling events are grouped, so 100 concurrent
            re-renders log as one message, not 100.
          </p>
        </div>
      </section>

      {/* --------------------- design principles --------------------- */}

      <section className="section alt" id="principles">
        <div className="wrap">
          <h2>Design principles</h2>
          <div className="principles">
            <Principle
              n="01"
              title="No monkey-patching React"
              body="Concurrent mode, RSC, and the Compiler all work. The hook uses only public React APIs — nothing to break on upgrade."
            />
            <Principle
              n="02"
              title="Hook-first"
              body="The core is a hook. HOCs, global config, and every adapter are thin wrappers around it. One mental model."
            />
            <Principle
              n="03"
              title="Zero production cost"
              body="The entire hook body is dead code under process.env.NODE_ENV === 'production'. Modern bundlers tree-shake it out automatically."
            />
            <Principle
              n="04"
              title="Signal over noise"
              body="Default level only reports re-renders worth fixing: new-reference-same-value, dead re-renders, and context-only re-renders. Genuine changes stay silent."
            />
            <Principle
              n="05"
              title="Safe by default"
              body="Token / password / secret / auth / api_key / bearer keys are redacted automatically. Bring your own redact() for custom rules."
            />
            <Principle
              n="06"
              title="Never break the host"
              body="Every diff is wrapped in try/catch, every reporter call is guarded, every error reports once. A crash in render-why never crashes your app."
            />
          </div>
        </div>
      </section>

      {/* --------------------- FAQ --------------------- */}

      <section className="section" id="faq">
        <div className="wrap">
          <h2>FAQ</h2>
          <Faq q="Does it work with the React Compiler?">
            Yes. render-why uses ordinary hooks and refs. The Compiler treats
            useWhyRender like any other hook — nothing to monkey-patch, nothing
            to break.
          </Faq>
          <Faq q="Will this slow down my app in production?">
            No. The entire hook body is gated behind{' '}
            <code>process.env.NODE_ENV === 'production'</code> and modern
            bundlers tree-shake it out. Production = 0 ns, 0 bytes.
          </Faq>
          <Faq q="Does it work in Expo Go?">
            Yes. Pure JavaScript. No native module, no Metro transformer, no
            Babel plugin. Drop the hook in and it works on every Expo SDK.
          </Faq>
          <Faq q="Is it noisy like why-did-you-render?">
            No. The default level only reports the re-renders worth fixing —
            new-reference-same-value, dead re-renders, and context-only
            re-renders. Genuine value changes stay silent.
          </Faq>
          <Faq q="How do I track secrets like tokens?">
            You don't have to think about it. Keys matching{' '}
            <code>token|password|secret|auth|api_key|bearer</code> are redacted
            by default. Pass your own <code>redact</code> function for custom
            rules.
          </Faq>
          <Faq q="Does it work with Server Components?">
            Yes — on the client boundary, as a no-op on the server. The hook
            checks for <code>typeof window === 'undefined'</code> and exits
            early during SSR / RSC rendering.
          </Faq>
          <Faq q="Can I pipe events somewhere other than the console?">
            Yes. Call <code>setReporter(fn)</code> with any function. The
            event object contains the component name, render count, prop diff,
            suggestions, elapsed time, and optional call-site stack.
          </Faq>
          <Faq q="How do I disable it per-component?">
            Use <code>enableWhyRender</code> with{' '}
            <code>exclude</code> or <code>ignore.components</code>. Or simply
            don't call <code>useWhyRender</code> in components you don't care
            about.
          </Faq>
        </div>
      </section>

      {/* --------------------- footer --------------------- */}

      <footer className="footer">
        <div className="wrap">
          <div>
            <strong>render-why</strong> · v1.0 · MIT · built for React ≥ 16.8
          </div>
          <div className="footer-links">
            <a href="https://www.npmjs.com/package/render-why" target="_blank" rel="noopener">npm</a>
            <a href="https://github.com/Kenildev007/render-why" target="_blank" rel="noopener">GitHub</a>
            <a href="#quickstart">docs</a>
            <a href="#live">demos</a>
          </div>
        </div>
      </footer>
    </>
  );
}

/* ----------------------- helpers ----------------------- */

function Row({ left, right }: { left: string; right: string }) {
  return (
    <div className="row">
      <code className="row-left">{left}</code>
      <div className="row-right">{right}</div>
    </div>
  );
}

function AdapterCard({ pkg, example }: { pkg: string; example: string }) {
  return (
    <div className="adapter">
      <div className="adapter-name">{pkg}</div>
      <pre>{example}</pre>
    </div>
  );
}

function Faq({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <details className="faq">
      <summary>{q}</summary>
      <div>{children}</div>
    </details>
  );
}

function CompareRow({
  cap,
  wdyr,
  rw,
}: {
  cap: string;
  wdyr: string;
  rw: string;
}) {
  return (
    <div className="compare-row">
      <div>{cap}</div>
      <div className="danger">{wdyr}</div>
      <div className="win">{rw}</div>
    </div>
  );
}

function PerfRow({
  op,
  budget,
  actual,
}: {
  op: string;
  budget: string;
  actual: string;
}) {
  return (
    <div className="perf-row">
      <div className="perf-op">{op}</div>
      <div className="perf-budget">{budget}</div>
      <div className="perf-actual">{actual}</div>
    </div>
  );
}

function Principle({
  n,
  title,
  body,
}: {
  n: string;
  title: string;
  body: string;
}) {
  return (
    <div className="principle">
      <div className="principle-num">{n}</div>
      <h3 className="principle-title">{title}</h3>
      <p className="principle-body">{body}</p>
    </div>
  );
}
