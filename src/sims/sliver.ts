/**
 * M7-T05 — Sliver-style C2 sim.
 *
 * Sliver has its own prompt ("sliver >"). We model a small subset:
 *   generate --http  --save <path>     create an implant (state transition)
 *   listeners http                     start an http listener
 *   use <session>                      activate a session (push prompt)
 *   info                               show implant metadata
 *   ls, ps, info                       basic recon
 *
 * The session/sliver model is similar to the msf prompt stack; the sim here
 * only exposes the recon commands. The actual session machinery lands in
 * a follow-up (the meterpreter module is the canonical session surface).
 */

import { register } from '../engine/registry.js';
import { makeRng } from '../core/rng.js';
import type { World } from '../core/types.js';

export type { World };

export interface SliverImplant {
  /** id */
  id: string;
  /** seed used to derive the implant's command-and-control */
  seed: number;
  hostId: string;
  /** when the implant was generated (virtual ms) */
  generatedAt: number;
}

const IMPLANTS: SliverImplant[] = [];
let nextId = 1;

export function generateImplant(world: World, hostId: string): SliverImplant | null {
  const host = world.hosts.find((h) => h.id === hostId);
  if (!host) return null;
  const rng = makeRng(world.seed ^ nextId);
  const imp: SliverImplant = {
    id: `imp-${nextId++}`,
    seed: rng.next() * 0xffffffff,
    hostId,
    generatedAt: 0,
  };
  IMPLANTS.push(imp);
  return imp;
}

export function listImplants(): ReadonlyArray<SliverImplant> {
  return [...IMPLANTS];
}

export function resetSliver(): void {
  IMPLANTS.length = 0;
  nextId = 1;
}

/** Recon commands: ls / ps / info against a host. */
export function sliverLs(world: World, hostId: string): string[] {
  const host = world.hosts.find((h) => h.id === hostId);
  if (!host) return ['no such host'];
  return [
    'drwxr-xr-x  root root  /',
    'drwxr-xr-x  root root  /home',
    'drwxr-xr-x  root root  /etc',
    '-rw-r--r--  root root  /etc/passwd',
    '-rw-r--r--  root root  /etc/shadow',
  ];
}

export function sliverPs(world: World, hostId: string): string[] {
  const host = world.hosts.find((h) => h.id === hostId);
  if (!host) return ['no such host'];
  return [
    'PID    NAME                USER',
    '1      systemd            root',
    '234    bash               analyst',
    '567    sshd               root',
    '891    implant            root',
  ];
}

export function sliverInfo(world: World, hostId: string): Record<string, string> {
  const host = world.hosts.find((h) => h.id === hostId);
  return {
    'Hostname': host?.hostname ?? 'unknown',
    'OS': host?.os ?? 'unknown',
    'Beacon': 'http(s)://gw.grid.test:80',
    'Interval': '60s',
  };
}

register({
  name: 'sliver',
  flags: { '-h': 'emulated' },
  handle() {
    return [
      [
        {
          kind: 'text',
          text:
            'sliver — emulated C2 console.\n  generate --http  --save <path>\n  listeners http\n  use <session>\n  info | ls | ps\n',
        },
      ],
    ];
  },
});

export {};