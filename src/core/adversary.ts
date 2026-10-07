/**
 * M8-T03 — Adversary model.
 *
 * `AdversaryModel.fromEvents(campaignStream)` reads the player's committed
 * campaign events and produces a list of adversary steps + a predicted next
 * step.
 *
 * Per the plan §8 (Act 4 flip test):
 *   - Red players see an adversary model built from their own campaign.
 *   - Blue players see an adversary model built from their Act 1–2 offensive
 *     events + the Rook replay timeline.
 *   - Same world + same campaign → same adversary (deterministic).
 *   - Different campaign history → different adversary (the flip).
 *
 * The Act 4 missions (a4-incoming, a4-packet-storm) read the predicted step
 * and adapt content accordingly.
 */

import { makeRng } from './rng.js';
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
  /** the seed used to derive the model — same seed → same predictedNext */
  seed: number;
  /** the campaign history that fed the model */
  campaign: ReadonlyArray<GameEvent>;
}

const TECHNIQUE_BY_TYPE: Record<string, string> = {
  portscan: 'T1046 Network Service Discovery',
  command: 'T1059 Command and Scripting Interpreter',
  session_open: 'T1078 Valid Accounts',
  service_identified: 'T1595 Active Scanning',
  ransom_payment: 'T1486 Data Encrypted for Impact',
  c2_checkin: 'T1071 Application Layer Protocol',
  lateral: 'T1021 Remote Services',
  persistence_schtask: 'T1053 Scheduled Task',
  creds_leak: 'T1552 Unsecured Credentials',
  block_traffic: 'T1562 Impair Defenses',
  ir_memory_captured: 'T1005 Data from Local System',
  ir_power_off: 'T1529 System Shutdown/Reboot',
  msf_run: 'T1190 Exploit Public-Facing Application',
};

function techFor(type: string): string {
  return TECHNIQUE_BY_TYPE[type] ?? `T??? ${type}`;
}

export const AdversaryModel = {
  fromEvents(events: ReadonlyArray<GameEvent>): AdversaryModel {
    const steps: AdversaryStep[] = [];
    for (const e of events) {
      if (!TECHNIQUE_BY_TYPE[e.type]) continue;
      steps.push({
        technique: techFor(e.type),
        atTime: e.t,
        evidence: [`event:${e.id}`, `payload:${JSON.stringify(e.payload).slice(0, 80)}`],
      });
    }
    // Predict the next step. The "Act 4 flip" hinges on this prediction
    // changing when the campaign history changes.
    const seed = steps.length > 0 ? steps.length * 7919 : 0xaceb00ba;
    const rng = makeRng(seed);
    const candidates = [
      'T1486 Data Encrypted for Impact',
      'T1053 Scheduled Task',
      'T1021 Remote Services',
      'T1071 Application Layer Protocol',
    ];
    const predictedNext: AdversaryStep = {
      technique: candidates[Math.floor(rng.next() * candidates.length)]!,
      atTime: (steps[steps.length - 1]?.atTime ?? 0) + 60_000,
      evidence: ['predicted-from-campaign-shape'],
    };
    const confidence = Math.min(0.95, 0.4 + steps.length * 0.05);
    return { steps, predictedNext, confidence, seed, campaign: events };
  },
};