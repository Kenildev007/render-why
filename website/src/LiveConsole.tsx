import { useEffect, useState, useMemo } from 'react';
import { subscribeEvents } from './eventBus';
import type { RenderEvent } from 'render-why';

type Props = {
  /** Only events from components whose names match this prefix appear here. */
  filter: string;
};

export default function LiveConsole({ filter }: Props) {
  const [events, setEvents] = useState<RenderEvent[]>([]);

  useEffect(() => {
    return subscribeEvents((e) => {
      if (!e.component.startsWith(filter)) return;
      setEvents((prev) => [...prev.slice(-9), e]);
    });
  }, [filter]);

  const empty = events.length === 0;

  return (
    <div className="console">
      <div className="console-head">
        <span className="console-dot" />
        <span>render-why — live</span>
        {!empty && (
          <button className="console-clear" onClick={() => setEvents([])}>
            clear
          </button>
        )}
      </div>
      <div className="console-body">
        {empty ? (
          <div className="console-empty">
            click a button above — events appear here
          </div>
        ) : (
          events.map((e, i) => <ConsoleLine key={i} event={e} />)
        )}
      </div>
    </div>
  );
}

function ConsoleLine({ event }: { event: RenderEvent }) {
  const keys = event.diff.changedKeys;

  const summary = useMemo(() => {
    if (keys.length === 0) return 'nothing changed — dead re-render';
    return keys
      .map((k) => {
        const c = event.diff.perKey[k];
        if (c.kind === 'new-reference-same-value')
          return `${k}: NEW REFERENCE`;
        if (c.kind === 'value-changed') return `${k}: value changed`;
        if (c.kind === 'added') return `${k}: added`;
        return `${k}: removed`;
      })
      .join(' · ');
  }, [event, keys]);

  return (
    <div className="line">
      <div className="line-head">
        🔍 <strong>{event.component}</strong>{' '}
        <span className="muted">(render #{event.render})</span>
      </div>
      <div className="line-body">{summary}</div>
      {event.suggestions.map((s, i) => (
        <div className="line-suggest" key={i}>
          💡 {s.message} <span className="muted">{s.fix}</span>
        </div>
      ))}
    </div>
  );
}
