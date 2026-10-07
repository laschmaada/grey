/**
 * M8-T02 — Maltego-style link graph.
 *
 * Builds a typed entity graph from the world + campaign events. Entities:
 * Person, Host, MMSI, Domain, Wallet, Document, Account.
 *
 * Transforms (the Maltego-style "actions" the player runs):
 *   to_person   — pull Person entities from the doc corpus
 *   to_host     — pull Host entities from the world
 *   to_wallet   — pull Wallet entities from the campaign (ransom_to_charter)
 *   to_ais      — pull MMSI entities from the AIS reports
 *   resolve_dns — pull Domain entities from the world.dns records
 *
 * The graph is plain JSON; the UI renders it as either an SVG or a table.
 */

import { register } from '../engine/registry.js';
import { makeRng } from '../core/rng.js';
import type { GameEvent, World } from '../core/types.js';

export type EntityKind = 'person' | 'host' | 'mmsi' | 'domain' | 'wallet' | 'document' | 'account';

export interface Entity {
  id: string;
  kind: EntityKind;
  label: string;
  /** extra metadata, e.g. for a Wallet: the tx hash; for a MMSI: the gap window */
  meta: Record<string, string>;
}

export interface Link {
  from: string;
  to: string;
  /** link type, e.g. "controls", "paid_to", "appears_in" */
  rel: string;
}

export interface MaltegoGraph {
  entities: Entity[];
  links: Link[];
}

export function buildGraph(
  world: World,
  events: ReadonlyArray<GameEvent>,
  options: { aisReport?: { mmsi: string; gapMinutes: number } } = {},
): MaltegoGraph {
  const out: MaltegoGraph = { entities: [], links: [] };
  const rng = makeRng(world.seed ^ 0xc4b5);

  for (const h of world.hosts) {
    out.entities.push({
      id: h.id,
      kind: 'host',
      label: h.hostname ?? h.ip,
      meta: { ip: h.ip, os: h.os },
    });
  }
  for (const d of world.dns) {
    out.entities.push({
      id: `domain:${d.name}`,
      kind: 'domain',
      label: d.name,
      meta: { type: d.type, value: d.value },
    });
  }
  // Wallets derived from campaign events with type "ransom_payment" or similar
  for (const e of events) {
    if (e.type === 'ransom_payment') {
      out.entities.push({
        id: `wallet:${e.payload['from'] as string}`,
        kind: 'wallet',
        label: (e.payload['from'] as string) ?? 'unknown',
        meta: { tx: e.payload['tx'] as string, amount: String(e.payload['amount'] ?? '') },
      });
    }
  }
  // AIS entity
  if (options.aisReport) {
    out.entities.push({
      id: `mmsi:${options.aisReport.mmsi}`,
      kind: 'mmsi',
      label: options.aisReport.mmsi,
      meta: { gap: `${options.aisReport.gapMinutes}min` },
    });
    out.links.push({
      from: `mmsi:${options.aisReport.mmsi}`,
      to: world.hosts[0]?.id ?? 'analyst',
      rel: 'near',
    });
  }
  // Synthetic People: derive from the world's docs (sherlock-style).
  // Look for email-like substrings in the doc content (the path/id carries
  // host-relative paths, not emails).
  for (const d of world.docs) {
    const emailMatch = /[\w.-]+@[\w.-]+\.[\w]+/.exec(d.content);
    if (emailMatch) {
      const handle = emailMatch[0].split('@')[0]!;
      out.entities.push({
        id: `person:${handle}`,
        kind: 'person',
        label: handle,
        meta: { email: emailMatch[0], docPath: d.path },
      });
      out.links.push({ from: `person:${handle}`, to: `domain:${(emailMatch[0].split('@')[1] ?? 'example.test')}`, rel: 'registered' });
    }
  }
  // Edges: person → host if their doc references the host
  for (const p of out.entities.filter((e) => e.kind === 'person')) {
    for (const host of world.hosts) {
      const hostRef = (host.hostname ?? host.ip).split('.')[0] ?? '';
      if (p.label.includes(hostRef)) {
        out.links.push({ from: p.id, to: host.id, rel: 'associated' });
      }
    }
  }
  void rng;
  return out;
}

register({
  name: 'maltego',
  flags: { '-h': 'emulated' },
  handle() {
    return [
      [
        {
          kind: 'text',
          text:
            'maltego — emulated link graph. Use buildGraph(world, events, options) from a mission. ' +
            'Entities: person, host, mmsi, domain, wallet, document, account. The UI renders the graph as an SVG with transforms.\n',
        },
      ],
    ];
  },
});