/**
 * MissionBriefing — the left-side panel of the Mission screen.
 *
 * Six sections, in order:
 *   1. Title + status (running / goal satisfied / error: …)
 *   2. BRIEF     — 1-3 sentence mission brief
 *   3. PRIMER    — tutorial-style 1-paragraph explanation
 *   4. GOALS     — live checklist, ticked as the player discovers facts
 *   5. SCOPE     — in-scope / out-of-scope / permitted / forbidden / data rule
 *   6. LAB       — real-world exercise description
 *
 * The panel reads from `props.mission` and `props.session` and re-evaluates
 * the goal atoms whenever the session reports a fact/scope mutation.
 *
 * Render uses Preact `style` props only. No innerHTML.
 */

import type { ComponentChildren } from 'preact';
import { useEffect, useMemo, useState } from 'preact/hooks';
import type { Session } from '../../engine/session.js';
import { atoms, evaluateAtom, type GoalContext } from '../../core/goals.js';
import type { GoalAtom } from '../../core/types.js';
import type { LoadedMission } from '../../content/missions_runtime.js';
import type { EventStore } from '../../core/events.js';
import type { MissionStub } from '../../content/missions.js';

export interface MissionBriefingProps {
  mission: LoadedMission;
  session: Session;
  /** the event store (campaign + session + nextId) */
  store: EventStore;
  /** stub metadata (payoutBase, track, act) from the MISSIONS catalog */
  stub: MissionStub;
  /** the knownFacts Set */
  facts: Set<string>;
  /** set externally to (re-)render the panel */
  factEpoch: number;
  /** overall mission status (drives the badge in the title bar) */
  status: string;
  onHub: () => void;
}

export function MissionBriefing(props: MissionBriefingProps) {
  const { mission, stub, status, factEpoch } = props;

  // Re-render when the session signals a fact or scope change.
  const [, setLocal] = useState(0);
  useEffect(() => {
    const tick = (): void => setLocal((n) => n + 1);
    props.session.onChange = tick;
    return () => {
      props.session.onChange = undefined;
    };
  }, [props.session]);

  const goalAtoms = useMemo<GoalAtom[]>(() => atoms(mission.goals), [mission.goals]);

  const goalCtx: GoalContext = useMemo(
    () => ({
      world: mission.world,
      store: props.store,
      knownFacts: props.facts,
      intelClaims: new Map(),
      scopeStrikes: props.session.scopeStrikes,
      noise: 0,
    }),
    // depend on factEpoch so live updates flow
    [mission, factEpoch, props.facts, props.store.campaign, props.session.scopeStrikes],
  );

  return (
    <aside
      style="height:100%; overflow-y:auto; padding:14px 18px; background: var(--gh-bg); color: var(--gh-fg); border-right: 1px solid var(--gh-border); box-sizing: border-box;"
      aria-label="mission briefing"
    >
      <header style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
        <button
          onClick={props.onHub}
          style="background:transparent; color:var(--gh-accent); border:none; cursor:pointer; font-family:inherit; font-size:inherit; padding:0;"
          aria-label="back to hub"
        >
          ← Hub
        </button>
        <span
          style={`color:${statusColor(status)}; font-family:inherit; font-size:0.95em;`}
        >
          {statusBadge(status)}
        </span>
      </header>

      <h2 style="margin:14px 0 4px; color: var(--gh-accent); font-size: 1.05rem;">
        {mission.title}
      </h2>
      <div style="color: var(--gh-muted); font-size: 0.85em; margin-bottom:14px;">
        {mission.id} · act {stub.act} · {stub.track} · base {stub.payoutBase} ₡
      </div>

      <Section title="Brief">
        <p style="margin: 0;">{mission.brief}</p>
      </Section>

      <Section title="Primer">
        <p style="margin: 0; color: var(--gh-fg);">{mission.primer}</p>
      </Section>

      <Section title="Goals">
        <ul style="margin:0; padding-left:18px; list-style:none;">
          {goalAtoms.map((atom, i) => (
            <GoalAtomRow key={i} atom={atom} ctx={goalCtx} />
          ))}
        </ul>
        {props.session.scopeStrikes > 0 && (
          <p style="margin:8px 0 0; color: var(--gh-warn); font-size: 0.85em;">
            ⚠ scope strikes: {props.session.scopeStrikes}
            {props.session.scopeLog.length > 0 && ` (last: ${props.session.scopeLog[props.session.scopeLog.length - 1]!.reason})`}
          </p>
        )}
      </Section>

      <Section title="Scope">
        <ScopeCardView scope={mission.scope} />
      </Section>

      <Section title="Lab">
        <p style="margin:0; color: var(--gh-fg);">{mission.lab}</p>
      </Section>

      <p
        style="margin-top:14px; color: var(--gh-muted); font-size: 0.8em; border-top: 1px solid var(--gh-border); padding-top: 8px;"
      >
        Simulator only — no real scanning, no working exploits, no network calls.
      </p>
    </aside>
  );
}

function Section({ title, children }: { title: string; children: ComponentChildren }) {
  return (
    <section style="margin-bottom: 14px;">
      <h3 style="margin: 0 0 4px; color: var(--gh-accent); font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.08em;">
        {title}
      </h3>
      <div style="color: var(--gh-fg); font-size: 0.9rem; line-height: 1.45;">{children}</div>
    </section>
  );
}

function GoalAtomRow({ atom, ctx }: { atom: GoalAtom; ctx: GoalContext }) {
  const satisfied = evaluateAtom(atom, ctx);
  const label = describeAtom(atom);
  return (
    <li
      style={`margin: 2px 0; color: ${satisfied ? 'var(--gh-accent)' : 'var(--gh-fg)'}; display: flex; align-items: baseline; gap: 6px;`}
    >
      <span aria-hidden="true">{satisfied ? '☑' : '☐'}</span>
      <span style="font-family: ui-monospace, monospace; font-size: 0.85em;">{label}</span>
    </li>
  );
}

function describeAtom(atom: GoalAtom): string {
  switch (atom.kind) {
    case 'host_discovered': return `host_discovered(${atom.hostId})`;
    case 'service_identified': return `service_identified(${atom.hostId}, ${atom.port})`;
    case 'fact_found': return `fact_found(${atom.key})`;
    case 'scan_performed': return `scan_performed(${atom.scan})`;
    case 'session_open': return `session_open(${atom.hostId}${atom.type ? ', ' + atom.type : ''})`;
    case 'credential_obtained': return `credential_obtained(${atom.user}, ${atom.hostId})`;
    case 'file_retrieved': return `file_retrieved(${atom.path})`;
    case 'evidence_preserved': return `evidence_preserved(${atom.hostId})`;
    case 'host_isolated': return `host_isolated(${atom.hostId})`;
    case 'rule_written': return `rule_written(${atom.id})`;
    case 'rule_blocks': return `rule_blocks(${atom.flowSet})`;
    case 'rule_fp_below': return `rule_fp_below(${atom.max})`;
    case 'alerts_triaged': return `alerts_triaged(${atom.setId})`;
    case 'intel_verified': return `intel_verified(${atom.claim})`;
    case 'report_submitted': return `report_submitted(${atom.id})`;
    case 'noise_below': return `noise_below(${atom.n})`;
    case 'scope_strikes_below': return `scope_strikes_below(${atom.n})`;
    case 'custom': return `custom(${atom.name})`;
    default: return JSON.stringify(atom);
  }
}

function ScopeCardView({ scope }: { scope: LoadedMission['scope'] }) {
  const row = (label: string, items: ReadonlyArray<string>) => (
    <div style="margin: 2px 0; display: flex; gap: 6px;">
      <span style="color: var(--gh-muted); min-width: 96px;">{label}</span>
      <span style="font-family: ui-monospace, monospace;">
        {items.length === 0 ? '—' : items.join(', ')}
      </span>
    </div>
  );
  return (
    <div>
      {row('in-scope', scope.inScope)}
      {row('out-of-scope', scope.outOfScope)}
      {row('permitted', scope.permitted)}
      {row('forbidden', scope.forbidden)}
      {scope.window && (
        <div style="margin: 2px 0; display: flex; gap: 6px;">
          <span style="color: var(--gh-muted); min-width: 96px;">window</span>
          <span style="font-family: ui-monospace, monospace;">
            {scope.window[0]} → {scope.window[1]}
          </span>
        </div>
      )}
      <div style="margin: 2px 0; display: flex; gap: 6px;">
        <span style="color: var(--gh-muted); min-width: 96px;">data rule</span>
        <span>{scope.dataRule}</span>
      </div>
    </div>
  );
}

function statusColor(status: string): string {
  if (status === 'goal satisfied') return 'var(--gh-accent)';
  if (status.startsWith('error')) return 'var(--gh-err)';
  return 'var(--gh-muted)';
}

function statusBadge(status: string): string {
  return `● ${status}`;
}