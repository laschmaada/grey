/**
 * M8 — Act 4 + Finale + Mosaic mission data.
 *
 * 5 Act 4 missions (a4-incoming, a4-packet-storm, a4-cold-memory,
 * a4-hold-the-line, a4-attribution), 2 finales (Red Zero Day, Blue Zero
 * Day), 1 shared finale (The Mosaic). The Mosaic finale ties the story:
 * the player assembles a conclusion from evidence cards and the board
 * yields one of three endings per `src/core/mosaic.ts`.
 */

import type { GoalExpr, ScopeCard, World } from '../core/types.js';
import { registerMission } from './missions_runtime.js';

const sharedScope = (inScope: string[], dataRule = 'no exfiltration'): ScopeCard => ({
  inScope,
  outOfScope: [],
  permitted: ['nmap', 'tshark', 'meridian', 'snort', 'volatility', 'maltego', 'mosaic'],
  forbidden: [],
  dataRule,
});

function a4HostWorld(hosts: Array<{ id: string; ip: string; os?: string; services?: Array<{ port: number; proto: 'tcp' | 'udp'; name: string; state: 'open' | 'closed' | 'filtered' }>; }>): World {
  return {
    seed: 0xc04a,
    hosts: hosts.map((h) => ({ id: h.id, ip: h.ip, os: h.os ?? 'Linux', inScope: true, services: h.services ?? [] })),
    vulns: [],
    creds: [],
    edges: [],
    dns: [],
    web: { rootUrl: 'http://grid.test/', nodes: [], links: [], index: new Map() },
    docs: [],
    defenses: { hostIds: [] },
    pinned: [],
  };
}

// ─── a4-incoming ──────────────────────────────────────────────────────────
// Predict the next strike from the adversary model.
const a4IncomingGoals: GoalExpr = { kind: 'fact_found', key: 'adversary:predicted' };
registerMission({
  id: 'a4-incoming',
  title: 'Incoming',
  brief: 'Predict the adversary\'s next strike from the campaign history.',
  primer:
    'Use the AdversaryModel.fromEvents(campaign) API. The predicted next technique comes from the shape of the player\'s history.',
  report: '## Incoming\n- predicted technique\n- confidence\n- counter-actions',
  lab: 'Use Atomic Red Team to validate the predicted TTP against your SIEM rules.',
  world: () => a4HostWorld([{ id: 'grid', ip: '192.0.2.10' }]),
  goals: a4IncomingGoals,
  scope: sharedScope(['grid']),
  transcripts: [
    {
      name: 'route-a',
      seed: 7,
      steps: [
        {
          command: 'adversary predict',
          afterMs: 500,
          expectFacts: ['adversary:predicted'],
        },
      ],
      expectedGoalsSatisfied: true,
    },
  ],
});

// ─── a4-packet-storm ──────────────────────────────────────────────────────
// Virtual-time budget: 60 minutes of traffic, no real-time reflex.
const a4PacketStormGoals: GoalExpr = {
  all: [
    { kind: 'fact_found', key: 'beacon:detected' },
    { kind: 'rule_written', id: 'beacon-blocker' },
  ],
};
registerMission({
  id: 'a4-packet-storm',
  title: 'Packet Storm',
  brief: 'Find the beacon and write a Snort rule. You have 60 minutes of virtual time. Real time is irrelevant.',
  primer: 'Use tshark -q -z conv,tcp to find the long-running conversation, then write a Snort rule.',
  report: '## Packet Storm\n- conversation endpoints\n- Snort rule\n- FP score',
  lab: 'In your lab, use tshark against a known beacon pcap.',
  world: () => a4HostWorld([{ id: 'gw', ip: '192.0.2.10', services: [{ port: 80, proto: 'tcp', name: 'http', state: 'open' }] }]),
  goals: a4PacketStormGoals,
  scope: sharedScope(['gw']),
  transcripts: [
    {
      name: 'route-a',
      seed: 8,
      steps: [
        { command: 'tshark -q -z conv,tcp', afterMs: 1000, expectFacts: ['beacon:detected'] },
        { command: 'snort -T -c beacon.rules', afterMs: 1500, expectFacts: ['rule:beacon-blocker', 'rule-fp-ok'] },
      ],
      expectedGoalsSatisfied: true,
    },
  ],
});

// ─── a4-cold-memory ───────────────────────────────────────────────────────
const a4ColdMemoryGoals: GoalExpr = { kind: 'fact_found', key: 'volatility:malware-found' };
registerMission({
  id: 'a4-cold-memory',
  title: 'Cold Memory',
  brief: 'Find the malware process in a memory image using Volatility.',
  primer: 'Run volatility.psList, run windows.malfind, identify the suspicious process and its C2 connection.',
  report: '## Cold Memory\n- suspicious process\n- C2 endpoint\n- TTPs',
  lab: 'Use Volatility against a memory image from your lab.',
  world: () => a4HostWorld([{ id: 'patient', ip: '192.0.2.11' }]),
  goals: a4ColdMemoryGoals,
  scope: sharedScope(['patient']),
  transcripts: [
    {
      name: 'route-a',
      seed: 9,
      steps: [{ command: 'volatility malfind', afterMs: 800, expectFacts: ['volatility:malware-found'] }],
      expectedGoalsSatisfied: true,
    },
  ],
});

// ─── a4-hold-the-line ─────────────────────────────────────────────────────
const a4HoldTheLineGoals: GoalExpr = { kind: 'rule_written', id: 'hold-line' };
registerMission({
  id: 'a4-hold-the-line',
  title: 'Hold the Line',
  brief: 'Write a Snort rule with low false-positive rate against the benign corpus.',
  primer: 'A stricter version of a2-block-it. The benign corpus is larger.',
  report: '## Hold the Line\n- rule text\n- FP rate',
  lab: 'Validate against your lab\'s pcap.',
  world: () => a4HostWorld([{ id: 'gw', ip: '192.0.2.10' }]),
  goals: a4HoldTheLineGoals,
  scope: sharedScope(['gw']),
  transcripts: [
    {
      name: 'route-a',
      seed: 10,
      steps: [{ command: 'snort -T -c strict.rules', afterMs: 1500, expectFacts: ['rule:hold-line', 'rule-fp-ok'] }],
      expectedGoalsSatisfied: true,
    },
  ],
});

// ─── a4-attribution ───────────────────────────────────────────────────────
// Graph + intel verification; Rook's credentials appear.
const a4AttributionGoals: GoalExpr = { kind: 'intel_verified', claim: 'cert_overlap:registrar:shared' };
registerMission({
  id: 'a4-attribution',
  title: 'The Attribution',
  brief: 'Build the link graph and verify the K2 (cert overlap) claim.',
  primer: 'Use the maltego graph builder + the intel verification API.',
  report: '## Attribution\n- K2 evidence chain\n- source diversity',
  lab: 'Validate cert claims against crt.sh.',
  world: () => a4HostWorld([{ id: 'grid', ip: '192.0.2.10' }]),
  goals: a4AttributionGoals,
  scope: sharedScope(['grid']),
  transcripts: [
    {
      name: 'route-a',
      seed: 11,
      steps: [{ command: 'maltego graph build', afterMs: 1000, expectFacts: ['intel:verified:cert_overlap:registrar:shared'] }],
      expectedGoalsSatisfied: true,
    },
  ],
});

// ─── f-red-zero-day ───────────────────────────────────────────────────────
// Track-exclusive. Red players: full chain, raw mode, noise live.
const fRedZeroDayGoals: GoalExpr = {
  all: [
    { kind: 'fact_found', key: 'session:gw' },
    { kind: 'fact_found', key: 'ransom-deployed' },
  ],
};
registerMission({
  id: 'f-red-zero-day',
  title: 'Zero Day (Red)',
  brief: 'Run the full chain on the GW host. No scaffolding. Noise is live.',
  primer: 'msfconsole → vsftpd_234_backdoor → meterpreter → shell → ransom sim.',
  report: '## Zero Day (Red)\n- chain\n- dwell time\n- post-mortem',
  lab: 'Run the chain in your Metasploitable 2 lab.',
  world: () => a4HostWorld([
    {
      id: 'gw',
      ip: '192.0.2.10',
      services: [
        { port: 21, proto: 'tcp', name: 'ftp', state: 'open' },
        { port: 22, proto: 'tcp', name: 'ssh', state: 'open' },
      ],
    },
  ]),
  goals: fRedZeroDayGoals,
  scope: sharedScope(['gw']),
  transcripts: [
    {
      name: 'route-a',
      seed: 12,
      steps: [
        { command: 'msfconsole', afterMs: 600 },
        { command: 'use exploit/unix/ftp/vsftpd_234_backdoor', afterMs: 300 },
        { command: 'set RHOST 192.0.2.10', afterMs: 100 },
        { command: 'run', afterMs: 3000, expectFacts: ['session:gw'] },
        { command: 'ransom deploy', afterMs: 1000, expectFacts: ['ransom-deployed'] },
      ],
      expectedGoalsSatisfied: true,
    },
  ],
});

// ─── f-blue-zero-day ──────────────────────────────────────────────────────
// Track-exclusive. Blue: behavioural detection with a threshold rule.
const fBlueZeroDayGoals: GoalExpr = {
  all: [
    { kind: 'rule_written', id: 'behaviour-threshold' },
    { kind: 'fact_found', key: 'behaviour-detected' },
  ],
};
registerMission({
  id: 'f-blue-zero-day',
  title: 'Zero Day (Blue)',
  brief: 'Detect the attack behaviourally — no signatures, only threshold rules.',
  primer: 'Set a behavioural rule in the Meridian Console (e.g. connections per minute > N).',
  report: '## Zero Day (Blue)\n- rule\n- time-to-detect\n- false positives',
  lab: 'Validate against your lab.',
  world: () => a4HostWorld([{ id: 'gw', ip: '192.0.2.10' }]),
  goals: fBlueZeroDayGoals,
  scope: sharedScope(['gw']),
  transcripts: [
    {
      name: 'route-a',
      seed: 13,
      steps: [
        { command: 'meridian rule behaviour conn>100', afterMs: 800, expectFacts: ['rule:behaviour-threshold'] },
        { command: 'meridian observe', afterMs: 5000, expectFacts: ['behaviour-detected'] },
      ],
      expectedGoalsSatisfied: true,
    },
  ],
});

// ─── f-mosaic ─────────────────────────────────────────────────────────────
// Shared. The player assembles a conclusion from cards. The board yields an
// ending per `src/core/mosaic.ts`.
const fMosaicGoals: GoalExpr = {
  all: [
    { kind: 'fact_found', key: 'mosaic:k1' },
    { kind: 'fact_found', key: 'mosaic:k2' },
    { kind: 'fact_found', key: 'mosaic:k3' },
    { kind: 'fact_found', key: 'mosaic:k5-rejected' },
  ],
};
registerMission({
  id: 'f-mosaic',
  title: 'The Mosaic',
  brief: 'Select the right evidence. Reject the false flag. Reach the true ending.',
  primer: 'Use mosaic.selectCard / rejectCard / conclude.',
  report: '## The Mosaic\n- chosen evidence\n- rejected evidence\n- ending',
  lab: 'N/A — pure simulator.',
  world: () => a4HostWorld([{ id: 'analyst', ip: '192.0.2.1' }]),
  goals: fMosaicGoals,
  scope: sharedScope(['analyst']),
  transcripts: [
    {
      name: 'route-a-true',
      seed: 14,
      steps: [
        { command: 'mosaic add k1', afterMs: 200, expectFacts: ['mosaic:k1'] },
        { command: 'mosaic add k2', afterMs: 200, expectFacts: ['mosaic:k2'] },
        { command: 'mosaic add k3', afterMs: 200, expectFacts: ['mosaic:k3'] },
        { command: 'mosaic reject k5', afterMs: 200, expectFacts: ['mosaic:k5-rejected'] },
        { command: 'mosaic conclude', afterMs: 300 },
      ],
      expectedGoalsSatisfied: true,
    },
    {
      name: 'route-b-official',
      seed: 14,
      steps: [
        { command: 'mosaic add k1', afterMs: 200, expectFacts: ['mosaic:k1'] },
        { command: 'mosaic add k5', afterMs: 200 },
        { command: 'mosaic conclude', afterMs: 300 },
      ],
      expectedGoalsSatisfied: true,
    },
  ],
});

export {};