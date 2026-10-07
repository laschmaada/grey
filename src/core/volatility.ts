/**
 * M8-T01 — Volatility-3-style sim.
 *
 * Reads structured memory-image fixtures (we don't parse real `.raw`/`.dmp` files).
 * Supported plugins: `windows.pslist`, `windows.pstree`, `windows.malfind`,
 * `windows.netscan`, `windows.cmdline`.
 *
 * The fixture is a `MemoryImage` built deterministically from the world seed.
 * Process names are seeded; the "malware" process appears on the host when
 * the world has a matching Vuln entry.
 */

import { register } from '../engine/registry.js';
import { makeRng } from '../core/rng.js';
import type { World } from '../core/types.js';

export type { Host } from '../core/types.js';

export interface MemoryProcess {
  pid: number;
  ppid: number;
  name: string;
  user: string;
  /** if true, flagged as potentially malicious by malfind */
  suspicious: boolean;
  /** suspicious memory protections (RWE / no-image) */
  protections: string[];
  /** command line from windows.cmdline */
  cmdline: string;
}

export interface MemoryConnection {
  pid: number;
  localAddr: string;
  localPort: number;
  remoteAddr: string;
  remotePort: number;
  state: 'ESTABLISHED' | 'LISTEN' | 'TIME_WAIT';
}

export interface MemoryImage {
  hostId: string;
  processes: MemoryProcess[];
  connections: MemoryConnection[];
}

const PROCESS_POOL = [
  'svchost.exe',
  'lsass.exe',
  'csrss.exe',
  'services.exe',
  'explorer.exe',
  'chrome.exe',
  'notepad.exe',
  'UpdaterSvc.exe', // Rook's persistence
  'beacon.exe', // beacon payload
];

export function buildMemoryImage(world: World, hostId: string): MemoryImage {
  const host = world.hosts.find((h) => h.id === hostId);
  if (!host) return { hostId, processes: [], connections: [] };
  const rng = makeRng(world.seed ^ hashString(hostId));
  const procs: MemoryProcess[] = [];
  for (let i = 0; i < 16; i++) {
    const name = PROCESS_POOL[i % PROCESS_POOL.length]!;
    const pid = 100 + Math.floor(rng.next() * 65000);
    procs.push({
      pid,
      ppid: i === 0 ? 0 : procs[0]!.pid,
      name,
      user: i % 4 === 0 ? 'NT AUTHORITY\\SYSTEM' : 'CORP\\analyst',
      suspicious: name === 'beacon.exe' || name === 'UpdaterSvc.exe',
      protections: name === 'beacon.exe' ? ['RWX'] : ['PAGE_EXECUTE_READ'],
      cmdline: name === 'beacon.exe' ? 'C:\\Windows\\beacon.exe --host gw.grid.test' : '',
    });
  }
  // Add a beacon connection out
  const conns: MemoryConnection[] = [
    {
      pid: procs.find((p) => p.name === 'beacon.exe')?.pid ?? 234,
      localAddr: host.ip,
      localPort: 49152,
      remoteAddr: '198.51.100.7',
      remotePort: 4444,
      state: 'ESTABLISHED',
    },
  ];
  return { hostId, processes: procs, connections: conns };
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return h >>> 0;
}

function getImage(world: World, hostId: string): MemoryImage {
  return buildMemoryImage(world, hostId);
}

/** windows.pslist */
export function psList(world: World, hostId: string): MemoryProcess[] {
  return getImage(world, hostId).processes;
}

/** windows.pstree — process tree as adjacency list */
export interface PsTreeNode {
  pid: number;
  name: string;
  children: PsTreeNode[];
}
export function psTree(world: World, hostId: string): PsTreeNode {
  const procs = getImage(world, hostId).processes;
  const byPid = new Map<number, PsTreeNode>();
  for (const p of procs) byPid.set(p.pid, { pid: p.pid, name: p.name, children: [] });
  let root: PsTreeNode | null = null;
  for (const p of procs) {
    const node = byPid.get(p.pid)!;
    if (p.ppid === 0 || !byPid.has(p.ppid)) {
      root = node;
    } else {
      byPid.get(p.ppid)!.children.push(node);
    }
  }
  return root ?? { pid: 0, name: '<empty>', children: [] };
}

/** windows.malfind */
export function malfind(world: World, hostId: string): Array<{ pid: number; name: string; protections: string[] }> {
  return getImage(world, hostId).processes
    .filter((p) => p.suspicious || p.protections.includes('RWX'))
    .map((p) => ({ pid: p.pid, name: p.name, protections: p.protections }));
}

/** windows.netscan */
export function netscan(world: World, hostId: string): MemoryConnection[] {
  return getImage(world, hostId).connections;
}

/** windows.cmdline */
export function cmdline(world: World, hostId: string): Array<{ pid: number; name: string; cmdline: string }> {
  return getImage(world, hostId).processes
    .filter((p) => p.cmdline.length > 0)
    .map((p) => ({ pid: p.pid, name: p.name, cmdline: p.cmdline }));
}

register({
  name: 'volatility',
  flags: { '-h': 'emulated' },
  handle() {
    return [
      [
        {
          kind: 'text',
          text:
            'volatility — emulated memory forensics. Use psList / psTree / malfind / netscan / cmdline from a mission. Source: the world\'s host memory image is built deterministically from the seed.\n',
        },
      ],
    ];
  },
});

export {};