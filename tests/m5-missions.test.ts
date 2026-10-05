import { describe, it, expect } from 'vitest';
import '../src/test/bootstrap.js';
import { loadMission } from '../src/content/missions_runtime.js';
import { evaluate, type GoalContext } from '../src/core/goals.js';
import { makeEventStore, type EventStore } from '../src/core/events.js';
import { runTranscript, type Transcript } from '../src/content/missions_runtime.js';
import type { GameEvent } from '../src/core/types.js';

function ctxFor(world: ReturnType<typeof loadMission>['world'], facts: Set<string>, events: GameEvent[]): GoalContext {
  return {
    world,
    store: { campaign: events, nextId: events.length + 1 } as EventStore,
    knownFacts: facts,
    intelClaims: new Map(),
    scopeStrikes: 0,
    noise: 0,
  };
}

describe('M5-T07: a1-twenty-alarms routes', () => {
  it('route-a triages the three true positives', () => {
    const m = loadMission('a1-twenty-alarms');
    const facts = new Set<string>();
    const events: GameEvent[] = [];
    const t = m.transcripts[0] as Transcript;
    runTranscript(m as never, t, events, facts);
    expect(evaluate(m.goals, ctxFor(m.world, facts, events))).toBe(true);
  });

  it('route-b (only one triage) does not satisfy all goals', () => {
    const m = loadMission('a1-twenty-alarms');
    const facts = new Set<string>();
    const events: GameEvent[] = [];
    const t = m.transcripts[1] as Transcript;
    runTranscript(m as never, t, events, facts);
    expect(evaluate(m.goals, ctxFor(m.world, facts, events))).toBe(false);
  });

  it('negative-1 (wrong call) does not satisfy', () => {
    const m = loadMission('a1-twenty-alarms');
    const facts = new Set<string>();
    const events: GameEvent[] = [];
    const t = m.transcripts[2] as Transcript;
    runTranscript(m as never, t, events, facts);
    expect(evaluate(m.goals, ctxFor(m.world, facts, events))).toBe(false);
  });
});

describe('M5-T03: a1-recon-console routes', () => {
  it('route-a (msf aux scanner) identifies port 22', () => {
    const m = loadMission('a1-recon-console');
    const facts = new Set<string>(['service:grid-gw:22', 'service:grid-gw:80']);
    const events: GameEvent[] = [];
    expect(evaluate(m.goals, ctxFor(m.world, facts, events))).toBe(true);
  });

  it('route-b (nmap) identifies port 22', () => {
    const m = loadMission('a1-recon-console');
    const facts = new Set<string>(['service:grid-gw:22']);
    const events: GameEvent[] = [];
    expect(evaluate(m.goals, ctxFor(m.world, facts, events))).toBe(true);
  });

  it('negative-1 (no target) does not satisfy', () => {
    const m = loadMission('a1-recon-console');
    const facts = new Set<string>();
    const events: GameEvent[] = [];
    expect(evaluate(m.goals, ctxFor(m.world, facts, events))).toBe(false);
  });
});

describe('M5-T03: a1-mail-server routes', () => {
  it('route-a (dig + nmap) identifies port 25', () => {
    const m = loadMission('a1-mail-server');
    const facts = new Set<string>(['service:mail:25']);
    const events: GameEvent[] = [];
    expect(evaluate(m.goals, ctxFor(m.world, facts, events))).toBe(true);
  });

  it('negative-1 (wrong host) does not satisfy', () => {
    const m = loadMission('a1-mail-server');
    const facts = new Set<string>();
    const events: GameEvent[] = [];
    expect(evaluate(m.goals, ctxFor(m.world, facts, events))).toBe(false);
  });
});

void makeEventStore;