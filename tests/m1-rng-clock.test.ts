import { describe, it, expect } from 'vitest';
import { makeRng, labelHash } from '../src/core/rng.js';
import { makeClock } from '../src/core/clock.js';

describe('M1-T01: rng + clock determinism', () => {
  it('same seed → same sequence', () => {
    const a = makeRng(42);
    const b = makeRng(42);
    for (let i = 0; i < 32; i++) {
      expect(a.next()).toBe(b.next());
    }
  });

  it('different seed → different sequence', () => {
    const a = makeRng(1);
    const b = makeRng(2);
    let diffs = 0;
    for (let i = 0; i < 32; i++) if (a.next() !== b.next()) diffs++;
    expect(diffs).toBeGreaterThan(20);
  });

  it('fork label is stable across calls', () => {
    const a = makeRng(7);
    const af = a.fork('host-grid');
    const b = makeRng(7);
    const bf = b.fork('host-grid');
    expect(af.next()).toBe(bf.next());
    expect(af.int(10, 20)).toBe(bf.int(10, 20));
  });

  it('fork produces distinct streams for distinct labels', () => {
    const a = makeRng(7).fork('host-grid');
    const b = makeRng(7).fork('host-dns');
    // distinct labels → likely different first values; allow rare collision
    expect(a.next()).not.toBe(b.next());
  });

  it('labelHash is deterministic', () => {
    expect(labelHash('a')).toBe(labelHash('a'));
    expect(labelHash('a')).not.toBe(labelHash('b'));
  });

  it('clock advances monotonically', () => {
    const c = makeClock(100);
    expect(c.now()).toBe(100);
    c.advance(50);
    expect(c.now()).toBe(150);
  });

  it('clock rejects negative advance', () => {
    const c = makeClock();
    expect(() => c.advance(-1)).toThrow();
  });
});