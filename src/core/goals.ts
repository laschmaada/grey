/**
 * §4.4 — Goal engine.
 *
 * Pure predicate evaluator. Combinators: all, any, not. Atoms match §4.4 vocabulary.
 */

import type { EventStore } from './events.js';
import type { GoalAtom, GoalExpr, World } from './types.js';

export interface GoalContext {
  world: World;
  store: EventStore;
  /** knowledge layer (facts, intel, findings) for predicate-shaped predicates */
  knownFacts: Set<string>;
  intelClaims: Map<string, Array<{ sourceType: string; origin: string }>>;
  scopeStrikes: number;
  noise: number;
}

export function evaluate(expr: GoalExpr, ctx: GoalContext): boolean {
  if ('all' in expr) return expr.all.every((e) => evaluate(e, ctx));
  if ('any' in expr) return expr.any.some((e) => evaluate(e, ctx));
  if ('not' in expr) return !evaluate(expr.not, ctx);
  return evaluateAtom(expr, ctx);
}

export function evaluateAtom(atom: GoalAtom, ctx: GoalContext): boolean {
  switch (atom.kind) {
    case 'host_discovered': {
      const ev = ctx.store.campaign
        .concat(ctx.store.session?.events ?? [])
        .find(
          (e) =>
            e.type === 'command' &&
            (e.payload as Record<string, unknown>)['hostId'] === atom.hostId,
        );
      return ev !== undefined;
    }
    case 'service_identified':
      return (
        ctx.knownFacts.has(`service:${atom.hostId}:${atom.port}`) ||
        ctx.store.campaign
          .concat(ctx.store.session?.events ?? [])
          .some(
            (e) =>
              e.type === 'service_identified' &&
              (e.payload as Record<string, unknown>)['hostId'] === atom.hostId &&
              (e.payload as Record<string, unknown>)['port'] === atom.port,
          )
      );
    case 'fact_found':
      return ctx.knownFacts.has(atom.key);
    case 'scan_performed':
      return ctx.store.campaign
        .concat(ctx.store.session?.events ?? [])
        .some(
          (e) =>
            e.type === 'command' &&
            (e.payload as Record<string, unknown>)['scan'] === atom.scan,
        );
    case 'session_open': {
      const all = ctx.store.campaign.concat(ctx.store.session?.events ?? []);
      return all.some(
        (e) =>
          e.type === 'session_open' &&
          (e.payload as Record<string, unknown>)['hostId'] === atom.hostId &&
          (atom.type === undefined ||
            (e.payload as Record<string, unknown>)['type'] === atom.type),
      );
    }
    case 'credential_obtained':
      return ctx.knownFacts.has(`cred:${atom.user}@${atom.hostId}`);
    case 'file_retrieved':
      return ctx.knownFacts.has(`file:${atom.path}`);
    case 'evidence_preserved':
      return ctx.knownFacts.has(`evidence:${atom.hostId}`);
    case 'host_isolated':
      return ctx.knownFacts.has(`isolated:${atom.hostId}`);
    case 'rule_written':
      return ctx.knownFacts.has(`rule:${atom.id}`);
    case 'rule_blocks':
      return ctx.knownFacts.has(`rule-blocks:${atom.flowSet}`);
    case 'rule_fp_below':
      // Goal is met if a corresponding fact exists with a numeric fp rate below max.
      return ctx.knownFacts.has(`rule-fp-ok`);
    case 'alerts_triaged':
      return ctx.knownFacts.has(`triage:${atom.setId}`);
    case 'intel_verified': {
      const sources = ctx.intelClaims.get(atom.claim) ?? [];
      const distinctSources = new Set(sources.map((s) => s.sourceType));
      const distinctOrigins = new Set(sources.map((s) => s.origin));
      return distinctSources.size >= 3 && distinctOrigins.size >= 3;
    }
    case 'report_submitted':
      return ctx.knownFacts.has(`report:${atom.id}`);
    case 'noise_below':
      return ctx.noise < atom.n;
    case 'scope_strikes_below':
      return ctx.scopeStrikes < atom.n;
    case 'custom':
      // Reserved for missions that ship a custom predicate; default deny.
      return false;
    default: {
      const _exhaustive: never = atom as never;
      void _exhaustive;
      return false;
    }
  }
}

/** Convenience: walk an expression and collect every atomic predicate. */
export function atoms(expr: GoalExpr): GoalAtom[] {
  if ('all' in expr) return expr.all.flatMap(atoms);
  if ('any' in expr) return expr.any.flatMap(atoms);
  if ('not' in expr) return atoms(expr.not);
  return [expr];
}