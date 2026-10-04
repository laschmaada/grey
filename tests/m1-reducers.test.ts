import { describe, it, expect } from 'vitest';
import {
  intelState,
  knowledgeReducer,
  noiseReducer,
  payout,
  qualityMultiplier,
  scopeReducer,
  walletReducer,
} from '../src/core/reducers.js';
import type { GameEvent, ScopeCard } from '../src/core/types.js';

describe('M1-T04/T05/T06: reducers + quality + intel rules', () => {
  it('wallet earn/purchase is straightforward', () => {
    const s = { wallet: 100, advance: 0 };
    const after = walletReducer(s, { id: 1, t: 0, actor: 'system', type: 'earn', payload: { amount: 50 } });
    expect(after.wallet).toBe(150);
  });

  it('purchase fronts shortfall via Ledger advance', () => {
    const s = { wallet: 100, advance: 0 };
    const after = walletReducer(s, { id: 1, t: 0, actor: 'player', type: 'purchase', payload: { cost: 200 } });
    expect(after.wallet).toBe(0);
    expect(after.advance).toBe(100);
  });

  it('advance_repay pays back from payout', () => {
    const s = { wallet: 100, advance: 50 };
    const after = walletReducer(s, {
      id: 1,
      t: 0,
      actor: 'system',
      type: 'advance_repay',
      payload: { amount: 80 },
    });
    expect(after.wallet).toBe(180 - 50);
    expect(after.advance).toBe(0);
  });

  it('noise reduces on noise_tick and clamps at 0', () => {
    const s = { noise: 5 };
    const a = noiseReducer(s, { id: 1, t: 0, actor: 'system', type: 'noise_delta', payload: { delta: -10 } });
    expect(a.noise).toBe(0);
  });

  it('scope strike increments on out-of-scope host', () => {
    const card: ScopeCard = {
      inScope: ['grid-gw'],
      outOfScope: ['canary'],
      permitted: ['nmap', 'dig'],
      forbidden: ['exploit-rce'],
      dataRule: 'no exfil',
    };
    const s = { strikes: 0, log: [] as Array<{ at: number; reason: string }> };
    const after = scopeReducer(
      s,
      { id: 1, t: 0, actor: 'player', type: 'command', payload: { hostId: 'canary' } },
      card,
    );
    expect(after.strikes).toBe(1);
  });

  it('forbidden method is a strike', () => {
    const card: ScopeCard = {
      inScope: ['grid-gw'],
      outOfScope: [],
      permitted: [],
      forbidden: ['exploit-rce'],
      dataRule: '',
    };
    const s = { strikes: 0, log: [] as Array<{ at: number; reason: string }> };
    const after = scopeReducer(
      s,
      {
        id: 1,
        t: 0,
        actor: 'player',
        type: 'command',
        payload: { hostId: 'grid-gw', method: 'exploit-rce' },
      },
      card,
    );
    expect(after.strikes).toBe(1);
  });

  it('quality multiplier is clamped to [0.85, 1.15]', () => {
    expect(qualityMultiplier({ outcome: 'success', trackMetric: 1, reportCompleteness: 1 })).toBeLessThanOrEqual(1.15);
    expect(qualityMultiplier({ outcome: 'success', trackMetric: 0, reportCompleteness: 0 })).toBeGreaterThanOrEqual(0.85);
    expect(qualityMultiplier({ outcome: 'fail', trackMetric: 1, reportCompleteness: 1 })).toBe(0.85);
  });

  it('payout = base × quality (× fieldBonus 1 + b)', () => {
    expect(payout(100, 1.0)).toBe(100);
    expect(payout(100, 1.15)).toBe(115);
    expect(payout(100, 1.0, 0.25)).toBe(125);
  });

  it('intelState requires independent sources and origins (§4.4)', () => {
    expect(intelState([], 'c')).toBe('unverified');
    expect(
      intelState(
        [
          {
            id: '1',
            claim: 'c',
            sourceType: 'ais',
            origin: 'mmsi-123',
            discoveredAt: 0,
          },
        ],
        'c',
      ),
    ).toBe('unverified');
    expect(
      intelState(
        [
          {
            id: '1',
            claim: 'c',
            sourceType: 'ais',
            origin: 'mmsi-123',
            discoveredAt: 0,
          },
          {
            id: '2',
            claim: 'c',
            sourceType: 'certlog',
            origin: 'sub.example',
            discoveredAt: 1,
          },
        ],
        'c',
      ),
    ).toBe('corroborated');
    expect(
      intelState(
        [
          {
            id: '1',
            claim: 'c',
            sourceType: 'ais',
            origin: 'mmsi-123',
            discoveredAt: 0,
          },
          {
            id: '2',
            claim: 'c',
            sourceType: 'certlog',
            origin: 'sub.example',
            discoveredAt: 1,
          },
          {
            id: '3',
            claim: 'c',
            sourceType: 'artifact',
            origin: 'usb-1',
            discoveredAt: 2,
          },
        ],
        'c',
      ),
    ).toBe('verified');
  });

  it('knowledge reducer adds facts and intel', () => {
    const s = { facts: [], intel: [] };
    const after = knowledgeReducer(s, {
      id: 1,
      t: 0,
      actor: 'player',
      type: 'fact_found',
      payload: { key: 'srv.ssh', value: 'openssh 7.4' },
    });
    expect(after.facts).toHaveLength(1);
    const after2 = knowledgeReducer(after, {
      id: 2,
      t: 1,
      actor: 'player',
      type: 'intel_found',
      payload: { claim: 'ais_gap', sourceType: 'ais', origin: 'mmsi-123' },
    });
    expect(after2.intel).toHaveLength(1);
  });

  // unused vars suppression
  it('handle a generic event with default branch', () => {
    const ev: GameEvent = { id: 1, t: 0, actor: 'system', type: 'noop', payload: {} };
    expect(walletReducer({ wallet: 0, advance: 0 }, ev).wallet).toBe(0);
  });
});