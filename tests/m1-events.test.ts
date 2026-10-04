import { describe, it, expect } from 'vitest';
import {
  append,
  commitSession,
  discardSession,
  makeEventStore,
  profileReducer,
  startSession,
} from '../src/core/events.js';
import type { GameEvent, Profile } from '../src/core/types.js';

const baseProfile: Profile = {
  name: 'tester',
  wallet: 0,
  trust: 0.5,
  evidenceIntegrity: 1,
  noise: 0,
  ownedTools: [],
  purchasedTools: [],
  completedMissions: [],
  fieldVerified: [],
  rank: 'analyst',
  seenNews: [],
};

function initialStore(): ReturnType<typeof makeEventStore> {
  return makeEventStore();
}

describe('M1-T03: event store + replay', () => {
  it('append assigns monotonic ids and respects session boundary', () => {
    const s = initialStore();
    const e1 = append(s, { t: 1, actor: 'player', type: 'earn', payload: { amount: 100 } });
    expect(e1.id).toBe(1);
    startSession(s, 'a1-first-contact');
    const e2 = append(s, { t: 2, actor: 'player', type: 'command', payload: { scan: 'tcp' } });
    expect(e2.id).toBe(2);
    expect(s.campaign).toHaveLength(1);
    expect(s.session?.events).toHaveLength(1);
    commitSession(s);
    expect(s.campaign).toHaveLength(2);
    expect(s.session).toBeUndefined();
  });

  it('discardSession drops session events', () => {
    const s = initialStore();
    append(s, { t: 1, actor: 'player', type: 'earn', payload: { amount: 100 } });
    startSession(s, 'm1');
    append(s, { t: 2, actor: 'player', type: 'command', payload: { scan: 'tcp' } });
    discardSession(s);
    expect(s.campaign).toHaveLength(1);
    expect(s.session).toBeUndefined();
  });

  it('replay reproduces the same profile twice', () => {
    const events: GameEvent[] = [
      { id: 1, t: 0, actor: 'system', type: 'earn', payload: { amount: 200 } },
      { id: 2, t: 1, actor: 'player', type: 'purchase', payload: { cost: 80 } },
      { id: 3, t: 2, actor: 'system', type: 'earn', payload: { amount: 50 } },
    ];
    const a = events.reduce(profileReducer, baseProfile);
    const b = events.reduce(profileReducer, baseProfile);
    expect(a).toEqual(b);
    expect(a.wallet).toBe(200 - 80 + 50);
  });
});