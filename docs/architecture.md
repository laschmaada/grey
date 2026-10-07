# Architecture

This document explains how GREY HERON is structured and why. It is the load-bearing technical reference; the 14 ADRs in `docs/adr/` are the per-decision rationale.

## Top-down

GREY HERON is a single-page web app that simulates a network-security investigation. It is built as **a single HTML file** (with everything inlined) so it can be opened directly from `file://` with no server, dropped onto a USB stick, or served from a static host.

```
┌──────────────────────────────────────────────────────────────────┐
│ index.html  (inlined: <style>, <script type="module" src="...">)  │
│ CSP: default-src 'none'; connect-src 'none'; …                      │
└──────────────────────────────────────────────────────────────────┘
         │
         │ ES modules
         ▼
┌──────────────────────────────────────────────────────────────────┐
│ src/main.tsx → src/ui/app.tsx (Preact, hub + mission screens)     │
│   • hash router (#/hub, #/mission/<id>)                            │
│   • UiStore (pub-sub)                                              │
│   • TerminalView (native <input> prompt, role=log, aria-live)     │
│   • click-to-pin pinnable spans                                    │
└──────────────────────────────────────────────────────────────────┘
         │
         │ runs in the same JS context but only `ui/` touches Preact
         ▼
┌──────────────────────────────────────────────────────────────────┐
│ src/engine/session.ts — terminal runtime                          │
│   • prompt stack: shell → msf → module → meterpreter              │
│   • history, tab completion, output span model                    │
│   • dispatches to registered commands via src/engine/registry.ts   │
└──────────────────────────────────────────────────────────────────┘
         │
         │ each command is a registered sim
         ▼
┌──────────────────────────────────────────────────────────────────┐
│ src/sims/*  +  src/engine/*  +  src/core/*                        │
│   • Each sim is a pure function on (argv, ctx) → OutputSpan[][]  │
│   • The world lives in src/core/types.ts and is materialised       │
│     per-mission via registerMission({ world: (seed) => World })   │
│   • Snort rule engine, traffic gen, pcap writer, IR mechanics,    │
│     intel verification, Rook replay, beacon puzzle — all pure      │
└──────────────────────────────────────────────────────────────────┘
```

## Layers

The codebase is split into seven layers with strict import boundaries:

| Layer | Path | Purpose | May import |
|---|---|---|---|
| **core** | `src/core/` | world model, RNG, clock, events, reducers, knowledge, goals, save envelope, traffic, snort, ir, intel, rook, honeytoken, beacon, adversity | — |
| **engine** | `src/engine/` | session, registry, output model, personality, msfconsole, meterpreter, meridian | core |
| **sims** | `src/sims/` | one file per tool: nmap, msf, web/dork, tshark, gobuster, sqlmap, certlog, theharvester, wayback, netcat, burp, ais, sherlock, hydra_john, sliver, wazuh, velociraptor | core, engine |
| **systems** | `src/systems/` | portfolio, zip, exportlint, scaffolding, field, review, coverage | core |
| **content** | `src/content/` | versions, tools, missions (stub list), shop, missions_runtime (per-mission data) | core, engine |
| **ui** | `src/ui/` | Preact store + screens + components | (everything, but only ui/ imports preact) |
| **test** | `src/test/` | bootstrap (side-effect import of all sims), harness | everything |

Enforced by `scripts/boundaries.ts` and the ESLint config in `eslint.config.js`.

## The world model

`World` is the canonical state:

```ts
interface World {
  seed: number;
  hosts: Host[];
  vulns: Vuln[];
  creds: Cred[];
  edges: Edge[];            // connectivity graph
  dns: DnsRecord[];
  web: WebGraph;            // dorkable pages
  docs: Doc[];              // free-text, may contain seeded secrets
  defenses: Defenses;
  traffic?: TrafficProfile;
  pinned: string[];         // JSON-pointer-like paths that seeded jitter must NOT touch
}
```

A `Host` carries `id`, `ip`, optional `hostname`, `os`, `inScope: boolean`, and a list of `Service`s. The `pinned` array lists dotted paths (`hosts.grid-gw.services.22.product`) that the seeded jitter may never modify — this is how transcript tests assert "this fact must not change across seeds."

Each mission materialises its world from a seed via `MissionDef.world(seed)`. The simulator is event-sourced: the player's actions append `GameEvent`s to the `EventStore`; the goal engine reads the event stream + a `knownFacts` set + the world's static data.

## Determinism

Two corollaries of the design:

1. **Same seed → same world.** `world(seed)` is a pure function. The mission's `world.ts` factory must not read `Math.random()` or `Date.now()`. The ESLint D6 ban enforces this; `boundaries.ts` is a second line of defense.
2. **Same events → same evaluation.** `evaluate(goals, ctx)` is pure. The `runScript()` test harness in `src/test/harness.ts` re-runs every mission transcript and asserts the goal is satisfied (or not) given the recorded events.

The seeded RNG (`src/core/rng.ts`) is mulberry32 with `fork(label)` for label-stable sub-streams. UI animations use the virtual clock, not `requestAnimationFrame` wall time.

## Events and derived state

`GameEvent = { id, t (virtual ms), actor, type, payload }` — append-only. The event log is the source of truth; the wallet, noise, trust, evidence integrity, and quality score are derived by `src/core/reducers.ts`.

The plan's `§4.5`:
- **Wallet** — `earn / purchase / advance / repay` with the Ledger advance rule (no interest, repaid from next payout).
- **Noise** — bumps per scan / exploit, decays over time.
- **Trust** — clamped `[0, 1]`. Block-beni IR actions drop it by `0.1`.
- **Evidence integrity** — `memory_captured` MUST happen before `host_powered_off` on the same host, or the action is an `OrderViolation` (M6-T06).
- **Scope strikes** — `scopeReducer` evaluates each command against the `ScopeCard` and records a strike if the target is `outOfScope` or the method is `forbidden`.

The quality composer (`qualityMultiplier` in reducers) clamps the payout multiplier to `[0.85, 1.15]`. Payout = `base × quality + fieldBonus` where `fieldBonus = 0.25 × base` for verified lab evidence.

## Knowledge

Two related but separate things:

- **`Fact`** — a key/value the player has discovered (e.g. `service:grid-gw:22`, `hashdump:grid-gw`, `harvested:emails:>=2`).
- **`IntelItem`** — a single (claim, sourceType, origin) tuple. The intel list aggregates items, deduplicates by claim, and computes the `corroborated` / `verified` state per §4.4:
  - `corroborated` — ≥ 2 items for the same claim with **different** `sourceType` **and** different `origin`.
  - `verified` — ≥ 3 such items.

The `intel_verified` goal predicate requires `verified`; the `isVeyraSuspect` helper in `src/core/intel.ts` flags single-source "veyra" claims as the K5 false-flag pattern from §7.2.

## Goal engine

`GoalExpr` is a small AST:

```ts
type GoalExpr =
  | { all: GoalExpr[] } | { any: GoalExpr[] } | { not: GoalExpr }
  | GoalAtom;

type GoalAtom =
  | { kind: 'host_discovered'; hostId: string }
  | { kind: 'service_identified'; hostId: string; port: number }
  | { kind: 'session_open'; hostId: string; type?: 'shell' | 'meterpreter' }
  | { kind: 'credential_obtained'; user: string; hostId: string }
  | { kind: 'rule_written'; id: string }
  | { kind: 'beacon:detected' }   // mission-keyed fact
  | { kind: 'intel_verified'; claim: string }
  | …;
```

`evaluate(expr, ctx)` is pure; the `Driver` test harness re-runs every mission transcript and asserts the goal fires (or not) given the recorded events.

## Terminal model

The `Session` owns a **prompt stack**: shell → msf → module → meterpreter. `pushPrompt('msf6 tcp > ')` and `popPrompt()` change the active prompt. `dispatch(line)` tokenises, routes built-ins (`help`, `man`, `history`, `clear`, `echo`, `exit`) to internal handlers, and falls through to the command registry.

Output is a list of typed spans — never raw HTML:

```ts
type OutputSpan =
  | { kind: 'text'; text: string; color?: string }
  | { kind: 'pinnable'; id: string; text: string; label?: string }
  | { kind: 'link'; text: string; href: string };
```

The terminal view (`src/ui/components/terminal-view.tsx`) renders each span with `textContent` and a single `createElement` for `pinnable` (so the player can save an output block as evidence). D14 bans `innerHTML` / `outerHTML` / `insertAdjacentHTML` in `core/engine/sims/systems/content`; ESLint enforces it.

## Traffic + pcap

`src/core/traffic.ts` is the **single** traffic generator. The msf aux portscan, the beacon puzzle, the Sliver callback, and the Snort rule engine all read from this. Frames are encoded Ethernet / IPv4 / TCP|UDP|ICMP in **big-endian network byte order** (file headers are little-endian per pcap spec). Every packet is deterministic given the seed.

`writePcap(packets)` produces a real `.pcap` file — magic `0xa1b2c3d4`, snaplen `65535`, link type `1` (Ethernet), per-record header `ts_sec ts_usec incl_len orig_len`. The player can open it in Wireshark.

`tshark -Y <filter>` uses a tiny BPF subset: `==, !=, contains, &&, ||, !`. Unknown fields return `not emulated in this simulator`.

## Snort rule engine

`src/core/snort.ts` parses and evaluates Snort rules (header + options). Supported options per the plan: `msg`, `content` (quoted / pipe-encoded / bare), `nocase`, `flags: S/A/F/R/P`, `sid`, `rev`, `classtype`, `reference`. Host match is CIDR/24 only. The Snort sim's `falsePositiveRate(rule, benignCorpus)` measures the false-positive cost of a rule.

The Snort rule editor UI is deferred; the engine itself is in place and stable.

## IR mechanics (Act 2)

`src/core/ir.ts` models the incident-response state machine:

- `memory_captured(host)` — record the memory image (must happen first)
- `host_powered_off(host)` — power off; **must** be after memory_captured on the same host, or the action is an `OrderViolation`
- `isolate(host)` — block all traffic to/from host
- `contain(host, mode)` — block inbound, outbound, or both
- `reauthorize(host)` — lift isolate / contain
- `block_traffic(host)` — without a prior compromise flag, this **costs 0.1 Trust** (§6 M6-T06)

`isForensicallyClean(state, hostId)` returns true if and only if `memory_captured` happened strictly before `host_powered_off` on that host.

## Mission format

A mission is a `MissionDef`:

```ts
interface MissionDef {
  id: string;
  act: 1|2|3|4|5;
  track: 'shared' | 'red' | 'blue';
  title: string;
  payoutBase: number;
  requiredTools: string[];
  status: 'stub' | 'complete';
  world: (seed: number) => World;
  goals: GoalExpr;
  scope: ScopeCard;
  brief: string; primer: string; report: string; lab: string;
  tags: { attack: string[]; d3fend: string[] };
  deck: Card[]; journal: [string, string, string];
  routes: Transcript[];
  negatives: Transcript[];
}
```

`transcripts/<name>.json` is the format the test runner consumes:

```json
{
  "mission": "a1-first-contact",
  "name": "route-a",
  "seed": 1234,
  "commands": ["nmap -sV -Pn 192.0.2.10"],
  "expect": {
    "goals": ["service_identified(grid-gw,22)"],
    "notGoals": [],
    "scopeStrikes": 0
  }
}
```

The content linter (`scripts/content-lint.ts`) walks every `complete` mission and checks: all fields present, ≥ 2 routes + ≥ 1 negative, dependency rules, no track-exclusive tools in shared missions, Blue missions never reference Red-only events, etc.

## UI

`src/ui/app.tsx` is a Preact app with two screens:

- `Hub` — lists missions (filtered by `status: 'complete'`), shows a one-line simulator warning.
- `Mission` — terminal view + status bar (mission id + goal status).

The hub uses `window.location.hash` for routing (`#/hub`, `#/mission/<id>`). A `UiStore` is a pub-sub that the terminal view writes to; the mission screen re-evaluates the goal each time the player makes a relevant action.

A full hub + mission screen + happy-dom smoke test lives in `tests/m3-ui.test.tsx`.

## Build and ship

`vite.config.ts` uses `vite-plugin-singlefile` to inline everything into `dist/index.html`. Output cap: 2.5 MB. Zero external URLs (CSP `connect-src 'none'`).

The size check (`scripts/size-check.ts`) catches any resource the plugin misses: it scans the inlined file for `src="http://..."` and `href="http://..."` attributes. W3C XML namespace identifiers (`http://www.w3.org/2000/svg`) are allowed because they are not network resources — they are strings inside the inlined source.

The GitHub Actions workflow (`.github/workflows/ci.yml`) runs `npm run verify` on every push and PR. The `pages` job deploys `dist/index.html` to GitHub Pages on every push to `main`.

## Where M8 + M9 will plug in

| Layer | M8 | M9 |
|---|---|---|
| core | `volatility.ts` (process-image sim), `maltego.ts` (link graph), upgraded `adversary.ts` (the Act 4 flip test) | perf budget enforcement, full save migration tests |
| engine | upgraded `meridian.ts` for behavioural thresholds | — |
| sims | chain explorer (Act 4 attributions) | — |
| ui | Mosaic board (M8-T06) | a11y audit, themes, reduced motion |
| test | Act 4 + finales + flip-test | full-economy canonical transcript run |

Full plan: `CODING_PLAN.md`. Current status: `PROGRESS.md`. Deferred items: `docs/deferred.md`.

## Where to read next

- [`docs/development.md`](development.md) — how to set up a dev environment, run tests, and add a new sim
- [`docs/missions.md`](missions.md) — how to author a new mission
- [`docs/field-manual.md`](field-manual.md) — every sim's CLI surface, what it does, what it doesn't
- [`docs/adr/0001-typescript-strict.md`](adr/0001-typescript-strict.md) … [`0014-zero-network.md`](adr/0014-zero-network.md) — the 14 architecture decision records
- [`DESIGN.md`](../DESIGN.md) — the game design
- [`CODING_PLAN.md`](../CODING_PLAN.md) — the engineering plan
- [`docs/FINAL_REPORT.md`](FINAL_REPORT.md) — what shipped at v0.4.0
