# GREY HERON — Final Report (v0.4.0)

This is the M9-T07 deliverable, written at the v0.4.0 cut-line. M9's full checklist is in `BLOCKERS.md` under "Deferred"; v0.4.0 covers M0–M7 of the plan.

## What shipped (M0–M7)

### M0 — Foundations ✅
- TypeScript strict + `noUncheckedIndexedAccess`, Vite + vite-plugin-singlefile, Vitest + happy-dom, ESLint v9 + typescript-eslint, Prettier
- 14 ADRs (`docs/adr/0001-*.md` … `0014-*.md`)
- `scripts/boundaries.ts` cross-checks layer isolation
- `scripts/size-check.ts` enforces 2.5 MB cap and zero external URLs
- `index.html` with CSP meta (`default-src 'none'; connect-src 'none'`)
- GitHub Actions workflow: `npm run verify` on push/PR; Pages deploys `dist/index.html` on main
- `npm run verify` runs 8 stages (tsc, eslint, vitest, boundaries, content-lint, economy-check, build, size-check) and fails on the first error

### M1 — Core engine (headless) ✅
- `core/types.ts` — `World`, `Host`, `Service`, `Vuln`, `Cred`, `Edge`, `DnsRecord`, `WebGraph`, `Doc`, `Defenses`, `ScopeCard`, `GameEvent`, `Fact`, `IntelItem`, `Artifact`, `GoalExpr`
- `core/rng.ts` — mulberry32 + label-stable `fork(label)`
- `core/clock.ts` — virtual clock + scheduler
- `core/events.ts` — append-only event store, campaign/session streams, profile reducer
- `core/reducers.ts` — wallet (earn/purchase/advance/repay), noise decay, scope strikes, quality composer (0.85–1.15), payout builder, knowledge layer (corroborated/verified)
- `core/goals.ts` — predicate vocabulary + all/any/not combinators + custom registry
- `core/save.ts` — base64url envelope + FNV-1a contentHash + migration
- `core/world.ts` — fixture tools + `validateWorld()` (RFC 1918/5737 reserved-IP check)
- `core/adversary.ts` — `AdversaryModel.fromEvents()` (Act 4 hook)
- `systems/economy.ts` (via `scripts/economy-check.ts`) — asserts §9 numbers exactly

### M2 — Terminal + nmap ✅
- `engine/tokenizer.ts` — quotes + escapes
- `engine/registry.ts` + `engine/session.ts` — command registry, prompt stack, history, tab completion, jobs table
- `engine/personality.ts` — per-tool blurb + invalid-option + not-emulated messages
- `engine/output.ts` — typed span model (`text`, `pinnable`, `link`)
- `sims/nmap.ts` — emulated nmap: `-sV -sC -sS -sT -p/-p-/--top-ports -Pn -T0..5 -A -v -oN`
- `sims/web.ts` — dork sim with site:/filetype:/intitle:/inurl: + quoted phrases
- `sims/msf.ts` — msfconsole stub (full prompt stack lands in M5)
- `content/missions_runtime.ts` — a1-first-contact full template (2 routes + 1 negative)
- `scripts/repl.ts` — `npm run repl -- a1-first-contact` with `:goals/:status/:wallet/:events`

### M3 — UI shell + mission loop ✅
- `ui/store.ts` — pub-sub
- `ui/app.tsx` — App shell, hash router, Hub and Mission screens
- `ui/components/terminal-view.tsx` — native input, role=log, aria-live, Tab/history, Ctrl-C/L, click-to-pin
- happy-dom smoke tests: hub lists missions, mission route shows terminal input, command dispatched

### M4 — v0 slice ✅
- `systems/field.ts` — `deriveFlag(saveSeed, assignmentId) → GH-XXXX-XXXX` (FNV-1a xor seed, base32 alphabet excluding 0/1)
- `systems/zip.ts` — in-house STORE-method ZIP + CRC32 with parse-back round-trip
- `systems/exportlint.ts` — public-IP / non-reserved-hostname / non-reserved-email / key-like lints
- `systems/portfolio.ts` — `buildPortfolio()` assembling §7.2 folder structure
- `scripts/export-lint.ts` — CLI linter over a file or directory
- Web/dork sim (M4-T01) with site:/filetype:/intitle:/inurl: and quoted-phrase search

### M5 — Act 1 sims ✅
- `core/traffic.ts` — traffic generator + real `.pcap` writer (Ethernet/IPv4/TCP/UDP/ICMP, big-endian network byte order, LCG payload fill, Wireshark-compatible)
- `sims/tshark.ts` — display-filter subset (ip.addr, ip.src/dst, tcp.port, udp.port, tcp.flags.syn/ack, icmp, dns, http, frame.time_relative, &&, ||, !, contains)
- `engine/meridian.ts` — Meridian Console: 20 alerts, 3 TPs, triage --tp/--fp, log search field=value, count by field
- `engine/msfconsole.ts` — prompt stack (search/use/info/show options/set/setg/unset/run/exploit/back/exit) + 4 modules (portscan/tcp, vsftpd_234_backdoor, ssh_version, ftp_version)
- `core/snort.ts` — Snort rule engine (header + msg + content + nocase + flags + sid/rev + classtype; CIDR/24 host matching; pipe-encoded bytes; false-positive scoring)
- All 6 Act 1 missions complete: a1-first-contact, a1-paper-trail, a1-mail-server, a1-recon-console, a1-twenty-alarms, a1-knock-knock (with msf aux route per errata 7.3 #1)

### M6 — Act 2 sims ✅
- `sims/certlog.ts` — OSINT trio: certlog (CT stand-in), theHarvester (`-d/-b`), wayback (deterministic snapshots)
- `sims/netcat.ts` — startListener / connect / scheduleReverse / NetcatEvent
- `sims/burp.ts` — Burp-style proxy: intercept queue, runBurp mutation, inScope check, header/body tampering
- `sims/gobuster.ts` + `sims/sqlmap.ts` — world web-graph and DNS hit-detection; injectable detection from snippets
- `core/ir.ts` — makeIrState/applyIr, memory_captured → host_powered_off ordering, isolate/contain, 0.1 Trust penalty for block-beni, power-off blocks subsequent memory_captured
- `core/scaffolding.ts` — hintsFor(level), TRIAL_1 wraps a1-first-contact with raw scaffolding, PRACTICE_RANGE_ITERATES
- 6 Act 2 missions complete: a2-harvest, a2-first-blood, a2-intercept, a2-dump, a2-patient-zero, a2-block-it

### M7 — Act 3 sims (Red + Blue + shared) ✅
- `sims/ais.ts` — vessel timeline; mmsi-538123456 has a 12h dark-ship gap (Nadia K, K1)
- `sims/sherlock.ts` — deterministic per-handle social platform enumeration
- `core/honeytoken.ts` — K5 trap: plantHoneytoken / checkHoneytokenHit
- `core/intel.ts` — intel list with corroborated/verified states per §4.4; isVeyraSuspect for K5 single-source false flag
- `engine/meterpreter.ts` — Meterpreter subset: sysinfo/getuid/ps/migrate/hashdump/upload/download/shell/background/exit
- `sims/sliver.ts` — generateImplant / listImplants / sliverLs / sliverPs / sliverInfo
- `sims/hydra_john.ts` — online brute-force + offline hash cracking with fixture creds
- `sims/wazuh.ts` — FIM alerts with sid 55x
- `sims/velociraptor.ts` — 50-host fleet fixture; VQL subset with WHERE
- `core/rook.ts` — seedRookPlan() (creds-leak → persistence-schtask → c2-checkin → lateral-smb)
- `core/beacon.ts` — makeBeaconPuzzle (periodic TCP PSH|ACK to port 4444)
- 10 Act 3 missions complete: 2 shared (a3-dark-ship, a3-honeytoken) + 4 Red (a3r-migrate-dump, a3r-pivot, a3r-callback, a3r-cracked) + 4 Blue (a3b-persisted, a3b-fleet-sweep, a3b-heartbeat, a3b-follow-money)

### M8–M9 — Deferred, in `BLOCKERS.md`

## Verification

`npm run verify` is the single command that proves the gates pass. Output on the v0.4.0 tree:

```
tsc --noEmit                 — clean
eslint .                     — clean (D6/D14 bans active)
vitest run                   — 20 files, 180 tests, 100% pass
boundaries                   — OK (core/engine/sims/systems/content layer isolation)
content-lint                 — OK (template + dependency + truth rules)
economy-check                — PASS — 9,270 ₡ grand total per track, all per-act tables match §9
vite build                   — dist/index.html 77,322 bytes
size-check                   — OK — 7.4% of 2.5 MB budget, 0 external URLs
```

## Known limitations (planned for v0.5+)

- **M8 sims** (Volatility, Maltego, Adversary model + the **Act 4 flip test**, chain explorer, the 2 finales, the Mosaic board)
- **M7-T09 Trial 2 + cross-training** raw scaffold (raw mode ships with M8; cross-training data structure depends on the Act 3 gate's specialisation)
- **M9 hardening** (a11y audit, perf budget, full save migration tests, FINAL_REPORT polish for v1.0.0)
- **Live golden output**: every sim formatter carries `goldenStatus: 'unverified'`. To flip to `'verified'`, capture a real output from your host-only lab per `docs/lab/CAPTURE_GOLDEN.md` and diff.

## Deferred list

See `docs/deferred.md` for the full list. Highlights:

- Active Directory branch, complex payout multipliers, hint penalties (DESIGN §A)
- Mission editor, daily challenges, leaderboards, New Game+ (DESIGN §A)
- Burp panel UI polish (M6-T03 scope-cut) — engine in place, panel deferred
- Maltego-style link-graph transforms (M8-T02 scope-cut) — table view remains

## Scope-cut ladder trail

CODING_PLAN §10: "If a task is failing after 3 distinct attempts, climb one rung at a time." Applied in v0.4.0:

1. **vite-plugin-singlefile output name** — `dist/index.html` (not `grey-heron.html`). Standardised for Pages + `file://` deploy.
2. **ESLint Math ban** — narrowed to `Math.random` only. D6 property preserved by deterministic RNG.
3. **size-check w3.org / `https://nmap.org` text matches** — XML namespaces + help-text aren't network resources. Restricts to `src=`/`href=` http(s).
4. **boundaries.ts `window` regex** — narrowed to `window.\w` member-access. Avoids false positives on the legitimate variable name.
5. **tshark `!` prefix** — must be space-separated (`! tcp.port == 22`). Mirrors real tshark grammar.
6. **PCAP endianness** — file headers little-endian; packet headers big-endian. Writer distinguishes correctly.
7. **AIS dark-ship gap injection** — slice + timestamp shift instead of splice + collapse, after the first version silently flattened the gap.

## How to run

```bash
git clone <repo>
cd grey-heron
npm install
npm run verify
npm run build
open dist/index.html
```

Or play a mission in the REPL:
```bash
npm run repl -- a1-first-contact
# or: repl -- a3b-heartbeat
# or: repl -- a2-first-blood
```

## What you should do next

1. Build your Kali + Metasploitable 2 lab per `docs/lab/BUILD.md`.
2. Capture real `nmap` and `msfconsole` outputs per `docs/lab/CAPTURE_GOLDEN.md`; drop them into `src/test/fixtures/golden/<tool>/<case>.txt`. Flip the sim's `goldenStatus: 'unverified'` to `'verified'`.
3. Implement M8–M9. The engine and lint gates are wired so each sim slots in without restructuring the rest of the codebase.
4. When M8–M9 land, re-run `npm run verify`, then tag `v1.0.0`.

— Grey Heron agent, October 2026
