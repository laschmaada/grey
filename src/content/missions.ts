import type { ToolDef } from './tools.js';

/**
 * Mission stubs. Full content lands per mission across M2..M8.
 * Keys follow §7.1 exactly.
 */
export type Track = 'shared' | 'red' | 'blue';
export type MissionStatus = 'stub' | 'complete';
export type Act = 1 | 2 | 3 | 4 | 5;

export interface MissionStub {
  id: string;
  act: Act;
  track: Track;
  title: string;
  payoutBase: number;
  requiredTools: string[]; // tool keys (from TOOLS)
  status: MissionStatus;
  milestone: string;
}

export const MISSIONS: readonly MissionStub[] = [
  // Act 1
  { id: 'a1-first-contact', act: 1, track: 'shared', title: 'First Contact', payoutBase: 80, requiredTools: [], status: 'complete', milestone: 'M2' },
  { id: 'a1-paper-trail', act: 1, track: 'shared', title: 'Paper Trail', payoutBase: 100, requiredTools: [], status: 'complete', milestone: 'M4' },
  { id: 'a1-mail-server', act: 1, track: 'shared', title: 'The Mail Server', payoutBase: 110, requiredTools: [], status: 'complete', milestone: 'M5' },
  { id: 'a1-recon-console', act: 1, track: 'shared', title: 'Recon Console', payoutBase: 130, requiredTools: [], status: 'complete', milestone: 'M5' },
  { id: 'a1-twenty-alarms', act: 1, track: 'shared', title: 'Twenty Alarms', payoutBase: 140, requiredTools: ['wireshark'], status: 'complete', milestone: 'M5' },
  { id: 'a1-knock-knock', act: 1, track: 'shared', title: 'Knock Knock', payoutBase: 160, requiredTools: [], status: 'complete', milestone: 'M4' },
  // Act 2
  { id: 'a2-harvest', act: 2, track: 'shared', title: 'Harvest', payoutBase: 200, requiredTools: ['theharvester'], status: 'stub', milestone: 'M6' },
  { id: 'a2-first-blood', act: 2, track: 'shared', title: 'First Blood', payoutBase: 280, requiredTools: ['netcat'], status: 'stub', milestone: 'M6' },
  { id: 'a2-intercept', act: 2, track: 'shared', title: 'Intercept', payoutBase: 260, requiredTools: ['burp'], status: 'stub', milestone: 'M6' },
  { id: 'a2-dump', act: 2, track: 'shared', title: 'Dump', payoutBase: 240, requiredTools: ['gobuster', 'sqlmap'], status: 'stub', milestone: 'M6' },
  { id: 'a2-patient-zero', act: 2, track: 'shared', title: 'Patient Zero', payoutBase: 260, requiredTools: ['wireshark'], status: 'stub', milestone: 'M6' },
  { id: 'a2-block-it', act: 2, track: 'shared', title: 'Block It', payoutBase: 260, requiredTools: ['snort'], status: 'stub', milestone: 'M6' },
  // Act 3
  { id: 'a3-dark-ship', act: 3, track: 'shared', title: 'The Dark Ship', payoutBase: 400, requiredTools: ['sherlock'], status: 'stub', milestone: 'M7' },
  { id: 'a3-honeytoken', act: 3, track: 'shared', title: 'The Honeytoken', payoutBase: 400, requiredTools: [], status: 'stub', milestone: 'M7' },
  { id: 'a3r-migrate-dump', act: 3, track: 'red', title: 'Migrate & Dump', payoutBase: 420, requiredTools: [], status: 'stub', milestone: 'M7' },
  { id: 'a3r-pivot', act: 3, track: 'red', title: 'Pivot', payoutBase: 440, requiredTools: [], status: 'stub', milestone: 'M7' },
  { id: 'a3r-callback', act: 3, track: 'red', title: 'The Callback', payoutBase: 440, requiredTools: ['sliver'], status: 'stub', milestone: 'M7' },
  { id: 'a3r-cracked', act: 3, track: 'red', title: 'Cracked', payoutBase: 450, requiredTools: ['hydra', 'john'], status: 'stub', milestone: 'M7' },
  { id: 'a3b-persisted', act: 3, track: 'blue', title: 'Persisted', payoutBase: 420, requiredTools: ['wazuh'], status: 'stub', milestone: 'M7' },
  { id: 'a3b-fleet-sweep', act: 3, track: 'blue', title: 'Fleet Sweep', payoutBase: 440, requiredTools: ['velociraptor'], status: 'stub', milestone: 'M7' },
  { id: 'a3b-heartbeat', act: 3, track: 'blue', title: 'Heartbeat', payoutBase: 440, requiredTools: ['wireshark'], status: 'stub', milestone: 'M7' },
  { id: 'a3b-follow-money', act: 3, track: 'blue', title: 'Follow the Money', payoutBase: 450, requiredTools: [], status: 'stub', milestone: 'M7' },
  // Act 4
  { id: 'a4-incoming', act: 4, track: 'shared', title: 'Incoming', payoutBase: 550, requiredTools: [], status: 'stub', milestone: 'M8' },
  { id: 'a4-packet-storm', act: 4, track: 'shared', title: 'Packet Storm', payoutBase: 600, requiredTools: ['wireshark'], status: 'stub', milestone: 'M8' },
  { id: 'a4-cold-memory', act: 4, track: 'shared', title: 'Cold Memory', payoutBase: 650, requiredTools: ['volatility'], status: 'stub', milestone: 'M8' },
  { id: 'a4-hold-the-line', act: 4, track: 'shared', title: 'Hold the Line', payoutBase: 600, requiredTools: ['snort'], status: 'stub', milestone: 'M8' },
  { id: 'a4-attribution', act: 4, track: 'shared', title: 'The Attribution', payoutBase: 600, requiredTools: ['maltego'], status: 'stub', milestone: 'M8' },
  // Finale
  { id: 'f-red-zero-day', act: 5, track: 'red', title: 'Zero Day (Red)', payoutBase: 1200, requiredTools: [], status: 'stub', milestone: 'M8' },
  { id: 'f-blue-zero-day', act: 5, track: 'blue', title: 'Zero Day (Blue)', payoutBase: 1200, requiredTools: [], status: 'stub', milestone: 'M8' },
  { id: 'f-mosaic', act: 5, track: 'shared', title: 'The Mosaic', payoutBase: 300, requiredTools: [], status: 'stub', milestone: 'M8' },
];

export function findMission(id: string): MissionStub | undefined {
  return MISSIONS.find((m) => m.id === id);
}

export function totalPayoutByAct(act: 1 | 2 | 3 | 4 | 5, track?: Track): number {
  return MISSIONS.filter((m) => m.act === act && (!track || m.track === track || m.track === 'shared'))
    .reduce((sum, m) => sum + m.payoutBase, 0);
}

export function allToolRequirements(): string[] {
  return Array.from(new Set(MISSIONS.flatMap((m) => m.requiredTools)));
}

export function validateMissionDependencies(tools: readonly ToolDef[]): string[] {
  const errors: string[] = [];
  const toolKeys = new Set(tools.map((t) => t.key));
  for (const m of MISSIONS) {
    for (const req of m.requiredTools) {
      if (!toolKeys.has(req)) {
        errors.push(`mission ${m.id} requires unknown tool "${req}"`);
      }
    }
  }
  return errors;
}