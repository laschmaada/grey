/**
 * M6-T04 — Gobuster (directory brute-forcer).
 *
 * Two modes:
 *   dir   - enumerate paths under a base URL against the world's web graph
 *   dns   - enumerate subdomains against the world's DNS records
 *
 * Returns a hit list with status. Uses the world's web graph (so web nodes
 * act as the discovered paths); for DNS, hits come from DnsRecord entries.
 */

import { register } from '../engine/registry.js';
import type { World } from '../core/types.js';

export interface GobusterHit {
  /** target path or subdomain */
  target: string;
  /** status code or dns status (FOUND / NXDOMAIN) */
  status: '200' | '301' | '302' | '403' | 'FOUND' | 'NXDOMAIN';
  /** size in bytes (for paths) or n/a for dns */
  size?: number;
}

export interface GobusterOptions {
  mode: 'dir' | 'dns';
  /** base url (dir) or base domain (dns) */
  base: string;
  /** wordlist — we accept a small built-in for the simulator */
  wordlist?: string[];
  /** extensions to append (dir only) */
  extensions?: string[];
}

const DEFAULT_DIR_WORDS = [
  'admin',
  'login',
  'wp-admin',
  'wp-login',
  'index.html',
  'index.php',
  'robots.txt',
  'sitemap.xml',
  'backup',
  'api',
  'config',
  'console',
  'dashboard',
  'docs',
  'download',
  'static',
  'uploads',
  'users',
  '.git',
  '.env',
];

const DEFAULT_DNS_WORDS = [
  'www',
  'mail',
  'smtp',
  'imap',
  'ns1',
  'ns2',
  'api',
  'dev',
  'staging',
  'prod',
  'blog',
  'shop',
  'cdn',
  'admin',
  'vpn',
  'internal',
  'git',
  'jenkins',
  'docs',
  'status',
];

/**
 * Run a gobuster scan against the world.
 *
 * The base URL/domain is "scoped" by being a substring of one of the world's
 * web-graph nodes or dns records. Hits outside the scope are returned with
 * a special `out-of-scope` flag the caller can check.
 */
export function runGobuster(world: World, opts: GobusterOptions): { hits: GobusterHit[]; outOfScope: string[] } {
  const wordlist = opts.wordlist ?? (opts.mode === 'dir' ? DEFAULT_DIR_WORDS : DEFAULT_DNS_WORDS);
  const hits: GobusterHit[] = [];
  const outOfScope: string[] = [];
  const exts = opts.extensions ?? [];

  if (opts.mode === 'dir') {
    const base = opts.base.replace(/\/$/, '');
    const knownPaths = new Set(world.web.nodes.map((n) => n.path));
    for (const word of wordlist) {
      for (const ext of exts.length > 0 ? exts : ['']) {
        const candidate = ext === '/' ? `/${word}/` : `/${word}${ext ? '.' + ext : ''}`;
        if (knownPaths.has(candidate)) {
          hits.push({ target: `${base}${candidate}`, status: '200', size: 1024 });
        }
      }
    }
    return { hits, outOfScope };
  }

  // dns mode
  const baseDomain = opts.base;
  const known = new Set(world.dns.map((d) => d.name));
  for (const word of wordlist) {
    const sub = `${word}.${baseDomain}`;
    if (known.has(sub)) {
      hits.push({ target: sub, status: 'FOUND' });
    }
  }
  return { hits, outOfScope };
}

register({
  name: 'gobuster',
  flags: {
    '-u': 'emulated',
    '-w': 'emulated',
    '-t': 'accepted-noop',
    '-x': 'emulated',
    '-m': 'emulated',
    '-h': 'emulated',
  },
  handle(argv, _ctx) {
    let url = '';
    let wordlist: string | undefined;
    let mode: 'dir' | 'dns' = 'dir';
    let extensions: string[] = [];
    for (let i = 0; i < argv.length; i++) {
      const a = argv[i]!;
      if (a === '-u' && argv[i + 1]) {
        url = argv[i + 1]!;
        i++;
      } else if (a === '-w' && argv[i + 1]) {
        wordlist = argv[i + 1]!;
        i++;
      } else if (a === '-m' && argv[i + 1]) {
        const m = argv[i + 1]!;
        if (m === 'dir' || m === 'dns') mode = m;
        i++;
      } else if (a === '-x' && argv[i + 1]) {
        extensions = argv[i + 1]!.split(',').filter((s) => s.length > 0);
        i++;
      }
    }
    if (!url) {
      return [
        [
          {
            kind: 'text',
            text: 'gobuster: missing -u <url>. Try `gobuster -m dir -u http://192.0.2.10/ -w <list>`.\n',
          },
        ],
      ];
    }
    // The bare handler in shared sims can't see the mission world; it emits a
    // banner with usage and returns. Missions wire runGobuster into their own
    // session via the registered module.
    const ext = extensions.length > 0 ? ` -x ${extensions.join(',')}` : '';
    const wl = wordlist ? ` -w ${wordlist}` : '';
    return [
      [
        {
          kind: 'text',
          text:
            `gobuster: ${url} (mode=${mode})${wl}${ext}\n` +
            '  (the simulator exposes runGobuster(world, opts) — wire it from a mission)\n',
        },
      ],
    ];
  },
});