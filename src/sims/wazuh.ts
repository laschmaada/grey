/**
 * M7-T07 — Wazuh-style alert console (file integrity monitoring).
 *
 * The sim watches a list of `fim_paths` and reports when a path's
 * recorded hash differs from the current hash. Triggers are deterministic
 * per world seed.
 */

import { register } from '../engine/registry.js';
import { makeRng } from '../core/rng.js';
import type { World } from '../core/types.js';

export interface FimEvent {
  /** when (virtual ms) */
  ts: number;
  hostId: string;
  path: string;
  action: 'created' | 'modified' | 'deleted';
  beforeHash: string;
  afterHash: string;
  /** rule id (sid) */
  sid: number;
}

export interface FimBaseline {
  hostId: string;
  path: string;
  hash: string;
}

const BASELINES: FimBaseline[] = [];

export function setBaseline(b: FimBaseline): void {
  BASELINES.push(b);
}

export function listBaselines(): ReadonlyArray<FimBaseline> {
  return [...BASELINES];
}

export function clearBaselines(): void {
  BASELINES.length = 0;
}

/** Generate the change events for a host (deterministic by host + seed). */
export function generateFimEvents(
  world: World,
  hostId: string,
  path: string,
  count: number,
): FimEvent[] {
  const rng = makeRng((world.seed ^ hashString(hostId)) ^ hashString(path));
  const out: FimEvent[] = [];
  for (let i = 0; i < count; i++) {
    const before = (rng.next() * 0xffffffff) | 0;
    const after = before ^ (rng.next() * 0xff) | 0;
    out.push({
      ts: 1_700_000_000_000 + i * 60_000,
      hostId,
      path,
      action: i === 0 ? 'created' : 'modified',
      beforeHash: hashToHex(before),
      afterHash: hashToHex(after),
      sid: 550 + (i % 4),
    });
  }
  return out;
}

function hashToHex(n: number): string {
  return n.toString(16).padStart(8, '0').repeat(4);
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return h >>> 0;
}

register({
  name: 'wazuh',
  flags: { '-h': 'emulated' },
  handle() {
    return [
      [
        {
          kind: 'text',
          text:
            'wazuh — emulated FIM agent. Use setBaseline(), generateFimEvents() from a mission. ' +
            'Alerts are exposed via Meridian.\n',
        },
      ],
    ];
  },
});

export {};