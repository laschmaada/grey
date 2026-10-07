# Development

How to set up a dev environment, run tests, and add a new sim or mission.

## Prerequisites

- **Node 20+** and **npm** (the `package.json` `engines` block recommends Node 20).
- **Git**.
- A POSIX-ish shell (bash / zsh / git-bash on Windows). All scripts are POSIX-portable.
- Optional: a real Kali + Metasploitable 2 host-only lab for `lab:` assignments. Setup: [`lab/BUILD.md`](lab/BUILD.md).

## Setup

```bash
git clone <your-fork>
cd grey-heron
npm install
npm run verify          # should pass on a clean checkout
```

`npm run verify` runs 8 stages and is the single command that proves the build is sound. If any stage fails, fix the underlying problem and re-run.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server (port 5173 by default). HMR for the UI. |
| `npm run build` | Vite production build → `dist/index.html` |
| `npm run preview` | Serve the production build locally |
| `npm run test` | Vitest one-shot (`vitest run`) |
| `npm run test:watch` | Vitest watch mode |
| `npm run lint` | ESLint over the whole tree |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run boundaries` | `scripts/boundaries.ts` — cross-checks layer isolation |
| `npm run content-lint` | `scripts/content-lint.ts` — every `complete` mission passes the §5 content checks |
| `npm run economy-check` | `scripts/economy-check.ts` — recomputes §9 tables, asserts the 9,270 ₡ grand total per track |
| `npm run size-check` | `scripts/size-check.ts` — bundle ≤ 2.5 MB; 0 external URLs in the artifact |
| `npm run export-lint` | `scripts/export-lint.ts` — scan a directory for reserved-ID violations |
| `npm run repl -- a1-first-contact` | Play a mission in the terminal with meta commands (`:goals`, `:status`, `:wallet`, `:events`) |
| `npm run verify` | All of the above in order |

## Project layout

```
grey-heron/
  DESIGN.md  CODING_PLAN.md  PROGRESS.md  BLOCKERS.md  README.md  LICENSE
  package.json  tsconfig.json  vite.config.ts  vitest.config.ts  eslint.config.js  .prettierrc
  .github/workflows/ci.yml
  scripts/                 # the gate runners
  src/                     # the source
  tests/                   # the tests
  docs/                    # the docs
```

## Tests

Tests live in `tests/` and are the only place that imports from `vitest`.

| File | What it covers |
|---|---|
| `tests/content.smoke.test.ts` | 30 missions registered, IDs unique, required tools in the catalog |
| `tests/m1-rng-clock.test.ts` | mulberry32 + `fork` determinism |
| `tests/m1-events.test.ts` | append-only event store, session/campaign, replay equality |
| `tests/m1-reducers.test.ts` | wallet / noise / trust / scope / quality / intel |
| `tests/m1-goals.test.ts` | all/any/not combinators, intel_verified |
| `tests/m1-save.test.ts` | base64url envelope, contentHash, migration |
| `tests/m1-world.test.ts` | `validateWorld` (RFC 1918 / 5737 / loopback), pinned invariance |
| `tests/m2-terminal.test.ts` | tokenizer, session, dispatch, nmap formatter, msfconsole prompt stack |
| `tests/m3-boot.test.ts` | `dist/index.html` boots from `file://` |
| `tests/m3-ui.test.tsx` | hub + mission route in happy-dom |
| `tests/m4-export.test.ts` | STORE ZIP + CRC32 + parse-back; export linter |
| `tests/m5-traffic.test.ts` | pcap writer, tshark display-filter subset |
| `tests/m5-tshark.test.ts` | tshark read + format |
| `tests/m5-snort.test.ts` | Snort rule parse + match + false-positive scoring |
| `tests/m5-meridian.test.ts` | 20 alerts, 3 TPs, triage / log search |
| `tests/m5-msf.test.ts` | msfconsole prompt stack |
| `tests/m5-missions.test.ts` | 8 Act 1 + 2 Act 2 mission routes |
| `tests/m6-sims.test.ts` | gobuster, sqlmap, certlog, theharvester, wayback, netcat, burp, IR |
| `tests/m6-missions.test.ts` | 6 Act 2 mission routes |
| `tests/m7.test.ts` | AIS, sherlock, honeytoken, intel, Rook, beacon, Wazuh, Velociraptor, Sliver, Hydra, John + 8 Act 3 mission routes |

A new sim or mission must add at least one test file or one test in an existing file.

## Adding a new sim

1. Create `src/sims/<tool>.ts`. The sim must:
   - Import `register` from `'../engine/registry.js'`.
   - Export a pure `run<Name>(world, …options)` function plus a `register({ name, flags, handle })` block.
   - Not import from `ui/`, never touch `document` / `window` / `localStorage` / `Date.now()` / `Math.random()`. ESLint enforces this for the layer; `scripts/boundaries.ts` is the second line of defense.
   - Use the seeded `Rng` (`makeRng(world.seed ^ <label>)`) for any non-determinism.

2. Wire it into `src/test/bootstrap.ts`:
   ```ts
   import '../sims/<tool>.js';
   ```

3. Tests in `tests/<name>.test.ts`. Cover at least: a known input → known output, an unknown flag → `not emulated` message, and a scope/edge case.

4. If the sim supports known-good inputs, capture a real output as a golden fixture per [`lab/CAPTURE_GOLDEN.md`](lab/CAPTURE_GOLDEN.md) and flip the formatter's `goldenStatus: 'verified'`. Until then, the formatter carries `goldenStatus: 'unverified'`.

5. Run `npm run verify` before committing. The `eslint`, `tsc`, `boundaries`, and `vitest` stages must all pass.

### Skeleton

```ts
/**
 * M?-T?? — <tool> sim.
 *
 * <what it emulates + what it doesn't, in plain English>.
 */
import { register } from '../engine/registry.js';
import type { World } from '../core/types.js';

export function run<Name>(world: World, options: <Name>Options): <Name>Result {
  // pure: same (world, options) → same result
  return { /* ... */ };
}

export interface <Name>Options { /* ... */ }
export interface <Name>Result { /* ... */ }

register({
  name: '<tool>',
  flags: {
    '-h': 'emulated',
    '--flag': 'emulated',
    // known but unimplemented
    '--unreal': 'not-emulated',
  },
  handle(argv, _ctx) {
    return [[
      { kind: 'text', text: '...' },
    ]];
  },
});

export {}; // keep file as a module
```

## Adding a new mission

See [`missions.md`](missions.md) for the full authoring guide, but the short version:

1. Add a `registerMission({...})` block to `src/content/missions_runtime.ts`. Required fields per `MissionDef`:
   - `id` — must be unique and follow the `a[1-4][r|b]?-name` pattern
   - `act`, `track` (`'shared' | 'red' | 'blue'`)
   - `title`, `payoutBase` (must match the value in `src/content/missions.ts`)
   - `requiredTools` — tool keys from `src/content/tools.ts`
   - `status: 'complete'` for the missions that should appear in the hub
   - `world: (seed: number) => World` — pure, deterministic
   - `goals: GoalExpr` — predicate from the §4.4 vocabulary
   - `scope: ScopeCard` — see `Appendix A.2`
   - `brief`, `primer`, `report`, `lab` — short Markdown
   - `transcripts` — at least 2 routes + 1 negative for `complete` missions

2. Add a row in `src/content/missions.ts` with `status: 'complete'` for the missions that should appear in the hub.

3. Tests in `tests/missions.test.ts` or a per-mission test file. Use the `Driver` / `runScript()` pattern in `src/test/harness.ts`.

4. Run `npm run verify`. The `content-lint` stage will catch missing fields, broken tool references, and track-exclusive tool violations.

## Debugging

- **`npm run verify` fails on `eslint`** — the D6/D14 bans are strict. Look at the violation and fix the source. Most common: `Math.random()`, `Date.now()`, `innerHTML`, `fetch`.
- **`tsc --noEmit` fails** — the type-checker is the most strict of the gates. Use `as never`, type predicates, or refactor the offending function rather than `// @ts-ignore`.
- **`vitest run` flaky** — the simulator is deterministic; if a test is flaky, there's a real bug. Run `npx vitest run --reporter=verbose` and inspect the event log with `runScript()`. The output of `:events` in the REPL is a good starting point.
- **`boundaries` complains** — `core/`, `engine/`, `sims/`, `systems/`, `content/` may not import from `ui/` or reference DOM globals. Move the file or split it.
- **`economy-check` fails** — `§9` of the plan has the per-act tables. Update `src/content/tools.ts` (the catalog) or `src/content/missions.ts` (the payout sums) to match.
- **`size-check` fails** — usually because new code inlined a `http://...` URL. Use `src/sims/<tool>.ts`'s CLI surface instead of inlining a help URL in user-facing text.

## Building a release

```bash
# 1. Verify
npm run verify

# 2. Build
npm run build
ls -lh dist/index.html    # confirm < 2.5 MB

# 3. Tag
git tag vX.Y.Z
git push origin --tags

# 4. CI deploys `dist/index.html` to GitHub Pages on every push to main
```

The release checklist is in [`RELEASE_CHECKLIST.md`](RELEASE_CHECKLIST.md). The v0.4.0 → v1.0.0 exit criteria live there.

## Code style

- TypeScript strict mode, `noUncheckedIndexedAccess`. Prefer `as const` over `any`.
- Files are < 400 lines. Split modules aggressively.
- Pure functions where possible. The boundary between pure and impure is at the `Session` / `App` layer.
- Tests are colocated by layer (`m5-*` for the M5 milestone) and live in `tests/`.
- The simulator's `goldenStatus` is `'unverified'` until you capture a real-world output. Don't claim verification you haven't earned.
