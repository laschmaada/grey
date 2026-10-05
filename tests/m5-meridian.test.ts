import { describe, it, expect } from 'vitest';
import { seedMeridian, triage, triageScore, logSearch, groupBy } from '../src/engine/meridian.js';
import { emptyWorld } from '../src/core/world.js';
import type { World } from '../src/core/types.js';

function smallWorld(): World {
  const w = emptyWorld(1);
  return {
    ...w,
    hosts: [
      {
        id: 'a',
        ip: '192.0.2.10',
        os: 'Linux',
        inScope: true,
        services: [],
      },
      {
        id: 'b',
        ip: '198.51.100.7',
        os: 'Linux',
        inScope: false,
        services: [],
      },
    ],
  };
}

describe('M5-T07: Meridian Console', () => {
  it('seeds 20 alerts and exactly 3 true positives (a1-twenty-alarms spec)', () => {
    const m = seedMeridian(smallWorld(), 20);
    expect(m.alerts).toHaveLength(20);
    const tps = m.alerts.filter((a) => a.truth === 'tp');
    expect(tps).toHaveLength(3);
    expect(tps.map((a) => a.id)).toEqual([1, 3, 11]);
  });

  it('triage marks alerts and triageScore aggregates correct/wrong/skipped', () => {
    const m = seedMeridian(smallWorld(), 20);
    // True positives are at IDs 1, 3, 11 (per the seed list).
    triage(m, 1, 'tp');
    triage(m, 3, 'tp');
    triage(m, 11, 'tp');
    const s = triageScore(m);
    expect(s.correct).toBe(3);
    expect(s.skipped).toBe(17);
    expect(s.wrong).toBe(0);
  });

  it('triage with wrong call counts toward wrong, not skipped', () => {
    const m = seedMeridian(smallWorld(), 20);
    triage(m, 1, 'fp'); // truth is tp
    const s = triageScore(m);
    expect(s.wrong).toBe(1);
    expect(s.skipped).toBe(19);
  });

  it('triage of an unknown id returns undefined', () => {
    const m = seedMeridian(smallWorld(), 20);
    expect(triage(m, 999, 'tp')).toBeUndefined();
  });

  it('logSearch filters by field=value pairs', () => {
    const m = seedMeridian(smallWorld());
    const filtered = logSearch(m, 'proto=tcp');
    expect(filtered.every((r) => r.proto === 'tcp')).toBe(true);
  });

  it('groupBy counts by field', () => {
    const m = seedMeridian(smallWorld());
    const counts = groupBy(m.logs, (l) => l.proto);
    expect((counts['tcp'] ?? 0) + (counts['udp'] ?? 0)).toBe(m.logs.length);
  });

  it('is deterministic for the same seed', () => {
    const a = seedMeridian(smallWorld(), 20);
    const b = seedMeridian(smallWorld(), 20);
    expect(a.alerts.map((x) => x.sig)).toEqual(b.alerts.map((x) => x.sig));
  });
});