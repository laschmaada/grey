# Release Checklist

## v0.4.0 (shipped) — Act 1, 2, 3 Red+Blue+shared

- [x] M0: tooling, lint, boundaries, size-check, CSP, ADRs
- [x] M1: headless core engine (types, RNG, clock, events, reducers, knowledge, goals, save, world validation, fixture tools, economy-check)
- [x] M2: terminal engine, nmap sim, REPL, a1-first-contact
- [x] M3: UI shell, terminal view (native input, role=log, aria-live), mission loop, hub, happy-dom smoke tests, file:// boot test
- [x] M4: web/dork, field flag, portfolio ZIP, export linter
- [x] M5: traffic + pcap, tshark, Meridian Console, msfconsole prompt stack, Snort rule engine
- [x] M6: certlog, theHarvester, wayback, Netcat, Burp, Gobuster, sqlmap, IR mechanics, 6 Act 2 missions
- [x] M7: AIS, sherlock, honeytoken, intel verification, Rook replay, beacon puzzle, Wazuh, Velociraptor, Sliver, Hydra/John, Meterpreter, 10 Act 3 missions
- [x] `npm run verify` is green on a clean checkout

## v0.5.0 → v1.0.0 exit criteria

- [ ] M8-T01: Volatility-3-style sim (`windows.pslist`, `pstree`, `malfind`, `netscan`, `cmdline`) over structured memory-image fixtures
- [ ] M8-T02: Link graph (SVG) with Maltego-style transforms as UI actions over world data, plus an accessible table view
- [ ] M8-T03: `adversary.ts` — `AdversaryModel.fromEvents(campaignStream)`. Red uses the player's own committed events; Blue uses their Act 1–2 offensive events plus the Rook replay. **Tests prove Act 4 content changes with different campaign histories (the Act 4 flip).**
- [ ] M8-T04: 5 Act 4 missions — a4-incoming (predict next strike from the adversary model), a4-packet-storm (virtual-time budget, no real-time reflex), a4-cold-memory, a4-hold-the-line (reuses Snort + FP scoring), a4-attribution (graph + intel verification; Rook's credentials appear)
- [ ] M8-T05: 2 finale missions — f-red-zero-day (full chain, raw mode, noise live) and f-blue-zero-day (behavioural detection with a threshold rule type in the Console; no signatures)
- [ ] M8-T06: Mosaic board — evidence cards with source type/origin, link drawing, verification states, conclusion selection. Endings per `truth.ts` (true ending iff K1, K2, K3 Verified and K5 identified; otherwise the official story; K4 adds an epilogue line). Ending and credits scenes
- [ ] M8-T07: Cross-training contracts, after-campaign hub state, Practice Range polish
- [ ] M9-T01: Accessibility audit (keyboard-only walkthrough, contrast for all themes, no color-only meaning, aria-live, reduced-motion)
- [ ] M9-T02: Economy verification — run every canonical transcript for **both tracks**; assert totals (9,270 ₡), per-act balances, and the tightest-point margin (§9)
- [ ] M9-T03: Save migration tests with fixture saves for every `schemaVersion`; corrupted-import handling
- [ ] M9-T04: Performance — command latency < 50 ms for all sims; first render < 1 s; bundle ≤ 2.5 MB
- [ ] M9-T05: Security pass — CSP present, zero-network and `innerHTML` bans enforced, `npm audit` best-effort (log if offline), lockfile committed
- [ ] M9-T06: Content pass — no stubs remain; proofread all prose; ensure originality; reserved-identifier lint clean; `FIELD_MANUAL.md` generated from tool dossiers
- [ ] M9-T07: Docs — README complete, `architecture.md` final, ADR index, `RELEASE_CHECKLIST.md` (this file), `FINAL_REPORT.md` for v1.0
- [ ] M7-T09: Trial 2 raw scaffold + cross-training data structure
- [ ] `npm run verify` is green on a clean checkout

## v1.0.0 ship checklist

1. **All 30 missions `status: 'complete'`** with passing routes and negatives
2. **Both finales reachable by transcript**
3. **The Act 4 flip test passes** — same content, different campaign history, different Act 4 adversary
4. **K1, K2, K3, K4, K5 all reachable** by a canonical route
5. **`npm run verify` is green on a clean checkout**
6. **`dist/grey-heron.html` builds and boots from `file://`** with no console errors
7. **Tag `v1.0.0`**
8. **Both endings reachable** by transcript (true ending + official-story ending)

## Cross-cutting

- [ ] All exported bundle URLs are reserved/local; CSP present and enforced
- [ ] Reserved-identifier lint clean across all content (IPs, domains, emails)
- [ ] `goldenStatus: 'verified'` for at least the load-bearing sims (Nmap, MSF aux scanners, tshark, Snort, sqlmap). The user captures the real outputs in their host-only lab per `docs/lab/CAPTURE_GOLDEN.md`
- [ ] No tracked-against-board loops; all orphans and tradeoffs justified in `BLOCKERS.md`

## Per-mission Definition of Done

Checked by `scripts/content-lint.ts` where possible:

- brief, primer, Scope Card, world fixture, goals, ≥ 2 routes, ≥ 1 negative transcript
- lab assignment (with seeded flag)
- report template
- ATT&CK/D3FEND tags
- deck cards, journal prompts
- scaffolding level

## Repository hygiene

- [ ] All commits have a type-and-scope prefix (`feat(M7):`, `docs(M8):`, `fix(M5-T05):`, etc.)
- [ ] No tracked-against-board files; every deferred item is in `docs/deferred.md` or `BLOCKERS.md`
- [ ] `package-lock.json` committed
- [ ] License: MIT
