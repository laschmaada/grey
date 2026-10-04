/**
 * §4.3 — Reducers.
 *
 * Pure functions. Each takes a state slice + event payload and returns a new slice.
 * The wallet reducer enforces "no stacking" and a no-interest Ledger advance (fronted
 * shortfall is repaid from the next payout).
 */

import type { Fact, GameEvent, IntelItem, IntelState, Profile, ScopeCard } from './types.js';

/** Wallet: earn / purchase / advance (front) / repay. */
export function walletReducer(
  state: { wallet: number; advance: number },
  ev: GameEvent,
): { wallet: number; advance: number } {
  switch (ev.type) {
    case 'earn':
      return {
        wallet: state.wallet + (ev.payload['amount'] as number),
        advance: state.advance,
      };
    case 'purchase': {
      const cost = ev.payload['cost'] as number;
      if (state.wallet >= cost) {
        return { wallet: state.wallet - cost, advance: state.advance };
      }
      // Front shortfall via Ledger advance.
      const shortfall = cost - state.wallet;
      return { wallet: 0, advance: state.advance + shortfall };
    }
    case 'advance_repay': {
      // Pays back from the most recent payout.
      const amt = ev.payload['amount'] as number;
      const pay = Math.min(amt, state.advance);
      return { wallet: state.wallet + (amt - pay), advance: state.advance - pay };
    }
    default:
      return state;
  }
}

/** Noise with decay. Each `noise_delta` of +N bumps noise; `noise_tick` decays. */
export function noiseReducer(
  state: { noise: number },
  ev: GameEvent,
  decayPerTick = 0.5,
): { noise: number } {
  switch (ev.type) {
    case 'noise_delta':
      return { noise: Math.max(0, state.noise + (ev.payload['delta'] as number)) };
    case 'noise_tick':
      return { noise: Math.max(0, state.noise - decayPerTick) };
    default:
      return state;
  }
}

/** Scope strikes — evaluated against a Scope Card. */
export function scopeReducer(
  state: { strikes: number; log: Array<{ at: number; reason: string }> },
  ev: GameEvent,
  card: ScopeCard,
): { strikes: number; log: Array<{ at: number; reason: string }> } {
  if (ev.type !== 'command') return state;
  const payload = ev.payload as {
    hostId?: string;
    target?: string;
    method?: string;
  };
  const hostId = payload.hostId;
  if (hostId && card.outOfScope.includes(hostId)) {
    const reason = `out-of-scope touch: ${hostId}`;
    return {
      strikes: state.strikes + 1,
      log: [...state.log, { at: ev.t, reason }],
    };
  }
  if (payload.method && card.forbidden.includes(payload.method)) {
    const reason = `forbidden method: ${payload.method}`;
    return {
      strikes: state.strikes + 1,
      log: [...state.log, { at: ev.t, reason }],
    };
  }
  return state;
}

/** Quality composer (§4.3): multiplier clamped to [0.85, 1.15]. */
export interface QualityInputs {
  outcome: 'success' | 'partial' | 'fail';
  trackMetric: number; // 0..1
  reportCompleteness: number; // 0..1
}
export function qualityMultiplier(i: QualityInputs): number {
  if (i.outcome === 'fail') return 0.85;
  const base =
    i.outcome === 'success'
      ? 0.9 + 0.1 * i.trackMetric + 0.1 * i.reportCompleteness
      : 0.85 + 0.05 * i.trackMetric + 0.05 * i.reportCompleteness;
  return Math.max(0.85, Math.min(1.15, base));
}

export function payout(payoutBase: number, quality: number, fieldBonus = 0): number {
  return Math.round(payoutBase * quality * (1 + fieldBonus));
}

/** Knowledge layer (§4.4): corroborated and verified require independent sources. */
export function intelState(items: ReadonlyArray<IntelItem>, claim: string): IntelState {
  const matching = items.filter((i) => i.claim === claim);
  if (matching.length === 0) return 'unverified';
  const distinctSources = new Set(matching.map((i) => i.sourceType));
  const distinctOrigins = new Set(matching.map((i) => i.origin));
  if (distinctSources.size >= 3 && distinctOrigins.size >= 3) return 'verified';
  if (distinctSources.size >= 2 && distinctOrigins.size >= 2) return 'corroborated';
  return 'unverified';
}

export function knowledgeReducer(
  state: { facts: Fact[]; intel: IntelItem[] },
  ev: GameEvent,
): { facts: Fact[]; intel: IntelItem[] } {
  switch (ev.type) {
    case 'fact_found':
      return {
        facts: [
          ...state.facts,
          {
            key: ev.payload['key'] as string,
            value: ev.payload['value'],
            discoveredAt: ev.t,
            via: ev.id,
          },
        ],
        intel: state.intel,
      };
    case 'intel_found':
      return {
        facts: state.facts,
        intel: [
          ...state.intel,
          {
            id: (ev.payload['id'] as string) ?? `intel-${ev.id}`,
            claim: ev.payload['claim'] as string,
            sourceType: ev.payload['sourceType'] as IntelItem['sourceType'],
            origin: ev.payload['origin'] as string,
            discoveredAt: ev.t,
          },
        ],
      };
    default:
      return state;
  }
}

/** Public helper: derive profile from a stream of events. */
export function deriveProfilePure(_events: ReadonlyArray<GameEvent>, p: Profile): Profile {
  // trivial implementation; full reducer is in events.ts. Kept here so consumers can
  // import from one place.
  return p;
}