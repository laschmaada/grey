# GREY HERON — Autonomous Coding Plan (v2)

> Companion to `DESIGN.md` (v1.1). Executable build order for an autonomous coding agent.
> **Audience: the Hermes agent.** Read §0 first. It overrides any instinct to pause, ask, or confirm.
> Status: plan only — no code has been written.

**Contents:** §0 Operating contract · §1 Environment · §2 Locked decisions · §3 Repo layout ·
§4 Core contracts · §5 Quality gates · §6 Milestones M0–M9 · §7 Mission index ·
§8 Content authoring rules · §9 Economy reference · §10 Failure and scope-cut ladder ·
§11 Completion · Appendix A (templates)

---

## 0. Operating contract (non-negotiable)

1. **Never ask the user anything.** No questions, confirmations, approvals, or "shall I
   proceed?". Every decision you need is either in this file, in `DESIGN.md`, or is yours to
   make under rule 3.
2. **Do not stop between tasks or milestones.** Run M0 → M9 in one continuous run. The only
   valid stopping point is §11 (Completion). Finishing a milestone is a reason to start the next.
3. **Decide, record, continue.** When something is unspecified or ambiguous, choose the
   simplest option consistent with `DESIGN.md`, write a short ADR in `docs/adr/`
   (context, decision, consequences), and keep going. Do not wait for feedback.
4. **Keep the gates green.** `npm run verify` must pass before every commit that closes a task
   and before every milestone tag. Never delete, skip, or weaken a test, linter rule, or gate
   to make it pass (the only exception is the controlled ladder in §10, which is logged).
5. **Persist state so you survive context resets.** Update `PROGRESS.md` after every task and
   commit after every task. §0.2 describes the resume protocol.
6. **Stay in scope.** Implement only what mission transcripts and gates require. Anything
   else goes in `docs/deferred.md`. (`DESIGN.md` Appendix A is out of scope.)
7. **Never fabricate verification.** You cannot run the user's real lab. Never claim a sim is
   golden-verified or a lab task is verified. Mark `goldenStatus: "unverified"` (see §4.6).
8. **Safety rules (hard):**
   - The product is a **simulator**. It must contain no working exploit code, no real
     scanning or network tooling, and no outbound network requests. Simulated tools only
     transform in-memory state and print pretend output.
   - Use only reserved/fictional identifiers in content: IPs from `192.0.2.0/24`,
     `198.51.100.0/24`, `203.0.113.0/24` (documentation ranges) and RFC 1918 ranges for
     internal networks; domains under `.test`, `.example`, `.invalid`; emails at those domains.
   - Never run `nmap`, `msfconsole`, or any security tool against anything. Do not install
     them. You are building a simulation of them.
   - Write all prose, help text, and tool output originals. Do not paste man pages, tool
     docs, or copyrighted text.
9. **No runtime AI or network calls.** The app is fully offline and deterministic.

### 0.1 The task loop (repeat until §11)

```
1. Open PROGRESS.md → pick the first unchecked task (IDs like M2-T04).
2. Write or extend a failing test first (unit or transcript) when the task has behavior.
3. Implement the smallest change that passes it.
4. Run: npm run verify
5. Fix failures. If stuck, apply §10 (do not ask, do not idle).
6. git add -A && git commit -m "<type>(<scope>): <task id> <summary>"
7. Tick the task in PROGRESS.md, add a one-line note, update "Next 3 actions".
8. At the end of a milestone: run its gate (§6), write docs/milestones/Mx.md,
   git tag mX, then immediately start the next milestone.
```

### 0.2 Resume protocol (use after any context reset or restart)

1. Read `PROGRESS.md`, then skim `DESIGN.md` and this file.
2. `git log --oneline -10` and `git status`. If the tree is dirty, finish or revert to
   the last commit, whichever is smaller.
3. Run `npm run verify`. Fix anything red before new work.
4. Continue at the first unchecked task. If `PROGRESS.md` does not exist, this is a fresh
   start: begin M0-T01.

### 0.3 Source-of-truth order
`DESIGN.md` wins on game design. This file wins on engineering. If `DESIGN.md` contradicts
itself or this file, apply the errata in §7.3, record an ADR, and continue. If `DESIGN.md` is
missing from the repo root, search the workspace for it. If it is truly absent, build from
§7 and §9 (they contain the load-bearing numbers) and record an ADR.

---

## 1. Environment assumptions and fallbacks

- Node ≥ 20, npm, git are available. If a tool is missing, try the platform's package
  manager (corepack, nvm, apt) without asking. Log the workaround in `BLOCKERS.md`.
- If dependency installation fails, retry (mirror/cache/offline-cache), then fall back to a
  zero-dependency implementation where feasible (tests with `node:test`). Never block on it.
- Work on `main`. If a remote exists, push after each milestone tag; if push fails, log and
  continue. Never request credentials.
- Dev dependencies (pin via lockfile, use latest stable at install time):
  `typescript`, `vite`, `vite-plugin-singlefile`, `vitest`, `@vitest/coverage-v8`,
  `preact`, `@preact/preset-vite`, `eslint`, `typescript-eslint`, `prettier`, `tsx`, `happy-dom`.
- **Runtime dependencies: `preact` only.** Everything else is in-house.

---

## 2. Locked decisions (do not revisit; each becomes an ADR in M0)

| ID | Decision |
|----|----------|
| D1 | TypeScript, `strict` plus `noUncheckedIndexedAccess`; ES modules; no `any` without a comment |
| D2 | Vite + `vite-plugin-singlefile`; output `dist/grey-heron.html` (primary: static host; secondary: `file://`) |
| D3 | UI: **Preact** (hooks) with a small pub/sub store; core/engine/sims are framework-free |
| D4 | Terminal: **custom DOM terminal** with a native `<input>` prompt; text is rendered only via `textContent` |
| D5 | State: **event-sourced**. Two streams: *campaign* (committed events of finished missions) and *session* (the current attempt). Success commits session → campaign; retry discards the session |
| D6 | Time: **deterministic virtual clock** plus scheduler in core; no `Date.now()` or `Math.random()` in core/engine/sims/systems/content (lint-enforced) |
| D7 | Persistence: profile in `localStorage` (`greyheron.profile`); artifacts (evidence) in IndexedDB with an in-memory fallback; save envelope has `schemaVersion`, `contentHash`, migration registry |
| D8 | Content: TypeScript modules for structured data; prose (briefs, primers, report templates, field text) as Markdown imported with Vite `?raw` |
| D9 | Tests: Vitest; one **transcript test per route per mission**; coverage floors: core ≥ 85%, systems ≥ 80% (lines) |
| D10 | Portfolio export: in-house **STORE-method ZIP writer** (no compression) plus CRC32; Blob download with clipboard fallback |
| D11 | Emulated tool versions are constants in `src/content/versions.ts`: Nmap 7.9x, Metasploit Framework 6.x, Snort 3, Volatility 3, Wireshark/tshark 4.x |
| D12 | Lab baseline: Kali + Metasploitable 2 (host-only, snapshotted). Field assignments target it |
| D13 | License: MIT (change later if desired; note in README) |
| D14 | Egress: zero network requests in app code (lint ban on `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, `sendBeacon`); CSP meta tag; `innerHTML`/`outerHTML`/`insertAdjacentHTML` banned |

---

## 3. Repo layout

```
grey-heron/
  DESIGN.md  CODING_PLAN.md  PROGRESS.md  BLOCKERS.md  README.md  LICENSE
  package.json  tsconfig.json  vite.config.ts  vitest.config.ts  eslint.config.js  .prettierrc
  .github/workflows/ci.yml          # verify on push/PR; Pages deploy of dist on main
  scripts/
    boundaries.ts   content-lint.ts   economy-check.ts   size-check.ts   repl.ts
    export-lint.ts  contrast-check.ts
  src/
    core/       types.ts rng.ts clock.ts events.ts reducers.ts knowledge.ts goals.ts
                save.ts migrate.ts world.ts traffic/ adversary.ts
    engine/     tokenizer.ts registry.ts session.ts completion.ts output.ts personality.ts jobs.ts
    sims/       shell/ nmap/ web/ dns/ msf/ console/ tshark/ cert/ harvester/ netcat/ burp/
                gobuster/ sqlmap/ snort/ meterpreter/ sliver/ hydra/ john/ wazuh/ velociraptor/
                chain/ sherlock/ ais/ vol/ graph/
    systems/    economy.ts scope.ts quality.ts review.ts portfolio.ts fieldlab.ts report.ts
                coverage.ts zip.ts exportlint.ts verification.ts scaffolding.ts
    content/    versions.ts tools.ts shop.ts truth.ts missions/<id>/ trials/ decks/ news/ certs.ts
    ui/         app.tsx store.ts screens/ components/ terminal-view/ themes/ a11y/
    test/       harness.ts transcripts/ fixtures/golden/ fixtures/saves/
  docs/
    adr/  architecture.md  safety.md  deferred.md  milestones/  lab/BUILD.md
    lab/CAPTURE_GOLDEN.md  lab/FIELD_MANUAL.md  RELEASE_CHECKLIST.md  FINAL_REPORT.md
```

Keep files under ~400 lines; split modules rather than growing them.

---

## 4. Core contracts (implement these shapes; extend as needed, don't contradict)

### 4.1 Time and randomness
```ts
interface Clock { now(): number /* virtual ms */; advance(ms: number): void }
interface Scheduler { schedule(at: number, ev: ScheduledEvent): void; runUntil(t: number): void }
function makeRng(seed: number): { next(): number; int(a: number, b: number): number;
                                  fork(label: string): Rng }   // mulberry32; forks are label-stable
```
Commands consume virtual time (e.g., scan duration depends on timing template and port
count). The UI offers "fast-forward"; tests advance the clock directly.

### 4.2 World (truth)
```ts
interface World {
  seed: number; hosts: Host[]; vulns: Vuln[]; creds: Cred[]; edges: Edge[];
  dns: DnsRecord[]; web: WebGraph; docs: Doc[]; defenses: Defenses;
  traffic?: TrafficProfile; pinned: string[]   // JSON paths never altered by seeded jitter
}
interface Host { id: string; ip: string; hostname?: string; os: string; inScope: boolean;
                 services: Service[] }
interface Service { port: number; proto: 'tcp'|'udp'; name: string; product?: string;
                    version?: string; banner?: string; state: 'open'|'closed'|'filtered' }
```
**Seeded jitter** (latency, benign banner text, ephemeral ports) must never touch goal-relevant
facts: those paths are listed in `pinned`.

### 4.3 Events and derived state
```ts
interface GameEvent { id: number; t: number; actor: 'player'|'npc'|'system';
                      type: string; payload: Record<string, unknown> }
```
Reducers (pure) derive: wallet (earn, purchase, **advance**, repay), owned tools, noise (with
decay), Trust, evidence integrity, scope strikes (evaluated against the mission's Scope Card),
quality score (outcome + track metric + report completeness → multiplier clamped to 0.85–1.15).

### 4.4 Player knowledge (separate from truth)
```ts
interface Fact { key: string; value: unknown; discoveredAt: number; via: number /* event id */ }
interface IntelItem { id: string; claim: string; sourceType: SourceType; origin: string;
                      discoveredAt: number }
type SourceType = 'ais'|'certlog'|'blockchain'|'social'|'artifact'|'human'
type IntelState = 'unverified'|'corroborated'|'verified'
// corroborated: ≥2 items for the same claim with different sourceType AND different origin
// verified:     ≥3 such items
```

### 4.5 Goals (data-driven)
Predicate vocabulary (extend only when a mission needs it):
`host_discovered(host)`, `service_identified(host,port)`, `fact_found(key)`, `scan_performed(kind)`,
`session_open(host,type?)`, `credential_obtained(user,host)`, `file_retrieved(path)`,
`evidence_preserved(host)`, `host_isolated(host)`, `rule_written(id)`, `rule_blocks(flowSet)`,
`rule_fp_below(max)`, `alerts_triaged(setId)`, `intel_verified(claim)`, `report_submitted(id)`,
`noise_below(n)`, `scope_strikes_below(n)`, combinators `all/any/not`, and
`custom(name)` backed by a registry. Any valid route that reaches the world state counts.

### 4.6 Missions, sims, terminal
```ts
interface MissionDef {
  id: string; act: 1|2|3|4|5; track: 'shared'|'red'|'blue'; title: string; payoutBase: number;
  requiredTools: string[]; status: 'stub'|'complete';
  world: () => World; scope: ScopeCard; goals: GoalExpr; scaffolding: ScaffoldingLevel;
  brief: string; primer: string; report: ReportTemplate; lab: LabAssignment;
  tags: { attack: string[]; d3fend: string[] };
  deck: Card[]; journal: [string, string, string]; routes: Transcript[]; negatives: Transcript[];
}
interface SimModule { id: string; version: string; commands: CommandSpec[];
                      handle(ctx: SimContext, argv: string[]): SimResult }
interface CommandSpec { name: string; flags: Record<string, 'emulated'|'accepted-noop'|'not-emulated'>;
                        complete?(ctx: SimContext, partial: string): string[] }
```
- Terminal `Session` has a **prompt stack** (shell → msfconsole → module → meterpreter) and a
  **jobs table** (background handlers, listeners).
- **Strict parsing, realistic failure.** Invalid options fail like the real tool. Real but
  unimplemented options print a clear "not emulated in this simulator — see field manual"
  (never the invalid-option message). "Did you mean…" appears only *after* a failure.
- `help`, `-h`, `man` are always free.
- Output is a list of typed spans (text, pinnable block, link), never raw HTML.
- `goldenStatus: 'unverified'|'verified'` on every sim formatter; all start `unverified`.
  Hand-written fixtures follow public documented output formats; `docs/lab/CAPTURE_GOLDEN.md`
  tells the user how to capture real output later.

### 4.7 Save envelope
```ts
interface SaveFile { schemaVersion: number; contentHash: string; seed: number;
  profile: Profile; campaign: GameEvent[]; session?: { missionId: string; events: GameEvent[] } }
```
Export string = base64url(JSON) + checksum. Import validates schema, checksum, and runs migrations.
A `contentHash` mismatch warns and replays only the campaign stream's *derived* facts.

### 4.8 Traffic model (shared by pcap viewer, Snort, beaconing, Packet Storm)
One generator in `core/traffic/` produces flows/packets from world events plus background
profiles (benign HTTP/DNS/SSH, beacon with interval and jitter). It writes real `.pcap` files
(global header, Ethernet/IPv4/TCP/UDP/ICMP frames, documentation-range addresses) so the player
can open them in real Wireshark. Every consumer reads from this model.

---

## 5. Quality gates

`npm run verify` runs, in order, and fails on the first error:

```
tsc --noEmit
eslint .                       # includes D6/D14 bans and import-boundary rules
vitest run --coverage          # unit + transcript tests, coverage floors (D9)
tsx scripts/boundaries.ts      # core/engine/sims/systems/content must not import ui or touch DOM
tsx scripts/content-lint.ts    # mission template completeness + dependency rules + truth/clue rules
tsx scripts/economy-check.ts   # recomputes §9 numbers from content; asserts they match
vite build
tsx scripts/size-check.ts      # dist/grey-heron.html ≤ 2.5 MB; zero external URLs in output
```

**Content linter rules** (grow with milestones):
- Every mission with `status: 'complete'` has all template fields (Appendix A).
- Each complete mission has ≥ 2 distinct passing routes and ≥ 1 negative transcript.
- **Dependency rules:** every `requiredTools` entry is in the starter kit or sold in a tier
  ≤ the mission's act; shared missions use no track-exclusive tools; Blue missions reference no
  Red-only events and vice versa; Act 4 shared missions use only shared tools.
- **Truth rules:** each clue and false flag in `content/truth.ts` is placed in ≥ 1 mission
  with a discoverable path; key links K1–K5 all reachable by a canonical route.
- Content uses only reserved IPs/domains (§0.8).

**Per-mission Definition of Done** (checked by lint where possible): brief, primer, Scope Card,
world fixture, goals, ≥ 2 routes, ≥ 1 negative, lab assignment (with seeded flag), report
template, ATT&CK/D3FEND tags, deck cards, journal prompts, scaffolding level.

---

## 6. Milestones

Task IDs below seed `PROGRESS.md` verbatim. Do not renumber. Add sub-notes freely.

### M0 — Foundations
- [ ] M0-T01 Init repo and tooling: package.json scripts (`dev`, `build`, `test`, `verify`, `repl`), strict tsconfig, Vite + singlefile, Vitest + coverage, ESLint, Prettier, `.gitignore`, MIT license, README stub.
- [ ] M0-T02 Enforce D6/D14 in ESLint (restricted globals/properties) and write `scripts/boundaries.ts`; prove both fail on a deliberate violation (then remove it).
- [ ] M0-T03 `scripts/size-check.ts` and a placeholder app that builds to `dist/grey-heron.html`; CSP meta tag in `index.html` (`default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; connect-src 'none'; base-uri 'none'; form-action 'none'`; inline allowances are required by the single-file build; record in ADR).
- [ ] M0-T04 CI workflow: run `verify`; on `main`, publish `dist` as `index.html` to Pages (only if the repo has Pages permissions; otherwise leave the job and note it).
- [ ] M0-T05 Docs: ADRs 0001–0014 for D1–D14; `architecture.md` skeleton; `safety.md` (rules of engagement, lab isolation, simulator-only policy); `lab/BUILD.md` (Kali + Metasploitable 2, host-only network, snapshots); `lab/CAPTURE_GOLDEN.md` (exact commands to capture real outputs for fixtures).
- [ ] M0-T06 Generate `PROGRESS.md` from this file's task IDs; create empty `BLOCKERS.md` and `docs/deferred.md`; `npm run verify` green. Tag `m0`.

**Gate G0:** `npm run verify` passes; the build output opens from `file://` with no console errors (assert via a happy-dom boot test).

### M1 — Core engine (headless)
- [ ] M1-T01 `rng.ts` (mulberry32 + `fork`) and `clock.ts`/scheduler with deterministic ordering; tests incl. same-seed reproducibility.
- [ ] M1-T02 Types per §4 (`World`, `Host`, `Service`, `Vuln`, `Cred`, `Edge`, `Defenses`, `ScopeCard`, `GameEvent`, `Fact`, `IntelItem`, `Artifact`, `GoalExpr`) and `validateWorld()` with clear errors.
- [ ] M1-T03 Event store: append-only, campaign/session streams, `commit()`/`discard()`, serialization; tests for replay equality.
- [ ] M1-T04 Reducers: wallet (earn/purchase/advance/repay), ownership, noise with decay, Trust, evidence integrity, scope strikes (Scope Card evaluator); property-style tests.
- [ ] M1-T05 Quality composer (outcome + track metric + report completeness → multiplier 0.85–1.15) and itemized payout builder (base × quality + field bonus).
- [ ] M1-T06 Knowledge layer: facts, findings, intel items with corroborated/verified rules (§4.4); tests including the independence rule.
- [ ] M1-T07 Goal engine: predicate vocabulary, combinators, custom registry, incremental evaluation; tests per predicate.
- [ ] M1-T08 Save/load: envelope, export/import string with checksum, migration registry (v1 baseline), `contentHash`; tests incl. corrupted input.
- [ ] M1-T09 World fixture tools: seeded jitter that respects `pinned`, name pools, `validateWorld` integration; tests proving pinned facts never change across seeds.
- [ ] M1-T10 Content registry stubs: `tools.ts`, `shop.ts`, and **all 30 missions as `status: 'stub'`** with act, track, `payoutBase`, `requiredTools` (§7, §9).
- [ ] M1-T11 `economy-check.ts` and economy library: recompute §9 tables (earnings, required spend, balances, tightest point) and assert; wire into `verify`.
- [ ] M1-T12 Test harness `Driver` interface and `runScript()`; coverage floors enforced. Tag `m1`.

**Gate G1:** all above tests green, core coverage ≥ 85%, `economy-check` matches §9 exactly.

### M2 — Terminal engine, Nmap sim, REPL
- [ ] M2-T01 Tokenizer (quotes, escapes), command registry, `Session` with prompt stack, history, `complete(line, cursor)`, jobs table, output span model.
- [ ] M2-T02 Personality framework: per-tool usage text, invalid-option errors, `not-emulated` messages; flag status tables.
- [ ] M2-T03 Shell basics: `help`, `man <tool>` (short original text), `clear`, `history`, `echo`, `exit`.
- [ ] M2-T04 Nmap sim: flags `-sV -sC -sS -sT -p -p- --top-ports -Pn -T0..5 -A -v -oN`; targets (IP, hostname via DNS, CIDR ≤ /24, ranges); normal-format output (header with `versions.ts`, "Host is up", `PORT STATE SERVICE VERSION`, "Not shown: …", "Service Info", "Nmap done: …"); duration from clock; noise contribution by timing/port count; out-of-scope touch emits scope events; `-O` and unlisted flags → `not-emulated`.
- [ ] M2-T05 Transcript format (Appendix A.3) and test runner that discovers `content/missions/*/transcripts/*.json`.
- [ ] M2-T06 `scripts/repl.ts`: `npm run repl -- <missionId>` plays a mission in the terminal with meta commands `:goals`, `:status`, `:wallet`, `:events` (debug).
- [ ] M2-T07 Mission `a1-first-contact` complete (full template), ≥ 2 routes + 1 negative. Tag `m2`.

**Gate G2:** `npm run repl -- a1-first-contact` can be completed by scripted input; transcripts pass; Nmap formatter covered by unit tests.

### M3 — App shell and mission loop (UI)
- [ ] M3-T01 Store + hash router + screen skeleton; themes via CSS variables (phosphor-green default, high-contrast, amber, light); font scale; reduced motion; focus styles. `scripts/contrast-check.ts` verifies WCAG AA text contrast for every theme.
- [ ] M3-T02 Terminal view: native `<input>` prompt; `role="log"` + `aria-live="polite"`; Tab completion, history (↑/↓), Ctrl-C, Ctrl-L; safe rendering; click-to-pin an output block.
- [ ] M3-T03 Mission controller state machine: brief → play → complete → payout → report → journal → done; Scope Card panel; objective checklist driven by the scaffolding level.
- [ ] M3-T04 Itemized payout screen (base × quality + field bonus) with the quality breakdown.
- [ ] M3-T05 Structured report builder: required sections, findings linked to fact IDs and artifacts, completeness check against world facts, self-review checklist.
- [ ] M3-T06 Artifacts store (IndexedDB wrapper with in-memory fallback); pin-from-terminal; list/view screen.
- [ ] M3-T07 Hub: mission list, wallet, rank; Settings (themes, font, motion, save export/import); stub screens for Shop, Journal, Drill, Portfolio, News.
- [ ] M3-T08 UI smoke tests (happy-dom): boot, play `a1-first-contact` through UI input, payout shown, report submitted; basic a11y assertions (labels, roles, keyboard focus order). Tag `m3`.

**Gate G3:** UI smoke tests pass; build succeeds; `file://` boot test passes.

### M4 — v0 slice complete
- [ ] M4-T01 Web/dork sim: `WebGraph`, search index supporting `site:`, `filetype:`, `intitle:`, `inurl:`, quoted phrases; `browse` frame with `search`/`open`; extensible for later acts.
- [ ] M4-T02 Mission `a1-paper-trail` complete.
- [ ] M4-T03 Mission `a1-knock-knock` complete (nmap-only routes in v0; attack-surface report template with completeness check; an msf auxiliary route is added in M5-T04).
- [ ] M4-T04 Field assignments: `deriveFlag(saveSeed, assignmentId)` → `GH-XXXX-XXXX`; evidence entry UI; +25% bonus and Field-Verified badge; field text and expected-output patterns for the three missions.
- [ ] M4-T05 Coverage matrix (ATT&CK/D3FEND tags, *simulated only* vs *lab-verified*) and Portfolio screen.
- [ ] M4-T06 Portfolio export: in-house STORE ZIP writer + CRC32 (parse-back test), folder structure from DESIGN §7.2 (`README.md`, `attack-coverage.md`, `writeups/`, `detections/`, `lab/`, `journal.md`, `certs.md`), Blob download + clipboard fallback.
- [ ] M4-T07 Export linter: warns on public IPs (outside RFC 1918/5737/loopback/link-local), non-reserved hostnames/emails, key-like strings; shown in the export UI.
- [ ] M4-T08 Content linter v1 (template completeness, dependency rules, reserved identifiers) wired into `verify`; fix all findings.
- [ ] M4-T09 Docs: `architecture.md` filled in, README (quickstart, lab setup, export), `lab/FIELD_MANUAL.md` seed. Tag `v0.1`.

**Gate G4 (v0 DoD):** a scripted run completes three missions, field assignments accept seeded evidence, and the export produces a ZIP containing a real write-up that passes the export linter.

### M5 — Act 1 complete
**5a — msf and shell utilities**
- [ ] M5-T01 msfconsole sim: prompt stack, module registry (aux scanners for TCP port scan, SSH/FTP version), `search` (name/type filters), `use`, `info` (original text), `show options`, `set/setg/unset`, `run`/`exploit`, `back`, `exit`; DB-backed commands → `not-emulated`.
- [ ] M5-T02 Shell utilities: `dig`, `whois`, `curl`, `host` against world DNS/web data (no real lookups).
- [ ] M5-T03 Missions `a1-recon-console`, `a1-mail-server` complete.
- [ ] M5-T04 Add msf auxiliary route to `a1-knock-knock` and extend its transcripts.

**5b — traffic, pcap, Console**
- [ ] M5-T05 Traffic generator (§4.8) with benign profiles and a scan signature; real `.pcap` writer; tests parse the output back.
- [ ] M5-T06 `tshark -r <file> -Y <filter>` sim and viewer panel; display-filter subset: `ip.addr`, `ip.src`, `ip.dst`, `tcp.port`, `udp.port`, `tcp.flags.syn == 1`, `tcp.flags.ack == 1`, `icmp`, `dns`, `http`, `frame.time_relative`, `&&`, `||`, `!`, `contains`; unknown fields → `not-emulated`.
- [ ] M5-T07 Meridian Console: alert queue (`triage <id> --tp|--fp`) and log search (`field=value`, `| head N`, `| count by field`).
- [ ] M5-T08 Mission `a1-twenty-alarms` complete (20 alerts, 3 true; spot your own scans in the pcap).

**5c — learning layer**
- [ ] M5-T09 Shop UI: tiers, R/O flags, purchase, advance flow, ownership gating of missions and tools; Wireshark gating verified end-to-end.
- [ ] M5-T10 Leitner deck engine (boxes at 1/2/4/8/16-day intervals), card generation from actual command usage events, Daily Drill screen.
- [ ] M5-T11 Journal: three prompts per mission, storage, curation flag, journal screen; feeds export.
- [ ] M5-T12 News feed (progress-gated) and echo incidents (2–3-command tasks reusing sims). Tag `v0.5`.

**Gate G5:** all six Act 1 missions pass transcripts; lab assignments written for all six; `economy-check` and `content-lint` green; Wireshark purchase gate works.

### M6 — Act 2: The Breach
- [ ] M6-T01 OSINT sims: `certlog <domain>` (stand-in for certificate-transparency search), `theHarvester -d <domain> -b <source>`, archive/Wayback page history in `browse`.
- [ ] M6-T02 Exploit flow in msf: vsftpd-class backdoor module as pure state transitions, payload selection, `exploit`, `sessions -l/-i`; Netcat sim (`nc -lvnp`, `nc host port`) with scheduled reverse connections.
- [ ] M6-T03 Burp-style proxy sim: intercept queue, view/edit/forward/drop, repeater; world web-app logic (price tamper); minimal panel UI.
- [ ] M6-T04 `gobuster dir` and `sqlmap` sims (`-u`, `--dbs`, `--tables`, `--dump`) over the world's web/DB data; wordlist stand-ins.
- [ ] M6-T05 Snort rule engine: header + options (`msg`, `content` + `nocase`, `flags`, `sid`, `rev`, `classtype`), evaluation over the traffic model, **generic false-positive scoring** against a benign corpus; `snort -T -c` style validation command and a rule editor UI.
- [ ] M6-T06 IR mechanics: evidence-integrity ordering (`memory_captured` before `host_powered_off`), isolate/contain actions, Trust penalties for blocking benign traffic.
- [ ] M6-T07 Missions `a2-harvest`, `a2-first-blood`, `a2-intercept`, `a2-dump`, `a2-patient-zero`, `a2-block-it` complete.
- [ ] M6-T08 Scaffolding levels incl. raw mode; **Trial 1** (reuses earlier sims, 0 payout); specialization screen; track stored in profile; Act 3 gating.
- [ ] M6-T09 Practice Range v1: seeded regenerated worlds for owned tools (nmap, msf lab, gobuster/sqlmap, snort) with goals. Tag `v0.6`.

**Gate G6:** Act 2 transcripts (both routes) pass; advance logic exercised by a test at the 0.85 quality floor; truth/clue lint covers K2.

### M7 — Act 3: The Wire (both tracks)
- [ ] M7-T01 Shared sims: AIS timeline (`ais <mmsi>` + timeline panel), `sherlock <username>` over a world social graph, GitHub-style dorking via the web sim, honeytoken trap logic (planted key trips an alert event).
- [ ] M7-T02 Verification mechanic wired to UI: intel list with states; unverified-intel trap trigger.
- [ ] M7-T03 Missions `a3-dark-ship`, `a3-honeytoken`.
- [ ] M7-T04 Red: Meterpreter subset (`sysinfo`, `getuid`, `ps`, `migrate`, `hashdump`, `upload`, `download`, `shell`, `background`), `route add/print` with edge-based reachability, noise decay and defender-response events.
- [ ] M7-T05 Red: Sliver-style C2 sim (`generate`, listener, `sessions`, `use`, `info`, `ls`, `ps`), Hydra sim, John sim (`--wordlist`, `--show`).
- [ ] M7-T06 Red missions `a3r-migrate-dump`, `a3r-pivot`, `a3r-callback`, `a3r-cracked`.
- [ ] M7-T07 Blue: Wazuh-style alert console (FIM alerts), Velociraptor-style VQL subset over a 50-host fleet fixture, scripted **Rook replay** (NPC events that plant persistence artifacts), beacon-detection puzzle (`tshark -q -z conv,tcp` and field extraction), chain-explorer sim.
- [ ] M7-T08 Blue missions `a3b-persisted`, `a3b-fleet-sweep`, `a3b-heartbeat`, `a3b-follow-money`.
- [ ] M7-T09 Trial 2 (raw mode); cross-training unlock data. Tag `v0.7`.

**Gate G7:** both tracks complete Act 3 via transcripts; Blue never needs Red-only events (linter proves it); K1, K3, K5 reachable.

### M8 — Act 4 and Finale
- [ ] M8-T01 Volatility-3-style sim (`windows.pslist`, `pstree`, `malfind`, `netscan`, `cmdline`) over structured memory-image fixtures.
- [ ] M8-T02 Link graph (SVG) with Maltego-style transforms as UI actions over world data, plus an accessible table view.
- [ ] M8-T03 `adversary.ts`: `AdversaryModel.fromEvents(campaignStream)`. Red uses the player's own committed events; Blue uses their Act 1–2 offensive events plus the Rook replay. Tests prove Act 4 content changes with different campaign histories (**the Act 4 flip**).
- [ ] M8-T04 Missions `a4-incoming` (predict next strike from the adversary model), `a4-packet-storm` (virtual-time budget, no real-time reflex), `a4-cold-memory`, `a4-hold-the-line` (reuses Snort + FP scoring), `a4-attribution` (graph + intel verification; Rook's credentials appear).
- [ ] M8-T05 Finale missions `f-red-zero-day` (full chain, raw mode, noise live) and `f-blue-zero-day` (behavioral detection with a threshold rule type in the Console; no signatures).
- [ ] M8-T06 Mosaic board: evidence cards with source type/origin, link drawing, verification states, conclusion selection. Endings per `truth.ts` (true ending iff K1, K2, K3 Verified and K5 identified; otherwise the official story; K4 adds an epilogue line). Ending and credits scenes.
- [ ] M8-T07 Cross-training contracts, after-campaign hub state, Practice Range polish. Tag `v0.8`.

**Gate G8:** both finales and both endings reachable by transcripts; flip tests green; all 30 missions `complete`.

### M9 — Hardening and release
- [ ] M9-T01 Accessibility audit: keyboard-only walkthrough tests, contrast for all themes, no color-only meaning (status always has text/icon), aria-live behavior, reduced-motion.
- [ ] M9-T02 Economy verification: run every canonical transcript for **both tracks**; assert totals (9,270 ₡), per-act balances, and the tightest-point margin (§9).
- [ ] M9-T03 Save migration tests with fixture saves for every `schemaVersion`; corrupted-import handling.
- [ ] M9-T04 Performance: command latency < 50 ms for all sims; first render < 1 s; bundle ≤ 2.5 MB.
- [ ] M9-T05 Security pass: CSP present, zero-network and `innerHTML` bans enforced, `npm audit` best-effort (log if offline), lockfile committed.
- [ ] M9-T06 Content pass: no stubs remain; proofread all prose; ensure originality; reserved-identifier lint clean; `FIELD_MANUAL.md` generated from tool dossiers.
- [ ] M9-T07 Docs: README complete, `architecture.md` final, ADR index, `RELEASE_CHECKLIST.md`, `FINAL_REPORT.md` (what was built, known limitations, `goldenStatus` summary, list of deferred items). Tag `v1.0.0`.

**Gate G9 = §11 Completion.**

---

## 7. Mission index

### 7.1 The 30 authored missions (a run plays 25)

| ID | Title | Track | Tools (beyond starter kit) | Base ₡ | Milestone |
|----|-------|-------|----------------------------|--------|-----------|
| a1-first-contact | First Contact | shared | — | 80 | M2 |
| a1-paper-trail | Paper Trail | shared | — | 100 | M4 |
| a1-mail-server | The Mail Server | shared | — | 110 | M5 |
| a1-recon-console | Recon Console | shared | — | 130 | M5 |
| a1-twenty-alarms | Twenty Alarms | shared | Wireshark | 140 | M5 |
| a1-knock-knock | Knock Knock | shared | — | 160 | M4 (+M5 route) |
| a2-harvest | Harvest | shared | theHarvester | 200 | M6 |
| a2-first-blood | First Blood | shared | Netcat | 280 | M6 |
| a2-intercept | Intercept | shared | Burp Suite | 260 | M6 |
| a2-dump | Dump | shared | Gobuster, sqlmap | 240 | M6 |
| a2-patient-zero | Patient Zero | shared | Wireshark | 260 | M6 |
| a2-block-it | Block It | shared | Snort | 260 | M6 |
| a3-dark-ship | The Dark Ship | shared | Sherlock | 400 | M7 |
| a3-honeytoken | The Honeytoken | shared | — | 400 | M7 |
| a3r-migrate-dump | Migrate & Dump | red | — | 420 | M7 |
| a3r-pivot | Pivot | red | — | 440 | M7 |
| a3r-callback | The Callback | red | Sliver | 440 | M7 |
| a3r-cracked | Cracked | red | Hydra, John | 450 | M7 |
| a3b-persisted | Persisted | blue | Wazuh | 420 | M7 |
| a3b-fleet-sweep | Fleet Sweep | blue | Velociraptor | 440 | M7 |
| a3b-heartbeat | Heartbeat | blue | Wireshark | 440 | M7 |
| a3b-follow-money | Follow the Money | blue | — | 450 | M7 |
| a4-incoming | Incoming | shared | — | 550 | M8 |
| a4-packet-storm | Packet Storm | shared | Wireshark | 600 | M8 |
| a4-cold-memory | Cold Memory | shared | Volatility | 650 | M8 |
| a4-hold-the-line | Hold the Line | shared | Snort | 600 | M8 |
| a4-attribution | The Attribution | shared | Maltego | 600 | M8 |
| f-red-zero-day | Zero Day (Red) | red | — | 1200 | M8 |
| f-blue-zero-day | Zero Day (Blue) | blue | — | 1200 | M8 |
| f-mosaic | The Mosaic | shared | — | 300 | M8 |

Starter kit (free): `msfconsole`, `nmap`, Meridian Console, shell utilities (`dig`, `whois`,
`curl`, `host`), decoder utility. Trials 1 and 2 pay 0 ₡ and are not counted as missions.

### 7.2 Story truth (encode in `content/truth.ts`; the author may adjust text, not structure)
Key links: **K1** `ais_gap` (trawler *Nadia K* dark over the cable route at the incident hour) ·
**K2** `cert_overlap` (shared cert/registrar between GREY HERON C2 and an old Halden subsidiary dev
server; found as an easy-to-miss second SAN in `a2-harvest`, used in `a4-attribution`) ·
**K3** `ransom_to_charter` (ransom wallet consolidates into charter-fuel payment) ·
**K4** `pretext_timezone` (lure typo habit, UTC+3 working hours) ·
**K5** `honeytoken_false_flag` (planted key pointing at Veyra-looking infrastructure).
False flags: Veyra-language strings in malware, Veyra-hosted C2 IP, "funds weapons program" claim.
Rook: sloppy rival; credentials appear in GREY HERON infrastructure in Act 4; truth: compromised
(phished), not willing.

### 7.3 Errata to apply over `DESIGN.md` v1.1
1. `a1-knock-knock` lists "nmap, msf" in the design; implement nmap-only first (M4) and add the msf route in M5-T04.
2. Trials 1 and 2 are content wrappers over earlier sims with 0 payout; the specialization contract unlocks on Trial 1 completion.
3. Practice Range moves to the end of M6 (after the world schema has survived two acts).
4. The Shop *screen* ships in M5 (first purchase, Wireshark, happens in `a1-twenty-alarms`); wallet/advance logic ships in M1.
5. Act 4 "defend against your own playbook" for Blue players means the Act 1–2 offensive events they performed plus the Rook replay (M8-T03).

---

## 8. Content authoring rules

- **Voice:** Ledger is dry and economical; briefs are short and concrete; primers explain *why*
  in ≤ 3 minutes of reading; reports use plain professional language.
- **Fiction:** nations *Veyra* and *Ostmark*; firm *Meridian Risk*; use `.test`/`.example`
  domains; reserved IPs only (§0.8). No real companies, people, or credentials. Tool names
  are used descriptively only; commercial tools get generic UI (no replicated branding).
- **Originality:** all text is written fresh. Output formats follow publicly documented
  conventions; wording is original.
- **Realism without weaponization:** exploit steps are state transitions in the world model.
  No real payload bytes, shellcode, or working exploit logic anywhere in the repo.
- **Fairness:** every clue in `truth.ts` has a discoverable path and at least one decoy; the
  game signals doubt (Ledger/Ink) before the Mosaic so the official-story ending feels earned.
- **Field assignments:** each names the lab setup, the exact task, the evidence expected (including
  the seeded flag), and the real install command. They are written as original instructions.
- **Scaffolding fade:** Act 1 worked example + checklist + hints; Act 2 checklist + hints;
  Trial 1 raw; Act 3 objective only; Trial 2 raw; Act 4 hints/checklist off; Finale raw.
  Hints are free and counted as a statistic. Raw mode only removes the checklist, hints, and Ledger coaching;
  tab completion and history stay on.

---

## 9. Economy reference (assert in `economy-check`)

**Shop (cost ₡; R = required):** Tier 1 — Wireshark 150 R, Netcat 100 R, theHarvester 200 R.
Tier 2 — Gobuster 200 R, sqlmap 300 R, Burp Suite 350 R, Snort 350 R, Nikto 250 O.
Tier 3 — Sherlock 250 R (both), Hydra 400 R (Red), John 450 R (Red), Sliver 700 R (Red),
Wazuh 450 R (Blue), Velociraptor 500 R (Blue), Hashcat 350 O, Zeek 400 O.
Tier 4 — Volatility 450 R (both), Maltego 450 R (both), Splunk/ELK 500 O.

**Earnings (base):** Act 1 720 · Act 2 1,500 · Act 3 2,550 (either track) · Act 4 3,000 · Finale 1,500
→ **9,270 ₡**.

**Required spend and balance after each act (Red / Blue):**

| Act | Earned | Required spend | Balance after |
|-----|--------|----------------|---------------|
| 1 | 720 | 450 / 450 | 270 / 270 |
| 2 | 1,500 | 1,200 / 1,200 | 570 / 570 |
| 3 | 2,550 | 1,800 / 1,200 | 1,320 / 1,920 |
| 4 | 3,000 | 900 / 900 | 3,420 / 4,020 |
| Finale | 1,500 | 0 / 0 | 4,920 / 5,520 |

**Tightest point:** `a2-dump` (needs Gobuster + sqlmap = 500 ₡; balance beforehand 660 ₡, margin
160 ₡, assuming only required purchases, in order, at base payout).
**Rules:** payout = base × quality (clamped 0.85–1.15) + field bonus (+25% of base); no stacked
penalties; Ledger advance fronts any shortfall for a required tool, repaid from the next payout,
no interest.

---

## 10. Failure and scope-cut ladder (use instead of asking)

If a task is failing after **3 distinct attempts**, climb one rung at a time and keep moving:

1. **Simplify:** cut the feature to exactly what the mission transcripts use.
2. **Re-scope the test, not the gate:** narrow the failing test to the supported behavior
   (never delete it silently; note why in the commit and `BLOCKERS.md`).
3. **Stub behind a flag** with an honest `not-emulated` message, log it in `BLOCKERS.md` and
   `docs/deferred.md`, and continue.
4. **Defer the task** to the end of its milestone; if still blocked, mark it deferred in
   `PROGRESS.md` with the reason and keep the milestone gate honest.

**If overall time or context is short,** prefer finishing the current milestone's gate over
starting the next, and cut in this order: Practice Range polish → news echo incidents →
cross-training contracts → Burp panel polish → link-graph transforms (keep the table view).
Log every cut. Never cut: transcript tests, the economy check, safety rules, save migrations,
or the portfolio export.

**Debugging protocol:** reproduce with the smallest transcript → read the event log →
bisect with `git` → fix the cause, not the symptom → add a regression test.

---

## 11. Completion

You are done only when all are true:
1. Gates G0–G9 pass and `npm run verify` is green on a clean checkout.
2. `PROGRESS.md` has every task checked or explicitly deferred with a reason in `BLOCKERS.md`.
3. All 30 missions are `status: 'complete'` with passing routes and negatives; both endings and both finales are reachable by transcript.
4. `docs/FINAL_REPORT.md` and `docs/RELEASE_CHECKLIST.md` exist, README is complete, tag `v1.0.0` is created.
5. `dist/grey-heron.html` builds and boots from `file://`.

When complete, print a brief summary (what shipped, known limitations, deferred list) and stop.
Do not ask for review, feedback, or permission before or after this point.

---

## Appendix A — Templates

### A.1 Mission folder
```
src/content/missions/<id>/
  index.ts          # MissionDef (§4.6): status, tools, goals, scope, tags, deck, journal
  world.ts          # fixture factory (respects `pinned`)
  brief.md  primer.md  report.md  lab.md
  transcripts/
    route-a.json  route-b.json  negative-1.json
```

### A.2 Scope Card
```ts
interface ScopeCard { inScope: string[]; outOfScope: string[]; permitted: string[];
                      forbidden: string[]; window?: [string, string]; dataRule: string }
```
Out-of-scope hosts appear naturally in scans; touching them (or breaking a rule) is a scope strike.

### A.3 Transcript file
```json
{
  "mission": "a1-first-contact",
  "name": "route-a",
  "seed": 1234,
  "commands": ["nmap -sV 203.0.113.10"],
  "expect": { "goals": ["service_identified(grid-gw,443)"], "notGoals": [], "scopeStrikes": 0 }
}
```
Negatives assert a wrong route does **not** complete the goal, or that an out-of-scope touch
registers a strike.

### A.4 PROGRESS.md format
```
# PROGRESS
Current milestone: M2   |   Last verify: pass   |   Last tag: m1
## Next 3 actions
1. M2-T04 Nmap sim: output formatter
2. ...
## Tasks
- [x] M0-T01 …  (note)
- [ ] M2-T04 …
```
