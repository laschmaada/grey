docs/milestones/M0..M4 — milestone gate records.

M0 — done
- npm run verify green (tsc, eslint, vitest, boundaries, content-lint, economy, build, size-check)
- 14 ADRs; architecture/safety/lab docs in place
- gates: G0 = verify green + file:// boot test

M1 — done
- 46 unit tests across 6 files
- core coverage floor 85% enforced by vite.config.ts
- economy-check recomputes §9 and asserts the 9,270 ₡ grand total per track

M2 — done
- a1-first-contact complete (2 routes + 1 negative transcript)
- Nmap formatter covered by unit tests
- `npm run repl -- a1-first-contact` plays the mission

M3 — done
- happy-dom UI smoke tests (2 in m3-ui.test.tsx, 4 in m3-boot.test.ts)
- dist/index.html boots from file:// with no console errors

M4 — done
- STORE-method ZIP + CRC32 + parse-back test
- export linter covers public IPs / non-reserved hostnames / emails / key-like strings
- content-linter stub wired into verify
- 80 total tests passing

M5 — done (v0.2.0)
- traffic generator + real .pcap writer (Ethernet/IPv4/TCP/UDP/ICMP, big-endian, LCG payload fill)
- tshark sim with display-filter subset (&&, ||, !, contains, ip/tcp/udp/icmp/dns/http)
- Meridian Console: 20 alerts seeded (3 true positives), triage --tp/--fp, log search
- msfconsole prompt stack with 4 modules (portscan/tcp, vsftpd_234_backdoor, ssh_version, ftp_version)
- Snort rule engine (header + msg + content + nocase + flags + sid/rev + classtype; CIDR/24)
- a1-twenty-alarms, a1-recon-console, a1-mail-server, a1-knock-knock all complete
- 122 tests passing (added: m5-traffic, m5-tshark, m5-snort, m5-meridian, m5-msf, m5-missions)
- dist/index.html 52.5 kB (5.0% of 2.5 MB budget)
- Cuts logged in BLOCKERS.md: M5-T02/T09/T10/T11/T12 deferred to v0.3.

M6+ — DEFERRED per BLOCKERS.md (Act 2 onward, including Active Defense plumb, Act 3
Red+Blue, Act 4 + finales + Mosaic, hardening, perf budget, FINAL_REPORT polish)