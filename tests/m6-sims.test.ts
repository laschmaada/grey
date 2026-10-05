import { describe, it, expect } from 'vitest';
import { runGobuster } from '../src/sims/gobuster.js';
import { runSqlmap, sqlmapFormat } from '../src/sims/sqlmap.js';
import {
  runCertlog,
  formatCertlog,
  runHarvester,
  formatHarvester,
  runWayback,
  formatWayback,
} from '../src/sims/certlog.js';
import { startListener, listListeners, connect, resetNetcat } from '../src/sims/netcat.js';
import { runBurp, getQueue, clearBurp } from '../src/sims/burp.js';
import {
  makeIrState,
  applyIr,
  isForensicallyClean,
} from '../src/core/ir.js';
import { TRIAL_1, hintsFor } from '../src/core/scaffolding.js';
import type { World } from '../src/core/types.js';

function smallWorld(): World {
  return {
    seed: 1,
    hosts: [
      { id: 'app', ip: '192.0.2.10', hostname: 'app.grid.test', os: 'Linux', inScope: true, services: [] },
    ],
    vulns: [],
    creds: [],
    edges: [],
    dns: [
      { name: 'app.grid.test', type: 'A', value: '192.0.2.10' },
      { name: 'mail.app.grid.test', type: 'A', value: '198.51.100.25' },
    ],
    web: {
      rootUrl: 'http://app.grid.test/',
      nodes: [
        { path: '/', title: 'Home', body: '', snippet: '' },
        { path: '/admin', title: 'Admin', body: '', snippet: 'sqli sqli' },
        { path: '/api', title: 'API', body: '', snippet: '' },
      ],
      links: [],
      index: new Map(),
    },
    docs: [],
    defenses: { hostIds: [] },
    pinned: [],
  };
}

describe('M6-T04: Gobuster sim', () => {
  it('finds known paths', () => {
    const r = runGobuster(smallWorld(), { mode: 'dir', base: 'http://192.0.2.10/' });
    expect(r.hits.map((h) => h.target).sort()).toContain('http://192.0.2.10/admin');
    expect(r.hits.map((h) => h.target).sort()).toContain('http://192.0.2.10/api');
  });

  it('returns nothing for paths not in the world', () => {
    const r = runGobuster(smallWorld(), { mode: 'dir', base: 'http://192.0.2.10/', wordlist: ['nonexistent-thing'] });
    expect(r.hits).toEqual([]);
  });

  it('finds known subdomains in dns mode', () => {
    const r = runGobuster(smallWorld(), { mode: 'dns', base: 'app.grid.test' });
    expect(r.hits.map((h) => h.target)).toContain('mail.app.grid.test');
  });
});

describe('M6-T04: sqlmap sim', () => {
  it('flags sqli-marked nodes as injectable', () => {
    const r = runSqlmap(smallWorld(), { url: 'http://192.0.2.10/admin' });
    expect(r.injectable).toContain('/admin');
  });

  it('returns default fixture databases/tables when none given', () => {
    const r = runSqlmap(smallWorld(), { url: 'http://192.0.2.10/' });
    expect(r.databases).toContain('appdb');
    expect(r.tables.some((t) => t.name === 'users')).toBe(true);
  });

  it('formats the dump nicely', () => {
    const r = runSqlmap(smallWorld(), { url: 'http://192.0.2.10/' });
    const txt = sqlmapFormat(r);
    expect(txt).toContain('appdb');
    expect(txt).toContain('users');
  });
});

describe('M6-T01: OSINT trio', () => {
  it('certlog returns SANs for matching hosts', () => {
    const r = runCertlog(smallWorld(), 'grid.test');
    expect(r.length).toBeGreaterThan(0);
    expect(r[0]!.san.length).toBeGreaterThan(0);
    expect(formatCertlog(r)).toContain('CN=');
  });

  it('harvester produces email records', () => {
    const r = runHarvester(smallWorld(), 'grid.test');
    expect(r.length).toBeGreaterThan(0);
    expect(formatHarvester(r)).toMatch(/@/);
  });

  it('wayback returns deterministic snapshots', () => {
    const a = runWayback(smallWorld(), '/admin');
    const b = runWayback(smallWorld(), '/admin');
    expect(a).toEqual(b);
    expect(a.length).toBeGreaterThan(0);
    expect(formatWayback(a)).toContain('snapshot(s)');
  });
});

describe('M6-T02: netcat sim', () => {
  it('startListener + connect yields a reverse-shell event with payload', () => {
    resetNetcat();
    const w = smallWorld();
    const l = startListener(w, 'app', 6200, 'flag{GH-CONNECT}');
    expect(l).not.toBeNull();
    const ev = connect('198.51.100.7', 'app', 6200);
    expect(ev?.type).toBe('reverse-shell');
    expect(ev?.payload).toBe('flag{GH-CONNECT}');
    expect(listListeners().length).toBe(1);
  });
});

describe('M6-T03: burp sim', () => {
  it('runs through the queue and emits a tampered hit', () => {
    clearBurp();
    const w = smallWorld();
    const r = runBurp(w, 'http://192.0.2.10/', { body: '{"price":1}' });
    expect(r.hits).toHaveLength(1);
    expect(r.tampered).toContain('body');
    expect(getQueue().length).toBe(0); // queue head was consumed
  });
});

describe('M6-T06: IR mechanics', () => {
  it('memory_captured then host_powered_off is forensically clean', () => {
    let st = makeIrState(['host-a']);
    st = applyIr(st, { kind: 'memory_captured', hostId: 'host-a', at: 1 }).state;
    st = applyIr(st, { kind: 'host_powered_off', hostId: 'host-a', at: 2 }).state;
    expect(isForensicallyClean(st, 'host-a')).toBe(true);
  });

  it('host_powered_off before memory_captured is an order violation', () => {
    const st = makeIrState(['host-a']);
    const r = applyIr(st, { kind: 'host_powered_off', hostId: 'host-a', at: 1 });
    expect(r.orderingViolations.length).toBe(1);
    expect(isForensicallyClean(r.state, 'host-a')).toBe(false);
  });

  it('block_traffic without prior compromise incurs a 0.1 Trust penalty', () => {
    const st = makeIrState(['host-a']);
    const r = applyIr(st, { kind: 'block_traffic', hostId: 'host-a', at: 1 });
    expect(r.trustPenalty).toBeCloseTo(0.1);
    expect(r.state.trustPenalty).toBeCloseTo(0.1);
  });

  it('block_traffic after memory_captured does not incur a penalty', () => {
    let st = makeIrState(['host-a']);
    st = applyIr(st, { kind: 'memory_captured', hostId: 'host-a', at: 1 }).state;
    const r = applyIr(st, { kind: 'block_traffic', hostId: 'host-a', at: 2 });
    expect(r.trustPenalty).toBe(0);
  });

  it('memory_captured on a powered-off host is blocked', () => {
    let st = makeIrState(['host-a']);
    st = applyIr(st, { kind: 'host_powered_off', hostId: 'host-a', at: 1 }).state;
    const r = applyIr(st, { kind: 'memory_captured', hostId: 'host-a', at: 2 });
    expect(r.blockedByPowerOff).toContain('host-a');
    expect(r.state.memoryCaptured.has('host-a')).toBe(false);
  });
});

describe('M6-T08: scaffolding + Trial 1', () => {
  it('worked level shows checklist+hints+example', () => {
    expect(hintsFor('worked')).toEqual({
      showChecklist: true,
      showHints: true,
      showWorkedExample: true,
      showLedgerCommentary: true,
    });
  });

  it('raw level hides everything', () => {
    expect(hintsFor('raw')).toEqual({
      showChecklist: false,
      showHints: false,
      showWorkedExample: false,
      showLedgerCommentary: false,
    });
  });

  it('Trial 1 wraps a1-first-contact with payout 0 and raw scaffolding', () => {
    expect(TRIAL_1.id).toBe('trial-1');
    expect(TRIAL_1.innerMissionId).toBe('a1-first-contact');
    expect(TRIAL_1.scaffolding).toBe('raw');
    expect(TRIAL_1.payoutBase).toBe(0);
  });
});

export {};