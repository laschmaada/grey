/**
 * M7-T07 — Velociraptor-style VQL subset over a 50-host fleet fixture.
 *
 * The sim materialises a fleet of 50 hosts with deterministic services
 * and a tiny VQL evaluator that supports: `host()`, `services()`, `processes()`,
 * and `WHERE <field> = <value>` filters. Output is a flat list of rows.
 */

import { register } from '../engine/registry.js';
import { makeRng } from '../core/rng.js';

export interface FleetHost {
  id: string;
  hostname: string;
  ip: string;
  os: string;
  services: Array<{ port: number; name: string; state: string }>;
  /** a tiny process table */
  processes: Array<{ pid: number; name: string; user: string }>;
}

const FLEET_SIZE = 50;
const FLEET: FleetHost[] = [];
let fleetBuilt = false;

export function buildFleet(seed: number): void {
  if (fleetBuilt) return;
  const rng = makeRng(seed);
  for (let i = 0; i < FLEET_SIZE; i++) {
    const host = i < 9 ? `host-0${i + 1}` : `host-${i + 1}`;
    FLEET.push({
      id: host,
      hostname: `${host}.fleet.test`,
      ip: `192.0.2.${10 + i}`,
      os: rng.next() < 0.7 ? 'Windows 10' : 'Linux 5.x',
      services: [
        { port: 22, name: 'ssh', state: 'open' },
        { port: 80, name: 'http', state: i % 4 === 0 ? 'open' : 'closed' },
        { port: 445, name: 'smb', state: i % 3 === 0 ? 'open' : 'closed' },
      ],
      processes: [
        { pid: 100 + i, name: 'svchost.exe', user: 'SYSTEM' },
        { pid: 200 + i, name: 'chrome.exe', user: 'analyst' },
      ],
    });
  }
  fleetBuilt = true;
}

/** VQL subset: `host()`, `services()`, `processes()` with optional `WHERE`. */
export interface VqlQuery {
  source: 'host' | 'services' | 'processes';
  /** simple equality filter: { field: value } */
  where?: Record<string, string | number>;
}

export function runVql(query: VqlQuery): Array<Record<string, unknown>> {
  if (FLEET.length === 0) buildFleet(1);
  let rows: Array<Record<string, unknown>>;
  if (query.source === 'host') {
    rows = FLEET.map((h) => ({ hostname: h.hostname, os: h.os, ip: h.ip }));
  } else if (query.source === 'services') {
    rows = FLEET.flatMap((h) => h.services.map((s) => ({ hostname: h.hostname, ...s })));
  } else {
    rows = FLEET.flatMap((h) => h.processes.map((p) => ({ hostname: h.hostname, ...p })));
  }
  if (query.where) {
    rows = rows.filter((r) => {
      for (const [k, v] of Object.entries(query.where!)) {
        if (r[k] !== v) return false;
      }
      return true;
    });
  }
  return rows;
}

register({
  name: 'velociraptor',
  flags: { '-h': 'emulated', 'query': 'emulated' },
  handle() {
    return [
      [
        {
          kind: 'text',
          text:
            'velociraptor — emulated VQL over a 50-host fleet. Use runVql() from a mission.\n' +
            'Sources: host | services | processes. WHERE: equality filters.\n',
        },
      ],
    ];
  },
});