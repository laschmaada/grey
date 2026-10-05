/**
 * §4.8 — Traffic model (the shared simulator of network flows/packets).
 *
 * A single generator in core/traffic/ produces flows from world events plus
 * background profiles. It writes real .pcap files (global header, Ethernet /
 * IPv4 / TCP / UDP / ICMP frames, documentation-range addresses) so the player
 * can open them in real Wireshark. Every consumer reads from this model.
 *
 * The pcap writer is spec-compatible:
 *   - Global header (24 bytes): magic 0xa1b2c3d4, version 2.4, snaplen 65535,
 *     link type 1 (Ethernet).
 *   - Per-record header (16 bytes): ts_sec, ts_usec, incl_len, orig_len.
 *   - Records: 14-byte Ethernet + IPv4 + TCP/UDP/ICMP, all addresses from
 *     reserved ranges.
 *
 * Determinism: the generator consumes a virtual clock and the seeded RNG, so
 * pcap bytes are stable across replays.
 */

import { type Rng } from './rng.js';
import type { World } from './types.js';

/** A flow is one TCP/UDP conversation's metadata. */
export interface Flow {
  src: string;
  dst: string;
  sport: number;
  dport: number;
  proto: 'tcp' | 'udp' | 'icmp';
  /** virtual-ms when the flow started */
  startMs: number;
  /** packet count */
  packets: number;
  bytes: number;
  /** human label */
  label?: string;
}

export interface Packet {
  ts: number; // virtual ms
  src: string;
  dst: string;
  proto: 'tcp' | 'udp' | 'icmp';
  sport: number;
  dport: number;
  flags: number; // TCP flags: SYN=0x02, ACK=0x10, FIN=0x01, RST=0x04, PSH=0x08, URG=0x20
  seq: number;
  ackNum: number;
  payloadLen: number;
}

/** Background noise profiles — what a quiet network looks like. */
export interface BackgroundProfile {
  /** packets/sec */
  rate: number;
  /** fraction of traffic that is HTTP/DNS/SSH/other */
  mix: { http: number; dns: number; ssh: number; other: number };
}

/** Build a benign background-traffic profile. */
export function defaultBackground(): BackgroundProfile {
  return { rate: 2, mix: { http: 0.4, dns: 0.3, ssh: 0.1, other: 0.2 } };
}

/** Generate background packets in [fromMs, toMs) for a benign profile. */
export function generateBackground(
  rng: Rng,
  world: World,
  fromMs: number,
  toMs: number,
  profile: BackgroundProfile = defaultBackground(),
): Packet[] {
  const out: Packet[] = [];
  const window = toMs - fromMs;
  if (window <= 0) return out;
  // Total packets = rate * window_seconds
  const total = Math.max(1, Math.floor((profile.rate * window) / 1000));
  // Pick a "client" host (any in-scope) and a "server" host (any host).
  const clients = world.hosts.filter((h) => h.inScope);
  const servers = world.hosts;
  if (clients.length === 0 || servers.length === 0) return out;
  for (let i = 0; i < total; i++) {
    const t = fromMs + Math.floor((i * window) / total);
    const client = clients[Math.floor(rng.next() * clients.length)]!;
    const server = servers[Math.floor(rng.next() * servers.length)]!;
    const mix = rng.next();
    let sport = 0;
    let dport = 0;
    let proto: 'tcp' | 'udp' | 'icmp' = 'tcp';
    if (mix < profile.mix.http) {
      proto = 'tcp';
      sport = ephemeral(rng);
      dport = 80;
    } else if (mix < profile.mix.http + profile.mix.dns) {
      proto = 'udp';
      sport = ephemeral(rng);
      dport = 53;
    } else if (mix < profile.mix.http + profile.mix.dns + profile.mix.ssh) {
      proto = 'tcp';
      sport = ephemeral(rng);
      dport = 22;
    } else {
      proto = 'tcp';
      sport = ephemeral(rng);
      dport = 443;
    }
    out.push({
      ts: t,
      src: client.ip,
      dst: server.ip,
      proto,
      sport,
      dport,
      flags: proto === 'tcp' ? 0x18 /* PSH|ACK */ : 0,
      seq: Math.floor(rng.next() * 0xffffffff),
      ackNum: Math.floor(rng.next() * 0xffffffff),
      payloadLen: proto === 'tcp' ? 64 + Math.floor(rng.next() * 512) : 32,
    });
  }
  return out;
}

function ephemeral(rng: Rng): number {
  // 49152..65535 (RFC 6335 dynamic range)
  return 49152 + Math.floor(rng.next() * 16383);
}

/**
 * Generate a beacon sequence: packets from src to dst on a fixed interval
 * with jitter (ms). Used by Snort, beacon-detection, and Packet Storm m3.
 */
export function generateBeacon(
  rng: Rng,
  src: string,
  dst: string,
  dport: number,
  fromMs: number,
  toMs: number,
  intervalMs: number,
  jitterMs: number,
  payloadLen = 64,
): Packet[] {
  const out: Packet[] = [];
  let t = fromMs;
  let seq = Math.floor(rng.next() * 0xffffffff);
  while (t < toMs) {
    out.push({
      ts: t,
      src,
      dst,
      proto: 'tcp',
      sport: ephemeral(rng),
      dport,
      flags: 0x18, // PSH|ACK
      seq,
      ackNum: 0,
      payloadLen,
    });
    const j = (rng.next() - 0.5) * 2 * jitterMs;
    t += Math.max(1, intervalMs + j);
    seq += payloadLen;
  }
  return out;
}

/**
 * Pcap writer — emits a real pcap file. Frame layout: Ethernet/IPv4/TCP|UDP|ICMP.
 * Deterministic given the same packet stream + clock.
 */

const PCAP_MAGIC = 0xa1b2c3d4;
const LINKTYPE_ETHERNET = 1;

export function writeGlobalHeader(): Uint8Array {
  const b = new Uint8Array(24);
  const dv = new DataView(b.buffer);
  // Pcap magic is little-endian on disk; the value 0xa1b2c3d4 is read with
  // `true` (little-endian) — see the magic check in tests.
  dv.setUint32(0, PCAP_MAGIC, true);
  dv.setUint16(4, 2, true); // version major
  dv.setUint16(6, 4, true); // version minor
  dv.setUint32(8, 0, true); // thiszone
  dv.setUint32(12, 0, true); // sigfigs
  dv.setUint32(16, 65535, true); // snaplen
  dv.setUint32(20, LINKTYPE_ETHERNET, true);
  return b;
}

/** Parse an IPv4 dotted-quad to a 4-byte big-endian Uint8Array. */
export function ipToBytes(ip: string): Uint8Array {
  const parts = ip.split('.');
  const b = new Uint8Array(4);
  for (let i = 0; i < 4; i++) {
    const n = Number(parts[i] ?? '0');
    b[i] = (n >= 0 && n <= 255) ? n : 0;
  }
  return b;
}

/** A deterministic but cosmetic MAC (00:00:5E prefix + 3 bytes from the IP). */
export function macForIp(ip: string): Uint8Array {
  const b = new Uint8Array(6);
  b[0] = 0x00;
  b[1] = 0x00;
  b[2] = 0x5e;
  const ipBytes = ipToBytes(ip);
  b[3] = ipBytes[0]!;
  b[4] = ipBytes[1]!;
  b[5] = ipBytes[2]!;
  return b;
}

function tcpChecksum(pseudoAndPacket: Uint8Array): number {
  let sum = 0;
  for (let i = 0; i + 1 < pseudoAndPacket.length; i += 2) {
    sum += (pseudoAndPacket[i]! << 8) | pseudoAndPacket[i + 1]!;
    if (sum > 0xffff) sum = (sum & 0xffff) + 1;
  }
  if (pseudoAndPacket.length % 2 === 1) {
    sum += pseudoAndPacket[pseudoAndPacket.length - 1]! << 8;
    if (sum > 0xffff) sum = (sum & 0xffff) + 1;
  }
  return (~sum) & 0xffff;
}

/**
 * Deterministic sequence of pseudo-random bytes used to fill packet payloads.
 * LCG: standard glibc parameters; same seed yields same stream.
 */
function lcgPayload(rngState: { s: number }, n: number): Uint8Array {
  const out = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    rngState.s = (Math.imul(rngState.s, 1103515245) + 12345) & 0x7fffffff;
    out[i] = rngState.s & 0xff;
  }
  return out;
}

/** Per-packet deterministic fill. */
function payloadFill(seed: number, n: number): Uint8Array {
  return lcgPayload({ s: (seed | 0) || 1 }, n);
}

/** Build an IPv4/TCP|UDP|ICMP packet. */
export function packetBytes(p: Packet): Uint8Array {
  // Ethernet header (14 bytes)
  const eth = new Uint8Array(14);
  const dstMac = macForIp(p.dst);
  const srcMac = macForIp(p.src);
  eth.set(dstMac, 0);
  eth.set(srcMac, 6);
  eth[12] = 0x08; // IPv4 ethertype
  eth[13] = 0x00;

  // IP header (20 bytes, no options)
  const ip = new Uint8Array(20);
  const ipDv = new DataView(ip.buffer);
  ipDv.setUint8(0, 0x45); // version=4, ihl=5
  ipDv.setUint8(1, 0); // DSCP/ECN
  const protoNum = p.proto === 'tcp' ? 6 : p.proto === 'udp' ? 17 : 1;
  const ipTotalLen = 20 + (p.proto === 'tcp' ? 20 : p.proto === 'udp' ? 8 : 8) + p.payloadLen;
  ipDv.setUint16(2, ipTotalLen, false);
  ipDv.setUint16(4, 0, false); // identification
  ipDv.setUint16(6, 0, false); // flags+frag
  ipDv.setUint8(8, 64); // TTL
  ipDv.setUint8(9, protoNum);
  ipDv.setUint16(10, 0, false); // checksum (computed below)
  ip.set(ipToBytes(p.src), 12);
  ip.set(ipToBytes(p.dst), 16);
  // ip checksum
  let ipSum = 0;
  for (let i = 0; i + 1 < ip.length; i += 2) {
    ipSum += (ip[i]! << 8) | ip[i + 1]!;
    if (ipSum > 0xffff) ipSum = (ipSum & 0xffff) + 1;
  }
  ipDv.setUint16(10, (~ipSum) & 0xffff, false);

  // L4 + payload
  let l4: Uint8Array;
  if (p.proto === 'tcp') {
    const tcp = new Uint8Array(20 + p.payloadLen);
    const tdv = new DataView(tcp.buffer);
    // Network byte order (big-endian) for all multi-byte fields.
    tdv.setUint16(0, p.sport, false);
    tdv.setUint16(2, p.dport, false);
    tdv.setUint32(4, p.seq >>> 0, false);
    tdv.setUint32(8, p.ackNum >>> 0, false);
    tdv.setUint8(12, 0x50); // data offset = 5 (20 bytes)
    tdv.setUint8(13, p.flags & 0xff);
    tdv.setUint16(14, 65535, false); // window
    tdv.setUint16(16, 0, false); // checksum (computed below)
    tdv.setUint16(18, 0, false); // urgent
    // payload: deterministic fill from seq — content not modelled
    const fill = payloadFill((p.seq >>> 0) || 1, p.payloadLen);
    tcp.set(fill, 20);
    // TCP checksum: pseudo-header + tcp
    const pseudoLen = 12 + tcp.length;
    const pseudo = new Uint8Array(pseudoLen);
    pseudo.set(ipToBytes(p.src), 0);
    pseudo.set(ipToBytes(p.dst), 4);
    pseudo[8] = 0;
    pseudo[9] = protoNum;
    pseudo.set(new Uint8Array(new Uint16Array([tcp.length]).buffer), 10);
    pseudo.set(tcp, 12);
    tdv.setUint16(16, tcpChecksum(pseudo), false);
    l4 = tcp;
  } else if (p.proto === 'udp') {
    const udp = new Uint8Array(8 + p.payloadLen);
    const udv = new DataView(udp.buffer);
    udv.setUint16(0, p.sport, false);
    udv.setUint16(2, p.dport, false);
    udv.setUint16(4, 8 + p.payloadLen, false);
    udv.setUint16(6, 0, false);
    udp.set(payloadFill((p.sport << 16) ^ p.dport, p.payloadLen), 8);
    const pseudo = new Uint8Array(12 + udp.length);
    pseudo.set(ipToBytes(p.src), 0);
    pseudo.set(ipToBytes(p.dst), 4);
    pseudo[8] = 0;
    pseudo[9] = protoNum;
    pseudo.set(new Uint8Array(new Uint16Array([udp.length]).buffer), 10);
    pseudo.set(udp, 12);
    udv.setUint16(6, tcpChecksum(pseudo), false);
    l4 = udp;
  } else {
    // ICMP echo request (type=8, code=0)
        const icmp = new Uint8Array(8 + p.payloadLen);
        const idv = new DataView(icmp.buffer);
        idv.setUint8(0, 8);
        idv.setUint8(1, 0);
        idv.setUint16(2, 0, false);
        idv.setUint16(4, (p.sport ^ p.dport) & 0xffff, false); // identifier (deterministic)
        idv.setUint16(6, 0, false); // seq
        icmp.set(payloadFill((p.sport << 16) ^ (p.dport << 8), p.payloadLen), 8);
        let sum = 0;
        for (let i = 0; i + 1 < icmp.length; i += 2) sum += (icmp[i]! << 8) | icmp[i + 1]!;
        idv.setUint16(2, (~sum) & 0xffff, false);
        l4 = icmp;
      }

  // Concatenate ethernet + ip + l4
  const out = new Uint8Array(eth.length + ip.length + l4.length);
  out.set(eth, 0);
  out.set(ip, eth.length);
  out.set(l4, eth.length + ip.length);
  return out;
}

export function writePcap(packets: ReadonlyArray<Packet>): Uint8Array {
  const gh = writeGlobalHeader();
  const totalLen = gh.length + packets.reduce((a, p) => a + 16 + packetBytes(p).length, 0);
  const out = new Uint8Array(totalLen);
  out.set(gh, 0);
  let pos = gh.length;
  for (const p of packets) {
    const body = packetBytes(p);
    const rec = new Uint8Array(16);
    const dv = new DataView(rec.buffer);
    dv.setUint32(0, Math.floor(p.ts / 1000), true); // ts_sec (little-endian on disk)
    dv.setUint32(4, (p.ts % 1000) * 1000, true); // ts_usec
    dv.setUint32(8, body.length, true); // incl_len
    dv.setUint32(12, body.length, true); // orig_len
    out.set(rec, pos);
    pos += rec.length;
    out.set(body, pos);
    pos += body.length;
  }
  return out;
}

/** A tshark-style display filter (subset of BPF + Wireshark syntax). */
export interface DisplayFilter {
  expr: string;
}

export function filterPackets(packets: ReadonlyArray<Packet>, expr: string): Packet[] {
  const ast = parseFilter(expr);
  if (!ast) return [...packets];
  return packets.filter((p) => evalAst(ast, p));
}

type FilterNode =
  | { kind: 'and'; left: FilterNode; right: FilterNode }
  | { kind: 'or'; left: FilterNode; right: FilterNode }
  | { kind: 'not'; child: FilterNode }
  | { kind: 'eq'; field: string; value: string }
  | { kind: 'contains'; field: string; value: string };

export function parseFilter(expr: string): FilterNode | null {
  const tokens = expr
    .replace(/\(/g, ' ( ')
    .replace(/\)/g, ' ) ')
    .split(/\s+/)
    .filter((t) => t.length > 0);
  let i = 0;
  function peek(): string | undefined {
    return tokens[i];
  }
  function take(): string {
    const t = tokens[i++];
    return t ?? '';
  }
  function parseComparison(): FilterNode | null {
    // Handle field OP value, with OP possibly on the next token.
    let field = take();
    if (!field) return null;
    let op = '';
    let combined = false;
    if (field.includes('==') || field.includes('!=') || field.includes('contains')) {
      combined = true;
      if (field.includes('!=')) op = '!=';
      else if (field.includes('==')) op = '==';
      else op = 'contains';
    } else {
      op = take();
      if (op !== '==' && op !== '!=' && op !== 'contains') return null;
    }
    const value = take();
    if (!value) return null;
    if (combined) {
      // split field from value using the operator
      const parts = field.split(op);
      if (parts.length !== 2) return null;
      field = parts[0]!.trim();
    }
    if (op === '!=') return { kind: 'not', child: { kind: 'eq', field, value } };
    if (op === 'contains') return { kind: 'contains', field, value };
    return { kind: 'eq', field, value };
  }
  function parseAtom(): FilterNode | null {
    const t = peek();
    if (t === '!') {
      take();
      const c = parseAtom();
      return c ? { kind: 'not', child: c } : null;
    }
    if (t === '(') {
      take();
      const e = parseOr();
      if (take() !== ')') return null;
      return e;
    }
    return parseComparison();
  }
  function parseAnd(): FilterNode | null {
    let left = parseAtom();
    while (left && peek() === '&&') {
      take();
      const right = parseAtom();
      if (!right) return null;
      left = { kind: 'and', left, right };
    }
    return left;
  }
  function parseOr(): FilterNode | null {
    let left = parseAnd();
    while (left && peek() === '||') {
      take();
      const right = parseAnd();
      if (!right) return null;
      left = { kind: 'or', left, right };
    }
    return left;
  }
  return parseOr();
}

function getField(p: Packet, field: string): string {
  switch (field) {
    case 'ip.src':
      return p.src;
    case 'ip.dst':
      return p.dst;
    case 'ip.addr':
      return p.src + ',' + p.dst;
    case 'tcp.srcport':
      return String(p.proto === 'tcp' ? p.sport : -1);
    case 'tcp.dstport':
      return String(p.proto === 'tcp' ? p.dport : -1);
    case 'tcp.port':
      return String(p.proto === 'tcp' ? p.sport : -1) + ',' + String(p.proto === 'tcp' ? p.dport : -1);
    case 'udp.srcport':
      return String(p.proto === 'udp' ? p.sport : -1);
    case 'udp.dstport':
      return String(p.proto === 'udp' ? p.dport : -1);
    case 'udp.port':
      return String(p.proto === 'udp' ? p.sport : -1) + ',' + String(p.proto === 'udp' ? p.dport : -1);
    case 'tcp.flags.syn':
      return String(p.proto === 'tcp' && (p.flags & 0x02) ? 1 : 0);
    case 'tcp.flags.ack':
      return String(p.proto === 'tcp' && (p.flags & 0x10) ? 1 : 0);
    case 'icmp':
      return p.proto === 'icmp' ? '1' : '0';
    case 'dns':
      return String(p.dport === 53 || p.sport === 53 ? 1 : 0);
    case 'http':
      return String(p.dport === 80 || p.dport === 8080 ? 1 : 0);
    default:
      return '';
  }
}

function evalAst(n: FilterNode, p: Packet): boolean {
  switch (n.kind) {
    case 'and':
      return evalAst(n.left, p) && evalAst(n.right, p);
    case 'or':
      return evalAst(n.left, p) || evalAst(n.right, p);
    case 'not':
      return !evalAst(n.child, p);
    case 'eq': {
      const v = getField(p, n.field);
      return v.split(',').includes(n.value);
    }
    case 'contains': {
      const v = getField(p, n.field);
      return v.toLowerCase().includes(n.value.toLowerCase());
    }
    default: {
      const _x: never = n;
      void _x;
      return false;
    }
  }
}