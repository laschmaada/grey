/**
 * App shell + screen routing.
 *
 * Two screens: Hub (mission list) and Mission (split briefing | terminal).
 * The Mission screen has a left-side briefing panel showing the mission's
 * brief / primer / goals / scope / lab, plus a right-side terminal that
 * is the same as before. Goals tick live as facts are discovered.
 */

import { useEffect, useState } from 'preact/hooks';
import '../test/bootstrap.js';
import { makeClock } from '../core/clock.js';
import { makeEventStore, type EventStore } from '../core/events.js';
import { Session } from '../engine/session.js';
import { MISSIONS } from '../content/missions.js';
import { UiStore } from './store.js';
import { TerminalView } from './components/terminal-view.js';
import { MissionBriefing } from './screens/mission-briefing.js';
import { evaluate, type GoalContext } from '../core/goals.js';
import { loadMission, type LoadedMission } from '../content/missions_runtime.js';

interface AppCtx {
  store: UiStore;
  session: Session;
  facts: Set<string>;
  events: EventStore;
  /** currently loaded mission (set on Mission mount, cleared on Hub) */
  mission: LoadedMission | null;
}

function makeApp(): AppCtx {
  const facts = new Set<string>();
  const store = new UiStore({
    route: '#/hub',
    missionId: null,
    lastPinnableId: null,
    wallet: 0,
    factEpoch: 0,
  });
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
  // When the session reports a fact or scope change, bump the UiStore
  // so any other panel can re-render. (The briefing listens via session.onChange.)
  session.onChange = () => store.bumpFacts();
  return { store, session, facts, events, mission: null };
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
  // factEpoch is used to force re-eval of the goal expression.
  const [, setTick] = useState(0);
  const [factEpoch, setFactEpoch] = useState(0);

  // Subscribe to the UiStore so fact bumps trigger a re-render.
  useEffect(() => ctx.store.on(() => setTick((n) => n + 1)), [ctx]);

  // Load the mission on entry. Wire the world + scope card + facts into
  // the session so commands resolve correctly.
  useEffect(() => {
    const m = MISSIONS.find((x) => x.id === id);
    if (!m) {
      setStatus('mission not found');
      ctx.mission = null;
      return;
    }
    try {
      const loaded = loadMission(id);
      ctx.mission = loaded;
      // Wire the mission's world + scope card into the terminal session.
      ctx.session.setWorld(loaded.world);
      ctx.session.attachScopeCard(loaded.scope);
      // Reset per-mission state: facts and strikes are mission-scoped for v1.
      ctx.facts.clear();
      ctx.session.scopeStrikes = 0;
      ctx.session.scopeLog = [];
      // Reset the in-memory campaign so the goal evaluator starts fresh.
      ctx.events.campaign.length = 0;
      ctx.events.nextId = 1;
      ctx.events.session = undefined;

      const def = MISSIONS.find((x) => x.id === id);
      const g: GoalContext = {
        world: loaded.world,
        store: { campaign: ctx.events.campaign, session: ctx.events.session, nextId: ctx.events.nextId },
        knownFacts: ctx.facts,
        intelClaims: new Map(),
        scopeStrikes: 0,
        noise: 0,
      };
      setStatus(evaluate(loaded.goals, g) ? 'goal satisfied' : 'running');
      setFactEpoch((n) => n + 1);
      void def;
    } catch (e) {
      setStatus(`error: ${e instanceof Error ? e.message : String(e)}`);
      ctx.mission = null;
    }
  }, [id, ctx]);

  // Re-evaluate the goal every time the store ticks (fact added, scope strike).
  useEffect(() => {
    if (!ctx.mission) return;
    const g: GoalContext = {
      world: ctx.mission.world,
      store: { campaign: ctx.events.campaign, session: ctx.events.session, nextId: ctx.events.nextId },
      knownFacts: ctx.facts,
      intelClaims: new Map(),
      scopeStrikes: ctx.session.scopeStrikes,
      noise: 0,
    };
    const ok = evaluate(ctx.mission.goals, g);
    setStatus(ok ? 'goal satisfied' : 'running');
  }, [factEpoch, ctx]);

  const onBack = () => {
    ctx.mission = null;
    ctx.store.set({ route: '#/hub', missionId: null });
  };

  const mission = ctx.mission;
  const stub = mission ? MISSIONS.find((x) => x.id === mission.id) : undefined;

  return (
    <div
      class="gh-mission-grid"
      aria-label="mission screen"
    >
      {mission && stub ? (
        <MissionBriefing
          mission={mission}
          stub={stub}
          session={ctx.session}
          store={ctx.events}
          facts={ctx.facts}
          factEpoch={factEpoch}
          status={status}
          onHub={onBack}
        />
      ) : (
        <aside style="padding:14px 18px; color: var(--gh-warn);">{status}</aside>
      )}
      <main style="height:100%; min-width:0; display:flex; flex-direction:column;">
        <TerminalView
          session={ctx.session}
          store={ctx.store}
          onPin={(_id, _text) => {
            /* TODO: a proper Artifacts store (M3-T06); for now we just log */
          }}
        />
      </main>
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

// unused but exported so consumers/tests can import the atoms helper if needed
export {};