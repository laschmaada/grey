import { describe, it, expect } from 'vitest';
import {
  generateBackground,
  generateBeacon,
  writePcap,
  packetBytes,
  ipToBytes,
  macForIp,
  parseFilter,
  filterPackets,
} from '../src/core/traffic.js';
import { makeRng } from '../src/core/rng.js';
import { emptyWorld } from '../src/core/world.js';
import type { Host, World } from '../src/core/types.js';

function smallWorld(): World {
  const w = emptyWorld(1);
  const hosts: Host[] = [
    {
      id: 'client',
      ip: '192.0.2.10',
      os: 'Linux',
      inScope: true,
      services: [],
    },
    {
      id: 'server',
      ip: '198.51.100.7',
      os: 'Linux',
      inScope: true,
      services: [{ port: 22, proto: 'tcp', name: 'ssh', state: 'open' }],
    },
  ];
  return { ...w, hosts };
}

describe('M5-T05: traffic generator', () => {
  it('generates benign background packets deterministically', () => {
    const w = smallWorld();
    const a = generateBackground(makeRng(42), w, 0, 10_000);
    const b = generateBackground(makeRng(42), w, 0, 10_000);
    expect(a.length).toBeGreaterThan(0);
    expect(a).toEqual(b);
    expect(a.every((p) => p.proto === 'tcp' || p.proto === 'udp')).toBe(true);
  });

  it('generates a beacon with monotonic timestamps and PSH|ACK flags', () => {
    const pkts = generateBeacon(makeRng(99), '192.0.2.10', '198.51.100.7', 4444, 0, 60000, 5000, 250);
    expect(pkts.length).toBeGreaterThan(0);
    expect(pkts.every((p) => (p.flags & 0x18) === 0x18)).toBe(true);
    for (let i = 1; i < pkts.length; i++) {
      const a = pkts[i - 1]!;
      const b = pkts[i]!;
      expect(b.ts).toBeGreaterThanOrEqual(a.ts);
    }
  });
});

describe('M5-T05: pcap writer is Wireshark-compatible', () => {
  it('emits a valid global header (magic 0xa1b2c3d4)', () => {
    const buf = writePcap([]);
    const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    expect(dv.getUint32(0, true)).toBe(0xa1b2c3d4);
    expect(dv.getUint16(4, true)).toBe(2);
    expect(dv.getUint16(6, true)).toBe(4);
    expect(dv.getUint32(20, true)).toBe(1); // Ethernet
  });

  it('encodes a packet with a known IPv4 / TCP layout', () => {
    const p = {
      ts: 1000,
      src: '192.0.2.10',
      dst: '198.51.100.7',
      proto: 'tcp' as const,
      sport: 49152,
      dport: 22,
      flags: 0x18,
      seq: 1,
      ackNum: 1,
      payloadLen: 16,
    };
    const bytes = packetBytes(p);
    // ethertype IPv4 = 0x0800 at offset 12..14
    expect(bytes[12]).toBe(0x08);
    expect(bytes[13]).toBe(0x00);
    // ip.version << 4 | ihl = 0x45
    expect(bytes[14]).toBe(0x45);
    // src ip at 26..30, dst ip at 30..34
    expect(Array.from(bytes.slice(26, 30))).toEqual([192, 0, 2, 10]);
    expect(Array.from(bytes.slice(30, 34))).toEqual([198, 51, 100, 7]);
    // tcp at offset 14+20=34
    const sport = (bytes[34]! << 8) | bytes[35]!;
    expect(sport).toBe(49152);
  });

  it('round-trips through writePcap to a non-zero byte sequence', () => {
    const pkts = generateBackground(makeRng(7), smallWorld(), 0, 1000);
    const bytes = writePcap(pkts);
    expect(bytes.length).toBeGreaterThan(24);
    // Magic still first
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    expect(dv.getUint32(0, true)).toBe(0xa1b2c3d4);
  });
});

describe('M5-T05: helpers', () => {
  it('ipToBytes converts dotted-quad to 4 bytes', () => {
    expect(Array.from(ipToBytes('192.0.2.10'))).toEqual([192, 0, 2, 10]);
    expect(Array.from(ipToBytes('0.0.0.0'))).toEqual([0, 0, 0, 0]);
  });

  it('macForIp returns a deterministic MAC from the IP prefix', () => {
    const mac = macForIp('192.0.2.10');
    expect(mac[0]).toBe(0);
    expect(mac[1]).toBe(0);
    expect(mac[2]).toBe(0x5e);
    expect(mac[3]).toBe(192);
    expect(mac[4]).toBe(0);
    expect(mac[5]).toBe(2);
  });
});

describe('M5-T06: tshark display filter subset', () => {
  const sample = [
    {
      ts: 0,
      src: '192.0.2.10',
      dst: '198.51.100.7',
      proto: 'tcp' as const,
      sport: 49152,
      dport: 22,
      flags: 0x18,
      seq: 1,
      ackNum: 1,
      payloadLen: 32,
    },
    {
      ts: 1000,
      src: '192.0.2.11',
      dst: '198.51.100.7',
      proto: 'tcp' as const,
      sport: 49153,
      dport: 80,
      flags: 0x02,
      seq: 1,
      ackNum: 0,
      payloadLen: 0,
    },
    {
      ts: 2000,
      src: '192.0.2.10',
      dst: '198.51.100.7',
      proto: 'udp' as const,
      sport: 49154,
      dport: 53,
      flags: 0,
      seq: 0,
      ackNum: 0,
      payloadLen: 64,
    },
  ];

  it('filters by tcp.port == 22', () => {
    const r = filterPackets(sample, 'tcp.port == 22');
    expect(r).toHaveLength(1);
    expect(r[0]!.dport).toBe(22);
  });

  it('filters by ip.src with quoted multi-form eq', () => {
    const r = filterPackets(sample, 'ip.src == 192.0.2.11');
    expect(r).toHaveLength(1);
  });

  it('supports tcp.flags.syn == 1', () => {
    const r = filterPackets(sample, 'tcp.flags.syn == 1');
    expect(r).toHaveLength(1);
    expect(r[0]!.flags & 0x02).toBeTruthy();
  });

  it('supports &&, ||, !', () => {
    expect(filterPackets(sample, 'tcp.port == 22 && tcp.flags.ack == 1')).toHaveLength(1);
    expect(filterPackets(sample, 'tcp.port == 22 || tcp.port == 80')).toHaveLength(2);
    expect(filterPackets(sample, '! tcp.port == 22')).toHaveLength(2);
  });

  it('icmp matches icmp packets', () => {
    const r = filterPackets(sample, 'icmp == 1');
    expect(r).toHaveLength(0);
  });

  it('dns matches port 53', () => {
    const r = filterPackets(sample, 'dns == 1');
    expect(r).toHaveLength(1);
  });

  it('parseFilter returns null on garbage', () => {
    expect(parseFilter('(')).toBeNull();
  });
});