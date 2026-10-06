/**
 * M7-T02 — Verification mechanic: intel list with states.
 *
 * Per §4.4:
 *   corroborated: ≥ 2 items for the same claim with different sourceType
 *                 AND different origin
 *   verified:     ≥ 3 such items
 *
 * This module is the canonical source for the intel list state machine.
 * The goal engine's `intel_verified` predicate reads from this.
 */

import type { IntelItem, IntelState, SourceType } from './types.js';

export interface IntelList {
  items: IntelItem[];
}

export function makeIntelList(items: IntelItem[] = []): IntelList {
  return { items };
}

export function addIntel(list: IntelList, item: IntelItem): IntelList {
  return { items: [...list.items, item] };
}

export function stateOf(list: IntelList, claim: string): IntelState {
  const matching = list.items.filter((i) => i.claim === claim);
  if (matching.length === 0) return 'unverified';
  const distinctSources = new Set(matching.map((i) => i.sourceType));
  const distinctOrigins = new Set(matching.map((i) => i.origin));
  if (distinctSources.size >= 3 && distinctOrigins.size >= 3) return 'verified';
  if (distinctSources.size >= 2 && distinctOrigins.size >= 2) return 'corroborated';
  return 'unverified';
}

/** Returns true iff claim is *truly* verified (≥ 3 independent sources). */
export function isVerified(list: IntelList, claim: string): boolean {
  return stateOf(list, claim) === 'verified';
}

/**
 * Detect a "Veyra-language" false-flag.
 *
 * Per §7.2, K5 is a honeytoken planted to point at Veyra-looking
 * infrastructure. If an intel item mentions "veyra" and the claim
 * originates from a single source, return true. Mission a4-attribution
 * uses this to reject the false flag.
 */
export function isVeyraFalseFlag(item: IntelItem): boolean {
  if (!item.claim.toLowerCase().includes('veyra')) return false;
  // Single-source + Veyra keywords => suspect.
  // (We don't have direct access to the list here; call isVeyraSuspect from the
  // mission runtime with the full list.)
  return true;
}

export function isVeyraSuspect(list: IntelList, claim: string): boolean {
  const matching = list.items.filter((i) => i.claim === claim);
  if (matching.length === 0) return false;
  if (matching.length > 1) return false; // multi-source = corroborated
  const lower = claim.toLowerCase();
  if (!lower.includes('veyra')) return false;
  // Veyra-named claim from a single source is suspect.
  return true;
}

export function allVerifiedClaims(list: IntelList): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const i of list.items) {
    if (seen.has(i.claim)) continue;
    seen.add(i.claim);
    if (stateOf(list, i.claim) === 'verified') out.push(i.claim);
  }
  return out;
}

export function claimsBySourceType(
  list: IntelList,
  sourceType: SourceType,
): string[] {
  return list.items.filter((i) => i.sourceType === sourceType).map((i) => i.claim);
}