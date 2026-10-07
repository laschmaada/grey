# GREY HERON

> A story-driven, browser-based simulator that teaches real offensive, defensive and OSINT skills — Metasploit-first — and turns everything you do into portfolio evidence.

A **simulator**, not a tool. No real scanning, no working exploits, no network calls. Every command runs entirely in the browser, against an in-memory world seeded with fictional infrastructure. Lab assignments in every mission tell you how to practice the same operation against your own Metasploitable 2 install.

**Status:** v1.0.0 — all 10 plan milestones complete (M0–M9). 30 of 30 missions complete. 214 tests passing. Single-file build, ~85 kB.

See [`docs/FINAL_REPORT.md`](docs/FINAL_REPORT.md) for the full what-shipped / known-limitations / deferred write-up, and [`docs/RELEASE_CHECKLIST.md`](docs/RELEASE_CHECKLIST.md) for the v1.0.0 ship checklist.

---

## Quickstart

```bash
# 1. Install dependencies
npm install

# 2. Verify the gates pass (the single command that proves the build is sound)
npm run verify

# 3. Build the single-file artifact
npm run build
# → dist/index.html  (~77 kB, opens directly from file://)

# 4. Play the simulator
# Open dist/index.html in a browser. No server required.
# Or run a mission in the REPL:
npm run repl -- a1-first-contact
# (or: repl -- a3b-heartbeat, repl -- a2-first-blood, etc.)
```

## What's in the box

| Layer | What | Where |
|---|---|---|
| **TypeScript core engine** | RNG, virtual clock, event store, reducers, knowledge, goal engine, save envelope | `src/core/` |
| **Terminal + sims** | nmap, msfconsole prompt stack, tshark, gobuster, sqlmap, hydra/john, sliver, meterpreter, wazuh, velociraptor, ais, sherlock, certlog, theharvester, wayback, snort rule engine, burp, netcat, meridian | `src/sims/`, `src/engine/` |
| **Missions** | All 30 missions complete: 6 Act 1, 6 Act 2, 2 shared Act 3 + 4 Red + 4 Blue, 5 Act 4, 2 finales, 1 Mosaic finale | `src/content/missions_runtime.ts`, `src/content/missions_act4.ts` |
| **UI** | Preact, hash router, mission loop, terminal view, hub | `src/ui/` |
| **Build** | Vite + vite-plugin-singlefile → `dist/index.html` | `vite.config.ts` |

## The verify pipeline

`npm run verify` runs 8 stages and fails on the first error:

```
tsc --noEmit             # 0 type errors
eslint .                 # 0 lint errors (D6/D14 bans: no Date.now, no Math.random,
                         #   no fetch / WebSocket / innerHTML in core/engine/sims/systems/content)
vitest run               # 214 unit + transcript + UI + boot + a11y + perf + save tests
boundaries               # core/engine/sims/systems/content don't import UI; no DOM access
content-lint             # mission stubs are present and well-formed
economy-check            # §9 tables match the 9,270 ₡ grand total per track
vite build               # dist/index.html produced
size-check               # bundle ≤ 2.5 MB; 0 external URLs in the artifact
```

The plan requires every gate to be green before any commit. Cutting a gate requires a §10 scope-cut ladder entry in `BLOCKERS.md`.

## What ships at v1.0.0 (every act + finales + hardening)

| Act | Mission | Tools |
|---|---|---|
| 1 | a1-first-contact — scan the perimeter | nmap |
| 1 | a1-paper-trail — web/dork recon | web/dork |
| 1 | a1-mail-server — DNS to mail server | dig, nmap |
| 1 | a1-recon-console — msf aux scanner | msf, nmap |
| 1 | a1-twenty-alarms — Meridian triage | meridian |
| 1 | a1-knock-knock — nmap + msf aux | nmap, msf |
| 2 | a2-harvest — theHarvester + certlog | theharvester, certlog |
| 2 | a2-first-blood — vsftpd backdoor + nc | msf, nc |
| 2 | a2-intercept — Burp price tamper | burp |
| 2 | a2-dump — gobuster + sqlmap | gobuster, sqlmap |
| 2 | a2-patient-zero — IR mechanics | volatility (stub), meridian, nmap |
| 2 | a2-block-it — Snort rule write | snort |
| 3 | a3-dark-ship — AIS dark-ship detect | ais, nmap |
| 3 | a3-honeytoken — recognise the planted key | meridian |
| 3 Red | a3r-migrate-dump — Meterpreter migrate + hashdump | meterpreter, msf, nmap |
| 3 Red | a3r-pivot — route add + internal reach | meterpreter, msf, nmap |
| 3 Red | a3r-callback — Sliver implant + callback | sliver, tshark, nmap |
| 3 Red | a3r-cracked — Hydra + John creds | hydra, john, nmap |
| 3 Blue | a3b-persisted — Wazuh FIM | wazuh, meridian, nmap |
| 3 Blue | a3b-fleet-sweep — Velociraptor VQL | velociraptor, meridian |
| 3 Blue | a3b-heartbeat — beacon detection | tshark, meridian |
| 3 Blue | a3b-follow-money — chain trace → K3 | (chain stub), meridian |
| 4 | a4-incoming — predict the next strike | maltego, nmap |
| 4 | a4-packet-storm — find beacon + write Snort rule | tshark, snort, nmap |
| 4 | a4-cold-memory — Volatility on the patient image | volatility, nmap |
| 4 | a4-hold-the-line — strict Snort rule | snort, nmap |
| 4 | a4-attribution — graph + K2 verification | maltego, nmap |
| Finale | f-red-zero-day — full chain, raw, noise live | msf, meterpreter |
| Finale | f-blue-zero-day — behavioural threshold rule | meridian |
| Finale | f-mosaic — true / official / incomplete endings | mosaic |

**All 30 missions `status: 'complete'`.**

## Lab setup (optional but recommended)

Every mission has a `lab` field describing a real-world exercise. The default setup is the Kali + Metasploitable 2 host-only network from `docs/lab/BUILD.md`. The simulator is the *training*; the lab is the *proof*.

## Safety

GREY HERON is a **simulator**. It is not a tool. The repo enforces this:

- **No working exploit code.** Every "exploit" is a state transition in the world model.
- **No real scanning or network tooling.** No `nmap` against real hosts; no Metasploit modules that open sockets.
- **No outbound network requests.** ESLint bans `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, `navigator.sendBeacon`. CSP rejects `connect-src`.
- **No DOM injection.** ESLint bans `innerHTML`, `outerHTML`, `insertAdjacentHTML`. Output uses `textContent` and structured spans.
- **Reserved identifiers.** Content uses IPs from `192.0.2.0/24`, `198.51.100.0/24`, `203.0.113.0/24`, RFC 1918, loopback, link-local. Domains under `.test`, `.example`, `.invalid`. Emails at those domains.
- **Originality.** All prose is written for this project. Output formats follow publicly documented conventions; wording is original.

Full safety write-up: [`docs/safety.md`](docs/safety.md).

## Documentation

- [`docs/architecture.md`](docs/architecture.md) — the technical reference
- [`docs/development.md`](docs/development.md) — dev environment, scripts, adding a new sim or mission
- [`docs/missions.md`](docs/missions.md) — mission authoring guide
- [`docs/field-manual.md`](docs/field-manual.md) — every sim's CLI surface, what it does, what it doesn't, the real tool it maps to
- [`docs/adr/0001-…0014`](docs/adr/) — 14 architecture decision records
- [`docs/safety.md`](docs/safety.md) — the rules of engagement
- [`docs/lab/BUILD.md`](docs/lab/BUILD.md) — Kali + Metasploitable 2 setup
- [`docs/lab/CAPTURE_GOLDEN.md`](docs/lab/CAPTURE_GOLDEN.md) — capturing real outputs to flip `goldenStatus: 'verified'`
- [`docs/milestones/M0..M4`](docs/milestones/) — milestone gate records
- [`docs/FINAL_REPORT.md`](docs/FINAL_REPORT.md) — what shipped at v0.4.0
- [`docs/RELEASE_CHECKLIST.md`](docs/RELEASE_CHECKLIST.md) — v0.4.0 → v1.0.0 exit criteria
- [`docs/deferred.md`](docs/deferred.md) — items explicitly out of scope
- [`DESIGN.md`](DESIGN.md) — game design
- [`CODING_PLAN.md`](CODING_PLAN.md) — engineering plan
- [`PROGRESS.md`](PROGRESS.md) — task tracker
- [`BLOCKERS.md`](BLOCKERS.md) — open issues, scope cuts, workarounds

## Repository layout

```
grey-heron/
  DESIGN.md  CODING_PLAN.md  PROGRESS.md  BLOCKERS.md  README.md  LICENSE
  package.json  tsconfig.json  vite.config.ts  vitest.config.ts  eslint.config.js  .prettierrc
  .github/workflows/ci.yml          # verify on push/PR; Pages deploy of dist on main
  scripts/
    boundaries.ts   content-lint.ts   economy-check.ts   size-check.ts   repl.ts
    export-lint.ts  contrast-check.ts
  src/                  # source (core/engine/sims/systems/content/ui/test)
  tests/                # test files
  dist/index.html       # single-file build (after npm run build)
  docs/                 # architecture, development, missions, field manual, ADRs, milestones
```

## Contributing

The plan (`CODING_PLAN.md`) and design (`DESIGN.md`) are normative. The §10 scope-cut ladder is the only approved way to skip a deliverable, and every cut is logged in `BLOCKERS.md`. To add a sim or mission, see [`docs/development.md`](docs/development.md) and [`docs/missions.md`](docs/missions.md).

## License

MIT. See [`LICENSE`](LICENSE).

## Credits

GREY HERON is built by the user (sitting in front of the simulator) and the Grey Heron agent (this repo). The "plan + spec" sources are `DESIGN.md` (game design) and `CODING_PLAN.md` (engineering plan). The agent was given an explicit operating contract: never ask, decide-and-record, keep the gates green, never fabricate verification, never run real security tools.

— Grey Heron agent, October 2026
