/**
 * App shell + screen routing. Simple hash router; a hub screen + mission screen.
 */

import { useEffect, useState } from 'preact/hooks';
import '../test/bootstrap.js';
import { makeClock } from '../core/clock.js';
import { makeEventStore } from '../core/events.js';
import { Session } from '../engine/session.js';
import { MISSIONS } from '../content/missions.js';
import { UiStore } from './store.js';
import { TerminalView } from './components/terminal-view.js';
import type { OutputSpan } from '../engine/output.js';
import type { GoalContext } from '../core/goals.js';
import { evaluate } from '../core/goals.js';
import { loadMission } from '../content/missions_runtime.js';

interface AppCtx {
  store: UiStore;
  session: Session;
  facts: Set<string>;
}

function makeApp(): AppCtx {
  const facts = new Set<string>();
  const store = new UiStore({ route: '#/hub', missionId: null, lastPinnableId: null, wallet: 0 });
  const clock = makeClock();
  const events = makeEventStore();
  const session = new Session({
    clock,
    emit: (type, payload) =>
      events.campaign.push({
        id: events.nextId++,
        t: clock.now(),
        actor: 'player',
        type,
        payload,
      }),
    knownFacts: facts,
    writeFact: (k) => facts.add(k),
  });
  return { store, session, facts };
}

function Hub({ ctx }: { ctx: AppCtx }) {
  return (
    <div style="padding: 16px;">
      <h1 style="margin: 0; color: var(--gh-accent);">GREY HERON</h1>
      <p style="margin: 4px 0; color: var(--gh-muted);">Missions</p>
      <ul style="list-style:none; padding:0;">
        {MISSIONS.filter((m) => m.status === 'complete').map((m) => (
          <li key={m.id} style="padding:4px 0;">
            <button
              onClick={() => ctx.store.set({ route: `#/mission/${m.id}`, missionId: m.id })}
              style="background:transparent; color:var(--gh-fg); border:1px solid var(--gh-border); padding:6px 10px; cursor:pointer;"
              aria-label={`start mission ${m.id}`}
            >
              {m.title} <span style="color:var(--gh-muted);">({m.id})</span>
            </button>
          </li>
        ))}
      </ul>
      <p style="color:var(--gh-warn); margin-top: 16px;">
        Simulator only — no real scanning, no working exploits, no network calls.
      </p>
    </div>
  );
}

function Mission({ ctx, id }: { ctx: AppCtx; id: string }) {
  const [status, setStatus] = useState<string>('running');

  useEffect(() => {
    const m = MISSIONS.find((x) => x.id === id);
    if (!m) {
      setStatus('mission not found');
      return;
    }
    try {
      const lm = loadMission(id);
      // Wire the mission's world into the terminal session so commands like
      // `nmap -sV <host>` can resolve targetHost against it.
      ctx.session.setWorld(lm.world);
      const g: GoalContext = {
        world: lm.world,
        store: { campaign: [], nextId: 0 },
        knownFacts: ctx.facts,
        intelClaims: new Map(),
        scopeStrikes: 0,
        noise: 0,
      };
      if (evaluate(lm.goals, g)) setStatus('goal satisfied');
      else setStatus('running');
    } catch (e) {
      setStatus(`error: ${e instanceof Error ? e.message : String(e)}`);
    }
  }, [id, ctx.facts, ctx.session, status]);

  return (
    <div style="display:flex; flex-direction:column; height: 100%;">
      <div style="padding:8px 16px; border-bottom: 1px solid var(--gh-border); display:flex; justify-content:space-between;">
        <button
          onClick={() => ctx.store.set({ route: '#/hub', missionId: null })}
          style="background:transparent; color:var(--gh-accent); border:none; cursor:pointer;"
          aria-label="back to hub"
        >
          ← Hub
        </button>
        <span style="color:var(--gh-muted);">{id} — {status}</span>
      </div>
      <div style="flex:1; min-height: 0;">
        <TerminalView
          session={ctx.session}
          store={ctx.store}
          onPin={(_id, text) => {
            const _ignored: OutputSpan[] = [{ kind: 'text', text: `(pinned ${text.length} bytes)\n` }];
            void _ignored;
          }}
        />
      </div>
    </div>
  );
}

export function App() {
  const [ctx] = useState<AppCtx>(makeApp);
  const initial = (typeof window !== 'undefined' && window.location.hash) || '#/hub';
  const [route, setRoute] = useState(initial.startsWith('#/') ? initial : '#/hub');

  useEffect(() => ctx.store.on((s) => setRoute(s.route)), [ctx]);

  useEffect(() => {
    function onHash(): void {
      const h = window.location.hash || '#/hub';
      setRoute(h);
    }
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  if (route.startsWith('#/mission/')) {
    const id = route.replace('#/mission/', '');
    return <Mission ctx={ctx} id={id} />;
  }
  return <Hub ctx={ctx} />;
}