# Simulator Field Manual

What each sim does, what it doesn't, and how to use it from a mission transcript. This is the reference for the mission author's "lab:" field — every simulator operation a player can attempt, with its CLI surface and a one-line "what real tool this maps to".

The simulator runs in the browser. No network. The pcap files it writes are real — you can `tshark -r <file> -Y <filter>` in your lab's Wireshark.

## Conventions

- **All identifiers are reserved.** IPs from `192.0.2.0/24`, `198.51.100.0/24`, `203.0.113.0/24`, RFC 1918, loopback, link-local. Domains under `.test`, `.example`, `.invalid`. Emails at those domains.
- **All output is deterministic given the same seed + same events.** Two replays from the same transcript produce the same output.
- **`goldenStatus`** is `'unverified'` on every sim formatter. To flip it to `'verified'`, capture a real output from your host-only lab and diff against the simulator output per [`lab/CAPTURE_GOLDEN.md`](lab/CAPTURE_GOLDEN.md).

## Recon

### nmap

The standard version mapper. The sim accepts the documented flags:
- `-sV` (version), `-sC` (script — placeholder for "scripts against open ports, banner-related only")
- `-sS` (SYN), `-sT` (TCP connect)
- `-p <list>`, `-p-` (all), `--top-ports <n>`
- `-Pn` (no ping), `-T0..T5` (timing templates)
- `-A` (aggressive = `-sV -sC` + script), `-v` (verbose), `-oN <file>` (output to file)

Unknown flags → `not emulated in this simulator`. Most notably:
- `-O` (OS detection) — `not-emulated`
- `--script` — `not-emulated`
- `-sU` (UDP scan) — `not-emulated`

Real tool: [nmap.org](https://nmap.org).

### msfconsole

A 4-module subset of Metasploit. Three-level prompt stack: shell → msf → module (meterpreter is wired but stubbed in M7-T04 with full MsfRunContext plumbing).

**Shell-level:**
- `msfconsole` / `msf` — opens the msf prompt
- `search <name>` — find modules
- `use <module>` — push a module prompt (`msf6 <short-name> >`)
- `info` — show module info (only in module prompt)
- `show options` — list required + optional
- `set <opt> <value>` / `setg <opt> <value>` / `unset <opt>` — option management
- `run` / `exploit` — invoke the module's `run(ctx)`; emits events + facts
- `back` — pop module prompt
- `exit` — pop msf prompt

**Modules shipped:**
- `auxiliary/scanner/portscan/tcp` — TCP port scan (requires `RHOSTS`); asserts `port:open:<host>:<port>` facts
- `exploit/unix/ftp/vsftpd_234_backdoor` — vsftpd 2.3.4 backdoor (state transition); asserts `session:<host>` + `exploit:vsftpd:<host>`; requires `RHOST`
- `auxiliary/scanner/ssh/ssh_version` — SSH version banner; requires `RHOSTS`
- `auxiliary/scanner/ftp/ftp_version` — FTP version; requires `RHOSTS`

Real tool: [metasploit.com](https://www.metasploit.com/).

### msfconsole (ms) command

The `ms` shell command is a thin alias that pipes into the prompt-stack dispatcher. Useful for one-liner transcripts: `msf use exploit/unix/ftp/vsftpd_234_backdoor; set RHOST 192.0.2.10; run`.

### web / dork

A search index over a world web graph. Supports:
- `site:<rootUrl-domain>` filter
- `filetype:<ext>` filter
- `intitle:<substring>` filter
- `inurl:<substring>` filter
- Quoted phrases (`"AIS gaps"`)
- Combined with `&&`, `||`, `!` operators

Real tool: search engine dorking (Google dorking for the player).

### theharvester

OSINT email/subdomain harvester. `runHarvester(world, domain)` returns a list of synthetic emails + their source (`dns`, `certlog`, `docs`, `web`).

CLI: `theharvester -d <domain> -b <source>`. Supported sources: `all`, `dns`, `certlog`, `docs`, `web`.

Real tool: [github.com/laramies/theHarvester](https://github.com/laramies/theHarvester).

### certlog

Certificate-transparency stand-in. `runCertlog(world, domain)` returns CN + SAN + issuer + validFrom/validTo for hosts in the world whose hostname ends with the queried domain.

CLI: `certlog <domain>`.

Real tool: [crt.sh](https://crt.sh).

### wayback

Archive snapshot list per path. Deterministic per (world seed, path) so two replays from the same seed produce the same digest list.

CLI: `wayback <path>`.

Real tool: [web.archive.org](https://web.archive.org).

### ais

Vessel tracking timeline. `runAis(world, mmsi)` returns position reports; the special mmsi `mmsi-538123456` (Nadia K) has a 12h gap that exceeds the 6h "dark ship" threshold.

CLI: `ais <mmsi>`.

Real tool: [MarineTraffic](https://www.marinetraffic.com).

### sherlock

Username enumeration across 8 fictional platforms. Deterministic per (world seed, handle).

CLI: `sherlock <handle>`.

Real tool: [github.com/sherlock-project/sherlock](https://github.com/sherlock-project/sherlock).

## Web app analysis

### gobuster

Directory / DNS brute-forcer. `runGobuster(world, { mode, base, wordlist?, extensions? })`:
- `mode: 'dir'` — checks the world's web-graph nodes against the base URL.
- `mode: 'dns'` — checks the world's DNS records against the base domain.

Built-in wordlists: 20 common paths (dir), 20 common subdomains (dns). Override with `wordlist`.

CLI: `gobuster -m dir|dns -u <url> -w <wordlist> [-x <ext>...]`.

Real tool: [github.com/OJ/gobuster](https://github.com/OJ/gobuster).

### sqlmap

SQL injection detector. `runSqlmap(world, { url, ... })` flags web nodes whose snippet contains `sqli` as injectable. Default fixture databases/tables when none provided.

CLI: `sqlmap -u <url> [--dbs] [--tables] [--dump]`.

Real tool: [sqlmap.org](https://sqlmap.org).

### burp

Burp-style intercept-and-mutate proxy. `runBurp(world, url, mutation?)` consumes the queue head, applies header / body mutations, returns `{ hits, dropped, tampered, outOfScope }`. Out-of-scope touches are reported but not consumed.

CLI: `burp intercept` / `burp forward` / `burp set header <h> <v>` / `burp drop` / `burp dump`.

Real tool: [portswigger.net/burp](https://portswigger.net/burp).

## Post-exploitation (Red)

### meterpreter

Session subset (`sysinfo`, `getuid`, `ps`, `migrate <pid>`, `hashdump`, `upload`, `download`, `shell`, `background`, `exit`). Process list is deterministic per host id; hashdump returns NTLM-style fixture hashes for known users (`Administrator`, `analyst`, `j.doe`, `svc_backup`, `admin`).

Real tool: meterpreter on Metasploit Framework.

### sliver

C2 console subset. `generateImplant` returns an implant record per host. `sliverLs / sliverPs / sliverInfo` produce deterministic recon output.

Real tool: [github.com/BishopFox/sliver](https://github.com/BishopFox/sliver).

### hydra

Online brute-forcer. `runHydra(world, host, port, user, wordlist?)` returns the matching fixture credential for known users (`admin`, `analyst`, `root`, `svc_backup`, `j.doe`) or the first word from the supplied wordlist.

Real tool: [github.com/vanhauser-thc/thc-hydra](https://github.com/vanhauser-thc/thc-hydra).

### john

Offline hash cracker. `runJohn(world, hashes)` returns `{ user, ntlm, plaintext }` for known users, or a synthesised "crack-<n>" for unknown.

Real tool: [openwall.com/john](https://www.openwall.com/john/).

### netcat

Listener / connect / reverse-shell. `startListener(world, hostId, port, flag?)` opens a listener with an optional payload. `connect(from, to, port)` consumes a listener and returns a `NetcatEvent`. `scheduleReverse(from, to, afterMs)` produces a future reverse-shell event.

Real tool: [nc](https://nmap.org/ncat/).

## Detection (Blue)

### meridian

SIEM-lite. `seedMeridian(world, count=20)` returns 20 alerts; exactly 3 are true positives (IDs 1, 3, 11) for `a1-twenty-alarms` / `a3b-follow-money` style flow. `triage(state, id, '--tp|--fp')` marks; `triageScore(state)` aggregates correct / wrong / skipped.

CLI: `meridian list` / `meridian triage <id> --tp|--fp` / `meridian <field>=<value>`.

Real tool: conceptual stand-in for [wazuh.com](https://wazuh.com) + SIEM triage UX.

### tshark

Display-filter subset. `tsharkRead(packets, expr)` evaluates the filter; unknown fields → `not emulated`. `tsharkFormat(packets)` produces a banner + per-packet line list.

Operators: `==`, `!=`, `contains`, `&&`, `||`, `!` (note: `!` must be space-separated from the field token). Parenthesised groups work.

Supported fields: `ip.addr`, `ip.src`, `ip.dst`, `tcp.port`, `tcp.srcport`, `tcp.dstport`, `udp.port`, `udp.srcport`, `udp.dstport`, `tcp.flags.syn`, `tcp.flags.ack`, `icmp`, `dns`, `http`, `frame.time_relative`.

Real tool: [wireshark.org](https://www.wireshark.org).

### traffic

The **single** traffic generator. `generateBackground(rng, world, fromMs, toMs, profile?)` emits benign background packets. `generateBeacon(rng, src, dst, dport, fromMs, toMs, intervalMs, jitterMs, payloadLen?)` emits a periodic beacon. `writePcap(packets)` writes a real `.pcap` file (Ethernet / IPv4 / TCP|UDP|ICMP, big-endian network byte order).

The pcap file is real — open it in Wireshark.

### snort (rule engine)

Header + options. `parseRule(text)` returns a `SnortRule`. `matchRule(rule, packet, payload)` returns true / false. `falsePositiveRate(rule, benign)` is the FP rate over a benign corpus.

Supported options: `msg`, `content` (quoted / pipe-encoded / bare), `nocase`, `flags: S/A/F/R/P/U`, `sid`, `rev`, `classtype`, `reference`. Host match is `any` or CIDR/24.

Real tool: [snort.org](https://www.snort.org).

### wazuh

File integrity monitoring. `setBaseline(baseline)` records a baseline; `generateFimEvents(world, hostId, path, count)` returns deterministic FIM events (created / modified) with sid 55x.

Real tool: [wazuh.com](https://wazuh.com).

### velociraptor

VQL subset over a 50-host fleet fixture. `runVql({ source: 'host'|'services'|'processes', where? })` returns filtered rows. Source: `host` (hostname, os, ip), `services` (port, name, state), `processes` (pid, name, user). WHERE supports equality filters.

Real tool: [velociraptor.velocidex.com](https://docs.velociraptor.velocidex.com).

## Specialty

### ir (incident response mechanics)

State machine:
- `makeIrState(hostIds)` — initialise per-host isolation / memory / power state.
- `applyIr(state, action)` — apply an action. Returns events + ordering violations + trust penalty + power-off blocks.
- `isForensicallyClean(state, hostId)` — true iff `memory_captured` happened strictly before `host_powered_off`.

Actions: `memory_captured`, `host_powered_off`, `isolate`, `contain`, `reauthorize`, `block_traffic`.

Constraints: `host_powered_off` before `memory_captured` is an `OrderViolation`. `block_traffic` without a prior compromise incurs `0.1 Trust`. `memory_captured` on a powered-off host is blocked.

### intel (verification)

Intel list with §4.4 states (`unverified` / `corroborated` / `verified`).
- `corroborated` — ≥ 2 items for the same claim with **different** `sourceType` **and** different `origin`.
- `verified` — ≥ 3 such items.

Helpers: `stateOf`, `isVerified`, `isVeyraSuspect` (single-source "veyra" claim → suspect false flag), `allVerifiedClaims`.

### rook (replay)

Pre-built Rook operation timeline. `seedRookPlan()` populates:
1. `creds-leak` (t=100, hostId=patient, payload=credential)
2. `persistence-schtask` (t=200, hostId=patient, payload=UpdaterSvc)
3. `c2-checkin` (t=300, hostId=patient)
4. `lateral-smb` (t=400, hostId=lateral)

The Blue player's job is to find this by querying FIM + VQL + logs.

### honeytoken (K5 trap)

`plantHoneytoken({ key, value, pointsAt, missionId })` adds a planted key. `checkHoneytokenHit(value)` returns the matching record (or null). When the planted key shows up in a Meridian alert or log event, the player should recognise it as a *signal* (not as evidence) per §7.2.

### beacon (detection puzzle)

`makeBeaconPuzzle(seed, world)` returns `{ packets, beacon, beaconCount }`. The beacon is a periodic TCP PSH|ACK to a fixed port (`4444`) on a known attacker host. The player uses `tshark -q -z conv,tcp` to spot the long-running conversation, then `tshark -Y tcp.port==<port>` to extract the per-flow records.

## Persistence

The simulator doesn't have a filesystem. "Persistence" missions (e.g. `a3b-persisted`) model persistence as a *fact* in `knownFacts`. The Rook replay module + the FIM + the VQL fleet are the load-bearing pieces.

## Architecture decisions

The sims use the seeded RNG (`makeRng(world.seed ^ <label>)`) for any non-determinism. The simulator's clock is virtual; `clock.advance(ms)` is the only way time moves. This is enforced by the D6 ban in ESLint.

For the rationale behind any decision, see [`docs/adr/`](adr/) — 14 architecture decision records covering TypeScript strict, Vite singlefile, Preact UI, the terminal model, the event-sourced state, the virtual clock, persistence, the tool version constants, the testing strategy, the in-house ZIP, the lab baseline, the MIT license, and the zero-network CSP.
