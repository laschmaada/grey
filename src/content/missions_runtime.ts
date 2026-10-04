/**
 * Mission runtime — load a mission's full definition (world fixture, goals, scope,
 * briefs, transcripts) and apply it to a fresh event store.
 *
 * The shape follows CODING_PLAN §4.6 and Appendix A.1. M2-T07 brings a1-first-contact
 * online end-to-end. Other missions add their data here as the simulator grows.
 */

import type { GameEvent, GoalExpr, ScopeCard, World } from '../core/types.js';

export interface TranscriptStep {
  command: string;
  /** virtual ms after the previous command (0 for back-to-back) */
  afterMs: number;
  /** facts to assert are known after this command */
  expectFacts?: string[];
}

export interface Transcript {
  name: string;
  seed: number;
  steps: TranscriptStep[];
  expectedGoalsSatisfied: boolean;
  expectedScopeStrikes?: number;
}

export interface MissionDef {
  id: string;
  title: string;
  brief: string;
  primer: string;
  report: string;
  lab: string;
  world(seed: number): World;
  goals: GoalExpr;
  scope: ScopeCard;
  transcripts: Transcript[];
}

export interface MissionGoalStatus {
  /** facts satisfied by the current state */
  satisfied: string[];
  /** facts still missing */
  missing: string[];
}

/** Tiny per-mission runtime view. */
export interface LoadedMission {
  id: string;
  title: string;
  world: World;
  goals: GoalExpr;
  scope: ScopeCard;
  transcripts: Transcript[];
  goalStatus?: MissionGoalStatus;
}

const CACHE = new Map<string, MissionDef>();

export function registerMission(def: MissionDef): void {
  CACHE.set(def.id, def);
}

export function loadMission(id: string, seed = 1): LoadedMission {
  const def = CACHE.get(id);
  if (!def) throw new Error(`unknown mission: ${id}`);
  const world = def.world(seed);
  return {
    id,
    title: def.title,
    world,
    goals: def.goals,
    scope: def.scope,
    transcripts: def.transcripts,
  };
}

/** Programmatic way to apply a transcript to an event store, producing events + known facts. */
export function runTranscript(
  _def: MissionDef,
  transcript: Transcript,
  events: GameEvent[],
  knownFacts: Set<string>,
): { facts: Set<string>; events: GameEvent[] } {
  let nextId = events.length + 1;
  for (const step of transcript.steps) {
    events.push({
      id: nextId++,
      t: events[events.length - 1]?.t ?? 0,
      actor: 'player',
      type: 'command',
      payload: { command: step.command, afterMs: step.afterMs },
    });
    for (const f of step.expectFacts ?? []) knownFacts.add(f);
  }
  return { facts: new Set(knownFacts), events };
}

/** M2-T07 — a1-first-contact: a single-target version scan completes the goal. */
const firstContactWorld = (seed: number): World => ({
  seed,
  hosts: [
    {
      id: 'grid-gw',
      ip: '192.0.2.10',
      hostname: 'gw.grid.test',
      os: 'Linux 4.18',
      inScope: true,
      services: [
        { port: 22, proto: 'tcp', name: 'ssh', product: 'OpenSSH', version: '7.4', state: 'open' },
        { port: 80, proto: 'tcp', name: 'http', product: 'nginx', version: '1.18.0', state: 'open' },
        { port: 443, proto: 'tcp', name: 'https', product: 'nginx', version: '1.18.0', state: 'open' },
        { port: 8080, proto: 'tcp', name: 'http-proxy', state: 'filtered' },
      ],
    },
    {
      id: 'canary',
      ip: '192.0.2.20',
      hostname: 'canary.grid.test',
      os: 'Linux 5.x',
      inScope: false,
      services: [],
    },
  ],
  vulns: [],
  creds: [],
  edges: [{ from: 'grid-gw', to: 'canary', kind: 'subnet-192.0.2.0/24' }],
  dns: [
    { name: 'gw.grid.test', type: 'A', value: '192.0.2.10' },
    { name: 'canary.grid.test', type: 'A', value: '192.0.2.20' },
  ],
  web: { rootUrl: 'http://gw.grid.test/', nodes: [], links: [], index: new Map() },
  docs: [],
  defenses: { hostIds: [] },
  pinned: ['hosts.grid-gw.ip', 'hosts.grid-gw.services.22.product'],
});

registerMission({
  id: 'a1-first-contact',
  title: 'First Contact',
  brief:
    'You receive an IP for the perimeter gateway of a target client. Run an nmap scan to identify services.',
  primer:
    'nmap is the standard network mapper. `-sV` adds service/version detection; `-sS` is the default SYN scan; timing templates T0..T5 trade stealth for speed.',
  report: '## Attack Surface\n- open ports and services\n- product/version\n- notes for Act 2 reconnaissance',
  lab: 'Run `nmap -sV -sC 192.0.2.10` against your Metasploitable 2 lab. Capture the output as your first lab artifact.',
  world: firstContactWorld,
  goals: { kind: 'service_identified', hostId: 'grid-gw', port: 22 },
  scope: {
    inScope: ['grid-gw'],
    outOfScope: ['canary'],
    permitted: ['nmap', 'dig', 'whois'],
    forbidden: ['exploit-rce'],
    dataRule: 'no data exfiltration',
  },
  transcripts: [
    {
      name: 'route-a',
      seed: 1234,
      steps: [
        {
          command: 'nmap -sV -Pn 192.0.2.10',
          afterMs: 1000,
          expectFacts: ['service:grid-gw:22', 'service:grid-gw:80', 'service:grid-gw:443'],
        },
      ],
      expectedGoalsSatisfied: true,
    },
    {
      name: 'route-b',
      seed: 1234,
      steps: [
        {
          command: 'nmap -sV -Pn -p 22 192.0.2.10',
          afterMs: 800,
          expectFacts: ['service:grid-gw:22'],
        },
      ],
      expectedGoalsSatisfied: true,
    },
    {
      name: 'negative-1',
      seed: 1234,
      steps: [
        {
          command: 'nmap -sV -Pn 192.0.2.20',
          afterMs: 800,
        },
      ],
      expectedGoalsSatisfied: false,
      expectedScopeStrikes: 1,
    },
  ],
});

export {};