/**
 * M7-T07 — Beacon-detection puzzle.
 *
 * A beacon is a periodic TCP PSH|ACK to a fixed destination port. The sim
 * generates a fake conversation with one or more beacons, and the player
 * must use `tshark -q -z conv,tcp` to spot the destination + count, then
 * `tshark -Y tcp.port==<port>` to extract the per-flow records.
 *
 * We model: beacon(src, dst, dport, intervalMs, payload) and a list of
 * benign flows. The player extracts the dst + dport from the conv output.
 */

import { makeRng } from '../core/rng.js';
import type { Packet } from './traffic.js';
import { generateBackground, generateBeacon } from './traffic.js';

export interface BeaconPuzzle {
  packets: Packet[];
  /** the answer the player must extract */
  beacon: { src: string; dst: string; dport: number };
  /** the number of beacon packets */
  beaconCount: number;
}

export function makeBeaconPuzzle(seed: number, world: { hosts: { ip: string }[] }): BeaconPuzzle {
  const rng = makeRng(seed);
  const inScope = world.hosts.filter((_, i) => i < 2).map((h) => h.ip);
  const dst = inScope[1] ?? '198.51.100.7';
  const src = inScope[0] ?? '192.0.2.10';
  const dport = 4444;
  const beacon = generateBeacon(rng, src, dst, dport, 0, 60_000, 5_000, 250);
  const benign = generateBackground(rng, { hosts: [], seed } as never, 0, 60_000);
  return {
    packets: [...benign, ...beacon],
    beacon: { src, dst, dport },
    beaconCount: beacon.length,
  };
}