/**
 * tshark -r <file> -Y <filter> simulator (M5-T06).
 *
 * Implements the Wireshark display-filter subset listed in CODING_PLAN §6:
 *   ip.addr, ip.src, ip.dst, tcp.port, udp.port, tcp.flags.syn == 1,
 *   tcp.flags.ack == 1, icmp, dns, http, frame.time_relative,
 *   &&, ||, !, contains
 *
 * Unknown fields return no matches — surfacing them as `not emulated`.
 *
 * Output is tshark-style lines, one per packet. We also expose a typed
 * `tsharkRead` for tests.
 */

import { register } from '../engine/registry.js';
import { filterPackets, type Packet } from '../core/traffic.js';

const KNOWN_FIELDS = new Set([
  'ip.addr',
  'ip.src',
  'ip.dst',
  'tcp.port',
  'tcp.srcport',
  'tcp.dstport',
  'udp.port',
  'udp.srcport',
  'udp.dstport',
  'tcp.flags.syn',
  'tcp.flags.ack',
  'icmp',
  'dns',
  'http',
  'frame.time_relative',
]);

export function tsharkRead(packets: ReadonlyArray<Packet>, expr: string): {
  ok: boolean;
  reason?: string;
  packets: Packet[];
} {
  if (!expr) return { ok: true, packets: [...packets] };
  // Probe known fields — if the expression references any unknown field, refuse.
  const fieldRefs = (expr.match(/[a-z][a-z0-9._]*/g) ?? []).filter((t) => t.includes('.'));
  const unknown = fieldRefs.filter((f) => !KNOWN_FIELDS.has(f));
  if (unknown.length > 0) {
    return {
      ok: false,
      reason: `tshark: unknown display field(s): ${unknown.join(', ')}. not emulated in this simulator (supported: ${[
        ...KNOWN_FIELDS,
      ].join(', ')}).`,
      packets: [],
    };
  }
  try {
    return { ok: true, packets: filterPackets(packets, expr) };
  } catch (e) {
    return {
      ok: false,
      reason: `tshark: invalid filter expression: ${e instanceof Error ? e.message : String(e)}`,
      packets: [],
    };
  }
}

export function tsharkFormat(packets: ReadonlyArray<Packet>): string {
  const lines: string[] = [];
  lines.push('Frame 1: Starting banner — tshark (emulator) capture');
  for (let i = 0; i < packets.length; i++) {
    const p = packets[i]!;
    const dt = (i * 0.001).toFixed(6);
    const proto = p.proto.toUpperCase();
    const len = p.payloadLen + (p.proto === 'tcp' ? 54 : p.proto === 'udp' ? 42 : 42);
    lines.push(
      `  ${(i + 2).toString().padStart(5)}  ${dt}  ${p.src} → ${p.dst}  ${proto.padEnd(4)}  ${p.dport}  len=${len}`,
    );
  }
  lines.push(`Captured ${packets.length} packet(s).`);
  return lines.join('\n');
}

register({
  name: 'tshark',
  flags: {
    '-r': 'emulated',
    '-Y': 'emulated',
    '-T': 'not-emulated',
    '-V': 'not-emulated',
  },
  handle(argv, _ctx) {
    const args = argv;
    let file = '';
    let filter = '';
    for (let i = 0; i < args.length; i++) {
      const a = args[i]!;
      if (a === '-r' && args[i + 1]) {
        file = args[i + 1]!;
        i++;
      } else if (a === '-Y' && args[i + 1]) {
        filter = args[i + 1]!;
        i++;
      } else if (!a.startsWith('-')) {
        // tolerate positional args
        if (!file) file = a;
      }
    }
    const target = file || 'capture.pcap';
    const placeholder: Packet[] = [
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
    const r = tsharkRead(placeholder, filter);
    if (!r.ok) {
      return [[{ kind: 'text', text: `${r.reason}\n` }]];
    }
    return [
      [
        { kind: 'text', text: `tshark: reading ${target}\n` },
        { kind: 'text', text: tsharkFormat(r.packets) + '\n' },
      ],
    ];
  },
});