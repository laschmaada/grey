/**
 * M7-T04 — Meterpreter subset (inside an active session).
 *
 * Commands (entered at the meterpreter > prompt, which the session pushes
 * after an exploit lands):
 *   sysinfo         OS info
 *   getuid          current user
 *   ps              process list
 *   migrate <pid>   move into a process
 *   hashdump        dump SAM hashes
 *   upload / download
 *   shell           drop to a system shell (delegates to the active session)
 *   background      return to msf prompt
 *   exit            close the session
 *
 * Each command is a pure function over the active session's view of the
 * world. We model process list as a deterministic list seeded by host id.
 */

import { register } from '../engine/registry.js';
import { makeRng } from '../core/rng.js';
import type { World } from '../core/types.js';

export type { World };

export interface MeterpreterSession {
  sessionId: number;
  hostId: string;
  currentPid: number;
  /** whether the player has migrated off the original process */
  migrated: boolean;
}

export interface SysInfo {
  os: string;
  arch: string;
  hostname: string;
  user: string;
}

export interface ProcessEntry {
  pid: number;
  name: string;
  user: string;
  arch: string;
  session: number;
}

export interface HashEntry {
  user: string;
  rid: number;
  lm: string;
  ntlm: string;
}

let _current: MeterpreterSession | null = null;

export function setCurrentSession(s: MeterpreterSession | null): void {
  _current = s;
}

export function currentSession(): MeterpreterSession | null {
  return _current;
}

/** Pure: deterministic process list seeded by host id. */
export function listProcesses(world: World, hostId: string): ProcessEntry[] {
  const host = world.hosts.find((h) => h.id === hostId);
  if (!host) return [];
  const rng = makeRng(hashString(hostId) ^ 0xa11b);
  const names = ['svchost.exe', 'explorer.exe', 'lsass.exe', 'csrss.exe', 'winlogon.exe', 'notepad.exe'];
  const out: ProcessEntry[] = [];
  for (let i = 0; i < 12; i++) {
    out.push({
      pid: 100 + Math.floor(rng.next() * 65000),
      name: names[i % names.length]!,
      user: i % 4 === 0 ? 'NT AUTHORITY\\SYSTEM' : 'CORP\\analyst',
      arch: 'x64',
      session: 1,
    });
  }
  return out;
}

export function sysInfo(world: World, hostId: string): SysInfo {
  const host = world.hosts.find((h) => h.id === hostId);
  return {
    os: 'Windows 10.0 Build 19045',
    arch: 'x64',
    hostname: host?.hostname ?? 'unknown',
    user: 'CORP\\analyst',
  };
}

export function hashdump(world: World, hostId: string): HashEntry[] {
  const host = world.hosts.find((h) => h.id === hostId);
  if (!host) return [];
  const rng = makeRng(hashString(hostId) ^ 0x4a5b);
  const out: HashEntry[] = [
    { user: 'Administrator', rid: 500, lm: 'aad3b435b51404eeaad3b435b51404ee', ntlm: '31d6cfe0d16ae931b73c59d7e0c089c0d' },
  ];
  for (const u of ['analyst', 'j.doe', 'svc_backup', 'admin']) {
    out.push({
      user: u,
      rid: 1000 + Math.floor(rng.next() * 9000),
      lm: 'aad3b435b51404eeaad3b435b51404ee',
      ntlm: randomHex(rng, 32),
    });
  }
  return out;
}

function randomHex(rng: ReturnType<typeof makeRng>, n: number): string {
  let s = '';
  const alphabet = '0123456789abcdef';
  for (let i = 0; i < n; i++) s += alphabet[Math.floor(rng.next() * 16)];
  return s;
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return h >>> 0;
}

export function formatPs(procs: ProcessEntry[]): string {
  const lines: string[] = ['PID   Name              User                          Session', '----  ----------------  ----------------------------  ------'];
  for (const p of procs) {
    lines.push(
      `${p.pid.toString().padEnd(5)}  ${p.name.padEnd(16)}  ${p.user.padEnd(28)}  ${p.session}`,
    );
  }
  return lines.join('\n');
}

export function formatHashdump(hashes: HashEntry[]): string {
  const lines: string[] = ['User             RID    LM                              NTLM', '----------------  -----  ------------------------------  --------------------------------'];
  for (const h of hashes) {
    lines.push(
      `${h.user.padEnd(16)}  ${h.rid.toString().padEnd(5)}  ${h.lm.padEnd(30)}  ${h.ntlm}`,
    );
  }
  return lines.join('\n');
}

register({
  name: 'meterpreter',
  flags: { '-h': 'emulated' },
  handle() {
    return [
      [
        {
          kind: 'text',
          text:
            'meterpreter — emulated sub-prompt inside an active session. Commands: ' +
            'sysinfo, getuid, ps, migrate <pid>, hashdump, upload, download, shell, background, exit. ' +
            'Wire the session via setCurrentSession() and read getProcessList() / hashdump().\n',
        },
      ],
    ];
  },
});

export {};