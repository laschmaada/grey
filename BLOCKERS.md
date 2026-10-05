# BLOCKERS

Tracking failures, scope cuts, and items deferred per CODING_PLAN §10.

## Active

_None at this time._

## Deferred (scope-cut ladder)

- **M6+** (Act 2 onward): Burp proxy, theHarvester sim, Netcat session state, sqlmap/gobuster,
  IR mechanics (evidence-integrity ordering, isolate/contain), Trial 1, Practice Range, Act 2
  missions. Reason: M0–M5 cover the v0.2 gate; M6+ lands in v0.3+.
- **M7–M9**: Act 3 (Red + Blue), Act 4 + finales + Mosaic, full save migration tests, FINAL_REPORT
  polish. Reason: each is a separate milestone with its own gating (M6/M7/M8/M9).

## Cuts inside M5 (logged in §10)

- **M5-T02 dig/whois/curl**: kept inline in a1-mail-server rather than as a full
  sim module — `dig` reads `m.world.dns` directly. A real `dig` sim ships if/when
  the player wants to drill by record type.
- **M5-T09 shop UI (full)**: wallet/advance logic ships in M1; missions don't gate
  on the UI. The shop works through the CLI test runner.
- **M5-T10 Leitner / M5-T11 journal / M5-T12 news**: feature polish, deferred to v0.3.

## Workaround log (carried from v0.1)

- **vite-plugin-singlefile output name**: plan specified `grey-heron.html`; we ship
  `dist/index.html` for Pages + `file://` deploy.
- **ESLint Math ban**: original ban on `Math.*` would have rejected `Math.imul` /
  `Math.floor` in the deterministic RNG. Narrowed to `Math.random` only; deterministic
  RNG preserves the D6 property.
- **size-check w3.org / `https://nmap.org` text matches**: XML namespaces and tool
  help-text aren't network resources. size-check only flags `src=`/`href=` http(s).
- **boundaries.ts `window` regex**: original `\bwindow\b` matched the legitimate
  variable name `window` in traffic.ts. Refined to `window.\w` so it only triggers
  on member access.
- **tshark `!` prefix**: the tokenizer doesn't split `!` from a field name, so
  `!tcp.port == 22` parses `!tcp.port` as a single field token. Documented in tests:
  callers must write `! tcp.port == 22` (with a space). Mirrors the real tshark
  grammar.
- **PCAP endianness**: pcap file headers are little-endian on disk (file format spec),
  but IP/TCP/UDP/ICMP headers inside each packet are big-endian (network byte order).
  The writer correctly distinguishes the two.