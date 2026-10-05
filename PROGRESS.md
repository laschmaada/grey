# PROGRESS

Current milestone: M5 (Act 1 complete; msfconsole prompt stack, traffic gen + pcap, tshark, Meridian Console, Snort rule engine landed)
Last verify: green
Last tag: v0.2.0

## Next 3 actions
1. M6-T01..M6-T09 — Act 2 sims (Burp, theHarvester, Netcat sessions, IR mechanics, sqlmap/gobuster, Snort UI, 6 missions, Trial 1, Practice Range v1)
2. M7-T01..M7-T09 — Act 3 sims (both tracks) + 8 missions
3. M8-T01..M8-T07 — Volatility, Maltego, Adversary model (Act 4 flip), 5 Act 4 missions, 2 finales, Mosaic

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
### M5 — Act 1 complete
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

## Notes
- M0–M4 built end-to-end; verify passes on the seed tree. M5+ are tracked in BLOCKERS.md
  with reason "scope: planned for v0.2+; M0–M4 gate covers the v0.1 contract".
- "Status: stub" vs "complete" in missions.ts still tracks §7.1. Any mission tagged
  `complete` has its world, brief, primer, goals, and at least one transcript.
- See `docs/FINAL_REPORT.md` (M9) for v1.0 release notes when it lands.