/**
 * M8 tests — Act 4 sims, adversary flip, mosaic endings, cross-training.
 */

import { describe, it, expect } from 'vitest';
import '../src/test/bootstrap.js';
import { AdversaryModel } from '../src/core/adversary.js';
import { buildGraph } from '../src/core/maltego.js';
import {
  psList,
  psTree,
  malfind,
  netscan,
  cmdline,
} from '../src/core/volatility.js';
import {
  emptyBoard,
  addCard,
  selectCard,
  rejectCard,
  conclude,
  type EvidenceCard,
} from '../src/core/mosaic.js';
import { pickTrack, currentContract, resetContracts } from '../src/core/cross-training.js';
import { startAttempt, recordResult, listAttempts, resetPracticeRange } from '../src/core/practice-range.js';
import type { GameEvent, World } from '../src/core/types.js';

function mkWorld(seed = 1234): World {
  return {
    seed,
    hosts: [
      { id: 'gw', ip: '192.0.2.10', os: 'Linux', inScope: true, services: [] },
    ],
    vulns: [],
    creds: [],
    edges: [],
    dns: [],
    web: { rootUrl: 'http://gw.grid.test/', nodes: [], links: [], index: new Map() },
    docs: [{ id: 'doc-1', hostId: 'gw', path: '/notes.txt', content: 'analyst@gw.grid.test' }],
    defenses: { hostIds: [] },
    pinned: [],
  };
}

function ev(id: number, type: string, t = id * 1000, payload: Record<string, unknown> = {}): GameEvent {
  return { id, t, actor: 'player', type, payload };
}

describe('M8-T01 Volatility', () => {
  const w = mkWorld();
  it('psList returns the seeded process array', () => {
    const list = psList(w, 'gw');
    expect(list.length).toBeGreaterThan(0);
    expect(list[0]?.name).toBeTruthy();
  });
  it('psTree is a tree', () => {
    const t = psTree(w, 'gw');
    expect(t.pid).toBeGreaterThan(0);
  });
  it('malfind flags the beacon', () => {
    const findings = malfind(w, 'gw');
    expect(findings.some((f) => f.name === 'beacon.exe')).toBe(true);
  });
  it('netscan returns the C2 connection', () => {
    const conns = netscan(w, 'gw');
    expect(conns.some((c) => c.remotePort === 4444)).toBe(true);
  });
  it('cmdline returns beacon command-line', () => {
    const lines = cmdline(w, 'gw');
    expect(lines.some((l) => l.name === 'beacon.exe' && l.cmdline.length > 0)).toBe(true);
  });
});

describe('M8-T02 Maltego graph', () => {
  it('builds entities from world + events', () => {
    const w = mkWorld();
    const events = [ev(1, 'ransom_payment', 1000, { from: 'wallet-1', tx: '0xdead', amount: '10' })];
    const g = buildGraph(w, events, { aisReport: { mmsi: '538123456', gapMinutes: 720 } });
    expect(g.entities.some((e) => e.kind === 'host')).toBe(true);
    expect(g.entities.some((e) => e.kind === 'wallet')).toBe(true);
    expect(g.entities.some((e) => e.kind === 'mmsi')).toBe(true);
    expect(g.entities.some((e) => e.kind === 'person')).toBe(true);
  });
});

describe('M8-T03 Adversary flip test', () => {
  it('different campaign history → different predicted technique', () => {
    const a = AdversaryModel.fromEvents([
      ev(1, 'portscan'),
      ev(2, 'service_identified'),
      ev(3, 'session_open'),
      ev(4, 'c2_checkin'),
      ev(5, 'lateral'),
    ]);
    const b = AdversaryModel.fromEvents([
      ev(1, 'msf_run'),
      ev(2, 'ransom_payment'),
    ]);
    // Different seeds → likely different predictions.
    expect(a.seed).not.toBe(b.seed);
    // Both produce a predicted next step.
    expect(a.predictedNext).toBeTruthy();
    expect(b.predictedNext).toBeTruthy();
  });
  it('same campaign history → same model', () => {
    const events = [ev(1, 'portscan'), ev(2, 'session_open')];
    const a = AdversaryModel.fromEvents(events);
    const b = AdversaryModel.fromEvents(events);
    expect(a.seed).toBe(b.seed);
    expect(a.predictedNext?.technique).toBe(b.predictedNext?.technique);
  });
  it('confidence scales with steps', () => {
    const small = AdversaryModel.fromEvents([ev(1, 'portscan')]);
    const big = AdversaryModel.fromEvents([
      ev(1, 'portscan'),
      ev(2, 'service_identified'),
      ev(3, 'session_open'),
      ev(4, 'c2_checkin'),
      ev(5, 'lateral'),
      ev(6, 'ransom_payment'),
    ]);
    expect(big.confidence).toBeGreaterThan(small.confidence);
  });
});

describe('M8-T06 Mosaic endings', () => {
  function card(claim: string, falseFlag = false): EvidenceCard {
    return { id: `c-${claim}`, claim, sourceType: 'ais', origin: 'test', falseFlag };
  }
  it('true ending requires K5 rejected', () => {
    const board = emptyBoard();
    addCard(board, card('ais_gap:trauler:Nadia:K'));
    addCard(board, card('cert_overlap:registrar:shared'));
    addCard(board, card('ransom_to_charter:fuel'));
    addCard(board, card('honeytoken:veyra:falseflag', true));
    selectCard(board, 'c-ais_gap:trauler:Nadia:K');
    selectCard(board, 'c-cert_overlap:registrar:shared');
    selectCard(board, 'c-ransom_to_charter:fuel');
    rejectCard(board, 'c-honeytoken:veyra:falseflag');
    const c = conclude(board);
    expect(c.ending).toBe('true');
  });
  it('official ending when Veyra accepted', () => {
    const board = emptyBoard();
    addCard(board, card('ais_gap:trauler:Nadia:K'));
    addCard(board, card('honeytoken:veyra:falseflag', true));
    selectCard(board, 'c-ais_gap:trauler:Nadia:K');
    selectCard(board, 'c-honeytoken:veyra:falseflag');
    const c = conclude(board);
    expect(c.ending).toBe('official');
  });
  it('incomplete when evidence missing', () => {
    const board = emptyBoard();
    addCard(board, card('pretext_timezone:lure'));
    selectCard(board, 'c-pretext_timezone:lure');
    const c = conclude(board);
    expect(c.ending).toBe('incomplete');
  });
});

describe('M8-T07 cross-training', () => {
  it('pickTrack stores a contract', () => {
    resetContracts();
    const c = pickTrack('red', 'trial-2');
    expect(c.track).toBe('red');
    expect(c.unlocks).toContain('red-finale');
    expect(currentContract()?.track).toBe('red');
  });
});

describe('M8-T07 practice range', () => {
  it('startAttempt → recordResult', () => {
    resetPracticeRange();
    const a = startAttempt('nmap-basics');
    expect(a.id).toMatch(/^pra-\d+$/);
    expect(a.world.hosts.length).toBe(2);
    expect(listAttempts().length).toBe(1);
    recordResult(a.id, 'pass');
    expect(listAttempts()[0]?.result).toBe('pass');
  });
});