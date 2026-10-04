import { describe, it, expect } from 'vitest';
import { TOOLS } from '../src/content/tools.js';
import { MISSIONS, allToolRequirements, totalPayoutByAct, findMission } from '../src/content/missions.js';

describe('content registry smoke (M0)', () => {
  it('ships the tool catalog with the expected counts', () => {
    expect(TOOLS.length).toBeGreaterThanOrEqual(20);
    expect(TOOLS.find((t) => t.key === 'nmap')).toBeDefined();
    expect(TOOLS.find((t) => t.key === 'metasploit')).toBeDefined();
  });

  it('mission stub list is exactly 30 (§7.1)', () => {
    expect(MISSIONS).toHaveLength(30);
  });

  it('every mission has requiredTools that exist in TOOLS', () => {
    const toolKeys = new Set(TOOLS.map((t) => t.key));
    for (const m of MISSIONS) {
      for (const req of m.requiredTools) {
        expect(toolKeys.has(req), `${m.id} requires unknown tool ${req}`).toBe(true);
      }
    }
  });

  it('mission IDs are unique', () => {
    const ids = new Set(MISSIONS.map((m) => m.id));
    expect(ids.size).toBe(MISSIONS.length);
  });

  it('allToolRequirements is a stable, non-empty list', () => {
    const all = allToolRequirements();
    expect(all.length).toBeGreaterThan(0);
    expect(new Set(all).size).toBe(all.length);
  });

  it('findMission returns the expected mission', () => {
    expect(findMission('a1-first-contact')?.title).toBe('First Contact');
    expect(findMission('nonexistent')).toBeUndefined();
  });

  it('total payout by act matches §9 (Act 1 = 720)', () => {
    // Act 1 total in §9 = 720. Sanity check.
    const sum = totalPayoutByAct(1);
    expect(sum).toBe(720);
  });
});