# Release Checklist (v0.1)

What ships in v0.1.0 vs. what's left for v1.0.

## v0.1.0 gate (M0–M4 of the plan)

- [x] M0: tooling, lint, boundaries, size-check, CSP, ADRs, docs
- [x] M1: headless core engine (types, RNG, clock, events, reducers, knowledge,
  goals, save, world validation, fixture tools, economy-check)
- [x] M2: terminal engine, nmap sim, REPL, a1-first-contact complete
- [x] M3: UI shell, terminal view (native input, role=log, aria-live), mission
  loop, hash router, hub, happy-dom smoke tests, file:// boot test
- [x] M4: web/dork sim, field flag derivation, portfolio ZIP + CRC32, export
  linter, content-linter stub
- [x] `npm run verify` is green on a clean checkout

## v1.0.0 gate (M5–M9 of the plan)

- [ ] M5-T01: msfconsole prompt stack with search/use/info/set/run/back/exit
- [ ] M5-T02: shell utilities (dig, whois, curl) over world data
- [ ] M5-T03: missions a1-recon-console and a1-mail-server complete
- [ ] M5-T04: msf auxiliary route for a1-knock-knock
- [ ] M5-T05: traffic generator + real .pcap writer
- [ ] M5-T06: tshark display-filter subset
- [ ] M5-T07: Meridian Console (alert queue + log search)
- [ ] M5-T08: mission a1-twenty-alarms complete
- [ ] M5-T09: shop UI (tiers, R/O flags, advance, ownership)
- [ ] M5-T10: Leitner deck engine + Daily Drill
- [ ] M5-T11: journal (3 prompts/mission) + curation + screen
- [ ] M5-T12: news feed (progress-gated) + echo incidents
- [ ] M6-T01..M6-T09: Act 2 sims + 6 missions + Trial 1 + Practice Range v1
- [ ] M7-T01..M7-T09: Act 3 sims + 8 missions (both tracks) + Trial 2
- [ ] M8-T01..M8-T07: Volatility, Maltego, Adversary, Act 4 missions, finales, Mosaic
- [ ] M9-T01..M9-T06: accessibility audit, full save migration tests, performance
  budget verification, security pass, content pass, FIELD_MANUAL.md generation

## v1.0.0 exit criteria

1. All gates G0–G9 pass.
2. All 30 missions are `status: 'complete'` with ≥ 2 routes + ≥ 1 negative transcript.
3. Both finales reachable by transcript.
4. `docs/FINAL_REPORT.md` updated to v1.0 and `dist/grey-heron.html` builds and
   boots from `file://`.
5. Tag `v1.0.0`.

## Cross-cutting

- [ ] All exported bundle URLs are reserved/local; CSP present and enforced.
- [ ] Reserved-identifier lint clean across all content (IPs, domains, emails).
- [ ] `goldenStatus: 'verified'` for at least the load-bearing sims (Nmap, MSF
  aux scanners, tshark, Snort, sqlmap). The user captures the real outputs in
  their host-only lab per `docs/lab/CAPTURE_GOLDEN.md`.
- [ ] 80%+ line coverage on `systems/` per D9.
- [ ] No tracked-against-board loops; all orphans and tradeoffs justified in `BLOCKERS.md`.