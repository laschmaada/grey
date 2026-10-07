/**
 * Briefing panel — the left side of the Mission screen.
 *
 * Tests:
 *  - the panel renders brief / primer / scope / lab from the loaded mission
 *  - the goals checklist shows all goal atoms and ticks them as the
 *    session's knownFacts grow
 *  - scope strikes appear after an out-of-scope touch
 */

import { describe, it, expect } from 'vitest';
import { render } from 'preact';
import { MissionBriefing } from '../src/ui/screens/mission-briefing.js';
import '../src/test/bootstrap.js';
import { Session } from '../src/engine/session.js';
import { makeClock } from '../src/core/clock.js';
import { makeEventStore } from '../src/core/events.js';
import { loadMission } from '../src/content/missions_runtime.js';
import { MISSIONS } from '../src/content/missions.js';
import { type GameEvent } from '../src/core/types.js';

function mkSession(): Session {
  const clock = makeClock();
  const events = makeEventStore();
  const facts = new Set<string>();
  return new Session({
    clock,
    emit: (type, payload) =>
      events.campaign.push({ id: events.nextId++, t: clock.now(), actor: 'player', type, payload }),
    knownFacts: facts,
    writeFact: (k) => facts.add(k),
  });
}

function setupMission(id: string) {
  const sess = mkSession();
  const lm = loadMission(id);
  sess.setWorld(lm.world);
  sess.attachScopeCard(lm.scope);
  const stub = MISSIONS.find((m) => m.id === id)!;
  return { sess, loaded: lm, stub };
}

describe('briefing: renders the six sections', () => {
  it('renders brief, primer, scope, lab', () => {
    document.body.innerHTML = '<div id="app"></div>';
    const { sess, loaded, stub } = setupMission('a1-first-contact');
    const root = document.getElementById('app')!;
    render(
      <MissionBriefing
        mission={loaded}
        stub={stub}
        session={sess}
        store={{ campaign: [], nextId: 1 }}
        facts={new Set()}
        factEpoch={0}
        status="running"
        onHub={() => {}}
      />,
      root,
    );
    const html = root.innerHTML;
    expect(html).toContain('Brief');
    expect(html).toContain('Primer');
    expect(html).toContain('Goals');
    expect(html).toContain('Scope');
    expect(html).toContain('Lab');
    expect(html).toContain(loaded.brief);
    expect(html).toContain(loaded.primer);
    expect(html).toContain(loaded.lab);
  });

  it('shows the goal atoms for the mission', () => {
    document.body.innerHTML = '<div id="app"></div>';
    const { sess, loaded, stub } = setupMission('a1-first-contact');
    const root = document.getElementById('app')!;
    render(
      <MissionBriefing
        mission={loaded}
        stub={stub}
        session={sess}
        store={{ campaign: [], nextId: 1 }}
        facts={new Set()}
        factEpoch={0}
        status="running"
        onHub={() => {}}
      />,
      root,
    );
    // a1-first-contact has a single service_identified atom (port 22)
    const html = root.innerHTML;
    expect(html).toContain('service_identified(grid-gw, 22)');
    expect(html).not.toContain('☑');
  });
});

describe('briefing: live goal ticking', () => {
  it('a service fact ticks the matching goal checkbox', () => {
    document.body.innerHTML = '<div id="app"></div>';
    const { sess, loaded, stub } = setupMission('a1-first-contact');
    const facts = new Set<string>();
    const events: GameEvent[] = [];
    const root = document.getElementById('app')!;
    render(
      <MissionBriefing
        mission={loaded}
        stub={stub}
        session={sess}
        store={{ campaign: events, nextId: 1 }}
        facts={facts}
        factEpoch={0}
        status="running"
        onHub={() => {}}
      />,
      root,
    );
    expect(root.innerHTML).not.toContain('☑');

    facts.add('service:grid-gw:22');
    render(
      <MissionBriefing
        mission={loaded}
        stub={stub}
        session={sess}
        store={{ campaign: events, nextId: 1 }}
        facts={facts}
        factEpoch={1}
        status="running"
        onHub={() => {}}
      /> as preact.VNode,
      root,
    );
    // Now the 22 atom should be ticked
    expect(root.innerHTML).toContain('☑');
    // No other atoms in this mission, so should be exactly one tick
    const tickedCount = (root.innerHTML.match(/☑/g) ?? []).length;
    expect(tickedCount).toBe(1);
  });
});

describe('briefing: scope strikes', () => {
  it('renders a warning when scopeStrikes > 0', () => {
    document.body.innerHTML = '<div id="app"></div>';
    const { sess, loaded, stub } = setupMission('a1-first-contact');
    sess.scopeStrikes = 1;
    sess.scopeLog.push({ at: 0, reason: 'out-of-scope touch: bad-host' });
    const root = document.getElementById('app')!;
    render(
      <MissionBriefing
        mission={loaded}
        stub={stub}
        session={sess}
        store={{ campaign: [], nextId: 1 }}
        facts={new Set()}
        factEpoch={0}
        status="running"
        onHub={() => {}}
      />,
      root,
    );
    expect(root.innerHTML).toContain('scope strikes: 1');
    expect(root.innerHTML).toContain('out-of-scope touch: bad-host');
  });
});