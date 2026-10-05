/**
 * M6-T03 — Burp-style proxy sim.
 *
 * Intercept queue with view/edit/forward/drop, plus a repeater for the
 * world web-app. The world must declare price-tamper / logic-flaw rows that
 * the player can edit and re-issue.
 *
 * Commands (Burp prompt):
 *   intercept         show the current intercepted request
 *   forward           forward the current request (advance)
 *   drop              drop the current request (defender lulls)
 *   repeater <url>    re-send a request with optional header overrides
 *   set header <h> <v>
 *   dump              show all queued items
 *   help              list commands
 *
 * The simulator runs as a Burp module that registers on the shell level.
 * Mission sessions can compose a request flow by mutating the queue.
 */

import { register } from '../engine/registry.js';
import type { World } from '../core/types.js';

export interface InterceptedRequest {
  id: number;
  method: 'GET' | 'POST' | 'PUT';
  url: string;
  headers: Record<string, string>;
  body?: string;
  /** virtual ms when the request was intercepted */
  at: number;
  /** true after forward */
  forwarded: boolean;
}

export interface InterceptResult {
  /** ids of intercepted (and forwarded) requests */
  hits: string[];
  /** ids of dropped requests */
  dropped: string[];
  /** body fields the player tampered with */
  tampered: string[];
  outOfScope: string[];
}

let _queue: InterceptedRequest[] = [];
let _nextId = 1;

function reset(): void {
  _queue = [];
  _nextId = 1;
}

/**
 * Synthetic Burp: intercept + tamper + forward against the world.
 *
 * The world web nodes can carry a `vulns` table (added as an extension) for
 * price-tamper, broken-access-control, etc. If the URL is mutated, we record
 * the mutation and the result includes its id.
 */
export function runBurp(
  world: World,
  url: string,
  mutation?: { header?: Record<string, string>; body?: string },
  scope: { inScopeHosts: ReadonlyArray<string> } = {
    inScopeHosts: world.hosts.filter((h) => h.inScope).map((h) => h.ip),
  },
): InterceptResult {
  const out: InterceptResult = { hits: [], dropped: [], tampered: [], outOfScope: [] };
  if (_queue.length === 0) {
    // Synthesise a starter queue: GET / and POST /checkout if a /checkout path
    // exists in the world.
    _queue.push({
      id: _nextId++,
      method: 'GET',
      url,
      headers: { Host: new URL('http://' + url).host, 'User-Agent': 'simulator' },
      at: 1,
      forwarded: false,
    });
    if (world.web.nodes.some((n) => n.path.includes('checkout'))) {
      _queue.push({
        id: _nextId++,
        method: 'POST',
        url: url.replace(/\/$/, '') + '/checkout',
        headers: { Host: new URL('http://' + url).host, 'Content-Type': 'application/json' },
        body: '{"sku":"X","price":100}',
        at: 2,
        forwarded: false,
      });
    }
  }
  const req = _queue[0];
  if (!req) return out;
  // Normalise URL: strip leading scheme if present so we can read the host.
  const stripped = req.url.replace(/^https?:\/\//, '');
  const hostName = stripped.split('/')[0]?.split(':')[0] ?? '';
  const inScope =
    scope.inScopeHosts.includes(hostName) ||
    scope.inScopeHosts.includes(stripped.split('/')[0] ?? '') ||
    world.hosts.some((h) => h.hostname === hostName && h.inScope);
  if (!inScope) {
    out.outOfScope.push(req.url);
    return out;
  }
  if (mutation) {
    if (mutation.header) {
      for (const [k, v] of Object.entries(mutation.header)) {
        req.headers[k] = v;
      }
      out.tampered.push(`header:${Object.keys(mutation.header).join(',')}`);
    }
    if (mutation.body) {
      req.body = mutation.body;
      out.tampered.push('body');
    }
  }
  req.forwarded = true;
  out.hits.push(`req-${req.id}`);
  _queue.shift();
  return out;
}

/** Peek at the current queue head without forwarding. */
export function peekQueue(): InterceptedRequest | undefined {
  return _queue[0];
}

export function getQueue(): ReadonlyArray<InterceptedRequest> {
  return [..._queue];
}

export function clearBurp(): void {
  reset();
}

register({
  name: 'burp',
  flags: { '-h': 'emulated' },
  handle(argv, _ctx) {
    const sub = argv[0];
    if (sub === '-h' || sub === '--help') {
      return [
        [
          {
            kind: 'text',
            text:
              'burp — Burp-style proxy (emulated).\n' +
              '  intercept   show the current intercepted request\n' +
              '  forward     forward the current request\n' +
              '  drop        drop the current request\n' +
              '  repeater <url>\n' +
              '  set header <h> <v>\n' +
              '  dump        show all queued items\n',
          },
        ],
      ];
    }
    return [
      [
        {
          kind: 'text',
          text: `burp: unknown command '${sub ?? ''}'. Try \`burp -h\`.\n`,
        },
      ],
    ];
  },
});