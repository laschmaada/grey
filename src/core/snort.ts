/**
 * Snort rule engine (M6-T05 — building it now so M5-T08 can land).
 *
 * Rules are header + options. We implement the documented subset:
 *   msg, content, nocase, flags, sid, rev, classtype
 *
 * Evaluation: header matches protocol + src/dst hosts + ports. Options:
 *   content:"<bytes>" — case-sensitive substring of payload
 *   nocase           — case-insensitive content match
 *   flags: S,A,F,R,P — TCP flags set
 *   classtype        — informational label
 *
 * The rule editor UI is M3+'s polish; the engine is here and stable.
 */

import type { Packet } from '../core/traffic.js';

export interface SnortRule {
  /** rule action (alert in our subset) */
  action: 'alert' | 'log' | 'pass' | 'drop';
  /** protocol */
  proto: 'tcp' | 'udp' | 'icmp' | 'ip';
  /** header: source host/port → dest host/port */
  src: { host: string; port: string };
  dst: { host: string; port: string };
  /** option list */
  options: SnortOption[];
  /** rule id (sid) */
  sid: number;
  /** revision */
  rev: number;
  /** parsed message */
  msg: string;
  classtype?: string;
}

export type SnortOption =
  | { kind: 'msg'; text: string }
  | { kind: 'content'; bytes: Uint8Array; nocase: boolean; offset?: number; depth?: number }
  | { kind: 'flags'; set: Set<string> }
  | { kind: 'sid'; n: number }
  | { kind: 'rev'; n: number }
  | { kind: 'classtype'; name: string }
  | { kind: 'reference'; system: string; id: string }
  | { kind: 'raw'; text: string }; // unknown options surfaced for the editor

/** Parse a single Snort rule text. Throws on malformed input. */
export function parseRule(text: string): SnortRule {
  // action proto src → dst ( options; )
  const headerEnd = text.indexOf('(');
  if (headerEnd === -1) throw new Error('snort: rule missing options');
  const header = text.slice(0, headerEnd).trim();
  const headerParts = header.split(/\s+/);
  if (headerParts.length < 7) throw new Error('snort: header needs action proto src → dst (port)');
  const action = headerParts[0]! as SnortRule['action'];
  const proto = headerParts[1]! as SnortRule['proto'];
  const arrowIdx = headerParts.indexOf('->');
  if (arrowIdx === -1) throw new Error('snort: header needs ->');
  const srcParts = headerParts.slice(2, arrowIdx);
  const dstParts = headerParts.slice(arrowIdx + 1);
  if (srcParts.length !== 2 || dstParts.length !== 2) {
    throw new Error('snort: src/dst must be host port');
  }
  const src = { host: srcParts[0]!, port: srcParts[1]! };
  const dst = { host: dstParts[0]!, port: dstParts[1]! };

  // Options
  const optText = text.slice(headerEnd + 1);
  const optEnd = optText.lastIndexOf(')');
  const inner = optText.slice(0, optEnd);
  const options = parseOptionsFor(inner);

  // Side effects from options
  let sid = 0;
  let rev = 0;
  let msg = '';
  let classtype: string | undefined;
  for (const o of options) {
    if (o.kind === 'sid') sid = o.n;
    else if (o.kind === 'rev') rev = o.n;
    else if (o.kind === 'msg') msg = o.text;
    else if (o.kind === 'classtype') classtype = o.name;
  }
  return { action, proto, src, dst, options, sid, rev, msg, ...(classtype !== undefined && { classtype }) };
}

export function parseOptionsFor(s: string): SnortOption[] {
  return parseOptionsInternal(s);
}

function parseOptionsInternal(s: string): SnortOption[] {
  // Split by `;` (respecting quotes)
  const parts: string[] = [];
  let cur = '';
  let inDouble = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i]!;
    if (c === '"') inDouble = !inDouble;
    if (c === ';' && !inDouble) {
      if (cur.trim().length > 0) parts.push(cur.trim());
      cur = '';
      continue;
    }
    cur += c;
  }
  if (cur.trim().length > 0) parts.push(cur.trim());

  const out: SnortOption[] = [];
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]!;
    if (part.startsWith('msg:')) {
      out.push({ kind: 'msg', text: unquote(part.slice('msg:'.length)) });
    } else if (part.startsWith('content:')) {
      // Look ahead for flag-only parts
      let lookahead = '';
      let j = i + 1;
      while (j < parts.length && isContentFlag(parts[j]!)) {
        lookahead += (lookahead ? ',' : '') + parts[j]!;
        j++;
      }
      out.push(parseContentOption(part, lookahead));
      i = j - 1;
    } else if (part.startsWith('flags:')) {
      const set = new Set(part.slice('flags:'.length).trim().split(/[\s,]+/).filter((x) => x.length > 0));
      out.push({ kind: 'flags', set });
    } else if (part.startsWith('sid:')) {
      out.push({ kind: 'sid', n: Number(part.slice('sid:'.length).trim()) });
    } else if (part.startsWith('rev:')) {
      out.push({ kind: 'rev', n: Number(part.slice('rev:'.length).trim()) });
    } else if (part.startsWith('classtype:')) {
      out.push({ kind: 'classtype', name: part.slice('classtype:'.length).trim() });
    } else if (part.startsWith('reference:')) {
      const r = part.slice('reference:'.length).trim();
      const k = r.indexOf(',');
      if (k >= 0) out.push({ kind: 'reference', system: r.slice(0, k).trim(), id: r.slice(k + 1).trim() });
      else out.push({ kind: 'raw', text: part });
    } else {
      out.push({ kind: 'raw', text: part });
    }
  }
  return out;
}

function isContentFlag(s: string): boolean {
  const t = s.trim();
  if (t === 'nocase') return true;
  if (t.startsWith('offset:') || t.startsWith('depth:')) return true;
  return false;
}

function parseContentOption(part: string, lookahead: string): SnortOption {
  const rest = part.slice('content:'.length);
  const quoted = rest.match(/^"((?:[^"\\]|\\.)*)"\s*(.*)$/);
  let bytes: Uint8Array;
  let flagsRaw: string;
  if (quoted) {
    bytes = decodeBytes(quoted[1]!);
    flagsRaw = (quoted[2] ?? '') + (lookahead ? ',' + lookahead : '');
  } else if (rest.startsWith('|')) {
    const end = rest.indexOf('|', 1);
    if (end === -1) return { kind: 'raw', text: part };
    const pipe = rest.slice(0, end + 1);
    bytes = decodeBytes(pipe);
    flagsRaw = rest.slice(end + 1).trimStart() + (lookahead ? ',' + lookahead : '');
  } else {
    const sp = rest.search(/\s/);
    bytes = decodeBytes(sp === -1 ? rest : rest.slice(0, sp));
    flagsRaw = (sp === -1 ? '' : rest.slice(sp + 1)) + (lookahead ? ',' + lookahead : '');
  }
  const flags = flagsRaw
    .split(',')
    .map((x) => x.trim())
    .filter((x) => x.length > 0);
  const nocase = flags.includes('nocase');
  let offset: number | undefined;
  let depth: number | undefined;
  for (const f of flags) {
    if (f.startsWith('offset:')) offset = Number(f.slice('offset:'.length));
    else if (f.startsWith('depth:')) depth = Number(f.slice('depth:'.length));
  }
  const base: { kind: 'content'; bytes: Uint8Array; nocase: boolean; offset?: number; depth?: number } = {
    kind: 'content',
    bytes,
    nocase,
  };
  if (offset !== undefined) base.offset = offset;
  if (depth !== undefined) base.depth = depth;
  return base;
}

function unquote(s: string): string {
  const t = s.trim();
  if (t.startsWith('"') && t.endsWith('"')) {
    return t.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  }
  return t;
}

function decodeBytes(s: string): Uint8Array {
  const bytes: number[] = [];
  // |XX| hex literal or raw chars
  const re = /\|([0-9a-fA-F\s]+)\||(.)/g;
  for (const m of s.matchAll(re)) {
    if (m[1] !== undefined) {
      const hex = m[1].replace(/\s+/g, '');
      for (let i = 0; i + 1 < hex.length; i += 2) {
        const b = parseInt(hex.slice(i, i + 2), 16);
        if (!Number.isNaN(b)) bytes.push(b);
      }
    } else if (m[2] !== undefined) {
      bytes.push(m[2].charCodeAt(0) & 0xff);
    }
  }
  return new Uint8Array(bytes);
}

export interface RuleMatch {
  rule: SnortRule;
  packet: Packet;
  /** Synthetic payload bytes the rule matched against. We use 0xff bytes by
   * default because we don't model payload content. Rules using `content`
   * won't match unless we synthesise a payload. */
  payload: Uint8Array;
}

/** Evaluate a rule against a packet + a heuristic payload. */
export function matchRule(rule: SnortRule, packet: Packet, payload: Uint8Array): boolean {
  // Header: protocol
  if (rule.proto !== 'ip' && rule.proto !== packet.proto) return false;
  // Header: hosts
  if (!hostMatches(rule.src.host, packet.src)) return false;
  if (!hostMatches(rule.dst.host, packet.dst)) return false;
  // Header: ports
  if (!portMatches(rule.src.port, packet.sport)) return false;
  if (!portMatches(rule.dst.port, packet.dport)) return false;

  // Options
  for (const opt of rule.options) {
    if (opt.kind === 'flags') {
      const want = opt.set;
      const flags: Record<string, boolean> = {
        S: !!(packet.flags & 0x02),
        A: !!(packet.flags & 0x10),
        F: !!(packet.flags & 0x01),
        R: !!(packet.flags & 0x04),
        P: !!(packet.flags & 0x08),
        U: !!(packet.flags & 0x20),
      };
      for (const f of want) {
        if (f in flags && !flags[f]) return false;
      }
    } else if (opt.kind === 'content') {
      const haystack = opt.nocase
        ? new TextDecoder('latin1').decode(payload).toLowerCase()
        : new TextDecoder('latin1').decode(payload);
      const needle = opt.nocase
        ? new TextDecoder('latin1').decode(opt.bytes).toLowerCase()
        : new TextDecoder('latin1').decode(opt.bytes);
      if (needle.length === 0) continue;
      const start = opt.offset ?? 0;
      const end = opt.depth ? Math.min(haystack.length, start + opt.depth) : haystack.length;
      if (!haystack.slice(start, end).includes(needle)) return false;
    }
    // msg / sid / rev / classtype / reference don't affect matching
  }
  return true;
}

function hostMatches(pat: string, ip: string): boolean {
  if (pat === 'any') return true;
  if (pat.includes('/')) {
    // CIDR — we accept /24 only
    const [base, bits] = pat.split('/');
    if (!base || bits !== '24') return false;
    const a = base.split('.').slice(0, 3).join('.');
    return ip.startsWith(a + '.');
  }
  return pat === ip;
}

function portMatches(pat: string, port: number): boolean {
  if (pat === 'any') return true;
  const n = Number(pat);
  return Number.isFinite(n) && n === port;
}

/** Generic false-positive scoring against a benign corpus. */
export function falsePositiveRate(rule: SnortRule, benign: ReadonlyArray<Packet>): number {
  if (benign.length === 0) return 0;
  let hits = 0;
  for (const p of benign) {
    if (matchRule(rule, p, new Uint8Array(0))) hits++;
  }
  return hits / benign.length;
}