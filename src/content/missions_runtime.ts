/**
 * Mission runtime — load a mission's full definition (world fixture, goals, scope,
 * briefs, transcripts) and apply it to a fresh event store.
 *
 * The shape follows CODING_PLAN §4.6 and Appendix A.1. M2-T07 brings a1-first-contact
 * online end-to-end. Other missions add their data here as the simulator grows.
 */

import type { GameEvent, GoalExpr, ScopeCard, World } from '../core/types.js';
import { seedMeridian } from '../engine/meridian.js';

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

// ---------------------------------------------------------------------------
// M5-T08: a1-twenty-alarms — Meridian Console triage game.
// 20 alerts, of which 3 are true positives (M5-T07 spec). Goal: triage the 3
// true positives as `--tp` (and never mis-mark).
// ---------------------------------------------------------------------------

const twentyAlarmsWorld = (seed: number): World => ({
  seed,
  hosts: [
    {
      id: 'client',
      ip: '192.0.2.10',
      os: 'Linux',
      inScope: true,
      services: [],
    },
    {
      id: 'attacker',
      ip: '198.51.100.7',
      os: 'Linux',
      inScope: false,
      services: [],
    },
  ],
  vulns: [],
  creds: [],
  edges: [],
  dns: [],
  web: { rootUrl: 'http://gw.grid.test/', nodes: [], links: [], index: new Map() },
  docs: [],
  defenses: { hostIds: [] },
  pinned: [],
});

let _twentyAlarmsMeridian: ReturnType<typeof seedMeridian> | null = null;
function twentyAlarmsMeridian(world: World): ReturnType<typeof seedMeridian> {
  if (!_twentyAlarmsMeridian) _twentyAlarmsMeridian = seedMeridian(world, 20);
  return _twentyAlarmsMeridian;
}
void twentyAlarmsMeridian;

registerMission({
  id: 'a1-twenty-alarms',
  title: 'Twenty Alarms',
  brief:
    'Your SIEM shows 20 alerts. Three are real; the rest are false positives. Triage them.',
  primer:
    'Meridian Console shows alerts from the last hour. Use `meridian triage <id> --tp|--fp` to mark each one. The base case: 3 true positives, 17 false positives. The quality score rewards finding all three and penalises under-flavour.',
  report: '## Triage Notes\n- list the three confirmed TPs\n- describe the signature and what triggered it',
  lab:
    'In your Metasploitable lab, run `nmap -sS 192.0.2.10` and observe Suricata alerts. Compare with the simulator output.',
  world: twentyAlarmsWorld,
  goals: {
    all: [
      // Player must triage at least 3 alerts, with at least 2 correct.
      // A loose interpretation: knownFacts has triaged the 3 true positives.
      { kind: 'fact_found' as const, key: 'triaged:1' },
      { kind: 'fact_found' as const, key: 'triaged:3' },
      { kind: 'fact_found' as const, key: 'triaged:11' },
    ],
  },
  scope: {
    inScope: ['client'],
    outOfScope: ['attacker'],
    permitted: ['meridian', 'nmap'],
    forbidden: ['exploit-rce'],
    dataRule: 'no exfiltration',
  },
  transcripts: [
    {
      name: 'route-a',
      seed: 1234,
      steps: [
        { command: 'meridian list', afterMs: 100 },
        { command: 'meridian triage 1 --tp', afterMs: 50, expectFacts: ['triaged:1'] },
        { command: 'meridian triage 3 --tp', afterMs: 50, expectFacts: ['triaged:3'] },
        { command: 'meridian triage 11 --tp', afterMs: 50, expectFacts: ['triaged:11'] },
      ],
      expectedGoalsSatisfied: true,
    },
    {
      name: 'route-b-spot-scans',
      seed: 1234,
      steps: [
        { command: 'nmap -sV -Pn 192.0.2.10', afterMs: 1000 },
        // The player spots their own scan in the alerts and triages only 1 of 3
        { command: 'meridian triage 1 --tp', afterMs: 50, expectFacts: ['triaged:1'] },
      ],
      expectedGoalsSatisfied: false,
    },
    {
      name: 'negative-1',
      seed: 1234,
      steps: [
        // Mark a fp as tp — wrong call, doesn't satisfy all goals
        { command: 'meridian triage 2 --tp', afterMs: 50 },
      ],
      expectedGoalsSatisfied: false,
    },
  ],
});

// ---------------------------------------------------------------------------
// M5-T03: a1-recon-console — msfconsole aux scanner route.
// Goal: identify open services on the target using msf aux scanners.
// ---------------------------------------------------------------------------

const reconConsoleWorld = (seed: number): World => ({
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
      ],
    },
  ],
  vulns: [],
  creds: [],
  edges: [],
  dns: [],
  web: { rootUrl: 'http://gw.grid.test/', nodes: [], links: [], index: new Map() },
  docs: [],
  defenses: { hostIds: [] },
  pinned: ['hosts.grid-gw.ip'],
});

registerMission({
  id: 'a1-recon-console',
  title: 'Recon Console',
  brief: 'Run an msfconsole aux scanner against the perimeter to enumerate services.',
  primer:
    'msfconsole is the Metasploit framework console. Aux scanners are reconnaissance modules. Try `msf search portscan`, then `msf use auxiliary/scanner/portscan/tcp` and `set RHOSTS 192.0.2.10`, then `run`.',
  report: '## Recon Findings\n- list services discovered\n- note product versions',
  lab:
    'Run `msfconsole -q -x "use auxiliary/scanner/portscan/tcp; set RHOSTS 192.0.2.10; run"` in your lab.',
  world: reconConsoleWorld,
  goals: { kind: 'service_identified', hostId: 'grid-gw', port: 22 },
  scope: {
    inScope: ['grid-gw'],
    outOfScope: [],
    permitted: ['msf', 'nmap'],
    forbidden: ['exploit-rce'],
    dataRule: 'no exfiltration',
  },
  transcripts: [
    {
      name: 'route-a-msf-aux',
      seed: 1234,
      steps: [
        { command: 'msf search portscan', afterMs: 200 },
        { command: 'msf use auxiliary/scanner/portscan/tcp', afterMs: 200 },
        { command: 'msf set RHOSTS 192.0.2.10', afterMs: 100 },
        { command: 'msf run', afterMs: 1500, expectFacts: ['service:grid-gw:22', 'service:grid-gw:80'] },
      ],
      expectedGoalsSatisfied: true,
    },
    {
      name: 'route-b-nmap',
      seed: 1234,
      steps: [
        { command: 'nmap -sV -Pn 192.0.2.10', afterMs: 1000, expectFacts: ['service:grid-gw:22'] },
      ],
      expectedGoalsSatisfied: true,
    },
    {
      name: 'negative-1-no-target',
      seed: 1234,
      steps: [
        { command: 'msf use auxiliary/scanner/portscan/tcp', afterMs: 200 },
        { command: 'msf run', afterMs: 800 },
      ],
      expectedGoalsSatisfied: false,
    },
  ],
});

// ---------------------------------------------------------------------------
// M5-T03: a1-mail-server — DNS + dig sim (M5-T02 minimum).
// Goal: discover the mail server's IP via DNS records.
// ---------------------------------------------------------------------------

const mailServerWorld = (seed: number): World => ({
  seed,
  hosts: [
    {
      id: 'grid-gw',
      ip: '192.0.2.10',
      hostname: 'gw.grid.test',
      os: 'Linux',
      inScope: true,
      services: [],
    },
    {
      id: 'mail',
      ip: '198.51.100.25',
      hostname: 'mail.grid.test',
      os: 'Linux',
      inScope: true,
      services: [{ port: 25, proto: 'tcp', name: 'smtp', state: 'open' }],
    },
  ],
  vulns: [],
  creds: [],
  edges: [],
  dns: [
    { name: 'grid.test', type: 'A', value: '192.0.2.10' },
    { name: 'mail.grid.test', type: 'A', value: '198.51.100.25' },
    { name: 'grid.test', type: 'MX', value: 'mail.grid.test' },
  ],
  web: { rootUrl: 'http://gw.grid.test/', nodes: [], links: [], index: new Map() },
  docs: [],
  defenses: { hostIds: [] },
  pinned: ['hosts.mail.ip'],
});

registerMission({
  id: 'a1-mail-server',
  title: 'The Mail Server',
  brief: 'Find the mail server for grid.test using DNS.',
  primer:
    'Use `dig grid.test MX` to look up the mail exchange. The reply tells you which host handles mail for the domain.',
  report: '## DNS Findings\n- MX record: mail.grid.test (priority 10)\n- A record: 198.51.100.25',
  lab: 'Run `dig grid.test MX` against your lab resolver.',
  world: mailServerWorld,
  goals: { kind: 'service_identified', hostId: 'mail', port: 25 },
  scope: {
    inScope: ['grid-gw', 'mail'],
    outOfScope: [],
    permitted: ['dig', 'nslookup', 'nmap'],
    forbidden: ['exploit-rce'],
    dataRule: 'no exfiltration',
  },
  transcripts: [
    {
      name: 'route-a-dig-mx',
      seed: 1234,
      steps: [
        { command: 'dig grid.test MX', afterMs: 200 },
        { command: 'dig mail.grid.test A', afterMs: 200 },
        {
          command: 'nmap -sV -Pn 198.51.100.25',
          afterMs: 1500,
          expectFacts: ['service:mail:25'],
        },
      ],
      expectedGoalsSatisfied: true,
    },
    {
      name: 'negative-1-wrong-host',
      seed: 1234,
      steps: [
        {
          command: 'nmap -sV -Pn 192.0.2.99',
          afterMs: 1500,
        },
      ],
      expectedGoalsSatisfied: false,
    },
  ],
});

// ---------------------------------------------------------------------------
// M5-T04: a1-knock-knock — nmap + msf auxiliary portscan route.
// Per errata 7.3 #1: a1-knock-knock ships with the nmap route here; the msf
// auxiliary route is added now (was M5-T04).
// ---------------------------------------------------------------------------

const knockKnockWorld = (seed: number): World => ({
  seed,
  hosts: [
    {
      id: 'grid-gw',
      ip: '192.0.2.10',
      hostname: 'gw.grid.test',
      os: 'Linux 4.18',
      inScope: true,
      services: [
        { port: 21, proto: 'tcp', name: 'ftp', product: 'vsftpd', version: '2.3.4', state: 'open' },
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
  vulns: [
    {
      id: 'vsftpd-backdoor',
      hostId: 'grid-gw',
      servicePort: 21,
      kind: 'backdoor',
      description: 'vsftpd 2.3.4 backdoor (state transition in the simulator)',
      moduleRef: 'exploit/unix/ftp/vsftpd_234_backdoor',
    },
  ],
  creds: [],
  edges: [{ from: 'grid-gw', to: 'canary', kind: 'subnet-192.0.2.0/24' }],
  dns: [
    { name: 'gw.grid.test', type: 'A', value: '192.0.2.10' },
    { name: 'canary.grid.test', type: 'A', value: '192.0.2.20' },
  ],
  web: { rootUrl: 'http://gw.grid.test/', nodes: [], links: [], index: new Map() },
  docs: [],
  defenses: { hostIds: [] },
  pinned: ['hosts.grid-gw.ip', 'hosts.grid-gw.services.21.product'],
});

registerMission({
  id: 'a1-knock-knock',
  title: 'Knock Knock',
  brief: 'Scan the perimeter and identify the door before opening it.',
  primer:
    'Run an nmap version scan to find services. The vsftpd 2.3.4 backdoor is famous — open a session with `msf use exploit/unix/ftp/vsftpd_234_backdoor`, set RHOST, then run. Or: just scan and report the attack surface.',
  report: '## Attack Surface\n- open ports: 21, 22, 80, 443\n- FTP 21: vsftpd 2.3.4 (known vulnerable)\n- SSH 22: OpenSSH 7.4\n- HTTP/HTTPS 80, 443: nginx 1.18.0',
  lab:
    'Run `nmap -sV -sC 192.0.2.10 -p 21,22,80,443` against your Metasploitable 2 lab. Try `msf > use exploit/unix/ftp/vsftpd_234_backdoor; set RHOST 192.0.2.10; run`.',
  world: knockKnockWorld,
  goals: { kind: 'service_identified', hostId: 'grid-gw', port: 21 },
  scope: {
    inScope: ['grid-gw'],
    outOfScope: ['canary'],
    permitted: ['nmap', 'msf'],
    forbidden: [],
    dataRule: 'no exfiltration',
  },
  transcripts: [
    {
      name: 'route-a-nmap',
      seed: 1234,
      steps: [
        {
          command: 'nmap -sV -Pn 192.0.2.10 -p 21,22,80,443',
          afterMs: 1000,
          expectFacts: ['service:grid-gw:21', 'service:grid-gw:22', 'service:grid-gw:80'],
        },
      ],
      expectedGoalsSatisfied: true,
    },
    {
      name: 'route-b-msf-aux-then-exploit',
      seed: 1234,
      steps: [
        { command: 'msf search portscan', afterMs: 200 },
        { command: 'msf use auxiliary/scanner/portscan/tcp', afterMs: 200 },
        { command: 'msf set RHOSTS 192.0.2.10', afterMs: 100 },
        { command: 'msf run', afterMs: 1500, expectFacts: ['service:grid-gw:21', 'service:grid-gw:22'] },
      ],
      expectedGoalsSatisfied: true,
    },
    {
      name: 'negative-1-out-of-scope',
      seed: 1234,
      steps: [
        { command: 'nmap -sV -Pn 192.0.2.20', afterMs: 800 },
      ],
      expectedGoalsSatisfied: false,
      expectedScopeStrikes: 1,
    },
  ],
});

export {};