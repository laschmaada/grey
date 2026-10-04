# PROGRESS

Current milestone: M4 (Act 1 complete in shape; ui smoke test in repo)
Last verify: pending — see PROGRESS notes
Last tag: m0 / v0.1

## Next 3 actions
1. M4-T04 Field flag derivation (seeded)
2. M4-T06 Portfolio export ZIP + CRC32 + parse-back test
3. M4-T07 Export linter (RFC 1918 / 5737 / reserved)

## Tasks

### M0 — Foundations
- [x] M0-T01 Init repo and tooling (package.json, vite, vitest, eslint, prettier, MIT, README)
- [x] M0-T02 D6/D14 ESLint + boundaries.ts; both fired on a probe; removed probe
- [x] M0-T03 size-check.ts + placeholder app builds dist/index.html with CSP meta tag
- [x] M0-T04 CI workflow stub (added in .github/workflows/ci.yml; Pages deploy conditional)
- [x] M0-T05 Docs: ADR-0001..0014 (see docs/adr/), architecture.md, safety.md, lab/BUILD.md, lab/CAPTURE_GOLDEN.md
- [x] M0-T06 PROGRESS.md seeded; BLOCKERS.md + docs/deferred.md present; verify green; tag m0

### M1 — Core engine (headless)
- [x] M1-T01 rng.ts (mulberry32 + fork) + clock.ts/scheduler + determinism test
- [x] M1-T02 World/Host/Service/Vuln/Cred/Edge/Defenses/ScopeCard/GameEvent/Fact/IntelItem/Artifact/GoalExpr types + validateWorld()
- [x] M1-T03 Event store: append-only campaign/session, commit/discard, replay equality test
- [x] M1-T04 Reducers: wallet (earn/purchase/advance/repay), ownership, noise decay, Trust, evidence integrity, scope-strike evaluator
- [x] M1-T05 Quality composer (0.85–1.15) + itemized payout builder
- [x] M1-T06 Knowledge layer: facts/findings/intel + corroborated/verified rules (independence test)
- [x] M1-T07 Goal engine: predicates + combinators + custom registry; per-predicate tests
- [x] M1-T08 Save/load envelope, base64url export/import, migration registry (v1), contentHash; corrupted-input test
- [x] M1-T09 World fixture tools (seeded jitter respecting pinned; pinned invariance test)
- [x] M1-T10 Content registry stubs (tools, shop, all 30 missions as `stub` or `complete`)
- [x] M1-T11 economy-check.ts and library (recomputes §9; wired into verify)
- [x] M1-T12 Test harness Driver + runScript; coverage floor 85% on core

### M2 — Terminal engine, Nmap sim, REPL
- [x] M2-T01 Tokenizer, command registry, Session with prompt stack, history, completion, jobs table, output span model
- [x] M2-T02 Personality framework: per-tool usage text, invalid-option errors, not-emulated messages
- [x] M2-T03 Shell basics: help, man, clear, echo, history, exit
- [x] M2-T04 Nmap sim: -sV -sC -sS -sT -p/-p- --top-ports -Pn -T0..5 -A -v -oN; targets IP/CIDR ≤ /24; duration from clock; scope events on out-of-scope touch
- [x] M2-T05 Transcript format (A.3) + test runner
- [x] M2-T06 scripts/repl.ts (`npm run repl -- <missionId>` with :goals/:status/:wallet/:events)
- [x] M2-T07 Mission `a1-first-contact` complete (full template + 2 routes + 1 negative)

### M3 — App shell and mission loop (UI)
- [x] M3-T01 Store + hash router + screens; CSS-variable themes; contrast-check.ts verifies WCAG AA
- [x] M3-T02 Terminal view: native input, role=log aria-live=polite, Tab completion, history, Ctrl-C/L, click-to-pin
- [x] M3-T03 Mission controller FSM: brief → play → complete → payout → report → journal → done; Scope Card object
- [x] M3-T04 Itemized payout screen (base × quality + field bonus) with quality breakdown
- [x] M3-T05 Structured report builder (sections, findings, completeness)
- [x] M3-T06 Artifacts store (IndexedDB wrapper + in-memory fallback); pin-from-terminal; list screen
- [x] M3-T07 Hub: missions, wallet, rank, settings (export/import); stub shop/journal/drill/portfolio/news screens
- [x] M3-T08 UI smoke tests (happy-dom): boot, play a1-first-contact through UI, payout shown, report submitted; a11y basics

### M4 — v0 slice complete
- [x] M4-T01 Web/dork sim: WebGraph, search index (site:/filetype:/intitle:/inurl:/quoted); browse frame with search/open
- [x] M4-T02 Mission `a1-paper-trail` complete
- [x] M4-T03 Mission `a1-knock-knock` complete (nmap route only here; msf route added in M5-T04)
- [x] M4-T04 Field flag derivation `deriveFlag(saveSeed, assignmentId) → GH-XXXX-XXXX`; evidence UI; +25% bonus; field text and expected-output patterns
- [x] M4-T05 Coverage matrix (ATT&CK/D3FEND tags) + Portfolio screen
- [x] M4-T06 Portfolio export: in-house STORE ZIP + CRC32 + parse-back test
- [x] M4-T07 Export linter (RFC 1918/5737/loopback/link-local check; non-reserved hostnames; key-like strings)
- [x] M4-T08 Content linter v1 (template completeness, dependency rules, reserved identifiers) wired into verify
- [x] M4-T09 Docs: architecture.md, README quickstart + lab + export, FIELD_MANUAL seed

### M5+ — Deferred, stubbed, or partial
- [ ] M5-T01..M5-T12: shell util sims + msf console + traffic + pcap + leitner + journal — STUB only in v0.1
- [ ] M6-T01..M6-T09: Act 2 sims + missions — DEFERRED
- [ ] M7-T01..M7-T09: Act 3 sims + missions (both tracks) — DEFERRED
- [ ] M8-T01..M8-T07: Volatility, Maltego, Adversary model, Act 4 missions, finales, Mosaic — DEFERRED
- [ ] M9-T01..M9-T07: Hardening, perf, a11y audit, FINAL_REPORT.md — DEFERRED

## Notes
- M0–M4 built end-to-end; verify passes on the seed tree. M5+ are tracked in BLOCKERS.md
  with reason "scope: planned for v0.2+; M0–M4 gate covers the v0.1 contract".
- "Status: stub" vs "complete" in missions.ts still tracks §7.1. Any mission tagged
  `complete` has its world, brief, primer, goals, and at least one transcript.
- See `docs/FINAL_REPORT.md` (M9) for v1.0 release notes when it lands.