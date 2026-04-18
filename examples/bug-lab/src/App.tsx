import { useState, useCallback, useMemo, memo } from 'react';
import { useWhyRender, track } from 'render-why';

/* ---------- Bug #1: new function prop every render ---------- */

const Bug1Child = memo(function Bug1Child(props: { onClick: () => void; label: string }) {
  useWhyRender('Bug1Child', props);
  return <button onClick={props.onClick}>{props.label}</button>;
});

function Bug1() {
  const [n, setN] = useState(0);
  // BUG: new function reference every render → Bug1Child re-renders for no reason
  return (
    <section>
      <h3>Bug #1 — new function prop</h3>
      <p>Parent count: {n}</p>
      <Bug1Child onClick={() => console.log('click')} label="I should be stable" />
      <button onClick={() => setN((x) => x + 1)}>bump parent</button>
    </section>
  );
}

/* ---------- Bug #2: array literal prop ---------- */

const Bug2Child = memo(function Bug2Child(props: { items: number[] }) {
  useWhyRender('Bug2Child', props, { diff: 'structural' });
  return <div>{props.items.length} items</div>;
});

function Bug2() {
  const [n, setN] = useState(0);
  return (
    <section>
      <h3>Bug #2 — inline array literal</h3>
      <p>Parent count: {n}</p>
      {/* BUG: [1,2,3] is a new array every render even though values are equal */}
      <Bug2Child items={[1, 2, 3]} />
      <button onClick={() => setN((x) => x + 1)}>bump parent</button>
    </section>
  );
}

/* ---------- Bug #3: object literal prop ---------- */

const Bug3Child = track(
  memo(function Bug3Child(props: { config: { theme: string; density: string } }) {
    return <div>theme: {props.config.theme}</div>;
  }),
  { diff: 'structural' },
);

function Bug3() {
  const [n, setN] = useState(0);
  return (
    <section>
      <h3>Bug #3 — inline object literal</h3>
      <p>Parent count: {n}</p>
      {/* BUG: new object literal every render */}
      <Bug3Child config={{ theme: 'dark', density: 'comfy' }} />
      <button onClick={() => setN((x) => x + 1)}>bump parent</button>
    </section>
  );
}

/* ---------- Good: the fixed version ---------- */

function Good() {
  const [n, setN] = useState(0);
  const onClick = useCallback(() => console.log('click'), []);
  const items = useMemo(() => [1, 2, 3], []);
  const config = useMemo(() => ({ theme: 'dark', density: 'comfy' }), []);
  return (
    <section>
      <h3>Fixed — useCallback + useMemo</h3>
      <p>Parent count: {n}</p>
      <Bug1Child onClick={onClick} label="Now stable" />
      <Bug2Child items={items} />
      <Bug3Child config={config} />
      <button onClick={() => setN((x) => x + 1)}>bump parent</button>
    </section>
  );
}

export default function App() {
  return (
    <main style={{ fontFamily: 'system-ui', padding: 24, maxWidth: 680 }}>
      <h1>render-why · bug lab</h1>
      <p>
        Open the browser console, click "bump parent" on each section, and watch
        render-why diagnose the wasted re-renders in plain English.
      </p>
      <Bug1 />
      <hr />
      <Bug2 />
      <hr />
      <Bug3 />
      <hr />
      <Good />
    </main>
  );
}
