/**
 * M6-T01 — OSINT sims: certlog, theHarvester, and Wayback (archive) page history.
 *
 *   certlog <domain>             — certificate-transparency stand-in: returns
 *                                  SANs present in the world's DNS / vulns.
 *   theharvester -d <domain> -b <source>
 *                                — list emails/subdomains by source ('all').
 *   wayback <path>               — list archive snapshots for a path (deterministic).
 *
 * All three read the world. They never make real network calls.
 */

import { register } from '../engine/registry.js';
import type { World } from '../core/types.js';
import { makeRng } from '../core/rng.js';

export interface CertlogResult {
  cn: string;
  san: string[];
  issuer: string;
  validFrom: number;
  validTo: number;
}

export function runCertlog(world: World, domain: string): CertlogResult[] {
  const results: CertlogResult[] = [];
  const inScopeHosts = world.hosts.filter((h) => h.inScope);
  if (inScopeHosts.length === 0) return results;
  const baseHost = inScopeHosts[0]!;
  const rng = makeRng(world.seed ^ 0xc3);

  // Find hosts whose hostname ends with the queried domain
  const matching = inScopeHosts.filter((h) => (h.hostname ?? '').endsWith(domain));

  for (const h of matching.length > 0 ? matching : [baseHost]) {
    const san = [
      ...matching.map((m) => m.hostname ?? m.ip),
      ...world.dns
        .filter((d) => d.name.endsWith(domain))
        .map((d) => d.name),
    ].slice(0, 6);
    results.push({
      cn: h.hostname ?? h.ip,
      san,
      issuer: ['Let\'s Encrypt', 'DigiCert', 'Self-signed'][rng.int(0, 2)]!,
      validFrom: 1_700_000_000 + rng.int(0, 86400),
      validTo: 1_736_000_000 + rng.int(0, 86400 * 365),
    });
  }
  return results;
}

export function formatCertlog(results: CertlogResult[]): string {
  if (results.length === 0) return '(no certificate history found)';
  const lines: string[] = [];
  for (const r of results) {
    lines.push(`CN=${r.cn}`);
    lines.push(`  issuer: ${r.issuer}`);
    lines.push(`  SAN: ${r.san.join(', ')}`);
    lines.push(`  validFrom: ${formatCert(r.validFrom)}`);
    lines.push(`  validTo: ${formatCert(r.validTo)}`);
  }
  return lines.join('\n');
}

function formatCert(unixSec: number): string {
  // Deterministic ISO-ish format without Date.now() (D6 ban).
  // Format: 2024-01-01T00:00:00Z (computed from unix seconds).
  const d = epochDays(unixSec);
  const year = 1970 + Math.floor(d / 365.25);
  const h = Math.floor((unixSec % 86400) / 3600);
  const m = Math.floor((unixSec % 3600) / 60);
  const s = unixSec % 60;
  return `${year}-01-01T${pad2(h)}:${pad2(m)}:${pad2(s)}Z`;
}

function epochDays(unixSec: number): number {
  return Math.floor(unixSec / 86400);
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export interface HarvesterEmail {
  email: string;
  source: string; // 'dns' / 'certlog' / 'docs' / 'web'
}

export function runHarvester(world: World, domain: string): HarvesterEmail[] {
  const out: HarvesterEmail[] = [];
  // Synthesise a deterministic but fictional email pool from the world's
  // hostname + domain seed.
  const rng = makeRng(world.seed ^ 0xa11a);
  const prefix = (domain.split('.')[0] ?? 'example').toLowerCase();
  const users = ['admin', 'root', 'security', 'noreply', 'support', 'sales', 'ops', 'eng'];
  for (const u of users) {
    if (rng.next() < 0.6) {
      out.push({ email: `${u}@${prefix}.test`, source: 'dns' });
    }
  }
  // Subdomains from dns records
  for (const d of world.dns) {
    if (d.name.endsWith(domain) && rng.next() < 0.4) {
      out.push({ email: `noreply@${d.name}`, source: 'certlog' });
    }
  }
  // From the world's docs (if a doc has an email-shaped id we surface it)
  for (const doc of world.docs) {
    if (doc.id.includes('@') && rng.next() < 0.5) {
      out.push({ email: doc.id, source: 'docs' });
    }
  }
  return out;
}

export function formatHarvester(results: HarvesterEmail[]): string {
  if (results.length === 0) return '(no email entries)';
  const lines: string[] = [`${results.length} email(s):`];
  for (const r of results) {
    lines.push(`  ${r.email.padEnd(40)}  source: ${r.source}`);
  }
  return lines.join('\n');
}

export interface WaybackSnapshot {
  path: string;
  timestamp: number;
  /** sha256-like digest (deterministic) */
  digest: string;
}

export function runWayback(world: World, path: string): WaybackSnapshot[] {
  const rng = makeRng((world.seed ^ 0x511e) + (path.length * 7));
  const count = 2 + Math.floor(rng.next() * 4);
  const out: WaybackSnapshot[] = [];
  let lastTs = 1_650_000_000 + rng.int(0, 86400 * 30);
  for (let i = 0; i < count; i++) {
    lastTs += 86400 * (30 + rng.int(0, 90));
    const d = Buffer.alloc(8);
    for (let j = 0; j < 8; j++) d[j] = (rng.next() * 256) | 0;
    out.push({
      path,
      timestamp: lastTs,
      digest: d.toString('hex'),
    });
  }
  return out;
}

export function formatWayback(snapshots: WaybackSnapshot[]): string {
  if (snapshots.length === 0) return '(no snapshots)';
  const lines: string[] = [`${snapshots.length} snapshot(s):`];
  for (const s of snapshots) {
    lines.push(
      `  ${epochDate(s.timestamp)}  ${s.path}  ${s.digest}`,
    );
  }
  return lines.join('\n');
}

register({
  name: 'certlog',
  flags: { '-h': 'emulated' },
  handle(argv, _ctx) {
    const domain = argv[argv.length - 1] ?? '';
    return [
      [
          {
            kind: 'text',
            text: `certlog: ${domain} (the simulator exposes runCertlog(world, domain) — wire it from a mission)\n`,
          },
        ],
    ];
  },
});

register({
  name: 'theharvester',
  flags: {
    '-d': 'emulated',
    '-b': 'emulated',
    '-h': 'emulated',
  },
  handle(argv, _ctx) {
    let domain = '';
    for (let i = 0; i < argv.length; i++) {
      if (argv[i] === '-d' && argv[i + 1]) {
        domain = argv[i + 1]!;
        i++;
      }
    }
    return [
      [
        {
          kind: 'text',
          text: `theharvester: ${domain || '(no -d)'} (the simulator exposes runHarvester(world, domain))\n`,
        },
      ],
    ];
  },
});

register({
  name: 'wayback',
  flags: { '-h': 'emulated' },
  handle(argv, _ctx) {
    const path = argv[argv.length - 1] ?? '';
    return [
      [
        {
          kind: 'text',
          text: `wayback: ${path} (the simulator exposes runWayback(world, path))\n`,
        },
      ],
    ];
  },
});

function epochDate(unixSec: number): string {
  // Deterministic YYYY-MM-DD from unix seconds (no Date).
  const d = Math.floor(unixSec / 86400);
  const year = 1970 + Math.floor(d / 365.25);
  return `${year}-01-01`;
}

export {};