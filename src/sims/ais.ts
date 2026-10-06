/**
 * M7-T01 — AIS (maritime vessel tracking) timeline.
 *
 * Reads from a world `mmsi` map (MMSIs are the vessel identifiers). The sim
 * returns a deterministic timeline of position reports for an MMSI.
 */

import { register } from '../engine/registry.js';
import { makeRng } from '../core/rng.js';
import type { World } from '../core/types.js';

export interface AisReport {
  mmsi: string;
  /** virtual ms */
  ts: number;
  lat: number;
  lon: number;
  /** knots */
  speed: number;
  /** degrees */
  heading: number;
  /** navigational status: "underway" / "at anchor" / etc. */
  status: 'underway' | 'at anchor' | 'moored' | 'fishing';
}

export interface AisTimeline {
  mmsi: string;
  reports: AisReport[];
  /** gap analysis: longest gap in minutes */
  longestGap: number;
  /** true if there's a gap > 6h (a "dark ship") */
  isDarkShip: boolean;
}

const AIS_TEMPLATES: Record<string, { lat: number; lon: number; baseSpeed: number }> = {
  'mmsi-538123456': { lat: 36.5, lon: -5.3, baseSpeed: 12 },
  'mmsi-477123456': { lat: 14.6, lon: 61.0, baseSpeed: 9 },
  'mmsi-636123456': { lat: 19.6, lon: -75.8, baseSpeed: 14 },
};

export function runAis(world: World, mmsi: string): AisTimeline {
  const tpl = AIS_TEMPLATES[mmsi] ?? { lat: 0, lon: 0, baseSpeed: 10 };
  const rng = makeRng(world.seed ^ hashString(mmsi));
  const baseTs = 1_700_000_000_000;
  const reports: AisReport[] = [];
  const intervalMs = 30 * 60 * 1000; // 30 min
  const totalReports = 24; // 12 hours
  let ts = baseTs;
  let lat = tpl.lat;
  let lon = tpl.lon;
  for (let i = 0; i < totalReports; i++) {
    lat += (rng.next() - 0.5) * 0.05;
    lon += (rng.next() - 0.5) * 0.05;
    const speed = tpl.baseSpeed + (rng.next() - 0.5) * 2;
    const heading = (rng.next() * 360) | 0;
    reports.push({
      mmsi,
      ts,
      lat: round(lat, 4),
      lon: round(lon, 4),
      speed: round(speed, 1),
      heading,
      status: i < totalReports - 2 ? 'underway' : 'at anchor',
    });
    ts += intervalMs;
  }
  // Inject a "dark" gap in the middle: keep the first 8 reports, then leave a
  // 12-hour gap before resuming. We push a placeholder at index 8 (the last
  // "seen" report), and rebuild the timestamps so the gap is 12h.
  if (mmsi === 'mmsi-538123456') {
    const before = reports.slice(0, 8);
    const after = reports.slice(8);
    const gap = 12 * 60 * 60 * 1000;
    const lastBefore = before[before.length - 1]!.ts;
    const firstAfter = after[0]!.ts;
    // Shift "after" so the gap is exactly `gap` ms.
    const shift = lastBefore + gap - firstAfter;
    for (const r of after) r.ts += shift;
    reports.length = 0;
    reports.push(...before, ...after);
  }
  const longestGap = longestGapMinutes(reports);
  return {
    mmsi,
    reports,
    longestGap,
    isDarkShip: longestGap > 6 * 60,
  };
}

function longestGapMinutes(reports: AisReport[]): number {
  let maxGap = 0;
  for (let i = 1; i < reports.length; i++) {
    const gap = (reports[i]!.ts - reports[i - 1]!.ts) / 60000;
    if (gap > maxGap) maxGap = gap;
  }
  return maxGap;
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return h >>> 0;
}

function round(n: number, places: number): number {
  const m = 10 ** places;
  return Math.round(n * m) / m;
}

register({
  name: 'ais',
  flags: { '-h': 'emulated' },
  handle(argv, _ctx) {
    const mmsi = argv.find((a) => !a.startsWith('-')) ?? 'mmsi-538123456';
    return [
      [
        {
          kind: 'text',
          text: `ais: ${mmsi} (the simulator exposes runAis(world, mmsi))\n`,
        },
      ],
    ];
  },
});