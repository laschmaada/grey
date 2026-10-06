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

// ---------------------------------------------------------------------------
// M7-T03 + T06 + T08: Act 3 missions (2 shared + 4 Red + 4 Blue).
// ---------------------------------------------------------------------------

// a3-dark-ship (shared) — AIS timeline with a 12h gap.
const a3DarkShipWorld = (seed: number): World => ({
  seed,
  hosts: [
    { id: 'analyst', ip: '192.0.2.10', os: 'Linux', inScope: true, services: [] },
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

registerMission({
  id: 'a3-dark-ship',
  title: 'The Dark Ship',
  brief: 'A trawler (Nadia K) is dark over the cable route at the incident hour. Confirm it.',
  primer:
    'Run `ais mmsi-538123456` to view the vessel timeline. A "dark ship" is a vessel whose AIS beacon went silent for >6 hours. Verify the gap.',
  report: '## AIS Findings\n- mmsi\n- gap window\n- position before / after',
  lab: 'Run an AIS query against MarineTraffic or AIS Hub for a real vessel.',
  world: a3DarkShipWorld,
  goals: { kind: 'fact_found', key: 'ais:dark-ship:mmsi-538123456' },
  scope: {
    inScope: ['analyst'],
    outOfScope: [],
    permitted: ['ais', 'nmap'],
    forbidden: [],
    dataRule: 'no exfiltration',
  },
  transcripts: [
    {
      name: 'route-a-ais',
      seed: 1234,
      steps: [
        { command: 'ais mmsi-538123456', afterMs: 1000, expectFacts: ['ais:dark-ship:mmsi-538123456'] },
      ],
      expectedGoalsSatisfied: true,
    },
  ],
});

// a3-honeytoken (shared) — recognise the planted key.
const a3HoneytokenWorld = (seed: number): World => ({
  seed,
  hosts: [
    { id: 'analyst', ip: '192.0.2.10', os: 'Linux', inScope: true, services: [] },
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

registerMission({
  id: 'a3-honeytoken',
  title: 'The Honeytoken',
  brief: 'A planted key shows up in a Meridian alert. Recognise it before treating it as evidence.',
  primer:
    'Honeytoken is a key the defender plants to detect a breach. When the key shows up in an alert, that is the *signal* — the key is not real evidence. Confirm the alert is the planted honeytoken.',
  report: '## Honeytoken\n- the planted key\n- where it was found',
  lab: 'Use canarytokens.org or a similar canary service.',
  world: a3HoneytokenWorld,
  goals: { kind: 'fact_found', key: 'honeytoken:recognized' },
  scope: {
    inScope: ['analyst'],
    outOfScope: [],
    permitted: ['meridian'],
    forbidden: [],
    dataRule: 'no exfiltration',
  },
  transcripts: [
    {
      name: 'route-a-recognise',
      seed: 1234,
      steps: [
        { command: 'meridian triage 1 --tp', afterMs: 50, expectFacts: ['honeytoken:recognized'] },
      ],
      expectedGoalsSatisfied: true,
    },
  ],
});

// a3r-migrate-dump (Red) — Meterpreter migrate + hashdump.
const a3rMigrateDumpWorld = (seed: number): World => ({
  seed,
  hosts: [
    { id: 'grid-gw', ip: '192.0.2.10', hostname: 'gw.grid.test', os: 'Windows 10', inScope: true, services: [] },
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

registerMission({
  id: 'a3r-migrate-dump',
  title: 'Migrate & Dump',
  brief: 'Open a meterpreter session, migrate into lsass, and dump hashes.',
  primer:
    'After running the vsftpd backdoor (a2-first-blood), the session lives in the FTP process. Migrate into a stable system process before dumping hashes. Use `meterpreter ps; migrate <pid>; hashdump`.',
  report: '## Meterpreter\n- the chosen PID\n- the dumped hashes',
  lab: 'Migrate into lsass.exe in a real lab and run `hashdump`.',
  world: a3rMigrateDumpWorld,
  goals: {
    all: [
      { kind: 'session_open', hostId: 'grid-gw', type: 'shell' },
      { kind: 'fact_found', key: 'hashdump:grid-gw' },
    ],
  },
  scope: {
    inScope: ['grid-gw'],
    outOfScope: [],
    permitted: ['meterpreter', 'msf', 'nmap'],
    forbidden: [],
    dataRule: 'no exfiltration',
  },
  transcripts: [
    {
      name: 'route-a',
      seed: 1234,
      steps: [
        { command: 'msf run', afterMs: 2000, expectFacts: ['session:grid-gw'] },
        { command: 'meterpreter ps', afterMs: 500 },
        { command: 'meterpreter migrate 200', afterMs: 200 },
        { command: 'meterpreter hashdump', afterMs: 1500, expectFacts: ['hashdump:grid-gw'] },
      ],
      expectedGoalsSatisfied: true,
    },
  ],
});

// a3r-pivot (Red) — route add, internal network reach.
const a3rPivotWorld = (seed: number): World => ({
  seed,
  hosts: [
    { id: 'grid-gw', ip: '192.0.2.10', hostname: 'gw.grid.test', os: 'Windows 10', inScope: true, services: [] },
    { id: 'internal', ip: '198.51.100.20', hostname: 'internal.grid.test', os: 'Linux', inScope: false, services: [{ port: 22, proto: 'tcp', name: 'ssh', state: 'open' }] },
  ],
  vulns: [],
  creds: [],
  edges: [{ from: 'grid-gw', to: 'internal', kind: 'subnet-198.51.100.0/24' }],
  dns: [],
  web: { rootUrl: 'http://gw.grid.test/', nodes: [], links: [], index: new Map() },
  docs: [],
  defenses: { hostIds: [] },
  pinned: [],
});

registerMission({
  id: 'a3r-pivot',
  title: 'Pivot',
  brief: 'Pivot from grid-gw to the internal host through a route add.',
  primer:
    'Once you have a session on grid-gw, add a route through it: `meterpreter route add 198.51.100.0/24 <grid-gw-session-id>`. Then nmap the internal host through the meterpreter pivot.',
  report: '## Pivot\n- route\n- internal host fingerprint',
  lab: 'Use Chisel or SSH -L / -R for port forwarding; run `proxychains nmap`.',
  world: a3rPivotWorld,
  goals: { kind: 'session_open', hostId: 'internal', type: 'shell' },
  scope: {
    inScope: ['grid-gw'],
    outOfScope: ['internal'],
    permitted: ['meterpreter', 'msf', 'nmap'],
    forbidden: [],
    dataRule: 'no exfiltration',
  },
  transcripts: [
    {
      name: 'route-a',
      seed: 1234,
      steps: [
        { command: 'msf run', afterMs: 2000, expectFacts: ['session:grid-gw'] },
        { command: 'meterpreter route add 198.51.100.0/24 1', afterMs: 200 },
        { command: 'meterpreter run auxiliary/scanner/portscan/tcp', afterMs: 1500, expectFacts: ['session:internal'] },
      ],
      expectedGoalsSatisfied: true,
    },
  ],
});

// a3r-callback (Red) — Sliver implant + callback.
const a3rCallbackWorld = (seed: number): World => ({
  seed,
  hosts: [
    { id: 'grid-gw', ip: '192.0.2.10', hostname: 'gw.grid.test', os: 'Windows 10', inScope: true, services: [] },
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

registerMission({
  id: 'a3r-callback',
  title: 'The Callback',
  brief: 'Generate a Sliver implant, deliver it to grid-gw, and observe the callback.',
  primer:
    'Use `sliver generate --http --save /tmp/imp.bin` and the Sliver C2 console to deliver the implant. Watch the callback in the Wireshark capture.',
  report: '## Sliver\n- implant path\n- callback timestamp',
  lab: 'Use Sliver in your lab; capture the callback with Wireshark.',
  world: a3rCallbackWorld,
  goals: { kind: 'fact_found', key: 'sliver:callback:grid-gw' },
  scope: {
    inScope: ['grid-gw'],
    outOfScope: [],
    permitted: ['sliver', 'tshark', 'nmap'],
    forbidden: [],
    dataRule: 'no exfiltration',
  },
  transcripts: [
    {
      name: 'route-a',
      seed: 1234,
      steps: [
        { command: 'sliver generate --http --save /tmp/imp.bin', afterMs: 500 },
        { command: 'sliver listeners http', afterMs: 500 },
        { command: 'sliver use imp-1', afterMs: 1000, expectFacts: ['sliver:callback:grid-gw'] },
      ],
      expectedGoalsSatisfied: true,
    },
  ],
});

// a3r-cracked (Red) — Hydra + John to recover creds.
const a3rCrackedWorld = (seed: number): World => ({
  seed,
  hosts: [
    { id: 'grid-gw', ip: '192.0.2.10', hostname: 'gw.grid.test', os: 'Windows 10', inScope: true, services: [] },
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

registerMission({
  id: 'a3r-cracked',
  title: 'Cracked',
  brief: 'Brute-force the SSH user and crack the dumped hashes.',
  primer:
    'Use hydra against the SSH service on grid-gw. Then run john against the dumped SAM hashes to recover plaintext passwords.',
  report: '## Cracked\n- hydra hit\n- john output',
  lab: 'Use hydra / john against a real user list and a hash dump.',
  world: a3rCrackedWorld,
  goals: {
    all: [
      { kind: 'credential_obtained', user: 'analyst', hostId: 'grid-gw' },
      { kind: 'credential_obtained', user: 'admin', hostId: 'grid-gw' },
    ],
  },
  scope: {
    inScope: ['grid-gw'],
    outOfScope: [],
    permitted: ['hydra', 'john', 'nmap'],
    forbidden: [],
    dataRule: 'no exfiltration',
  },
  transcripts: [
    {
      name: 'route-a',
      seed: 1234,
      steps: [
        { command: 'hydra -l analyst -P wordlist.txt ssh://192.0.2.10', afterMs: 1500, expectFacts: ['cred:analyst@grid-gw'] },
        { command: 'john --wordlist=rockyou.txt hashes.txt', afterMs: 1500, expectFacts: ['cred:admin@grid-gw'] },
      ],
      expectedGoalsSatisfied: true,
    },
  ],
});

// a3b-persisted (Blue) — Wazuh FIM detects persistence.
const a3bPersistedWorld = (seed: number): World => ({
  seed,
  hosts: [
    { id: 'patient', ip: '192.0.2.10', hostname: 'patient.grid.test', os: 'Windows 10', inScope: true, services: [] },
  ],
  vulns: [],
  creds: [],
  edges: [],
  dns: [],
  web: { rootUrl: 'http://gw.grid.test/', nodes: [], links: [], index: new Map() },
  docs: [],
  defenses: { hostIds: ['patient'] },
  pinned: [],
});

registerMission({
  id: 'a3b-persisted',
  title: 'Persisted',
  brief: 'A scheduled task was created on patient. Find it via Wazuh FIM.',
  primer:
    'Wazuh watches C:\\Windows\\System32\\Tasks for changes. Run `wazuh fim query` and look for a task named `UpdaterSvc` (Rook).',
  report: '## FIM\n- the persistence mechanism\n- the task name',
  lab: 'On a real Windows VM, set a baseline with Wazuh, then create a scheduled task and observe the alert.',
  world: a3bPersistedWorld,
  goals: { kind: 'fact_found', key: 'wazuh:persistence:patient' },
  scope: {
    inScope: ['patient'],
    outOfScope: [],
    permitted: ['wazuh', 'meridian', 'nmap'],
    forbidden: [],
    dataRule: 'preserve evidence',
  },
  transcripts: [
    {
      name: 'route-a',
      seed: 1234,
      steps: [
        { command: 'wazuh fim query /Windows/System32/Tasks', afterMs: 1500, expectFacts: ['wazuh:persistence:patient'] },
      ],
      expectedGoalsSatisfied: true,
    },
  ],
});

// a3b-fleet-sweep (Blue) — Velociraptor VQL across the fleet.
const a3bFleetSweepWorld = (seed: number): World => ({
  seed,
  hosts: [
    { id: 'analyst', ip: '192.0.2.10', os: 'Linux', inScope: true, services: [] },
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

registerMission({
  id: 'a3b-fleet-sweep',
  title: 'Fleet Sweep',
  brief: 'Run a VQL query across the 50-host fleet. Find hosts with port 445 open.',
  primer:
    '`velociraptor "SELECT hostname, port FROM services() WHERE port == 445"`. Find hosts with SMB exposed to the corporate network.',
  report: '## Fleet\n- host count\n- candidate hosts',
  lab: 'Run Velociraptor on a real fleet.',
  world: a3bFleetSweepWorld,
  goals: { kind: 'fact_found', key: 'fleet:smb-open' },
  scope: {
    inScope: ['analyst'],
    outOfScope: [],
    permitted: ['velociraptor', 'meridian'],
    forbidden: [],
    dataRule: 'no exfiltration',
  },
  transcripts: [
    {
      name: 'route-a-vql',
      seed: 1234,
      steps: [
        {
          command: 'velociraptor "SELECT hostname, port FROM services() WHERE port == 445"',
          afterMs: 1500,
          expectFacts: ['fleet:smb-open'],
        },
      ],
      expectedGoalsSatisfied: true,
    },
  ],
});

// a3b-heartbeat (Blue) — beacon detection puzzle.
const a3bHeartbeatWorld = (seed: number): World => ({
  seed,
  hosts: [
    { id: 'analyst', ip: '192.0.2.10', os: 'Linux', inScope: true, services: [] },
    { id: 'attacker', ip: '198.51.100.7', os: 'Linux', inScope: false, services: [] },
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

registerMission({
  id: 'a3b-heartbeat',
  title: 'Heartbeat',
  brief: 'A beacon is calling home from a compromised host. Find it in the pcap.',
  primer:
    'Use `tshark -q -z conv,tcp` to see the conversation list. Look for a long-running TCP/PSH|ACK conversation. Confirm the destination + port.',
  report: '## Beacon\n- source host\n- destination\n- destination port',
  lab: 'Capture a Sliver C2 callback in Wireshark; spot the beacon.',
  world: a3bHeartbeatWorld,
  goals: { kind: 'fact_found', key: 'beacon:detected' },
  scope: {
    inScope: ['analyst'],
    outOfScope: ['attacker'],
    permitted: ['tshark', 'meridian'],
    forbidden: [],
    dataRule: 'preserve evidence',
  },
  transcripts: [
    {
      name: 'route-a',
      seed: 1234,
      steps: [
        { command: 'tshark -q -z conv,tcp', afterMs: 1500, expectFacts: ['beacon:detected'] },
      ],
      expectedGoalsSatisfied: true,
    },
  ],
});

// a3b-follow-money (Blue) — chain explorer / blockchain trace.
const a3bFollowMoneyWorld = (seed: number): World => ({
  seed,
  hosts: [
    { id: 'analyst', ip: '192.0.2.10', os: 'Linux', inScope: true, services: [] },
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

registerMission({
  id: 'a3b-follow-money',
  title: 'Follow the Money',
  brief: 'Trace the ransom wallet to the charter-fuel payment. K3.',
  primer:
    'The chain explorer sim shows a wallet. Follow the transactions to the consolidation into the charter-fuel payment. Confirm K3 = `ransom_to_charter`.',
  report: '## K3\n- the wallet address\n- the consolidation transaction',
  lab: 'Use a real chain explorer for a public testnet.',
  world: a3bFollowMoneyWorld,
  goals: { kind: 'intel_verified', claim: 'ransom_to_charter' },
  scope: {
    inScope: ['analyst'],
    outOfScope: [],
    permitted: ['chain', 'meridian'],
    forbidden: [],
    dataRule: 'no exfiltration',
  },
  transcripts: [
    {
      name: 'route-a-verify',
      seed: 1234,
      steps: [
        { command: 'chain trace wallet 0xdeadbeef', afterMs: 1500 },
        { command: 'meridian triage 1 --tp', afterMs: 50 },
        { command: 'meridian triage 2 --tp', afterMs: 50 },
        { command: 'meridian triage 3 --tp', afterMs: 50 },
      ],
      expectedGoalsSatisfied: true,
    },
  ],
});

export {};

// a2-harvest — theHarvester sim, find emails for the target domain.
const a2HarvestWorld = (seed: number): World => ({
  seed,
  hosts: [
    {
      id: 'grid-gw',
      ip: '192.0.2.10',
      hostname: 'gw.grid.test',
      os: 'Linux',
      inScope: true,
      services: [{ port: 80, proto: 'tcp', name: 'http', state: 'open' }],
    },
  ],
  vulns: [],
  creds: [],
  edges: [],
  dns: [
    { name: 'grid.test', type: 'A', value: '192.0.2.10' },
    { name: 'mail.grid.test', type: 'A', value: '198.51.100.25' },
    { name: 'admin.grid.test', type: 'A', value: '192.0.2.30' },
    { name: 'docs.grid.test', type: 'A', value: '192.0.2.31' },
  ],
  web: { rootUrl: 'http://gw.grid.test/', nodes: [], links: [], index: new Map() },
  docs: [{ id: 'security@grid.test', path: '/contact', content: '' }],
  defenses: { hostIds: [] },
  pinned: [],
});

registerMission({
  id: 'a2-harvest',
  title: 'Harvest',
  brief: 'Find contact email addresses for the target domain.',
  primer:
    'theHarvester enumerates emails / subdomains from public sources. Try `theharvester -d grid.test -b all`.',
  report: '## Harvested Contacts\n- list the discovered emails',
  lab: 'In your lab, run `theHarvester -d example.test -b all` against a real domain.',
  world: a2HarvestWorld,
  goals: { kind: 'fact_found', key: 'harvested:emails:>=2' },
  scope: {
    inScope: ['grid-gw'],
    outOfScope: [],
    permitted: ['theharvester', 'certlog', 'nmap'],
    forbidden: ['exploit-rce'],
    dataRule: 'no exfiltration',
  },
  transcripts: [
    {
      name: 'route-a-theharvester',
      seed: 1234,
      steps: [
        { command: 'theharvester -d grid.test -b all', afterMs: 1500, expectFacts: ['harvested:emails:>=2'] },
      ],
      expectedGoalsSatisfied: true,
    },
    {
      name: 'route-b-certlog-fallback',
      seed: 1234,
      steps: [
        { command: 'certlog grid.test', afterMs: 800, expectFacts: ['harvested:emails:>=2'] },
      ],
      expectedGoalsSatisfied: true,
    },
  ],
});

// a2-first-blood — vsftpd backdoor + Netcat reverse shell.
const a2FirstBloodWorld = (seed: number): World => ({
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
      ],
    },
    {
      id: 'attacker',
      ip: '198.51.100.7',
      hostname: 'attacker.test',
      os: 'Linux',
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
      description: 'vsftpd 2.3.4 backdoor',
      moduleRef: 'exploit/unix/ftp/vsftpd_234_backdoor',
    },
  ],
  creds: [],
  edges: [],
  dns: [],
  web: { rootUrl: 'http://gw.grid.test/', nodes: [], links: [], index: new Map() },
  docs: [],
  defenses: { hostIds: [] },
  pinned: [],
});

registerMission({
  id: 'a2-first-blood',
  title: 'First Blood',
  brief: 'Open a shell on grid-gw via the vsftpd backdoor and catch the reverse connection.',
  primer:
    'The vsftpd 2.3.4 backdoor opens a shell on port 6200/tcp after a smiley-face login. Use `msf use exploit/unix/ftp/vsftpd_234_backdoor`, set RHOST, run. Then `nc -lvnp 6200` to catch the reverse shell.',
  report: '## First Shell\n- describe the session',
  lab: 'Run vsftpd-class exploit against your Metasploitable 2 lab.',
  world: a2FirstBloodWorld,
  goals: { kind: 'session_open', hostId: 'grid-gw', type: 'shell' },
  scope: {
    inScope: ['grid-gw'],
    outOfScope: ['attacker'],
    permitted: ['msf', 'nc', 'nmap'],
    forbidden: [],
    dataRule: 'no exfiltration',
  },
  transcripts: [
    {
      name: 'route-a-msf-then-nc',
      seed: 1234,
      steps: [
        { command: 'msf use exploit/unix/ftp/vsftpd_234_backdoor', afterMs: 200 },
        { command: 'msf set RHOST 192.0.2.10', afterMs: 100 },
        { command: 'msf run', afterMs: 2000, expectFacts: ['session:open:grid-gw', 'exploit:vsftpd:grid-gw'] },
      ],
      expectedGoalsSatisfied: true,
    },
  ],
});

// a2-intercept — Burp proxy price tamper.
const a2InterceptWorld = (seed: number): World => ({
  seed,
  hosts: [
    {
      id: 'shop',
      ip: '192.0.2.10',
      hostname: 'shop.grid.test',
      os: 'Linux',
      inScope: true,
      services: [{ port: 80, proto: 'tcp', name: 'http', product: 'nginx', state: 'open' }],
    },
  ],
  vulns: [],
  creds: [],
  edges: [],
  dns: [],
  web: {
    rootUrl: 'http://shop.grid.test/',
    nodes: [
      { path: '/', title: 'Home', body: 'welcome', snippet: 'shop sqli-test' },
      { path: '/checkout', title: 'Checkout', body: 'price-tamper target', snippet: 'POST /checkout' },
    ],
    links: [],
    index: new Map(),
  },
  docs: [],
  defenses: { hostIds: [] },
  pinned: [],
});

registerMission({
  id: 'a2-intercept',
  title: 'Intercept',
  brief: 'Tamper with the checkout price via the Burp proxy.',
  primer:
    'Run `burp` to inspect the queue. Forward the GET, then intercept the POST /checkout. Change the price in the body to 1 and forward.',
  report: "## Tampering\n- describe the timeline between the GET and the POST\n- list the header(s) you set",
  lab: 'Use mitmproxy / Burp Suite in your lab to repeat on a real shop endpoint.',
  world: a2InterceptWorld,
  goals: { kind: 'fact_found', key: 'tampered:body' },
  scope: {
    inScope: ['shop'],
    outOfScope: [],
    permitted: ['burp', 'nmap'],
    forbidden: [],
    dataRule: 'no real purchase',
  },
  transcripts: [
    {
      name: 'route-a',
      seed: 1234,
      steps: [
        { command: 'burp intercept', afterMs: 200 },
        { command: 'burp forward', afterMs: 100 },
        { command: 'burp intercept', afterMs: 200 },
        { command: 'burp set header X-Tamper 1', afterMs: 100 },
        { command: 'burp forward', afterMs: 100, expectFacts: ['tampered:body'] },
      ],
      expectedGoalsSatisfied: true,
    },
  ],
});

// a2-dump — gobuster + sqlmap.
const a2DumpWorld = (seed: number): World => ({
  seed,
  hosts: [
    {
      id: 'app',
      ip: '192.0.2.10',
      hostname: 'app.grid.test',
      os: 'Linux',
      inScope: true,
      services: [{ port: 80, proto: 'tcp', name: 'http', product: 'nginx', state: 'open' }],
    },
  ],
  vulns: [],
  creds: [],
  edges: [],
  dns: [],
  web: {
    rootUrl: 'http://app.grid.test/',
    nodes: [
      { path: '/', title: 'Home', body: 'app', snippet: '' },
      { path: '/admin', title: 'Admin', body: 'admin', snippet: 'sqli sqli' },
      { path: '/login', title: 'Login', body: 'login', snippet: '' },
      { path: '/api', title: 'API', body: 'api', snippet: '' },
    ],
    links: [],
    index: new Map(),
  },
  docs: [],
  defenses: { hostIds: [] },
  pinned: [],
});

registerMission({
  id: 'a2-dump',
  title: 'Dump',
  brief: 'Find hidden directories and dump the app database.',
  primer:
    'Run `gobuster -m dir -u http://192.0.2.10/`. Then `sqlmap -u http://192.0.2.10/admin --dbs --tables`.',
  report: '## Dump\n- directories\n- databases / tables',
  lab: 'Repeat on a DVWA / bWAPP install.',
  world: a2DumpWorld,
  goals: {
    all: [
      { kind: 'fact_found', key: 'gobuster-hit:/admin' },
      { kind: 'fact_found', key: 'sqlmap-databases:>=1' },
    ],
  },
  scope: {
    inScope: ['app'],
    outOfScope: [],
    permitted: ['gobuster', 'sqlmap', 'nmap'],
    forbidden: [],
    dataRule: 'no exfiltration',
  },
  transcripts: [
    {
      name: 'route-a',
      seed: 1234,
      steps: [
        {
          command: 'gobuster -m dir -u http://192.0.2.10/',
          afterMs: 1500,
          expectFacts: ['gobuster-hit:/admin'],
        },
        {
          command: 'sqlmap -u http://192.0.2.10/admin --dbs --tables',
          afterMs: 2500,
          expectFacts: ['sqlmap-databases:>=1'],
        },
      ],
      expectedGoalsSatisfied: true,
    },
  ],
});

// a2-patient-zero — IR mechanics. Capture memory, then power off.
const a2PatientZeroWorld = (seed: number): World => ({
  seed,
  hosts: [
    {
      id: 'patient',
      ip: '192.0.2.10',
      hostname: 'patient.grid.test',
      os: 'Linux',
      inScope: true,
      services: [],
    },
    {
      id: 'lateral',
      ip: '192.0.2.11',
      hostname: 'lateral.grid.test',
      os: 'Linux',
      inScope: true,
      services: [],
    },
  ],
  vulns: [],
  creds: [],
  edges: [{ from: 'patient', to: 'lateral', kind: 'subnet-192.0.2.0/24' }],
  dns: [],
  web: { rootUrl: 'http://gw.grid.test/', nodes: [], links: [], index: new Map() },
  docs: [],
  defenses: { hostIds: [] },
  pinned: [],
});

registerMission({
  id: 'a2-patient-zero',
  title: 'Patient Zero',
  brief: 'Contain the breach. Capture memory of patient before powering it off.',
  primer:
    'IR sequence: memory_captured → host_powered_off → isolate → contain. Out-of-order fails the goal.',
  report: '## IR Steps\n- memory first, then power off\n- isolate / contain before patching',
  lab: 'Run a Volatility + IR exercise on a real compromised host.',
  world: a2PatientZeroWorld,
  goals: {
    all: [
      { kind: 'fact_found', key: 'ir:memory_captured:patient' },
      { kind: 'fact_found', key: 'ir:host_powered_off:patient' },
      { kind: 'fact_found', key: 'ir:isolate:patient' },
      { kind: 'fact_found', key: 'ir:contain:patient' },
    ],
  },
  scope: {
    inScope: ['patient', 'lateral'],
    outOfScope: [],
    permitted: ['volatility', 'meridian', 'nmap'],
    forbidden: [],
    dataRule: 'preserve evidence',
  },
  transcripts: [
    {
      name: 'route-a-correct-order',
      seed: 1234,
      steps: [
        { command: 'ir memory_captured patient', afterMs: 200, expectFacts: ['ir:memory_captured:patient'] },
        { command: 'ir host_powered_off patient', afterMs: 200, expectFacts: ['ir:host_powered_off:patient'] },
        { command: 'ir isolate patient', afterMs: 100, expectFacts: ['ir:isolate:patient'] },
        { command: 'ir contain patient', afterMs: 100, expectFacts: ['ir:contain:patient'] },
      ],
      expectedGoalsSatisfied: true,
    },
    {
      name: 'negative-1-out-of-order',
      seed: 1234,
      steps: [
        { command: 'ir host_powered_off patient', afterMs: 200, expectFacts: ['ir:host_powered_off:patient'] },
      ],
      expectedGoalsSatisfied: false,
    },
  ],
});

// a2-block-it — write a Snort rule that blocks without FPs.
const a2BlockItWorld = (seed: number): World => ({
  seed,
  hosts: [
    {
      id: 'gw',
      ip: '192.0.2.10',
      os: 'Linux',
      inScope: true,
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

registerMission({
  id: 'a2-block-it',
  title: 'Block It',
  brief: 'Write a Snort rule that detects the beacon without alerting on benign traffic.',
  primer:
    'Run `snort -T -c rules.txt` to validate. The rule should match the C2 beacon (TCP PSH|ACK to port 4444) and not flag normal SSH/HTTP.',
  report: '## Snort Rule\n- the rule text\n- FP rate against the benign corpus',
  lab: 'Run Snort against Metasploitable pcap and a benign pcap; compute the rate.',
  world: a2BlockItWorld,
  goals: { kind: 'rule_written', id: 'beacon-blocker' },
  scope: {
    inScope: ['gw'],
    outOfScope: [],
    permitted: ['snort', 'tshark'],
    forbidden: [],
    dataRule: 'no exfiltration',
  },
  transcripts: [
    {
      name: 'route-a',
      seed: 1234,
      steps: [
        {
          command: 'snort -T -c rules.txt',
          afterMs: 1500,
          expectFacts: ['rule:beacon-blocker', 'rule-fp-ok'],
        },
      ],
      expectedGoalsSatisfied: true,
    },
  ],
});

export {};