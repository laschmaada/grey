/**
 * M7-T05 — Hydra (online brute-force) and John (offline hash cracking) sims.
 *
 * Hydra accepts username/wordlist/host/port and returns a fake "cracked"
 * record for one entry (deterministic by world seed). John takes a
 * dump of NTLM hashes and returns a "cracked" subset.
 *
 * Both register as emulated tools. The "cracks" come from a small
 * fixture table that's seeded by world.seed ^ user — there is no real
 * brute-force; the sim just pretends a credential is recovered so the
 * player can move on.
 */

import { register } from '../engine/registry.js';
import { makeRng } from '../core/rng.js';
import type { World } from '../core/types.js';

export interface HydraHit {
  host: string;
  port: number;
  user: string;
  password: string;
}

const FIXTURE_CREDS: Array<[string, string]> = [
  ['admin', 'admin123'],
  ['analyst', 'Spring2025!'],
  ['root', 'toor'],
  ['svc_backup', 'P@ssw0rd!'],
  ['j.doe', 'ChangeMe!'],
];

export function runHydra(
  _world: World,
  host: string,
  port: number,
  user: string,
  wordlist: string[] = [],
): HydraHit | null {
  const found = FIXTURE_CREDS.find((c) => c[0] === user);
  if (!found) {
    if (wordlist.length === 0) return null;
    const w = wordlist[0]!;
    return { host, port, user, password: w };
  }
  return { host, port, user: found[0]!, password: found[1]! };
}

/** Crack a hash file. Returns map: user -> plaintext. */
export function runJohn(
  world: World,
  hashes: Array<{ user: string; ntlm: string }>,
): Array<{ user: string; ntlm: string; plaintext: string }> {
  const out: Array<{ user: string; ntlm: string; plaintext: string }> = [];
  for (const h of hashes) {
    const fixture = FIXTURE_CREDS.find((c) => c[0] === h.user);
    if (fixture) {
      out.push({ user: h.user, ntlm: h.ntlm, plaintext: fixture[1]! });
    } else {
      // synthesise a deterministic "crack" from the seed so the test can assert
      // something for any input
      const rng = makeRng(world.seed ^ hashString(h.ntlm));
      out.push({ user: h.user, ntlm: h.ntlm, plaintext: `crack-${(rng.next() * 1000) | 0}` });
    }
  }
  return out;
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return h >>> 0;
}

register({
  name: 'hydra',
  flags: {
    '-L': 'emulated',
    '-l': 'emulated',
    '-P': 'emulated',
    '-p': 'emulated',
    'ssh': 'emulated',
    'ftp': 'emulated',
    'http-post': 'emulated',
  },
  handle() {
    return [
      [
        {
          kind: 'text',
          text:
            'hydra — emulated brute-forcer. Use runHydra(world, host, port, user, wordlist) from a mission.\n',
        },
      ],
    ];
  },
});

register({
  name: 'john',
  flags: {
    '--wordlist': 'emulated',
    '--format': 'emulated',
    '--show': 'emulated',
  },
  handle() {
    return [
      [
        {
          kind: 'text',
          text:
            'john — emulated offline cracker. Use runJohn(world, hashes) from a mission.\n',
        },
      ],
    ];
  },
});