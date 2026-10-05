/**
 * M5-T07 — Meridian Console.
 *
 * A SIEM-lite with two operations:
 *   - alert queue: `triage <id> --tp|--fp` marks an alert true-positive or
 *     false-positive (toggles noise and trust).
 *   - log search:  `meridian <field>=<value> [| head N | count by field]`
 *
 * Backed by an in-memory alert store + the world's `docs` corpus as the
 * searchable log source. Alert ID space is 1..N; a default seed generates
 * 20 alerts (M5-T08 a1-twenty-alarms), of which 3 are true positives.
 */

import { register } from '../engine/registry.js';
import type { World } from '../core/types.js';
import { makeRng } from '../core/rng.js';

export interface MeridianAlert {
  id: number;
  /** virtual ms */
  ts: number;
  /** alert signature (e.g. "ET SCAN nmap signature") */
  sig: string;
  severity: 'low' | 'medium' | 'high';
  srcIp: string;
  dstIp: string;
  /** baseline classification — what the SIEM thinks */
  baseline: 'tp' | 'fp';
  /** player's classification (undefined until triaged) */
  player?: 'tp' | 'fp';
  /** true-positive truth (used for scoring the mission) */
  truth: 'tp' | 'fp';
}

export interface MeridianLogEvent {
  ts: number;
  src: string;
  dst: string;
  proto: 'tcp' | 'udp';
  port: number;
  action: 'allow' | 'deny';
  bytes: number;
}

export interface MeridianState {
  alerts: MeridianAlert[];
  logs: MeridianLogEvent[];
}

const SEED_ALERT_SIGS: Array<{
  sig: string;
  severity: MeridianAlert['severity'];
  baseline: 'tp' | 'fp';
  truth: 'tp' | 'fp';
}> = [
  { sig: 'ET SCAN nmap SYN sweep signature', severity: 'medium', baseline: 'tp', truth: 'tp' },
  { sig: 'ET POLICY outbound SSH to non-corporate host', severity: 'low', baseline: 'fp', truth: 'fp' },
  { sig: 'ET TROJAN C2 beacon to known bad IP', severity: 'high', baseline: 'tp', truth: 'tp' },
  { sig: 'ET POLICY internal DNS over UDP/53', severity: 'low', baseline: 'fp', truth: 'fp' },
  { sig: 'ET WEB_SERVER possible SQL injection attempt', severity: 'medium', baseline: 'fp', truth: 'fp' },
  { sig: 'ET MALWARE Suspicious .test domain lookup', severity: 'low', baseline: 'fp', truth: 'fp' },
  { sig: 'ET INFO TLS handshake to internal host', severity: 'low', baseline: 'fp', truth: 'fp' },
  { sig: 'ET WEB_SPECIFIC_APPS possible XSS payload', severity: 'low', baseline: 'fp', truth: 'fp' },
  { sig: 'ET POLICY SSH connection outside business hours', severity: 'low', baseline: 'fp', truth: 'fp' },
  { sig: 'ET SCAN potential portscan from internal host', severity: 'medium', baseline: 'fp', truth: 'fp' },
  { sig: 'ET TROJAN backdoor command response', severity: 'high', baseline: 'tp', truth: 'tp' },
  { sig: 'ET POLICY failed login spike', severity: 'low', baseline: 'fp', truth: 'fp' },
  { sig: 'ET WEB_SERVER suspicious user-agent', severity: 'low', baseline: 'fp', truth: 'fp' },
  { sig: 'ET INFO HTTP/2 SETTINGS frame anomaly', severity: 'low', baseline: 'fp', truth: 'fp' },
  { sig: 'ET POLICY cleartext credential in URL', severity: 'medium', baseline: 'fp', truth: 'fp' },
  { sig: 'ET DNS suspicious NXDOMAIN burst', severity: 'low', baseline: 'fp', truth: 'fp' },
  { sig: 'ET TROJAN possible reverse shell pattern', severity: 'high', baseline: 'fp', truth: 'fp' },
  { sig: 'ET POLICY time-of-day anomaly', severity: 'low', baseline: 'fp', truth: 'fp' },
  { sig: 'ET INFO ICMP echo request burst', severity: 'low', baseline: 'fp', truth: 'fp' },
  { sig: 'ET SCAN generic nmap version detection', severity: 'medium', baseline: 'fp', truth: 'fp' },
];

/**
 * Seed Meridian with a configurable alert population. a1-twenty-alarms
 * uses the default 20-alert list (3 true positives).
 */
export function seedMeridian(world: World, count = 20): MeridianState {
  const rng = makeRng(world.seed ^ 0xa11a);
  const inScope = world.hosts.filter((h) => h.inScope);
  const outOfScope = world.hosts.filter((h) => !h.inScope);
  const alerts: MeridianAlert[] = [];
  for (let i = 0; i < count; i++) {
    const tpl = SEED_ALERT_SIGS[i % SEED_ALERT_SIGS.length]!;
    const src = inScope.length > 0 ? pick(rng, inScope)!.ip : '192.0.2.10';
    const dst = outOfScope.length > 0 ? pick(rng, outOfScope)!.ip : '198.51.100.7';
    alerts.push({
      id: i + 1,
      ts: 1000 * (i + 1),
      sig: tpl.sig,
      severity: tpl.severity,
      srcIp: src,
      dstIp: dst,
      baseline: tpl.baseline,
      truth: tpl.truth,
    });
  }
  const logs = generateLogs(rng, world);
  return { alerts, logs };
}

function generateLogs(rng: ReturnType<typeof makeRng>, world: World): MeridianLogEvent[] {
  const out: MeridianLogEvent[] = [];
  const inScope = world.hosts.filter((h) => h.inScope);
  for (let i = 0; i < 200; i++) {
    const src = inScope.length > 0 ? pick(rng, inScope)!.ip : '192.0.2.10';
    const dst = '198.51.100.7';
    const proto = rng.next() < 0.6 ? 'tcp' : 'udp';
    out.push({
      ts: 500 * i,
      src,
      dst,
      proto,
      port: 22 + Math.floor(rng.next() * 100),
      action: rng.next() < 0.95 ? 'allow' : 'deny',
      bytes: 64 + Math.floor(rng.next() * 8000),
    });
  }
  return out;
}

function pick<T>(rng: ReturnType<typeof makeRng>, arr: readonly T[]): T {
  return arr[Math.floor(rng.next() * arr.length)]!;
}

/** Triage an alert: --tp marks true-positive, --fp marks false-positive. */
export function triage(state: MeridianState, id: number, verdict: 'tp' | 'fp'): MeridianAlert | undefined {
  const a = state.alerts.find((x) => x.id === id);
  if (!a) return undefined;
  a.player = verdict;
  return a;
}

/** Score the player's triage decisions. +1 for a correct call, −1 for an incorrect one, 0 if skipped. */
export function triageScore(state: MeridianState): { correct: number; wrong: number; skipped: number } {
  let correct = 0;
  let wrong = 0;
  let skipped = 0;
  for (const a of state.alerts) {
    if (!a.player) skipped++;
    else if (a.player === a.truth) correct++;
    else wrong++;
  }
  return { correct, wrong, skipped };
}

/** Evaluate a tiny field=value log search (no regex, just equality). */
export function logSearch(state: MeridianState, expr: string): MeridianLogEvent[] {
  const eq: Array<[string, string]> = [];
  const m = expr.matchAll(/(\w+)=([\w.:/-]+)/g);
  for (const x of m) eq.push([x[1]!, x[2]!]);
  if (eq.length === 0) return [...state.logs];
  return state.logs.filter((l) => {
    for (const [k, v] of eq) {
      if (k === 'ts' && String(l.ts) !== v) return false;
      if (k === 'src' && l.src !== v) return false;
      if (k === 'dst' && l.dst !== v) return false;
      if (k === 'port' && String(l.port) !== v) return false;
      if (k === 'proto' && l.proto !== v) return false;
      if (k === 'action' && l.action !== v) return false;
    }
    return true;
  });
}

/** Group a log slice by field. Used by `count by field`. */
export function groupBy<T>(arr: readonly T[], field: (t: T) => string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const x of arr) {
    const k = field(x);
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

register({
  name: 'meridian',
  flags: { '-h': 'emulated' },
  async handle() {
    return [
      [
        {
          kind: 'text',
          text:
            'meridian — Meridian Console (emulated SIEM).\n' +
            '  triage <id> --tp|--fp  mark an alert\n' +
            '  meridian <field>=<value> [| head N | count by <field>]\n',
        },
      ],
    ];
  },
});

export {};