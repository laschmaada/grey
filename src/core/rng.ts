/**
 * §4.1 — Seeded RNG (mulberry32) with deterministic label-stable forks.
 *
 * mulberry32 reference: https://gist.github.com/tommyettinger/46a3b9a0e0d34c2e5d4f (public domain).
 * Output range: [0, 1). Pure.
 */

export interface Rng {
  next(): number;
  int(a: number, b: number): number;
  pick<T>(arr: readonly T[]): T;
  fork(label: string): Rng;
  /** cheap string label, for diagnostics */
  readonly label: string;
}

function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeRng(seed: number, label = 'root'): Rng {
  const next = mulberry32(seed);

  function fork(childLabel: string): Rng {
    // Combine parent seed with a hash of the label for label-stability.
    let h = 2166136261 >>> 0;
    for (let i = 0; i < childLabel.length; i++) {
      h ^= childLabel.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return makeRng((seed ^ h) >>> 0, `${label}/${childLabel}`);
  }

  function int(a: number, b: number): number {
    if (b < a) throw new Error(`int: b < a (${b} < ${a})`);
    return Math.floor(next() * (b - a + 1)) + a;
  }

  function pick<T>(arr: readonly T[]): T {
    if (arr.length === 0) throw new Error('pick: empty array');
    const idx = int(0, arr.length - 1);
    return arr[idx]!;
  }

  return { next, int, pick, fork, label };
}

/** djb2-style label hash used by tests to assert label-stability. */
export function labelHash(label: string): number {
  let h = 5381;
  for (let i = 0; i < label.length; i++) {
    h = ((h << 5) + h + label.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}