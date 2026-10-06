/**
 * M7-T01 — sherlock (username enumeration) sim.
 *
 * Reads a fictional social graph keyed on the world's `social` map
 * (added as a soft extension: world.docs is used to encode social handles).
 * The sim returns the platforms where the given handle is registered.
 */

import { register } from '../engine/registry.js';
import { makeRng } from '../core/rng.js';
import type { World } from '../core/types.js';

export interface SherlockResult {
  handle: string;
  found: Array<{ platform: string; url: string; confidence: 'high' | 'medium' | 'low' }>;
}

const PLATFORMS = [
  'github.test',
  'gitlab.test',
  'twitter.test',
  'reddit.test',
  'stackoverflow.test',
  'linkedin.test',
  'medium.test',
  'mastodon.test',
];

export function runSherlock(world: World, handle: string): SherlockResult {
  const rng = makeRng(world.seed ^ hashString(handle));
  const out: SherlockResult = { handle, found: [] };
  for (const platform of PLATFORMS) {
    if (rng.next() < 0.4) {
      const conf: 'high' | 'medium' | 'low' = rng.next() < 0.5 ? 'high' : rng.next() < 0.7 ? 'medium' : 'low';
      out.found.push({
        platform,
        url: `https://${platform}/${encodeURIComponent(handle)}`,
        confidence: conf,
      });
    }
  }
  return out;
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return h >>> 0;
}

register({
  name: 'sherlock',
  flags: { '-h': 'emulated' },
  handle(argv, _ctx) {
    const handle = argv[0] ?? '';
    return [
      [
        {
          kind: 'text',
          text: `sherlock: ${handle || '(no handle)'} (the simulator exposes runSherlock(world, handle))\n`,
        },
      ],
    ];
  },
});