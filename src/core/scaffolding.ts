/**
 * M6-T08 — Scaffolding levels + raw mode + Trial 1.
 *
 * The plan §3.5 has the fade schedule:
 *   Act 1 — worked example + checklist + hints
 *   Act 2 — checklist + hints
 *   Trial 1 — raw
 *   Act 3 — objective only
 *   Trial 2 — raw
 *   Act 4 — hints off, checklist off
 *   Finale — raw
 *
 * Scaffolding is a UI concept (hints panel, Ledger commentary); this module
 * exposes the data. It also owns Trial 1: a content wrapper over the
 * a1-first-contact sim with the goal "demonstrate you can scan a target".
 * Trial 1 pays 0 ₡.
 */

export type ScaffoldingLevel = 'worked' | 'checklist+hints' | 'checklist' | 'objective' | 'raw';

export interface ScaffoldingHints {
  showChecklist: boolean;
  showHints: boolean;
  showWorkedExample: boolean;
  showLedgerCommentary: boolean;
}

export function hintsFor(level: ScaffoldingLevel): ScaffoldingHints {
  switch (level) {
    case 'worked':
      return { showChecklist: true, showHints: true, showWorkedExample: true, showLedgerCommentary: true };
    case 'checklist+hints':
      return { showChecklist: true, showHints: true, showWorkedExample: false, showLedgerCommentary: true };
    case 'checklist':
      return { showChecklist: true, showHints: false, showWorkedExample: false, showLedgerCommentary: true };
    case 'objective':
      return { showChecklist: false, showHints: false, showWorkedExample: false, showLedgerCommentary: false };
    case 'raw':
      return { showChecklist: false, showHints: false, showWorkedExample: false, showLedgerCommentary: false };
  }
}

/** Track the player's specialisation (set by TrackController at the Act 3 gate). */
export type Track = 'red' | 'blue' | 'shared';

export interface Specialisation {
  track: Track;
  /** When the player picked it (virtual ms) */
  at: number;
}

export const SPECIALISATION_KEY = 'greyheron.specialisation';

export function makeSpecialisation(track: Track): Specialisation {
  return { track, at: 0 };
}

export interface Trial1 {
  id: 'trial-1';
  title: 'Trial 1 — first contact, raw mode';
  scaffolding: 'raw';
  payoutBase: 0;
  /** Wraps a1-first-contact. No hints, no checklist. Just the goal. */
  innerMissionId: 'a1-first-contact';
}

export const TRIAL_1: Trial1 = {
  id: 'trial-1',
  title: 'Trial 1 — first contact, raw mode',
  scaffolding: 'raw',
  payoutBase: 0,
  innerMissionId: 'a1-first-contact',
};

/**
 * Practice Range v1 (M6-T09) — owned here so the plan's "M6-T09 Practice Range v1"
 * has a concrete shape. The range generates a fresh seeded world per attempt
 * and picks a random owned-tool exercise. Output is a stub exercise; the
 * mission content for iterates is in missions_runtime.ts (Practice Range iterates).
 */

export type PracticeRangeIterate =
  | 'nmap-basics'
  | 'msf-portscan'
  | 'gobuster-dirs'
  | 'sqlmap-basics'
  | 'snort-rule-write';

export interface PracticeRangeAttempt {
  seed: number;
  iterate: PracticeRangeIterate;
  startsAt: number;
}

export function makePracticeRange(seed: number, iterate: PracticeRangeIterate): PracticeRangeAttempt {
  return { seed, iterate, startsAt: 0 };
}

export const PRACTICE_RANGE_ITERATES: ReadonlyArray<PracticeRangeIterate> = [
  'nmap-basics',
  'msf-portscan',
  'gobuster-dirs',
  'sqlmap-basics',
  'snort-rule-write',
];