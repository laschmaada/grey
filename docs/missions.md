# Mission Authoring

How to add a new mission. This is the load-bearing reference for content; the simulator's worth is in its missions.

## Mission schema

```ts
interface MissionDef {
  id: string;            // unique, lowercase, matches 'a[1-4]?[r|b]?-name' pattern
  act: 1 | 2 | 3 | 4 | 5;
  track: 'shared' | 'red' | 'blue';
  title: string;         // human-readable
  payoutBase: number;    // credits ₡ at quality = 1.0
  requiredTools: string[];   // keys from src/content/tools.ts
  status: 'stub' | 'complete';
  world: (seed: number) => World; // pure, deterministic
  goals: GoalExpr;       // see §4.4 of CODING_PLAN
  scope: ScopeCard;      // see Appendix A.2
  brief: string;         // 1-3 sentences
  primer: string;        // 1 short paragraph, ≤ 3 minutes reading
  report: string;        // Markdown template the player fills in
  lab: string;           // real-world exercise using the host-only lab
  tags: { attack: string[]; d3fend: string[] };
  deck: Card[];          // spaced-repetition deck (M5-T10)
  journal: [string, string, string]; // 3 prompts
  routes: Transcript[];
  negatives: Transcript[];
}
```

The §5 content linter enforces these rules on every `status: 'complete'` mission:

- All required fields present.
- At least 2 routes + 1 negative transcript.
- Every `requiredTools` entry is in the starter kit or sold in a tier ≤ the mission's act.
- Shared missions use no track-exclusive tools.
- Blue missions reference no Red-only events and vice-versa.
- Act 4 shared missions use only shared tools.

The `npx tsx scripts/content-lint.ts` runner is part of `npm run verify`. It fails the build on any violation.

## Transcripts

A transcript is the test fixture the runScript harness uses to validate the mission. Format:

```json
{
  "mission": "a1-first-contact",
  "name": "route-a",
  "seed": 1234,
  "commands": [
    "nmap -sV -Pn 192.0.2.10"
  ],
  "expect": {
    "goals": ["service_identified(grid-gw,22)"],
    "notGoals": [],
    "scopeStrikes": 0
  }
}
```

A mission can have any number of routes and negatives. The linter requires at least 2 routes + 1 negative for `status: 'complete'`.

## Worlds

A world is a pure factory from a seed:

```ts
function myWorld(seed: number): World {
  return {
    seed,
    hosts: [
      { id: 'grid-gw', ip: '192.0.2.10', hostname: 'gw.grid.test', os: 'Linux 4.18', inScope: true, services: [...] },
    ],
    vulns: [],
    creds: [],
    edges: [],
    dns: [],
    web: { rootUrl: 'http://gw.grid.test/', nodes: [], links: [], index: new Map() },
    docs: [],
    defenses: { hostIds: [] },
    pinned: ['hosts.grid-gw.ip'],
  };
}
```

Hard rules for worlds:

- **Reserved IP ranges only.** `192.0.2.0/24`, `198.51.100.0/24`, `203.0.113.0/24`, RFC 1918, loopback, link-local. `validateWorld()` in `src/core/world.ts` enforces this.
- **Reserved domains only.** `.test`, `.example`, `.invalid`, `.localhost`.
- **No `Math.random()` / `Date.now()` / `fetch` / `Math.random()`.** Use `makeRng(world.seed ^ <label>)` for any non-determinism.
- **Pinned paths.** List the JSON-pointer-like paths whose content must not change across seeds. The world validation tests assert this.
- **OS strings.** Use fictional names. `Linux 4.18`, `Linux 5.x`, `Windows 10`, `Windows 11`. Never a real version like `Windows 10 22H2 Build 19045.2604` — that fingerprints a real install.

## Goals

The §4.4 vocabulary:

| Atom | Args | What it tests |
|---|---|---|
| `host_discovered` | `hostId` | player scanned / saw the host |
| `service_identified` | `hostId, port` | player identified a service (nmap -sV, msf aux, dig + nmap) |
| `fact_found` | `key` | arbitrary fact key in knownFacts |
| `scan_performed` | `scan` | player ran the named scan |
| `session_open` | `hostId, type?` | player opened a session (msf exploit, sliver use) |
| `credential_obtained` | `user, hostId` | player recovered a cred (hydra, john) |
| `file_retrieved` | `path` | player retrieved a file (meteorpreter download, sliver download) |
| `evidence_preserved` | `hostId` | player captured memory before powering off |
| `host_isolated` | `hostId` | player isolated the host |
| `rule_written` | `id` | player wrote a Snort rule |
| `rule_blocks` | `flowSet` | the rule blocks a flow set |
| `rule_fp_below` | `max` | the rule's FP rate is below `max` |
| `alerts_triaged` | `setId` | player triaged an alert set |
| `intel_verified` | `claim` | the claim has ≥ 3 distinct sourceType+origin in intelClaims |
| `report_submitted` | `id` | player submitted a report |
| `noise_below` | `n` | noise < `n` |
| `scope_strikes_below` | `n` | scope strikes < `n` |
| `custom` | `name, args?` | mission-defined |

Combinators: `all`, `any`, `not`.

The goal engine reads the `knownFacts` set first, then the event log. A `session_open` predicate is satisfied if either:

```ts
ctx.knownFacts.has(`session:${atom.hostId}`) ||
ctx.store.campaign.concat(ctx.store.session?.events ?? []).some(
  (e) => e.type === 'session_open' && e.payload['hostId'] === atom.hostId && ...
);
```

Use `knownFacts` in the sim module's `run(ctx)` so the goal engine can match even when no `session_open` event has been emitted.

## Scope cards

```ts
interface ScopeCard {
  inScope: string[];       // hostIds
  outOfScope: string[];    // hostIds
  permitted: string[];     // tool names
  forbidden: string[];     // method names
  window?: [string, string]; // virtual-ms time window
  dataRule: string;         // human-readable
}
```

The `scopeReducer` in `src/core/reducers.ts` increments `strikes` for each command that targets a host in `outOfScope` or uses a method in `forbidden`. The mission's negative transcripts are designed to assert that an out-of-scope touch **fails** the goal.

## Brief / primer / report / lab

- **brief** — 1-3 sentences. The player sees this on the mission card.
- **primer** — 1 short paragraph. The player sees this on "show primer". ≤ 3 minutes of reading.
- **report** — Markdown template. The player fills this in to complete the mission.
- **lab** — real-world exercise using the host-only lab. Includes a hint about which tool to use and the expected output shape.

The `lab:` field is required and is the simulator's *transfer-to-reality* commitment: every simulator operation has a real-world counterpart. The default Kali + Metasploitable 2 setup is in `docs/lab/BUILD.md`.

## Scaffolding

The `scaffolding` field (from `src/core/scaffolding.ts`) controls which hints the UI shows:

| Level | Checklist | Hints | Worked example | Ledger commentary |
|---|---|---|---|---|
| `worked` (Act 1) | ✓ | ✓ | ✓ | ✓ |
| `checklist+hints` (Act 2) | ✓ | ✓ | — | ✓ |
| `checklist` (Trial 1) | ✓ | — | — | ✓ |
| `objective` (Act 3) | — | — | — | — |
| `raw` (Trial 2, Act 4, Finale) | — | — | — | — |

The §3.5 fade schedule is automatic: the mission template picks the level based on `act`. The `TRIAL_1` wrapper at M6-T08 reuses `a1-first-contact` with `raw` scaffolding and `payoutBase: 0` to act as the gating Trial 1 content.

## End-to-end example: adding `a1-foo`

```ts
// src/content/missions_runtime.ts
const a1FooWorld = (seed: number): World => ({
  seed,
  hosts: [
    {
      id: 'foo',
      ip: '192.0.2.30',
      hostname: 'foo.grid.test',
      os: 'Linux 5.x',
      inScope: true,
      services: [{ port: 22, proto: 'tcp', name: 'ssh', state: 'open' }],
    },
  ],
  vulns: [],
  creds: [],
  edges: [],
  dns: [],
  web: { rootUrl: 'http://foo.grid.test/', nodes: [], links: [], index: new Map() },
  docs: [],
  defenses: { hostIds: [] },
  pinned: ['hosts.foo.ip'],
});

registerMission({
  id: 'a1-foo',
  title: 'Foo',
  brief: 'Find the open service on foo.',
  primer: 'Run nmap -sV -Pn 192.0.2.30.',
  report: '## Foo\n- service\n- product/version',
  lab: 'Run `nmap -sV -sC 192.0.2.30` in your lab.',
  world: a1FooWorld,
  goals: { kind: 'service_identified', hostId: 'foo', port: 22 },
  scope: {
    inScope: ['foo'],
    outOfScope: [],
    permitted: ['nmap'],
    forbidden: [],
    dataRule: 'no exfiltration',
  },
  transcripts: [
    {
      name: 'route-a-nmap',
      seed: 1234,
      steps: [{ command: 'nmap -sV -Pn 192.0.2.30', afterMs: 1000, expectFacts: ['service:foo:22'] }],
      expectedGoalsSatisfied: true,
    },
    {
      name: 'negative-1-no-target',
      seed: 1234,
      steps: [{ command: 'nmap -sV -Pn 192.0.2.99', afterMs: 800 }],
      expectedGoalsSatisfied: false,
    },
  ],
});
```

```ts
// src/content/missions.ts
{ id: 'a1-foo', act: 1, track: 'shared', title: 'Foo', payoutBase: 100, requiredTools: [], status: 'complete', milestone: 'M2' },
```

```ts
// tests/m1-foo.test.ts
import { describe, it, expect } from 'vitest';
import '../src/test/bootstrap.js';
import { loadMission, runTranscript, type Transcript } from '../src/content/missions_runtime.js';
import { evaluate, type GoalContext } from '../src/core/goals.js';
import { type EventStore } from '../src/core/events.js';
import type { GameEvent } from '../src/core/types.js';

describe('a1-foo', () => {
  it('route-a reaches the goal', () => {
    const m = loadMission('a1-foo');
    const facts = new Set<string>(['service:foo:22']);
    const events: GameEvent[] = [];
    const ctx: GoalContext = {
      world: m.world, store: { campaign: events, nextId: 1 } as EventStore,
      knownFacts: facts, intelClaims: new Map(), scopeStrikes: 0, noise: 0,
    };
    expect(evaluate(m.goals, ctx)).toBe(true);
  });

  it('negative-1 fails the goal', () => {
    const m = loadMission('a1-foo');
    const facts = new Set<string>();
    const events: GameEvent[] = [];
    const ctx: GoalContext = {
      world: m.world, store: { campaign: events, nextId: 1 } as EventStore,
      knownFacts: facts, intelClaims: new Map(), scopeStrikes: 0, noise: 0,
    };
    expect(evaluate(m.goals, ctx)).toBe(false);
  });
});
```

## Honest authoring rules

1. **No real exploits.** Every "exploit" is a state transition in the world model. No real payload bytes, no real shellcode, no working exploit logic.
2. **No real network calls.** No `nmap` against real hosts; no Metasploit modules that open sockets. The simulator runs in the browser.
3. **No real tools' branding.** The plan's §8 says: "Tool names are used descriptively only; commercial tools get generic UI (no replicated branding)." Use Nmap / Metasploit / Burp / Snort / Sliver / Wazuh / Velociraptor names descriptively; don't reproduce their logos or UI in the simulator.
4. **No copyrighted text.** All prose is original. Output formats follow public conventions; wording is fresh.
5. **Reserved identifiers.** IPs from `192.0.2.0/24`, `198.51.100.0/24`, `203.0.113.0/24`, RFC 1918, loopback, link-local. Domains under `.test`, `.example`, `.invalid`. Emails at those domains.
6. **No real credentials.** Fixture creds for `runHydra` / `runJohn` are clearly fictional (`admin/admin123`, `analyst/Spring2025!`, `root/toor`, `svc_backup/P@ssw0rd!`, `j.doe/ChangeMe!`). Don't reuse real leaked creds.
7. **Every clue is reachable.** The §5 content truth rules require every clue and false flag in `src/content/truth.ts` to be placed in ≥ 1 mission with a discoverable path. Key links K1–K5 all reachable by a canonical route.

If you're unsure, the §10 scope-cut ladder is the only approved way to ship less than the plan asks for. Every cut goes in `BLOCKERS.md` with a reason.
