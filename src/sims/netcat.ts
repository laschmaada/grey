/**
 * M6-T02 — Netcat (TCP read/write) with scheduled reverse connections.
 *
 * Real netcat: `nc -lvnp <port>` listens; `nc host port` connects. We model:
 *   - listener: open a port on a host, accept the connection, write a flag,
 *     close.
 *   - connect: from another host (or the player) to a listening port.
 *   - scheduled reverse: the world's vuln has a backdoor that calls back
 *     to the player on a fixed interval (M6-T02 + a2-first-blood).
 *
 * The player mode is emulated — we never open a real socket. The world's
 * `vulns` array can include a `kind: 'backdoor'` with `moduleRef:
 * 'exploit/...'` and we synthesise a "reverse connection" event after a delay.
 */

import { register } from '../engine/registry.js';
import type { World } from '../core/types.js';

export interface NetcatListener {
  /** which host listens */
  hostId: string;
  /** listening port */
  port: number;
  /** when (virtual ms) the listener started */
  startedAt: number;
  /** output produced when something connects */
  flag?: string;
}

export interface NetcatEvent {
  id: number;
  type: 'connect' | 'reverse-shell' | 'close';
  at: number;
  from: string;
  to: string;
  port: number;
  payload?: string;
}

const LISTENERS: NetcatListener[] = [];
let nextId = 1;

/** Start a listener on a host:port. Returns the listener record. */
export function startListener(
  world: World,
  hostId: string,
  port: number,
  flag?: string,
): NetcatListener | null {
  const host = world.hosts.find((h) => h.id === hostId);
  if (!host) return null;
  const l: NetcatListener = {
    hostId,
    port,
    startedAt: world.seed, // virtual ms — first valid timestamp
    ...(flag !== undefined ? { flag } : {}),
  };
  LISTENERS.push(l);
  return l;
}

/** Connect to a listener. Returns the resulting event (or null if no listener). */
export function connect(from: string, to: string, port: number, payload = ''): NetcatEvent | null {
  const l = LISTENERS.find((x) => x.port === port && x.hostId === to);
  if (!l) return null;
  const ev: NetcatEvent = {
    id: nextId++,
    type: 'reverse-shell',
    at: l.startedAt + 1500,
    from,
    to,
    port,
  };
  if (l.flag) ev.payload = l.flag;
  if (payload) ev.payload = (ev.payload ?? '') + payload;
  return ev;
}

/** Schedule a reverse connection (the world's backdoor calls home). */
export function scheduleReverse(
  fromHostId: string,
  fromPort: number,
  _toHostId: string,
  _toPort: number,
  afterMs: number,
): NetcatEvent {
  const ev: NetcatEvent = {
    id: nextId++,
    type: 'reverse-shell',
    at: afterMs,
    from: fromHostId,
    to: _toHostId,
    port: fromPort,
  };
  return ev;
}

/** Pure: list all listeners. */
export function listListeners(): ReadonlyArray<NetcatListener> {
  return [...LISTENERS];
}

export function resetNetcat(): void {
  LISTENERS.length = 0;
  nextId = 1;
}

register({
  name: 'nc',
  flags: {
    '-l': 'emulated',
    '-v': 'emulated',
    '-p': 'emulated',
    '-n': 'emulated',
    '-e': 'not-emulated',
  },
  handle(argv, _ctx) {
    const listen = argv.includes('-l') || argv.includes('-lvnp');
    let port = 0;
    for (let i = 0; i < argv.length; i++) {
      if (argv[i] === '-p' && argv[i + 1]) {
        port = Number(argv[i + 1]!);
        i++;
      }
    }
    if (listen && port > 0) {
      return [
        [
          {
            kind: 'text',
            text: `nc: listening on 0.0.0.0:${port} (use the runNetcat() session / Mission APIs to actually accept connections).\n`,
          },
        ],
      ];
    }
    const host = argv.find((a) => !a.startsWith('-'));
    if (host && port > 0) {
      return [
        [
          {
            kind: 'text',
            text: `nc: ${host} ${port} (connect path — wires through session/runNetcat() from a mission)\n`,
          },
        ],
      ];
    }
    return [
      [
        {
          kind: 'text',
          text: 'nc: usage: nc -lvnp <port>  OR  nc <host> <port>\n',
        },
      ],
    ];
  },
});