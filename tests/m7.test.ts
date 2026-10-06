import { describe, it, expect } from 'vitest';
import '../src/test/bootstrap.js';
import { loadMission, type Transcript as _Transcript, runTranscript as _runTranscript } from '../src/content/missions_runtime.js';
import { evaluate, type GoalContext } from '../src/core/goals.js';
import { type EventStore } from '../src/core/events.js';
import type { GameEvent } from '../src/core/types.js';
import { runAis } from '../src/sims/ais.js';
import { runSherlock } from '../src/sims/sherlock.js';
import { runVql, buildFleet } from '../src/sims/velociraptor.js';
import { makeBeaconPuzzle } from '../src/core/beacon.js';
import { checkHoneytokenHit, plantHoneytoken, resetHoneytokens } from '../src/core/honeytoken.js';
import { seedRookPlan, listRookActions, resetRook } from '../src/core/rook.js';
import { runHydra, runJohn } from '../src/sims/hydra_john.js';
import { generateImplant, listImplants, resetSliver } from '../src/sims/sliver.js';

function ctxFor(mission: ReturnType<typeof loadMission>, facts: Set<string>, events: GameEvent[]): GoalContext {
  return {
    world: mission.world,
    store: { campaign: events, nextId: events.length + 1 } as EventStore,
    knownFacts: facts,
    intelClaims: new Map(),
    scopeStrikes: 0,
    noise: 0,
  };
}

describe('M7-T01: shared sims', () => {
  it('ais dark-ship mmsi-538123456 has a >6h gap', () => {
    const w = smallWorld();
    const t = runAis(w, 'mmsi-538123456');
    expect(t.isDarkShip).toBe(true);
    expect(t.longestGap).toBeGreaterThan(6 * 60);
  });

  it('ais other mmsis do not have a >6h gap', () => {
    const w = smallWorld();
    expect(runAis(w, 'mmsi-477123456').isDarkShip).toBe(false);
    expect(runAis(w, 'mmsi-636123456').isDarkShip).toBe(false);
  });

  it('sherlock returns deterministic per-handle results', () => {
    const w = smallWorld();
    const a = runSherlock(w, 'analyst42');
    const b = runSherlock(w, 'analyst42');
    expect(a.found.length).toBe(b.found.length);
  });
});

describe('M7-T02: intel verification + honeytoken', () => {
  it('honeytoken detect returns the planted record', () => {
    resetHoneytokens();
    const r = plantHoneytoken({
      key: 'honeytoken:aws-access-key:ABCD',
      value: 'ABCD',
      pointsAt: 'Veyra C2',
      missionId: 'a3-honeytoken',
    });
    expect(checkHoneytokenHit('ABCD')).toEqual(r);
  });

  it('Rook plan has 4 actions in order', () => {
    resetRook();
    seedRookPlan();
    const acts = listRookActions();
    expect(acts).toHaveLength(4);
    expect(acts.map((a) => a.kind)).toEqual([
      'creds-leak',
      'persistence-schtask',
      'c2-checkin',
      'lateral-smb',
    ]);
  });
});

describe('M7-T05: Red sims', () => {
  it('hydra returns the matching credential', () => {
    const w = smallWorld();
    const r = runHydra(w, '192.0.2.10', 22, 'analyst');
    expect(r?.password).toBe('Spring2025!');
  });

  it('john cracks hashes for known fixture users', () => {
    const w = smallWorld();
    const out = runJohn(w, [
      { user: 'admin', ntlm: 'aad3b435b51404eeaad3b435b51404ee' },
      { user: 'analyst', ntlm: 'aad3b435b51404eeaad3b435b51404ee' },
    ]);
    expect(out.find((o) => o.user === 'admin')?.plaintext).toBe('admin123');
    expect(out.find((o) => o.user === 'analyst')?.plaintext).toBe('Spring2025!');
  });

  it('sliver generateImplant returns an implant record', () => {
    resetSliver();
    const w = smallWorld();
    const imp = generateImplant(w, 'analyst');
    expect(imp).not.toBeNull();
    expect(listImplants()).toHaveLength(1);
  });
});

describe('M7-T07: Blue sims', () => {
  it('velociraptor VQL filters by port', () => {
    buildFleet(1);
    const rows = runVql({ source: 'services', where: { port: 445 } });
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r['port'] === 445)).toBe(true);
  });

  it('beacon puzzle produces a deterministic answer', () => {
    const w = smallWorld();
    const p = makeBeaconPuzzle(42, w);
    expect(p.beacon).toBeDefined();
    expect(p.beaconCount).toBeGreaterThan(0);
    const beaconPackets = p.packets.filter((q) => q.dport === p.beacon.dport);
    expect(beaconPackets.length).toBe(p.beaconCount);
  });
});

describe('M7-T03 + T06 + T08: Act 3 mission routes', () => {
  it('a3-dark-ship route-a reaches the goal', () => {
    const m = loadMission('a3-dark-ship');
    const facts = new Set<string>(['ais:dark-ship:mmsi-538123456']);
    expect(evaluate(m.goals, ctxFor(m, facts, []))).toBe(true);
  });

  it('a3-honeytoken route-a reaches the goal', () => {
    const m = loadMission('a3-honeytoken');
    const facts = new Set<string>(['honeytoken:recognized']);
    expect(evaluate(m.goals, ctxFor(m, facts, []))).toBe(true);
  });

  it('a3r-migrate-dump route-a reaches the goal', () => {
    const m = loadMission('a3r-migrate-dump');
    const facts = new Set<string>(['session:grid-gw', 'hashdump:grid-gw']);
    expect(evaluate(m.goals, ctxFor(m, facts, []))).toBe(true);
  });

  it('a3r-pivot route-a reaches the goal', () => {
    const m = loadMission('a3r-pivot');
    const facts = new Set<string>(['session:internal']);
    expect(evaluate(m.goals, ctxFor(m, facts, []))).toBe(true);
  });

  it('a3r-callback route-a reaches the goal', () => {
    const m = loadMission('a3r-callback');
    const facts = new Set<string>(['sliver:callback:grid-gw']);
    expect(evaluate(m.goals, ctxFor(m, facts, []))).toBe(true);
  });

  it('a3r-cracked route-a reaches the goal', () => {
    const m = loadMission('a3r-cracked');
    const facts = new Set<string>(['cred:analyst@grid-gw', 'cred:admin@grid-gw']);
    expect(evaluate(m.goals, ctxFor(m, facts, []))).toBe(true);
  });

  it('a3b-persisted route-a reaches the goal', () => {
    const m = loadMission('a3b-persisted');
    const facts = new Set<string>(['wazuh:persistence:patient']);
    expect(evaluate(m.goals, ctxFor(m, facts, []))).toBe(true);
  });

  it('a3b-fleet-sweep route-a reaches the goal', () => {
    const m = loadMission('a3b-fleet-sweep');
    const facts = new Set<string>(['fleet:smb-open']);
    expect(evaluate(m.goals, ctxFor(m, facts, []))).toBe(true);
  });

  it('a3b-heartbeat route-a reaches the goal', () => {
    const m = loadMission('a3b-heartbeat');
    const facts = new Set<string>(['beacon:detected']);
    expect(evaluate(m.goals, ctxFor(m, facts, []))).toBe(true);
  });

  it('a3b-follow-money route-a reaches the goal', () => {
    const m = loadMission('a3b-follow-money');
    const facts = new Set<string>([]);
    // intel_verified needs ≥3 different sourceType+origin in ctx.intelClaims
    const ctx: GoalContext = {
      world: m.world,
      store: { campaign: [], nextId: 1 } as EventStore,
      knownFacts: facts,
      intelClaims: new Map([
        ['ransom_to_charter', [
          { sourceType: 'ais', origin: 'mmsi-538123456' },
          { sourceType: 'certlog', origin: 'sub.example' },
          { sourceType: 'artifact', origin: 'usb-1' },
        ]],
      ]),
      scopeStrikes: 0,
      noise: 0,
    };
    expect(evaluate(m.goals, ctx)).toBe(true);
  });
});

function smallWorld(): import('../src/core/types.js').World {
  return {
    seed: 1,
    hosts: [
      { id: 'analyst', ip: '192.0.2.10', os: 'Linux', inScope: true, services: [] },
      { id: 'attacker', ip: '198.51.100.7', os: 'Linux', inScope: false, services: [] },
      { id: 'grid-gw', ip: '192.0.2.10', os: 'Linux', inScope: true, services: [] },
    ],
    vulns: [],
    creds: [],
    edges: [],
    dns: [],
    web: { rootUrl: 'http://gw.grid.test/', nodes: [], links: [], index: new Map() },
    docs: [],
    defenses: { hostIds: [] },
    pinned: [],
  };
}

export {};