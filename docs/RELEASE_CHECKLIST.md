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

## v1.0.0 — Shipped ✅

- [x] M8-T01: Volatility-3-style sim (`windows.pslist`, `windows.pstree`, `windows.malfind`, `windows.netscan`, `windows.cmdline`)
- [x] M8-T02: Maltego-style link graph (`buildGraph`, person/host/mmsi/domain/wallet entities, transforms)
- [x] M8-T03: Adversary model with **the Act 4 flip test** (`AdversaryModel.fromEvents`, deterministic seed, MITRE techniques)
- [x] M8-T04: 5 Act 4 missions complete — a4-incoming, a4-packet-storm, a4-cold-memory, a4-hold-the-line, a4-attribution
- [x] M8-T05: 2 finales complete — f-red-zero-day, f-blue-zero-day
- [x] M8-T06: Mosaic board engine (true/official/incomplete endings); Mosaic UI canvas+drag deferred
- [x] M8-T07: Cross-training contracts, Practice Range polish (5 iterate types)
- [x] M9-T01: Accessibility audit (lang, prefers-reduced-motion, role=log, aria-live, CSP, html lang) — tests in `tests/m9-a11y.test.ts`
- [x] M9-T02: Economy verification — `scripts/economy-check.ts` PASSES 9,270 ₡ per track
- [x] M9-T03: Save migration tests — round-trip, drift detection, schema upgrade, `contentHash` stability
- [x] M9-T04: Performance — every sim under 50 ms on a 100-call warm loop; bundle 85 kB (8.1% of cap)
- [x] M9-T05: Security pass — CSP present, zero-network and innerHTML bans enforced, lockfile committed
- [x] M9-T06: Content pass — 30 of 30 missions complete, reserved-identifier lint clean
- [x] M9-T07: Docs — README, architecture.md, ADR index, RELEASE_CHECKLIST, FINAL_REPORT

## v1.0.0 ship checklist

1. **All 30 missions `status: 'complete'`** with passing routes and negatives ✅
2. **Both finales reachable by transcript** ✅
3. **The Act 4 flip test passes** — same content, different campaign history, different Act 4 adversary ✅
4. **K1, K2, K3, K4, K5 all reachable** by a canonical route ✅
5. **`npm run verify` is green on a clean checkout** ✅
6. **`dist/index.html` builds and boots from `file://`** with no console errors ✅
7. **Tag `v1.0.0`** ✅
8. **Both endings reachable** by transcript (true ending + official-story ending) ✅

## Cross-cutting

- [x] All exported bundle URLs are reserved/local; CSP present and enforced
- [x] Reserved-identifier lint clean across all content (IPs, domains, emails)
- [x] No tracked-against-board loops; all orphans and tradeoffs justified in `BLOCKERS.md` and `docs/deferred.md`
- [ ] `goldenStatus: 'verified'` for at least the load-bearing sims (Nmap, MSF aux scanners, tshark, Snort, sqlmap). The user captures the real outputs in their host-only lab per `docs/lab/CAPTURE_GOLDEN.md`

## Per-mission Definition of Done

Checked by `scripts/content-lint.ts` where possible:

- [x] brief, primer, Scope Card, world fixture, goals, ≥ 2 routes, ≥ 1 negative transcript
- [x] lab assignment (with seeded flag)
- [x] report template
- [x] ATT&CK/D3FEND tags
- [x] deck cards, journal prompts
- [x] scaffolding level

## Repository hygiene

- [x] All commits have a type-and-scope prefix (`feat(M7):`, `docs(M8):`, `fix(M5-T05):`, etc.)
- [x] No tracked-against-board files; every deferred item is in `docs/deferred.md` or `BLOCKERS.md`
- [x] `package-lock.json` committed
- [x] License: MIT

## Versioning

| Tag | Date | Notes |
|---|---|---|
| `v0.1.0` | initial | M0 — M1: tooling + headless core engine |
| `v0.2.0` | +M2 | terminal + nmap sim + REPL |
| `v0.3.0` | +M3 | UI shell + mission loop + happy-dom smoke |
| `v0.4.0` | +M4-M7 | v0.1 + all sims + 22 missions + docs |
| `v0.5.0` | +M8 | Volatility, Maltego, Adversary, Mosaic, Cross-training, Practice Range + 8 Act 4 missions |
| `v1.0.0` | +M9 | Hardening (a11y, perf, save, security, content, docs) — **ship** |