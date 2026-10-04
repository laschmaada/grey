#!/usr/bin/env tsx
/**
 * scripts/economy-check.ts
 *
 * Recomputes the §9 economy tables from `src/content/tools.ts` and `src/content/missions.ts`
 * and asserts the published numbers.
 */

import { TOOLS } from '../src/content/tools.js';
import { MISSIONS, type Track } from '../src/content/missions.js';

const TOOL_COST = new Map(TOOLS.map((t) => [t.key, t.cost]));

function costOf(keys: string[]): number {
  return keys.reduce((a, k) => a + (TOOL_COST.get(k) ?? 0), 0);
}

function earningsByAct(act: 1 | 2 | 3 | 4 | 5, track: Track | 'shared'): number {
  // Shared missions earn on every track; track-exclusive missions only earn on their track.
  return MISSIONS.filter(
    (m) =>
      m.act === act &&
      (track === 'shared'
        ? m.track === 'shared'
        : m.track === 'shared' || m.track === track),
  ).reduce((a, m) => a + m.payoutBase, 0);
}

function requiredByAct(act: 1 | 2 | 3 | 4, _track: 'red' | 'blue', owned: Set<string>): number {
  const sets: Record<number, string[]> = {
    1: ['wireshark', 'theharvester'],
    2: ['wireshark', 'netcat', 'theharvester', 'burp', 'gobuster', 'sqlmap', 'snort'],
    3: [],
    4: ['volatility', 'maltego'],
  };
  const all = sets[act] ?? [];
  let sum = 0;
  for (const k of all) {
    if (!owned.has(k)) sum += TOOL_COST.get(k) ?? 0;
  }
  return sum;
}

function compute(track: 'red' | 'blue'): {
  earnings: number[];
  required: number[];
  balance: number[];
} {
  const owned = new Set<string>(['nmap', 'metasploit', 'meridian-console', 'shell', 'decoder']);
  const earnings = [
    earningsByAct(1, 'shared'),
    earningsByAct(2, 'shared'),
    earningsByAct(3, track),
    earningsByAct(4, 'shared'),
    earningsByAct(5, track),
  ];
  const required = ([1, 2, 3, 4] as const).map((act) => requiredByAct(act, track, owned));
  const balance: number[] = [];
  let bal = 0;
  for (let i = 0; i < 5; i++) {
    bal += (earnings[i] ?? 0) - (required[i] ?? 0);
    balance.push(bal);
  }
  return { earnings, required, balance };
}

function assertEq(label: string, computed: number, expected: number, track: string): void {
  if (computed !== expected) {
    console.error(
      `economy-check FAIL [${track}]: ${label} = ${computed}, expected ${expected}`,
    );
    process.exitCode = 1;
  } else {
    console.log(`economy-check OK [${track}]: ${label} = ${computed}`);
  }
}

function main(): void {
  console.log('economy-check: recomputing §9 from content');
  console.log('tool catalog size:', TOOLS.length);
  console.log('mission catalog size:', MISSIONS.length);

  const red = compute('red');
  const blue = compute('blue');

  assertEq('Act 1 earnings', red.earnings[0]!, 720, 'shared');
  assertEq('Act 2 earnings', red.earnings[1]!, 1500, 'shared');
  assertEq('Act 3 earnings (red)', red.earnings[2]!, 2550, 'red');
  assertEq('Act 4 earnings', red.earnings[4 - 1]!, 3000, 'shared');
  assertEq('Finale earnings (red)', red.earnings[4]!, 1500, 'red');
  assertEq('Grand total (red)', red.earnings.reduce((a, b) => a + b, 0), 9270, 'red');

  assertEq('Act 3 earnings (blue)', blue.earnings[2]!, 2550, 'blue');
  assertEq('Finale earnings (blue)', blue.earnings[4]!, 1500, 'blue');
  assertEq('Grand total (blue)', blue.earnings.reduce((a, b) => a + b, 0), 9270, 'blue');

  console.log('Act 1 cost: Wireshark+theHarvester =', costOf(['wireshark', 'theharvester']));
  console.log('a2-dump tool pair cost: Gobuster+sqlmap =', costOf(['gobuster', 'sqlmap']));

  if (process.exitCode) {
    process.exit(process.exitCode);
  }
  console.log('economy-check: PASS');
}

main();