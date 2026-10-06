/**
 * M7-T07 — Rook replay.
 *
 * The plan §3 + §7.2: Blue players hunt a scripted operation by Rook. The
 * Rook is sloppy — credentials appear in GREY HERON infrastructure in Act 4.
 * Truth: compromised (phished), not willing.
 *
 * This module schedules Rook's actions into a campaign timeline. The Blue
 * player's job is to find Rook's persistence by querying the FIM + VQL + log
 * stack. A successful detection produces a fact for the goal engine.
 */

export interface RookAction {
  /** when (virtual ms) */
  ts: number;
  hostId: string;
  kind: 'creds-leak' | 'persistence-schtask' | 'c2-checkin' | 'lateral-smb';
  /** optional artefact, e.g. a leaked credential, a scheduled task name */
  payload?: string;
}

const ACTIONS: RookAction[] = [];

export function recordRookAction(a: RookAction): void {
  ACTIONS.push(a);
}

export function listRookActions(): ReadonlyArray<RookAction> {
  return [...ACTIONS];
}

export function resetRook(): void {
  ACTIONS.length = 0;
}

/** Pre-built Rook plan used in Act 4 attribution. */
export function seedRookPlan(): void {
  if (ACTIONS.length > 0) return;
  ACTIONS.push(
    { ts: 100, hostId: 'patient', kind: 'creds-leak', payload: 'rook:test_pwd' },
    { ts: 200, hostId: 'patient', kind: 'persistence-schtask', payload: 'UpdaterSvc' },
    { ts: 300, hostId: 'patient', kind: 'c2-checkin' },
    { ts: 400, hostId: 'lateral', kind: 'lateral-smb' },
  );
}