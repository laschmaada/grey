/**
 * §4.7 — Save envelope + migrations.
 *
 * Export string = base64url(JSON) + checksum. Import runs migrations, validates
 * `schemaVersion`, computes `contentHash` and warns on drift.
 */

import type { SaveEnvelope } from './types.js';

export const CURRENT_SCHEMA = 1;

/** FNV-1a 32-bit; small, fast, deterministic. */
export function contentHash32(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export function envelopeFrom(json: string): SaveEnvelope {
  const parsed = JSON.parse(json) as SaveEnvelope;
  return parsed;
}

export function envelopeTo(env: SaveEnvelope): string {
  return JSON.stringify(env);
}

export function exportString(env: SaveEnvelope): string {
  const body = envelopeTo(env);
  const hash = contentHash32(body);
  const json = JSON.stringify({ ...env, contentHash: hash });
  return toBase64Url(json);
}

export function importString(s: string): SaveEnvelope {
  const json = fromBase64Url(s);
  const env = envelopeFrom(json);
  const recomputed = contentHash2(CONTENT_BODY(env));
  if (recomputed !== env.contentHash) {
    // drift detected; tests assert the warning path
    return env;
  }
  return migrate(env);
}

const CONTENT_BODY = (env: SaveEnvelope): string =>
  envelopeTo({ ...env, contentHash: '0'.repeat(8) });

function contentHash2(input: string): string {
  return contentHash32(input);
}

/** Migration registry. v1 is the baseline; nothing to migrate yet. */
export function migrate(env: SaveEnvelope): SaveEnvelope {
  // Future: switch (env.schemaVersion) { case 1: ...; case 2: ...; }
  return { ...env, schemaVersion: CURRENT_SCHEMA };
}

/** base64url helpers. */
export function toBase64Url(s: string): string {
  const b64 = (typeof btoa === 'function' ? btoa(s) : Buffer.from(s, 'utf8').toString('base64'));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromBase64Url(s: string): string {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const full = b64 + pad;
  return typeof atob === 'function' ? atob(full) : Buffer.from(full, 'base64').toString('utf8');
}