/**
 * M9-T04 — Performance budget.
 *
 * - command latency < 50 ms for all sims (over a 100-call warm loop)
 * - bundle < 2.5 MB
 * - first render is not measured in tests (browser only) but the boot test
 *   in tests/m3-boot.test.ts covers the happy-dom + module-load path
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import '../src/test/bootstrap.js';
import { runNmap } from '../src/sims/nmap.js';
import { tsharkFormat, tsharkRead } from '../src/sims/tshark.js';
import { runGobuster } from '../src/sims/gobuster.js';
import { runSqlmap } from '../src/sims/sqlmap.js';
import { seedMeridian } from '../src/engine/meridian.js';
import { buildGraph } from '../src/core/maltego.js';
import { AdversaryModel } from '../src/core/adversary.js';
import { psList, malfind } from '../src/core/volatility.js';
import type { GameEvent, World } from '../src/core/types.js';
import type { Packet as TrafficPacket } from '../src/core/traffic.js';

function mkWorld(): World {
  return {
    seed: 7,
    hosts: Array.from({ length: 12 }, (_, i) => ({
      id: `h${i}`,
      ip: `192.0.2.${i + 1}`,
      os: 'Linux 5.x',
      inScope: true,
      services: [
        { port: 22, proto: 'tcp', name: 'ssh', state: 'open' },
        { port: 80, proto: 'tcp', name: 'http', state: 'open' },
        { port: 443, proto: 'tcp', name: 'https', state: 'open' },
      ],
    })),
    vulns: [],
    creds: [],
    edges: [],
    dns: [],
    web: { rootUrl: 'http://192.0.2.1/', nodes: [
      { path: '/', title: 'Home', body: '', snippet: 'sqli' },
      { path: '/admin', title: 'Admin', body: '', snippet: '' },
      { path: '/api', title: 'API', body: '', snippet: '' },
    ], links: [], index: new Map() },
    docs: [],
    defenses: { hostIds: [] },
    pinned: [],
  };
}

describe('M9-T04 perf budget', () => {
  const w = mkWorld();

  function bench<T>(name: string, fn: () => T): T {
    const start = performance.now();
    for (let i = 0; i < 100; i++) fn();
    const elapsed = (performance.now() - start) / 100;
    expect(elapsed, `${name} avg over 100 calls`).toBeLessThan(50);
    return fn();
  }

  function runNmapOnHost(host: World['hosts'][number]) {
    const args: Parameters<typeof runNmap>[0] = {
      version: true, script: false, syn: false, tcpConnect: true,
      ports: 'all', topPorts: null, noPing: true, timing: 'T5',
      aggressive: false, verbose: false, outputFile: null, targets: [host.ip],
    };
    return runNmap(args, host, true);
  }

  it('runNmap < 50 ms', () => {
    bench('nmap', () => runNmapOnHost(w.hosts[0]!));
  });

  it('tshark < 50 ms', () => {
    const packets: TrafficPacket[] = [];
    for (let i = 0; i < 50; i++) {
      packets.push({ ts: i * 1000, src: '192.0.2.1', dst: '198.51.100.2', sport: 49152, dport: 80, proto: 'tcp', flags: 0x10, seq: i, ackNum: i, payloadLen: 0 });
    }
    bench('tshark', () => {
      tsharkRead(packets, 'tcp.port == 80');
      tsharkFormat(packets);
    });
  });

  it('runGobuster < 50 ms', () => {
    bench('gobuster', () => runGobuster(w, { mode: 'dir', base: 'http://192.0.2.1/' }));
  });

  it('runSqlmap < 50 ms', () => {
    bench('sqlmap', () => runSqlmap(w, { url: 'http://192.0.2.1/' }));
  });

  it('seedMeridian < 50 ms', () => {
    bench('meridian', () => seedMeridian(w, 20));
  });

  it('buildGraph < 50 ms', () => {
    const events: GameEvent[] = [];
    for (let i = 0; i < 50; i++) events.push({ id: i, t: i * 100, actor: 'player', type: 'portscan', payload: {} });
    bench('maltego', () => buildGraph(w, events));
  });

  it('AdversaryModel.fromEvents < 50 ms', () => {
    const events: GameEvent[] = [];
    for (let i = 0; i < 50; i++) events.push({ id: i, t: i * 100, actor: 'player', type: 'portscan', payload: {} });
    bench('adversary', () => AdversaryModel.fromEvents(events));
  });

  it('Volatility psList + malfind < 50 ms', () => {
    bench('volatility', () => {
      psList(w, 'h1');
      malfind(w, 'h1');
    });
  });

  it('dist/index.html < 2.5 MB', () => {
    const path = resolve(process.cwd(), 'dist/index.html');
    const size = statSync(path).size;
    expect(size).toBeLessThan(2.5 * 1024 * 1024);
    void readFileSync;
  });
});