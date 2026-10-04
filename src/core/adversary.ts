/**
 * Adversary model — M8-T03. Stub for now.
 *
 * `AdversaryModel.fromEvents` takes the campaign stream and produces a model the
 * Act 4 missions read from. The "Act 4 flip" — same content, different campaign
 * history, different adversary — is asserted by tests in M8.
 */

import type { GameEvent } from './types.js';

export interface AdversaryStep {
  technique: string;
  atTime: number;
  evidence: string[];
}

export interface AdversaryModel {
  steps: AdversaryStep[];
  predictedNext?: AdversaryStep;
  confidence: number;
}

export const AdversaryModel = {
  fromEvents(events: ReadonlyArray<GameEvent>): AdversaryModel {
    // M8-T03 implementation. v0.1: trivially derive from player events.
    const steps: AdversaryStep[] = events
      .filter((e) => e.type === 'command' || e.type === 'session_open')
      .map((e) => ({
        technique: String(e.payload['technique'] ?? e.type),
        atTime: e.t,
        evidence: [],
      }));
    return { steps, confidence: 0.5 };
  },
};