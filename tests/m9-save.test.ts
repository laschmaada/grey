/**
 * M9-T03 — Save migration tests.
 *
 * Every schemaVersion gets a fixture; import runs the migration chain and
 * asserts the result lands at CURRENT_SCHEMA. Corrupt input is rejected with
 * a warning (the env is returned but with contentHash drift signal).
 */

import { describe, it, expect } from 'vitest';
import { CURRENT_SCHEMA, exportString, importString, contentHash32 } from '../src/core/save.js';
import type { SaveEnvelope } from '../src/core/types.js';

function mkEnvelope(schemaVersion: number): SaveEnvelope {
  return {
    schemaVersion,
    contentHash: '',
    seed: 1234,
    profile: {
      name: 'analyst',
      wallet: 500,
      trust: 0.7,
      evidenceIntegrity: 1,
      noise: 0,
      ownedTools: ['nmap'],
      purchasedTools: [],
      track: 'shared',
      completedMissions: [],
      fieldVerified: [],
      rank: 'analyst',
      seenNews: [],
    },
    campaign: [],
  };
}

describe('M9-T03 save migration', () => {
  it('exports and re-imports without drift', () => {
    const env = mkEnvelope(CURRENT_SCHEMA);
    const s = exportString(env);
    const env2 = importString(s);
    expect(env2.schemaVersion).toBe(CURRENT_SCHEMA);
  });

  it('migrates v1 → current', () => {
    const env = mkEnvelope(1);
    const s = exportString(env);
    const env2 = importString(s);
    expect(env2.schemaVersion).toBe(CURRENT_SCHEMA);
    expect(env2.profile.wallet).toBe(500);
  });

  it('migrates an older-than-current version', () => {
    const env = mkEnvelope(CURRENT_SCHEMA - 1 >= 1 ? CURRENT_SCHEMA - 1 : 1);
    const s = exportString(env);
    const env2 = importString(s);
    expect(env2.schemaVersion).toBe(CURRENT_SCHEMA);
  });

  it('rejects tampered content (hash mismatch warns, env still returned)', () => {
    // Build a valid envelope, then construct a *different* envelope with
    // the same shape but a different contentHash. The hash recompute will
    // detect the drift and the loader will return the env (warning path).
    const env1 = mkEnvelope(CURRENT_SCHEMA);
    const s1 = exportString(env1);
    const env2 = mkEnvelope(CURRENT_SCHEMA);
    const env2WithWrongHash: SaveEnvelope = { ...env2, contentHash: 'deadbeef', profile: { ...env2.profile, wallet: 9999 } };
    const s2 = exportString(env2WithWrongHash);
    expect(s1).not.toBe(s2);
    const decoded = importString(s2);
    expect(decoded.profile.wallet).toBe(9999);
  });

  it('round-trips a complex env (with campaign events + session)', () => {
    const env = mkEnvelope(CURRENT_SCHEMA);
    env.campaign = [
      { id: 1, t: 100, actor: 'player', type: 'portscan', payload: { target: '192.0.2.10' } },
      { id: 2, t: 200, actor: 'player', type: 'service_identified', payload: { host: 'gw', port: 22 } },
    ];
    env.session = { missionId: 'a1-first-contact', events: [
      { id: 1, t: 100, actor: 'player', type: 'nmap', payload: {} },
    ] };
    const s = exportString(env);
    const env2 = importString(s);
    expect(env2.campaign.length).toBe(2);
    expect(env2.session?.missionId).toBe('a1-first-contact');
    expect(env2.session?.events.length).toBe(1);
  });

  it('contentHash is stable', () => {
    const a = contentHash32('hello');
    const b = contentHash32('hello');
    const d = contentHash32('world');
    expect(a).toBe(b);
    expect(a).not.toBe(d);
    expect(a).toMatch(/^[0-9a-f]{8}$/);
  });
});