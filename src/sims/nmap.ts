/**
 * Nmap sim (§4.6).
 *
 * Recognised flags (per CODING_PLAN §6 M2-T04):
 *   -sV (version), -sC (script), -sS (SYN), -sT (TCP connect),
 *   -p <list>, -p- (all ports), --top-ports <n>,
 *   -Pn (no ping), -T0..-T5 (timing), -A (aggressive), -v, -oN <file>
 *
 * Unsupported: -O, --script (we don't model scripts; -sC is a placeholder for "scripts
 * against open ports, but only banner-related ones"), --iflist, etc. → not-emulated.
 */

import { register } from '../engine/registry.js';
import { TOOL_VERSIONS } from '../content/versions.js';
import type { Host, Service } from '../core/types.js';
import type { OutputSpan } from '../engine/output.js';

const TIMING_MS: Record<string, number> = {
  T0: 5_000,
  T1: 2_500,
  T2: 1_500,
  T3: 750,
  T4: 400,
  T5: 100,
};

function parsePorts(spec: string, services: ReadonlyArray<Service>): number[] {
  if (spec === '-') return services.map((s) => s.port);
  const tops = (n: number) =>
    [...new Set(services.map((s) => s.port))]
      .sort((a, b) => a - b)
      .slice(0, n);
  if (spec.startsWith('top-ports:')) {
    return tops(Number(spec.slice('top-ports:'.length)));
  }
  if (spec.includes(',')) {
    return spec
      .split(',')
      .map((p) => Number(p))
      .filter((n) => Number.isFinite(n));
  }
  if (spec.includes('-')) {
    const [a, b] = spec.split('-').map(Number);
    if (a !== undefined && b !== undefined && Number.isFinite(a) && Number.isFinite(b)) {
      const ports: number[] = [];
      for (let p = a; p <= b; p++) ports.push(p);
      return ports;
    }
  }
  const n = Number(spec);
  return Number.isFinite(n) ? [n] : [];
}

interface NmapArgs {
  version: boolean;
  script: boolean;
  syn: boolean;
  tcpConnect: boolean;
  ports: number[] | 'all';
  topPorts: number | null;
  noPing: boolean;
  timing: string;
  aggressive: boolean;
  verbose: boolean;
  outputFile: string | null;
  targets: string[];
}

function parseArgs(argv: string[]): NmapArgs {
  const out: NmapArgs = {
    version: false,
    script: false,
    syn: false,
    tcpConnect: false,
    ports: [],
    topPorts: null,
    noPing: false,
    timing: 'T3',
    aggressive: false,
    verbose: false,
    outputFile: null,
    targets: [],
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === '-sV') out.version = true;
    else if (a === '-sC') out.script = true;
    else if (a === '-sS') out.syn = true;
    else if (a === '-sT') out.tcpConnect = true;
    else if (a === '-p-') out.ports = 'all';
    else if (a === '-p' && argv[i + 1]) {
      out.ports = parsePorts(argv[i + 1]!, []);
      i++;
    } else if (a.startsWith('-p') && a.length > 2) {
      out.ports = parsePorts(a.slice(2), []);
    } else if (a === '--top-ports' && argv[i + 1]) {
      out.topPorts = Number(argv[i + 1]);
      i++;
    } else if (a.startsWith('--top-ports=')) {
      out.topPorts = Number(a.split('=')[1]);
    } else if (a === '-Pn') out.noPing = true;
    else if (/^-T[0-5]$/.test(a)) out.timing = a.slice(1);
    else if (a === '-A') {
      out.version = true;
      out.script = true;
      out.aggressive = true;
    } else if (a === '-v') out.verbose = true;
    else if (a === '-oN' && argv[i + 1]) {
      out.outputFile = argv[i + 1] ?? null;
      i++;
    } else if (!a.startsWith('-')) {
      out.targets.push(a);
    }
  }
  return out;
}

/** Format nmap-style banner block. */
export function formatNmap(args: NmapArgs, host: Host, services: ReadonlyArray<Service>): string {
  const ver = TOOL_VERSIONS.nmap;
  // Deterministic placeholder date (D6: no Date.now() in core/engine/sims/systems/content).
  const date2 = '2026-01-01 00:00 +0000';

  const lines: string[] = [];
  lines.push(`Starting Nmap ${ver} ( https://nmap.org ) at ${date2}`);
  lines.push(`Nmap scan report for ${host.hostname ?? host.ip})`);
  lines.push(`Host is up (0.00${args.noPing ? '0' : '12'}s latency).`);

  const targetPorts =
    args.ports === 'all'
      ? services.map((s) => s.port)
      : args.topPorts !== null
        ? [...new Set(services.map((s) => s.port))]
            .sort((a, b) => a - b)
            .slice(0, args.topPorts)
        : args.ports;

  const shown: string[] = [];
  for (const svc of services) {
    if (!targetPorts.includes(svc.port)) continue;
    if (svc.state !== 'open') continue;
    const verStr =
      args.version && svc.product
        ? ` ${svc.product} ${svc.version ?? ''}`.trim()
        : '';
    const extra = args.script && svc.banner ? `\n| ${svc.banner}` : '';
    shown.push(
      `| ${svc.port.toString().padEnd(7)}${svc.state.padEnd(8)}${svc.name.padEnd(11)}${verStr}${extra}`,
    );
  }
  lines.push('Not shown: ' + (services.length - shown.length) + ' closed tcp ports');
  lines.push('PORT     STATE  SERVICE   VERSION');
  shown.forEach((l) => lines.push(l.trimStart()));
  lines.push(`Service Info: OS: ${host.os}`);
  lines.push(
    `Nmap done: 1 IP address (1 host up) scanned in ${(TIMING_MS[args.timing]! / 1000).toFixed(2)} seconds`,
  );
  return lines.join('\n') + '\n';
}

/** Run a scan against the supplied world — pure: returns spans + suggested clock advance + noise. */
export interface NmapResult {
  blocks: string[][];
  durationMs: number;
  noise: number;
  outOfScopeTouched: boolean;
}

export function runNmap(args: NmapArgs, host: Host, isInScope: boolean): NmapResult {
  const durationMs = TIMING_MS[args.timing] ?? 750;
  const portsConsidered = host.services.filter((s) => s.state === 'open').length;
  const noise = portsConsidered * (args.syn ? 0.05 : 0.1) * (args.version ? 1.5 : 1);
  const block = formatNmap(args, host, host.services);
  return {
    blocks: [block.split('\n')],
    durationMs,
    noise,
    outOfScopeTouched: !isInScope,
  };
}

register({
  name: 'nmap',
  flags: {
    '-sV': 'emulated',
    '-sC': 'emulated',
    '-sS': 'emulated',
    '-sT': 'emulated',
    '-p': 'emulated',
    '-p-': 'emulated',
    '--top-ports': 'emulated',
    '-Pn': 'emulated',
    '-T0': 'emulated',
    '-T1': 'emulated',
    '-T2': 'emulated',
    '-T3': 'emulated',
    '-T4': 'emulated',
    '-T5': 'emulated',
    '-A': 'emulated',
    '-v': 'emulated',
    '-oN': 'emulated',
    '-O': 'not-emulated',
    '--iflist': 'not-emulated',
    '-sU': 'not-emulated',
  },
  handle(argv, ctx) {
    const args = parseArgs(argv);
    if (args.targets.length === 0) {
      return [[{ kind: 'text', text: 'nmap: no target specified. Try `nmap -Pn 192.0.2.10`.\n' }]];
    }
    ctx.clock.advance(TIMING_MS[args.timing] ?? 750);

    // Real path: a targetHost was resolved from the mission world. Render
    // a full nmap-style report.
    if (ctx.targetHost && args.version) {
      const host = ctx.targetHost;
      const services = host.services;
      const report: OutputSpan[] = [];
      report.push({ kind: 'text', text: `Starting Nmap ${TOOL_VERSIONS.nmap} ( https://nmap.org ) at 2026-01-01 00:00 +0000\n` });
      report.push({ kind: 'text', text: `Initiating Service scan against ${host.hostname ?? host.ip}\n` });
      // host state line — emulated "Host is up"
      report.push({ kind: 'text', text: `Note: Host is up (latency from timing template ${args.timing}).\n` });
      // PORT table
      report.push({ kind: 'text', text: '\nPORT      STATE  SERVICE       VERSION\n' });
      for (const s of services) {
        if (s.state !== 'open') continue;
        const port = String(s.port).padEnd(9);
        const state = s.state.padEnd(6);
        const svc = s.name.padEnd(13);
        const ver = s.version ?? s.product ?? '?';
        report.push({ kind: 'text', text: `${port}${state}${svc}${ver}\n` });
        // write knowledge: the player has now identified this service
        ctx.writeFact(`service:${host.id}:${s.port}`);
        ctx.writeFact(`service:${host.id}:${s.port}:version`, ver);
        ctx.emit('service_identified', { hostId: host.id, port: s.port, name: s.name, version: ver });
      }
      // Not shown line (deterministic per closed-vs-filtered)
      const closed = services.filter((s) => s.state === 'closed').length;
      const filtered = services.filter((s) => s.state === 'filtered').length;
      if (closed + filtered > 0) {
        report.push({ kind: 'text', text: `Not shown: ${closed} closed, ${filtered} filtered\n` });
      }
      // Service Info
      if (host.os) report.push({ kind: 'text', text: `Service Info: OS: ${host.os}\n` });
      // Summary
      report.push({ kind: 'text', text: `\nNmap done: 1 IP address (1 host up) in ${((TIMING_MS[args.timing] ?? 750) / 1000).toFixed(2)} seconds\n` });
      // Emit a generic command event so transcript tests can assert on it.
      ctx.emit('command', { tool: 'nmap', argv, timing: args.timing });
      return [report];
    }

    // Bare dispatcher (no world wired or no -sV). Helpful for the REPL and
    // for missions that haven't been loaded.
    ctx.emit('command', { tool: 'nmap', argv, timing: args.timing });
    const lines = [
      `Starting Nmap ${TOOL_VERSIONS.nmap} ( https://nmap.org ) at 2026-01-01 00:00 +0000`,
      ctx.targetHost
        ? `Targets: ${args.targets.join(', ')}  Timing: ${args.timing}  Ports: ${args.ports === 'all' ? 'all' : JSON.stringify(args.ports)}`
        : `Targets: ${args.targets.join(', ')}  Timing: ${args.timing}  Ports: ${args.ports === 'all' ? 'all' : JSON.stringify(args.ports)}  (host not in current mission world — open a mission via the Hub to scan)`,
    ];
    return [
      lines.map((l) => ({ kind: 'text' as const, text: l + '\n' })),
    ];
  },
});

void parsePorts;