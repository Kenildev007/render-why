import {
  memo,
  useState,
  useCallback,
  useMemo,
  createContext,
  useContext,
} from 'react';
import { useWhyRender, track } from 'render-why';

/* ----------------------- Demo 1: function prop ----------------------- */

const D1Child = memo(function Demo1Child(props: {
  onClick: () => void;
  label: string;
}) {
  useWhyRender('Demo1.Child', props);
  return <button className="demo-btn">{props.label}</button>;
});

export function Demo1() {
  const [n, setN] = useState(0);
  return (
    <div className="demo-stage">
      <div className="demo-meta">Parent render count: {n}</div>
      {/* BUG: a new inline function is created every render */}
      <D1Child onClick={() => {}} label="tracked child" />
      <button className="cta" onClick={() => setN((x) => x + 1)}>
        bump parent
      </button>
    </div>
  );
}

/* ----------------------- Demo 2: array literal ----------------------- */

const D2Child = memo(function Demo2Child(props: { items: number[] }) {
  useWhyRender('Demo2.Child', props, { diff: 'structural' });
  return <div className="demo-meta">{props.items.length} items</div>;
});

export function Demo2() {
  const [n, setN] = useState(0);
  return (
    <div className="demo-stage">
      <div className="demo-meta">Parent render count: {n}</div>
      {/* BUG: inline array literal — new ref every render */}
      <D2Child items={[1, 2, 3, 4]} />
      <button className="cta" onClick={() => setN((x) => x + 1)}>
        bump parent
      </button>
    </div>
  );
}

/* ----------------------- Demo 3: object literal ----------------------- */

const D3Child = memo(function Demo3Child(props: {
  config: { theme: string; density: string };
}) {
  useWhyRender('Demo3.Child', props, { diff: 'structural' });
  return (
    <div className="demo-meta">
      theme: {props.config.theme} · density: {props.config.density}
    </div>
  );
});

export function Demo3() {
  const [n, setN] = useState(0);
  return (
    <div className="demo-stage">
      <div className="demo-meta">Parent render count: {n}</div>
      <D3Child config={{ theme: 'dark', density: 'comfy' }} />
      <button className="cta" onClick={() => setN((x) => x + 1)}>
        bump parent
      </button>
    </div>
  );
}

/* ----------------------- Demo 4: dead re-render ---------------------- */

function Demo4Child(props: { value: number }) {
  useWhyRender('Demo4.Child', props);
  return <div className="demo-meta">value: {props.value}</div>;
}

export function Demo4() {
  const [, force] = useState(0);
  const [value] = useState(42);
  return (
    <div className="demo-stage">
      <Demo4Child value={value} />
      {/* Every click re-renders the parent with the same value → dead re-render */}
      <button className="cta" onClick={() => force((x) => x + 1)}>
        force re-render (value stays 42)
      </button>
    </div>
  );
}

/* ----------------------- Demo 5: fixed version ----------------------- */

const D5Child = memo(function Demo5Child(props: {
  onClick: () => void;
  items: number[];
  config: { theme: string };
}) {
  useWhyRender('Demo5.Child', props, { diff: 'structural' });
  return (
    <div className="demo-meta">
      {props.items.length} items · {props.config.theme}
    </div>
  );
});

export function Demo5() {
  const [n, setN] = useState(0);
  const onClick = useCallback(() => {}, []);
  const items = useMemo(() => [1, 2, 3, 4], []);
  const config = useMemo(() => ({ theme: 'dark' }), []);
  return (
    <div className="demo-stage">
      <div className="demo-meta">Parent render count: {n}</div>
      <D5Child onClick={onClick} items={items} config={config} />
      <button className="cta" onClick={() => setN((x) => x + 1)}>
        bump parent
      </button>
    </div>
  );
}

/* ----------------------- Demo 6: context re-render ------------------ */

type Theme = { color: string; density: string };
const ThemeCtx = createContext<Theme>({ color: 'dark', density: 'comfy' });

const D6Consumer = memo(function Demo6Consumer() {
  const theme = useContext(ThemeCtx);
  useWhyRender('Demo6.Consumer', { theme }, { diff: 'structural' });
  return (
    <div className="demo-meta">
      theme: {theme.color} · {theme.density}
    </div>
  );
});

export function Demo6() {
  const [n, setN] = useState(0);
  // BUG: provider value is a new object every render, so every consumer
  // in the subtree re-renders even though the actual theme never changes.
  return (
    <ThemeCtx.Provider value={{ color: 'dark', density: 'comfy' }}>
      <div className="demo-stage">
        <div className="demo-meta">Provider render count: {n}</div>
        <D6Consumer />
        <button className="cta" onClick={() => setN((x) => x + 1)}>
          bump provider
        </button>
      </div>
    </ThemeCtx.Provider>
  );
}

/* ----------------------- Demo 7: track() HOC ------------------------ */

// A plain, legacy component — no useWhyRender inside.
function Demo7Card(props: { user: { id: number; name: string }; count: number }) {
  return (
    <div className="demo-meta">
      {props.user.name} · rendered {props.count}×
    </div>
  );
}

// Opt into tracking without editing the original component.
const D7Tracked = track(memo(Demo7Card), {
  name: 'Demo7.Card',
  diff: 'structural',
});

export function Demo7() {
  const [n, setN] = useState(0);
  return (
    <div className="demo-stage">
      <div className="demo-meta">Parent render count: {n}</div>
      {/* BUG: new user object every render */}
      <D7Tracked user={{ id: 1, name: 'Ada' }} count={n} />
      <button className="cta" onClick={() => setN((x) => x + 1)}>
        bump parent
      </button>
    </div>
  );
}

/* ----------------------- Demo 8: stable derived prop --------------- */

function Demo8Child(props: { even: boolean }) {
  useWhyRender('Demo8.Child', props);
  return (
    <div className="demo-meta">
      even: <strong>{String(props.even)}</strong>
    </div>
  );
}

export function Demo8() {
  const [n, setN] = useState(0);
  // BUG: parent state changes, but the derived prop doesn't.
  // The unmemoized child re-renders anyway and render-why flags it
  // as a dead re-render (nothing-changed).
  const even = n % 2 === 0;
  return (
    <div className="demo-stage">
      <div className="demo-meta">parent n: {n}</div>
      <Demo8Child even={even} />
      <button className="cta" onClick={() => setN((x) => x + 2)}>
        n += 2 (even stays true)
      </button>
    </div>
  );
}
