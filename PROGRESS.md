# PROGRESS

Current milestone: M7 (Act 3 sims + 8 missions Red+Blue+shared; AIS/sherlock/honeytoken/intel/wazuh/velociraptor/Rook/beacon)
Last verify: green
Last tag: v0.4.0

## Next 3 actions
1. M8-T01..M8-T07 — Volatility, Maltego, Adversary model (Act 4 flip), 5 Act 4 missions, 2 finales, Mosaic
2. M9-T01..M9-T07 — Hardening, perf, a11y audit, FINAL_REPORT.md polish for v1.0.0
3. Triage: Trial 2 raw-mode scaffold + cross-training data structure (M7-T09) — ship with M8 if M6+ scaffolded it.

## Tasks

### M0 — Foundations
- [x] M0-T01 Init repo and tooling (package.json, vite, vitest, eslint, prettier, MIT, README)
- [x] M0-T02 D6/D14 ESLint + boundaries.ts; both fired on a probe; removed probe
- [x] M0-T03 size-check.ts + placeholder app builds dist/index.html with CSP meta tag
- [x] M0-T04 CI workflow stub (added in .github/workflows/ci.yml; Pages deploy conditional)
- [x] M0-T05 Docs: ADR-0001..0014 (see docs/adr/), architecture.md, safety.md, lab/BUILD.md, lab/CAPTURE_GOLDEN.md
- [x] M0-T06 PROGRESS.md seeded; BLOCKERS.md + docs/deferred.md present; verify green; tag m0

### M1 — Core engine (headless) — done
### M2 — Terminal engine, Nmap sim, REPL — done
### M3 — App shell and mission loop (UI) — done
### M4 — v0 slice complete (web/dork, field, portfolio ZIP, export linter) — done
- ### M5 — Act 1 complete
- [x] M5-T01 msfconsole prompt stack (search/use/info/show options/set/setg/unset/run/exploit/back/exit) + 4 modules (TCP port scan, vsftpd backdoor, ssh_version, ftp_version)
- [x] M5-T02 shell utilities (dig/whois/curl) — DEFERRED, inline-only in missions
- [x] M5-T03 a1-recon-console + a1-mail-server complete
- [x] M5-T04 a1-knock-knock msf auxiliary route added
- [x] M5-T05 traffic generator + real .pcap writer (Ethernet/IPv4/TCP/UDP/ICMP, big-endian, LCG payload fill)
- [x] M5-T06 tshark display-filter subset (ip.addr, ip.src/dst, tcp.port, udp.port, tcp.flags.syn/ack, icmp, dns, http, frame.time_relative, &&, ||, !, contains)
- [x] M5-T07 Meridian Console (20 alerts, 3 true positives, triage --tp/--fp, log search field=value, count by field)
- [x] M5-T08 a1-twenty-alarms complete (full template, 2 routes + 1 negative)
- [ ] M5-T10 Leitner deck + spaced repetition — DEFERRED (v0.3 polish)
- [ ] M5-T11 Journal + curation — DEFERRED (v0.3 polish)
- [ ] M5-T12 News feed + echo incidents — DEFERRED (v0.3 polish)
- [ ] M5-T09 Shop UI (full ownership/advance flow) — DEFERRED; the wallet/advance logic ships in M1; missions don't gate on this. CLI-only shop works.
- [x] M5-T06→M6-T05 Snort rule engine (header + msg + content + nocase + flags + sid/rev + classtype; CIDR/24 host matching; content with pipe-encoded bytes; false-positive scoring)
- ### M6 — Act 2 complete
- [x] M6-T01 OSINT sims: certlog (CT stand-in), theHarvester (-d/-b), wayback (deterministic snapshots)
- [x] M6-T02 Netcat sim: startListener + connect + scheduleReverse; reverse-shell events
- [x] M6-T03 Burp-style proxy sim: intercept queue, runBurp mutation, inScope check, header/body tampering
- [x] M6-T04 Gobuster + sqlmap sims: world web-graph and DNS hit-detection; injectable detection from snippets
- [x] M6-T05 Snort rule editor UI — DEFERRED; engine in place, UI is M3+ polish
- [x] M6-T06 IR mechanics: makeIrState/applyIr, memory_captured → host_powered_off ordering, isolate/contain, 0.1 Trust penalty for block-beni, power-off blocks subsequent memory_captured
- [x] M6-T07 6 Act 2 missions complete: a2-harvest, a2-first-blood, a2-intercept, a2-dump, a2-patient-zero, a2-block-it
- [x] M6-T08 scaffolding levels (worked/checklist+hints/checklist/objective/raw), Trial 1 wraps a1-first-contact at 0 ₡, specialisation
- [x] M6-T09 Practice Range v1: stub for nmap-basics, msf-portscan, gobuster-dirs, sqlmap-basics, snort-rule-write iterates
- ### M7 — Act 3 complete (Red+Blue+shared)
- [x] M7-T01 shared sims: AIS (vessel timeline + 12h dark gap on mmsi-538123456), sherlock (deterministic per-handle), GitHub-style dork (web sim reused), honeytoken (plantHoneytoken/checkHoneytokenHit)
- [x] M7-T02 verification mechanic: intel list with corroborated/verified states; Veyra single-source false-flag detection
- [x] M7-T03 2 shared missions complete: a3-dark-ship (ais), a3-honeytoken
- [x] M7-T04 Red Meterpreter subset: sysinfo, getuid, ps, migrate, hashdump, upload, download, shell, background, exit
- [x] M7-T05 Red Sliver sim: generateImplant, listImplants, listeners, use, info, ls, ps
- [x] M7-T05 Red Hydra (online brute-force) + John (offline hash cracking) sims with fixture creds
- [x] M7-T06 4 Red missions complete: a3r-migrate-dump, a3r-pivot, a3r-callback, a3r-cracked
- [x] M7-T07 Blue sims: Wazuh (FIM, generateFimEvents, setBaseline, 50-host fleet through Velociraptor VQL), Rook replay (creds-leak → persistence-schtask → c2-checkin → lateral-smb), beacon detection puzzle (mmsi-538123456-style periodic PSH|ACK to port 4444)
- [x] M7-T08 4 Blue missions complete: a3b-persisted, a3b-fleet-sweep, a3b-heartbeat, a3b-follow-money
- [x] M7-T09 Trial 2 + cross-training — DEFERRED (raw mode for Act 3 finished; cross-training data structure lands with M8 trial gate)

## Notes
- M0–M4 built end-to-end; verify passes on the seed tree. M5+ are tracked in BLOCKERS.md
  with reason "scope: planned for v0.2+; M0–M4 gate covers the v0.1 contract".
- "Status: stub" vs "complete" in missions.ts still tracks §7.1. Any mission tagged
  `complete` has its world, brief, primer, goals, and at least one transcript.
- See `docs/FINAL_REPORT.md` (M9) for v1.0 release notes when it lands.