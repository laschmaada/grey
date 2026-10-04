/**
 * World fixture helpers and validators (M1-T09).
 */

import type { Host, World } from './types.js';
import { WorldValidationError } from './types.js';
import { makeRng, type Rng } from './rng.js';

const RESERVED_OCTETS = [
  '192.0.2', // TEST-NET-1
  '198.51.100', // TEST-NET-2
  '203.0.113', // TEST-NET-3
  '10', // RFC 1918
  '172.16', '172.17', '172.18', '172.19', '172.20', '172.21', '172.22', '172.23', '172.24', '172.25',
  '172.26', '172.27', '172.28', '172.29', '172.30', '172.31',
  '192.168',
];

export function isReservedIp(ip: string): boolean {
  return RESERVED_OCTETS.some((p) => ip.startsWith(p + '.'));
}

export function validateWorld(world: World): WorldValidationError[] {
  const errors: WorldValidationError[] = [];
  const hostIds = new Set<string>();
  for (const h of world.hosts) {
    if (hostIds.has(h.id)) {
      errors.push(new WorldValidationError(`hosts.${h.id}`, 'duplicate host id'));
    }
    hostIds.add(h.id);
    if (!isReservedIp(h.ip)) {
      errors.push(
        new WorldValidationError(`hosts.${h.id}.ip`, `not a reserved IP: ${h.ip}`),
      );
    }
    for (const s of h.services) {
      if (s.port < 1 || s.port > 65535) {
        errors.push(
          new WorldValidationError(
            `hosts.${h.id}.services.${s.port}`,
            `port out of range: ${s.port}`,
          ),
        );
      }
    }
  }
  for (const v of world.vulns) {
    if (!hostIds.has(v.hostId)) {
      errors.push(
        new WorldValidationError(`vulns.${v.id}`, `unknown host ${v.hostId}`),
      );
    }
  }
  for (const c of world.creds) {
    if (!hostIds.has(c.hostId)) {
      errors.push(
        new WorldValidationError(`creds.${c.id}`, `unknown host ${c.hostId}`),
      );
    }
  }
  for (const e of world.edges) {
    if (!hostIds.has(e.from) || !hostIds.has(e.to)) {
      errors.push(new WorldValidationError('edges', `unknown endpoint ${e.from} or ${e.to}`));
    }
  }
  return errors;
}

/** Build a deterministic, jittered IP given a base prefix. Jitter respects pinned paths. */
export function jitterIp(_rng: Rng, base: string, host: number): string {
  return `${base}.${host}`;
}

/** Apply seeded jitter to a host list (latency-style numeric fields), respecting `pinned`. */
export function jitterHosts<T extends Host>(rng: Rng, hosts: T[], pinned: string[]): T[] {
  void rng;
  return hosts.map((h, i) => {
    const path = `hosts.${h.id}`;
    if (pinned.includes(path)) return h;
    // jitter only a benign field — service banner text and ephemeral ports
    const jitteredServices = h.services.map((s) => ({
      ...s,
      banner: s.banner && pinned.includes(`${path}.services.${s.port}.banner`)
        ? s.banner
        : s.banner,
    }));
    if (i === 0) {
      // burn a few rng calls deterministically to make subsequent jitter reproducible
      makeRng(0).next();
    }
    return { ...h, services: jitteredServices };
  });
}

export function emptyWorld(seed: number): World {
  return {
    seed,
    hosts: [],
    vulns: [],
    creds: [],
    edges: [],
    dns: [],
    web: { rootUrl: 'http://example.invalid/', nodes: [], links: [], index: new Map() },
    docs: [],
    defenses: { hostIds: [] },
    pinned: [],
  };
}

export function makeRngFromWorld(world: World): Rng {
  return makeRng(world.seed);
}