import { describe, it, expect } from 'vitest';
import { parseRule, matchRule, falsePositiveRate } from '../src/core/snort.js';
import type { Packet } from '../src/core/traffic.js';

describe('M5-T06→M6-T05: Snort rule engine', () => {
  it('parses a basic alert rule', () => {
    const r = parseRule(
      'alert tcp any any -> 192.0.2.0/24 22 (msg:"SSH inbound"; flags:S; sid:1000001; rev:1; classtype:attempted-recon;)',
    );
    expect(r.action).toBe('alert');
    expect(r.proto).toBe('tcp');
    expect(r.src.host).toBe('any');
    expect(r.dst.host).toBe('192.0.2.0/24');
    expect(r.dst.port).toBe('22');
    expect(r.msg).toBe('SSH inbound');
    expect(r.sid).toBe(1000001);
    expect(r.rev).toBe(1);
    expect(r.classtype).toBe('attempted-recon');
  });

  it('matches a SYN packet to port 22', () => {
    const r = parseRule(
      'alert tcp any any -> 192.0.2.0/24 22 (msg:"SSH inbound"; flags:S; sid:1; rev:1;)',
    );
    const p: Packet = {
      ts: 0,
      src: '198.51.100.7',
      dst: '192.0.2.10',
      proto: 'tcp',
      sport: 49152,
      dport: 22,
      flags: 0x02, // SYN
      seq: 0,
      ackNum: 0,
      payloadLen: 0,
    };
    expect(matchRule(r, p, new Uint8Array(0))).toBe(true);
  });

  it('rejects when flags do not match', () => {
    const r = parseRule(
      'alert tcp any any -> 192.0.2.0/24 22 (msg:"SSH inbound"; flags:S; sid:2; rev:1;)',
    );
    const p: Packet = {
      ts: 0,
      src: '198.51.100.7',
      dst: '192.0.2.10',
      proto: 'tcp',
      sport: 49152,
      dport: 22,
      flags: 0x18, // PSH|ACK, no SYN
      seq: 1,
      ackNum: 1,
      payloadLen: 0,
    };
    expect(matchRule(r, p, new Uint8Array(0))).toBe(false);
  });

  it('parses content + raw text', () => {
    const r = parseRule(
      'alert tcp any any -> any any (msg:"GET /"; content:"|47 45 54 20|"; nocase; sid:3; rev:1;)',
    );
    expect(r.msg).toBe('GET /');
    const content = r.options.find((o) => o.kind === 'content');
    expect(content?.kind).toBe('content');
    if (content?.kind === 'content') {
      expect(Array.from(content.bytes)).toEqual([0x47, 0x45, 0x54, 0x20]);
      expect(content.nocase).toBe(true);
    }
  });

  it('falsePositiveRate measures hits over a benign corpus', () => {
    const r = parseRule(
      'alert tcp any any -> any 22 (msg:"SSH"; flags:S; sid:4; rev:1;)',
    );
    const benign: Packet[] = [
      {
        ts: 0,
        src: '198.51.100.7',
        dst: '192.0.2.10',
        proto: 'tcp',
        sport: 49152,
        dport: 80,
        flags: 0x18,
        seq: 0,
        ackNum: 0,
        payloadLen: 0,
      },
      {
        ts: 0,
        src: '198.51.100.7',
        dst: '192.0.2.10',
        proto: 'tcp',
        sport: 49152,
        dport: 443,
        flags: 0x18,
        seq: 0,
        ackNum: 0,
        payloadLen: 0,
      },
    ];
    expect(falsePositiveRate(r, benign)).toBe(0);
  });

  it('rejects a malformed rule', () => {
    expect(() => parseRule('not a rule')).toThrow();
  });
});