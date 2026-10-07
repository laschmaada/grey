/**
 * M8-T07 — Practice Range polish.
 *
 * Iterates 5 owned-tool exercises over a fresh seeded world. Each iterate
 * is a 5-10 minute exercise with a fixed goal; the player keeps cycling
 * until they hit a clean run.
 *
 * This module extends the v0.3 stub in `src/core/scaffolding.ts` with a
 * `startAttempt` / `recordResult` API the UI can drive.
 */

import { makeRng } from './rng.js';
import type { World } from './types.js';

export type PracticeRangeIterate =
  | 'nmap-basics'
  | 'msf-portscan'
  | 'gobuster-dirs'
  | 'sqlmap-basics'
  | 'snort-rule-write';

export interface PracticeRangeAttempt {
  id: string;
  seed: number;
  iterate: PracticeRangeIterate;
  world: World;
  startedAt: number;
  result?: 'pass' | 'fail';
  finishedAt?: number;
}

const _attempts: PracticeRangeAttempt[] = [];
let _nextId = 1;

export function startAttempt(iterate: PracticeRangeIterate): PracticeRangeAttempt {
  const seed = makeRng(_nextId * 4093 + 0xc0c0de).next() * 0xffffffff;
  const att: PracticeRangeAttempt = {
    id: `pra-${_nextId++}`,
    seed: Math.floor(seed),
    iterate,
    world: {
      seed: Math.floor(seed),
      hosts: [
        { id: 'app', ip: '192.0.2.10', os: 'Linux 5.x', inScope: true, services: [
          { port: 22, proto: 'tcp', name: 'ssh', state: 'open' },
          { port: 80, proto: 'tcp', name: 'http', state: 'open' },
        ] },
        { id: 'aux', ip: '198.51.100.20', os: 'Linux 5.x', inScope: false, services: [
          { port: 22, proto: 'tcp', name: 'ssh', state: 'open' },
        ] },
      ],
      vulns: [],
      creds: [],
      edges: [],
      dns: [],
      web: { rootUrl: 'http://192.0.2.10/', nodes: [
        { path: '/', title: 'Home', body: 'app', snippet: '' },
        { path: '/admin', title: 'Admin', body: 'admin', snippet: 'sqli sqli' },
        { path: '/api', title: 'API', body: 'api', snippet: '' },
      ], links: [], index: new Map() },
      docs: [],
      defenses: { hostIds: [] },
      pinned: [],
    },
    startedAt: 0,
  };
  _attempts.push(att);
  return att;
}

export function recordResult(id: string, result: 'pass' | 'fail'): PracticeRangeAttempt | null {
  const att = _attempts.find((a) => a.id === id);
  if (!att) return null;
  att.result = result;
  att.finishedAt = 0;
  return att;
}

export function listAttempts(): ReadonlyArray<PracticeRangeAttempt> {
  return [..._attempts];
}

export function resetPracticeRange(): void {
  _attempts.length = 0;
  _nextId = 1;
}