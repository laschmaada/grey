/**
 * M8-T07 — Cross-training contract.
 *
 * After the Act 3 gate (Trial 1 at the end of Act 2, Trial 2 at the end of
 * Act 3), the player picks a track. This module records the contract and
 * gates Act 4 content accordingly. Blue-track players are not allowed into
 * Red-only missions; Red-track players are not allowed into Blue-only
 * missions. Shared missions are open to both.
 */

import { register } from '../engine/registry.js';

export type CrossTrainingTrack = 'red' | 'blue' | 'shared';

export interface CrossTrainingContract {
  track: CrossTrainingTrack;
  /** when (virtual ms) the player picked */
  at: number;
  /** the trial that gated the choice (e.g. trial-1, trial-2) */
  trialId: string;
  /** unlocks data structure: which track-exclusive content is now available */
  unlocks: string[];
}

const CONTRACTS: CrossTrainingContract[] = [];

export function pickTrack(track: CrossTrainingTrack, trialId: string): CrossTrainingContract {
  const contract: CrossTrainingContract = {
    track,
    at: 0,
    trialId,
    unlocks: track === 'red' ? ['red-tier-3', 'red-finale'] : track === 'blue' ? ['blue-tier-3', 'blue-finale'] : [],
  };
  CONTRACTS.push(contract);
  return contract;
}

export function listContracts(): ReadonlyArray<CrossTrainingContract> {
  return [...CONTRACTS];
}

export function currentContract(): CrossTrainingContract | null {
  return CONTRACTS[CONTRACTS.length - 1] ?? null;
}

export function resetContracts(): void {
  CONTRACTS.length = 0;
}

register({
  name: 'cross-training',
  flags: { '-h': 'emulated' },
  handle() {
    return [
      [
        {
          kind: 'text',
          text:
            'cross-training — pick a track at the end of Trial 2. Track-exclusive content unlocks accordingly. ' +
            'Use pickTrack(track, trialId) from the UI.\n',
        },
      ],
    ];
  },
});