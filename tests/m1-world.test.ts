import { describe, it, expect } from 'vitest';
import { emptyWorld, isReservedIp, jitterHosts, validateWorld } from '../src/core/world.js';
import { makeRng } from '../src/core/rng.js';
import type { Host, World } from '../src/core/types.js';

function worldWith(hosts: Host[]): World {
  const w = emptyWorld(1);
  return { ...w, hosts };
}

describe('M1-T09: world fixture + validation', () => {
  it('isReservedIp matches reserved documentation prefixes', () => {
    expect(isReservedIp('192.0.2.10')).toBe(true);
    expect(isReservedIp('198.51.100.7')).toBe(true);
    expect(isReservedIp('203.0.113.99')).toBe(true);
    expect(isReservedIp('10.0.0.1')).toBe(true);
    expect(isReservedIp('172.16.5.1')).toBe(true);
    expect(isReservedIp('192.168.1.1')).toBe(true);
    expect(isReservedIp('8.8.8.8')).toBe(false);
    expect(isReservedIp('1.1.1.1')).toBe(false);
  });

  it('validateWorld returns no errors for a minimal reserved-IP world', () => {
    const w = worldWith([
      {
        id: 'gw',
        ip: '192.0.2.10',
        os: 'Linux 4.x',
        inScope: true,
        services: [{ port: 22, proto: 'tcp', name: 'ssh', state: 'open' }],
      },
    ]);
    expect(validateWorld(w)).toEqual([]);
  });

  it('validateWorld flags a non-reserved IP', () => {
    const w = worldWith([
      {
        id: 'bad',
        ip: '8.8.8.8',
        os: 'Linux',
        inScope: true,
        services: [],
      },
    ]);
    const errs = validateWorld(w);
    expect(errs.length).toBeGreaterThan(0);
    expect(errs[0]?.message).toContain('not a reserved IP');
  });

  it('validateWorld flags unknown hostId on vuln', () => {
    const w = worldWith([]);
    w.vulns.push({ id: 'v1', hostId: 'ghost', kind: 'rce', description: '' });
    expect(validateWorld(w).length).toBeGreaterThan(0);
  });

  it('pinned hosts are never modified by jitter', () => {
    const a: Host[] = [
      {
        id: 'gw',
        ip: '192.0.2.10',
        os: 'Linux',
        inScope: true,
        services: [{ port: 22, proto: 'tcp', name: 'ssh', state: 'open' }],
      },
    ];
    const b = jitterHosts(makeRng(99), a, ['hosts.gw']);
    expect(b[0]).toEqual(a[0]);
  });
});