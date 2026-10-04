import { describe, it, expect } from 'vitest';
import { evaluate, atoms, type GoalContext } from '../src/core/goals.js';
import { makeEventStore } from '../src/core/events.js';
import { emptyWorld } from '../src/core/world.js';
import type { GoalExpr } from '../src/core/types.js';

function emptyCtx(): GoalContext {
  return {
    world: emptyWorld(1),
    store: makeEventStore(),
    knownFacts: new Set<string>(),
    intelClaims: new Map<
      string,
      Array<{ sourceType: string; origin: string }>
    >(),
    scopeStrikes: 0,
    noise: 0,
  };
}

void emptyCtx;

describe('M1-T07: goal engine', () => {
  it('host_discovered satisfied by command event with hostId', () => {
    const ctx = emptyCtx();
    ctx.store.campaign.push({
      id: 1,
      t: 0,
      actor: 'player',
      type: 'command',
      payload: { hostId: 'grid-gw' },
    });
    const expr: GoalExpr = { kind: 'host_discovered', hostId: 'grid-gw' };
    expect(evaluate(expr, ctx)).toBe(true);
  });

  it('all combinator requires every child', () => {
    const ctx = emptyCtx();
    ctx.knownFacts.add('a');
    const expr: GoalExpr = {
      all: [{ kind: 'fact_found', key: 'a' }, { kind: 'fact_found', key: 'b' }],
    };
    expect(evaluate(expr, ctx)).toBe(false);
    ctx.knownFacts.add('b');
    expect(evaluate(expr, ctx)).toBe(true);
  });

  it('any combinator requires at least one child', () => {
    const ctx = emptyCtx();
    const expr: GoalExpr = {
      any: [{ kind: 'fact_found', key: 'a' }, { kind: 'fact_found', key: 'b' }],
    };
    expect(evaluate(expr, ctx)).toBe(false);
    ctx.knownFacts.add('b');
    expect(evaluate(expr, ctx)).toBe(true);
  });

  it('not combinator negates', () => {
    const ctx = emptyCtx();
    ctx.knownFacts.add('a');
    const expr: GoalExpr = { not: { kind: 'fact_found', key: 'a' } };
    expect(evaluate(expr, ctx)).toBe(false);
  });

  it('intel_verified needs 3+ different sourceType AND origin', () => {
    const ctx = emptyCtx();
    ctx.intelClaims.set('claim-x', [
      { sourceType: 'ais', origin: 'a' },
      { sourceType: 'certlog', origin: 'b' },
    ]);
    expect(evaluate({ kind: 'intel_verified', claim: 'claim-x' }, ctx)).toBe(false);
    ctx.intelClaims.set('claim-x', [
      { sourceType: 'ais', origin: 'a' },
      { sourceType: 'certlog', origin: 'b' },
      { sourceType: 'artifact', origin: 'c' },
    ]);
    expect(evaluate({ kind: 'intel_verified', claim: 'claim-x' }, ctx)).toBe(true);
  });

  it('noise_below and scope_strikes_below', () => {
    const ctx = emptyCtx();
    ctx.noise = 5;
    expect(evaluate({ kind: 'noise_below', n: 10 }, ctx)).toBe(true);
    expect(evaluate({ kind: 'noise_below', n: 3 }, ctx)).toBe(false);
    ctx.scopeStrikes = 0;
    expect(evaluate({ kind: 'scope_strikes_below', n: 1 }, ctx)).toBe(true);
  });

  it('atoms walks an expression and returns the leaf predicates', () => {
    const expr: GoalExpr = {
      all: [
        { kind: 'fact_found', key: 'a' },
        { any: [{ kind: 'fact_found', key: 'b' }, { kind: 'fact_found', key: 'c' }] },
      ],
    };
    const all = atoms(expr);
    expect(all).toHaveLength(3);
  });
});