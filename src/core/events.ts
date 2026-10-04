/**
 * §4.3 — Event store.
 *
 * Append-only, two streams (campaign + session). `commit()` folds session into
 * campaign; `discard()` drops the session. Replay equality is asserted by M1-T03 tests.
 */

import type { GameEvent, Profile } from './types.js';

export interface EventStore {
  campaign: GameEvent[];
  session?: { missionId: string; events: GameEvent[] };
  nextId: number;
}

export function makeEventStore(): EventStore {
  return { campaign: [], nextId: 1 };
}

export function append(store: EventStore, ev: Omit<GameEvent, 'id'>): GameEvent {
  const id = store.nextId++;
  const full: GameEvent = { ...ev, id };
  if (store.session) {
    store.session.events.push(full);
  } else {
    store.campaign.push(full);
  }
  return full;
}

export function startSession(store: EventStore, missionId: string): void {
  if (store.session) {
    throw new Error(`startSession: session already open for ${store.session.missionId}`);
  }
  store.session = { missionId, events: [] };
}

export function commitSession(store: EventStore): { missionId: string; events: GameEvent[] } {
  if (!store.session) throw new Error('commitSession: no session open');
  const { missionId, events } = store.session;
  store.campaign.push(...events);
  store.session = undefined;
  return { missionId, events };
}

export function discardSession(store: EventStore): void {
  store.session = undefined;
}

/** Pure: replay events through a reducer to derive state. */
export function replay<S>(
  events: ReadonlyArray<GameEvent>,
  reducer: (state: S, ev: GameEvent) => S,
  initial: S,
): S {
  let s = initial;
  for (const ev of events) s = reducer(s, ev);
  return s;
}

/** Profile is included in the save envelope but is *also* a derived view
 * (the canonical source is `events`); when we replay the campaign we re-derive
 * the wallet etc. */
export function deriveProfile(events: ReadonlyArray<GameEvent>, initial: Profile): Profile {
  return replay(events, profileReducer, initial);
}

export function profileReducer(state: Profile, ev: GameEvent): Profile {
  switch (ev.type) {
    case 'earn':
      return { ...state, wallet: state.wallet + (ev.payload['amount'] as number) };
    case 'purchase':
      return { ...state, wallet: state.wallet - (ev.payload['cost'] as number) };
    case 'mission_complete':
      return {
        ...state,
        completedMissions: Array.from(
          new Set([...state.completedMissions, ev.payload['missionId'] as string]),
        ),
      };
    case 'field_verified':
      return {
        ...state,
        fieldVerified: Array.from(
          new Set([...state.fieldVerified, ev.payload['id'] as string]),
        ),
      };
    case 'tool_acquired':
      return {
        ...state,
        ownedTools: Array.from(
          new Set([...state.ownedTools, ev.payload['key'] as string]),
        ),
        purchasedTools: Array.from(
          new Set([...state.purchasedTools, ev.payload['key'] as string]),
        ),
      };
    case 'trust_delta':
      return { ...state, trust: clamp01(state.trust + (ev.payload['delta'] as number)) };
    case 'noise_delta':
      return { ...state, noise: Math.max(0, state.noise + (ev.payload['delta'] as number)) };
    case 'evidence_delta':
      return {
        ...state,
        evidenceIntegrity: clamp01(
          state.evidenceIntegrity + (ev.payload['delta'] as number),
        ),
      };
    default:
      return state;
  }
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}