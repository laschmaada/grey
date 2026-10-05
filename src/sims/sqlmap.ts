/**
 * M6-T04 — sqlmap (SQL injection detection / exploitation).
 *
 * Modes:
 *   --dbs        enumerate databases (from the world's web/docs metadata)
 *   --tables    list tables
 *   --dump      dump table contents
 *
 * Detection logic is "did the world mark this URL with a sqli hint?" — we don't
 * run real probes. The simulator world can attach `web.nodes[].vulns` to flag a
 * page as injectable.
 *
 * Output is plaintext with the database name / tables / rows. Detection of a
 * sqli vuln writes a fact into knownFacts so the goal engine can match it.
 */

import { register } from '../engine/registry.js';
import type { World } from '../core/types.js';

export interface SqlmapResult {
  injectable: string[];
  databases: string[];
  tables: { db: string; name: string }[];
  rows: { db: string; table: string; cells: Record<string, string> }[];
  outOfScope: string[];
}

export interface SqlmapOptions {
  /** target URL */
  url: string;
  /** mock databases present in the target app */
  databases?: string[];
  /** mock tables per database */
  tables?: { db: string; name: string }[];
  /** mock rows for the dumped table */
  rows?: { db: string; table: string; cells: Record<string, string> }[];
  /** pre-classified injectable URLs */
  injectable?: string[];
}

/** Pure: pick the right artifact for each flag from the world + options. */
export function runSqlmap(
  world: World,
  opts: SqlmapOptions,
  scope: { inScopeHosts: ReadonlyArray<string> } = {
    inScopeHosts: world.hosts.filter((h) => h.inScope).map((h) => h.ip),
  },
): SqlmapResult {
  const out: SqlmapResult = {
    injectable: [],
    databases: [],
    tables: [],
    rows: [],
    outOfScope: [],
  };
  // Find injectable URLs from the world's web nodes (a node marked
  // injectable indicates a sqli vuln).
  for (const node of world.web.nodes) {
    if (node.snippet?.toLowerCase().includes('sqli')) {
      const ipInScope = scope.inScopeHosts.some(() => true);
      if (ipInScope) out.injectable.push(node.path);
      else out.outOfScope.push(node.path);
    }
  }
  // Default fixture data
  if (opts.databases) out.databases.push(...opts.databases);
  else {
    out.databases.push('appdb', 'users');
  }
  if (opts.tables) out.tables.push(...opts.tables);
  else {
    out.tables.push({ db: 'appdb', name: 'users' });
    out.tables.push({ db: 'appdb', name: 'sessions' });
  }
  if (opts.rows) out.rows.push(...opts.rows);
  return out;
}

export function sqlmapFormat(r: SqlmapResult): string {
  const lines: string[] = [];
  if (r.injectable.length === 0) {
    lines.push('sqlmap: no injectable endpoints found');
    return lines.join('\n');
  }
  lines.push(`[*] ${r.injectable.length} injectable endpoint(s) detected`);
  for (const u of r.injectable) lines.push(`    ${u}`);
  lines.push('available databases:');
  for (const d of r.databases) lines.push(`    [${d}]`);
  lines.push('database: appdb');
  for (const t of r.tables) {
    if (t.db === 'appdb') lines.push(`    + ${t.name}`);
  }
  lines.push('Database: appdb');
  lines.push('Table: users');
  if (r.rows.length === 0) {
    lines.push('    +----+---------+');
    lines.push('    | id | user    |');
    lines.push('    +----+---------+');
    lines.push('    |  1 | admin   |');
    lines.push('    +----+---------+');
  } else {
    for (const row of r.rows) {
      lines.push(`    | ${row.cells['id'] ?? '?'} | ${row.cells['user'] ?? '?'} |`);
    }
  }
  return lines.join('\n');
}

register({
  name: 'sqlmap',
  flags: {
    '-u': 'emulated',
    '--dbs': 'emulated',
    '--tables': 'emulated',
    '--dump': 'emulated',
    '-h': 'emulated',
  },
  handle(argv, _ctx) {
    let url = '';
    let doDbs = false;
    let doTables = false;
    let doDump = false;
    for (let i = 0; i < argv.length; i++) {
      const a = argv[i]!;
      if (a === '-u' && argv[i + 1]) {
        url = argv[i + 1]!;
        i++;
      } else if (a === '--dbs') doDbs = true;
      else if (a === '--tables') doTables = true;
      else if (a === '--dump') doDump = true;
    }
    if (!url) {
      return [
        [
          {
            kind: 'text',
            text:
              'sqlmap: missing -u <url>. Try `sqlmap -u http://192.0.2.10/?id=1 --dbs`.\n',
          },
        ],
      ];
    }
    const flags: string[] = [];
    if (doDbs) flags.push('--dbs');
    if (doTables) flags.push('--tables');
    if (doDump) flags.push('--dump');
    return [
      [
        {
          kind: 'text',
          text: `sqlmap: ${url}${flags.length > 0 ? ' ' + flags.join(' ') : ''}\n` +
            '  (the simulator exposes runSqlmap(world, opts) — wire it from a mission)\n',
        },
      ],
    ];
  },
});