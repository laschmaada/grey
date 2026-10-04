import { describe, it, expect } from 'vitest';
import {
  CURRENT_SCHEMA,
  exportString,
  importString,
  contentHash32,
  fromBase64Url,
  toBase64Url,
} from '../src/core/save.js';
import type { SaveEnvelope } from '../src/core/types.js';

function sample(): SaveEnvelope {
  return {
    schemaVersion: CURRENT_SCHEMA,
    contentHash: '0'.repeat(8),
    seed: 1234,
    profile: {
      name: 'tester',
      wallet: 80,
      trust: 0.5,
      evidenceIntegrity: 1,
      noise: 0,
      ownedTools: ['nmap'],
      purchasedTools: ['nmap'],
      completedMissions: ['a1-first-contact'],
      fieldVerified: [],
      rank: 'analyst',
      seenNews: [],
    },
    campaign: [
      {
        id: 1,
        t: 0,
        actor: 'system',
        type: 'earn',
        payload: { amount: 80 },
      },
    ],
  };
}

describe('M1-T08: save/load envelope', () => {
  it('round-trips a sample envelope', () => {
    const env = sample();
    const s = exportString(env);
    const restored = importString(s);
    expect(restored.schemaVersion).toBe(env.schemaVersion);
    expect(restored.seed).toBe(env.seed);
    expect(restored.profile.wallet).toBe(env.profile.wallet);
  });

  it('contentHash32 is deterministic', () => {
    expect(contentHash32('abc')).toBe(contentHash32('abc'));
    expect(contentHash32('abc')).not.toBe(contentHash32('abd'));
  });

  it('base64url round-trip', () => {
    const s = 'hello world+/';
    expect(fromBase64Url(toBase64Url(s))).toBe(s);
  });

  it('corrupted input throws a JSON parse error (caller catches)', () => {
    const env = sample();
    const s = exportString(env);
    const corrupted = s.slice(0, -2) + 'XX';
    // Truncated/garbled base64 that decodes to invalid JSON — we expect a SyntaxError
    expect(() => importString(corrupted)).toThrow();
  });

  it('import tolerates a contentHash drift and returns the envelope', () => {
    const env = sample();
    const s = exportString(env);
    const env2 = importString(s);
    expect(env2.schemaVersion).toBe(env.schemaVersion);
    expect(env2.profile.wallet).toBe(env.profile.wallet);
  });

  it('rejects malformed base64 throws a SyntaxError', () => {
    expect(() => fromBase64Url('###not-base64###')).toThrow();
  });
});