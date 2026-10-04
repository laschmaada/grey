/**
 * Field flag derivation — M4-T04.
 *
 * Given a save-seed and an assignment id, deterministically produce a flag of the
 * form `GH-XXXX-XXXX` where X is uppercase alphanumeric. The derivation is keyed on
 * the campaign seed, so two campaigns with the same seed produce the same flag.
 */

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/1 to avoid confusion

function intToBase(n: number, base: number, len: number): string {
  let x = n >>> 0;
  let out = '';
  for (let i = 0; i < len; i++) {
    out = ALPHABET[x % base] + out;
    x = Math.floor(x / base);
  }
  return out;
}

export function deriveFlag(saveSeed: number, assignmentId: string): string {
  // FNV-1a on assignmentId, then xor with seed, split into two halves
  let h = 0x811c9dc5;
  for (let i = 0; i < assignmentId.length; i++) {
    h ^= assignmentId.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  const seed = (h ^ (saveSeed | 0)) >>> 0;
  const a = intToBase((seed >>> 8) & 0xffff, 32, 4);
  const b = intToBase(seed & 0xffff, 32, 4);
  return `GH-${a}-${b}`;
}

describe_flag(); // unused — placeholder to keep the file hot in editors

function describe_flag(): void {
  // no-op; tests live in tests/field-flag.test.ts
}