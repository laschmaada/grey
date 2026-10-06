/**
 * M7-T01 — honeytoken trap logic.
 *
 * The plan §7.2 K5: "honeytoken false flag (planted key pointing at
 * Veyra-looking infrastructure)". The sim supports:
 *   - planting a honeytoken key into a fact set (`plantHoneytoken`).
 *   - checking for a hit when an alert arrives (`checkHoneytokenHit`).
 *
 * If a planted key shows up in a Meridian alert or a log event, the
 * verification mechanic in M7-T02 should treat it as a *honeytoken hit*,
 * not a real piece of evidence — and avoid the unverified-intel trap.
 */

export interface HoneytokenRecord {
  /** the planted fact key, e.g. "honeytoken:aws-access-key:ABCD..." */
  key: string;
  /** the value (e.g. the fake key itself) */
  value: string;
  /** which target it points at, e.g. "Veyra-looking infrastructure" */
  pointsAt: string;
  /** when (virtual ms) it was planted */
  plantedAt: number;
  /** which mission / scenario it's associated with */
  missionId: string;
}

const HONEYTOKENS: HoneytokenRecord[] = [];

export function plantHoneytoken(rec: Omit<HoneytokenRecord, 'plantedAt'> & { plantedAt?: number }): HoneytokenRecord {
  const r: HoneytokenRecord = { ...rec, plantedAt: rec.plantedAt ?? 0 };
  HONEYTOKENS.push(r);
  return r;
}

export function listHoneytokens(): ReadonlyArray<HoneytokenRecord> {
  return [...HONEYTOKENS];
}

export function resetHoneytokens(): void {
  HONEYTOKENS.length = 0;
}

/** Returns the matching honeytoken if `value` is one of the planted keys. */
export function checkHoneytokenHit(value: string): HoneytokenRecord | null {
  for (const h of HONEYTOKENS) {
    if (h.value === value || h.key === value) return h;
  }
  return null;
}