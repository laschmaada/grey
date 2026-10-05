import { describe, it, expect } from 'vitest';
import { tsharkRead, tsharkFormat } from '../src/sims/tshark.js';
import type { Packet } from '../src/core/traffic.js';

describe('M5-T06: tshark sim', () => {
  const sample: Packet[] = [
    {
      ts: 0,
      src: '192.0.2.10',
      dst: '198.51.100.7',
      proto: 'tcp',
      sport: 49152,
      dport: 22,
      flags: 0x18,
      seq: 1,
      ackNum: 1,
      payloadLen: 32,
    },
  ];

  it('returns packets when filter is empty', () => {
    expect(tsharkRead(sample, '').packets).toEqual(sample);
  });

  it('rejects unknown fields', () => {
    const r = tsharkRead(sample, 'http.request.uri == "/"');
    expect(r.ok).toBe(false);
    expect(r.reason).toContain('not emulated');
  });

  it('filters by supported fields', () => {
    const r = tsharkRead(sample, 'tcp.port == 22');
    expect(r.ok).toBe(true);
    expect(r.packets).toHaveLength(1);
  });

  it('formats output with banner line', () => {
    const txt = tsharkFormat(sample);
    expect(txt).toContain('Starting banner');
    expect(txt).toContain('Captured 1 packet');
  });
});