/**
 * M8-T06 — Mosaic board.
 *
 * The player assembles a conclusion from evidence cards. Each card carries
 * (claim, sourceType, origin). The board evaluates the conclusion against
 * the truth rules in `src/content/truth.ts` and yields one of the endings:
 *
 *   true       — K1, K2, K3 verified, K5 identified (the player rejected the
 *                Veyra false flag), and K4 is acknowledged.
 *   official   — at least one of K1-K3 verified but the player accepted the
 *                Veyra false flag.
 *   incomplete — insufficient evidence; the board prompts for more cards.
 *
 * The board is data-only here; the UI renders it as a canvas + drag.
 */

import { register } from '../engine/registry.js';
import type { SourceType } from './types.js';

export type EndingKind = 'true' | 'official' | 'incomplete';

export interface EvidenceCard {
  id: string;
  /** the claim this card asserts, e.g. "K1:trauler:Nadia:K-dark" */
  claim: string;
  sourceType: SourceType;
  origin: string;
  /** if true, the card is one of the planted false flags (Veyra) */
  falseFlag: boolean;
}

export interface BoardConclusion {
  selected: EvidenceCard[];
  rejected: EvidenceCard[];
  ending: EndingKind;
  reasons: string[];
}

const K_CLAIMS = {
  K1: 'ais_gap:trauler:Nadia:K',
  K2: 'cert_overlap:registrar:shared',
  K3: 'ransom_to_charter:fuel',
  K4: 'pretext_timezone:lure',
  K5: 'honeytoken:veyra:falseflag',
} as const;

export function emptyBoard(): { cards: EvidenceCard[]; conclusion: BoardConclusion | null } {
  return { cards: [], conclusion: null };
}

export function addCard(board: { cards: EvidenceCard[]; conclusion: BoardConclusion | null }, card: EvidenceCard): void {
  board.cards.push(card);
}

export function selectCard(board: { cards: EvidenceCard[]; conclusion: BoardConclusion | null }, id: string): void {
  if (!board.conclusion) board.conclusion = { selected: [], rejected: [], ending: 'incomplete', reasons: [] };
  const card = board.cards.find((c) => c.id === id);
  if (!card) return;
  const c = board.conclusion;
  if (c.selected.includes(card) || c.rejected.includes(card)) return;
  c.selected.push(card);
}

export function rejectCard(board: { cards: EvidenceCard[]; conclusion: BoardConclusion | null }, id: string): void {
  if (!board.conclusion) board.conclusion = { selected: [], rejected: [], ending: 'incomplete', reasons: [] };
  const card = board.cards.find((c) => c.id === id);
  if (!card) return;
  const c = board.conclusion;
  if (c.selected.includes(card) || c.rejected.includes(card)) return;
  c.rejected.push(card);
}

export function conclude(board: { cards: EvidenceCard[]; conclusion: BoardConclusion | null }): BoardConclusion {
  if (!board.conclusion) board.conclusion = { selected: [], rejected: [], ending: 'incomplete', reasons: [] };
  const c = board.conclusion;
  c.reasons.length = 0;
  const claims = new Set(c.selected.map((s) => s.claim));
  // K5: a player must REJECT the planted Veyra false flag.
  // The official-story ending happens when K1-K3 are *accepted* (some) AND
  // the Veyra flag was *not* rejected.
  const k5Rejected = c.rejected.some((r) => r.claim === K_CLAIMS.K5);
  const k1 = claims.has(K_CLAIMS.K1);
  const k2 = claims.has(K_CLAIMS.K2);
  const k3 = claims.has(K_CLAIMS.K3);
  const k4 = claims.has(K_CLAIMS.K4);

  if (k1 && k2 && k3 && k5Rejected) {
    c.ending = 'true';
    c.reasons.push('K1, K2, K3 verified and the K5 Veyra false flag was rejected.');
    if (k4) c.reasons.push('K4 acknowledged — epilogue line: "the lure had a UTC+3 working-hours signature, matching the pre-textual pattern of a phished account."');
    return c;
  }
  if ((k1 || k2 || k3) && !k5Rejected) {
    c.ending = 'official';
    c.reasons.push('The board accepted the planted Veyra false flag (K5). The official story is told.');
    return c;
  }
  c.ending = 'incomplete';
  c.reasons.push('Insufficient evidence on K1, K2, K3.');
  return c;
}

register({
  name: 'mosaic',
  flags: { '-h': 'emulated' },
  handle() {
    return [
      [
        {
          kind: 'text',
          text:
            'mosaic — the conclusion board. addCard / selectCard / rejectCard / conclude. ' +
            'The board evaluates the truth rules from §7.2 (K1-K5) and yields one of three endings: true, official, or incomplete.\n',
        },
      ],
    ];
  },
});