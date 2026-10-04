# GREY HERON — Game Design Document (v1.1)

> A story-driven, browser-based simulator that teaches real offensive, defensive and
> OSINT skills — Metasploit-first — and turns everything you do into portfolio evidence.
> Built as a **personal learning tool and portfolio project**.
> Status: design revised (v1.1), no code yet.

---

## 0. What changed from v1.0

**Re-aimed:** v1.0 read like a product for an audience. v1.1 is a learning instrument
for one learner who also needs a portfolio. Anything that only matters at scale is deferred.

**Fixed (inconsistencies in v1.0):**
- Blue players could not hunt "persistence you planted" in Act 3 → Blue now hunts a
  scripted operation by Rook (see §3, §4.3).
- Snort was needed in Act 2 but sold in Act 4; Nmap was needed in mission 1 but sold in
  the shop; Act 4 shared missions required Blue-tier tools → tool timing rebuilt (§8).
- Hydra, Sherlock, Gobuster, Nikto had no mission home or the wrong tier → re-homed.
- Metasploit-first was not visible in Act 1 → new mission "Recon Console".
- Red and Blue Act 3 had different mission counts (6 vs 5) → now 6 each.
- Economy check hid BloodHound (11,550 ₡ total, not 10,350 ₡) → economy rebuilt and
  verified per purchase point.

**Added:** learning loop, field assignments as the core loop, portfolio pipeline,
scope and authorization mechanic, world-model architecture, outcome-based validation,
mystery designed backward, spaced review, write-ups and journal, cert and ATT&CK mapping,
accessibility, production and test plan.

**Deferred (Appendix A):** New Game+, leaderboards, daily challenges, mission editor,
Active Directory branch, complex payout multipliers, hint penalties.

---

## 1. Purpose and success criteria

### 1.1 Purpose
1. **Learn** real red, blue and OSINT skills with muscle memory that transfers to a real lab.
2. **Prove it** with a portfolio that shows evidence, write-ups, detections and an honest
   record of what was simulated and what was verified in a real lab.

### 1.2 The promise (scoped honestly)
Finishing the campaign does not make you a professional. It prepares you to practice each
operation in a real lab, and leaves you with the artifacts to show for it.

### 1.3 Can-do statements (the measurable bar)

| Act | After this act you can… |
|-----|-------------------------|
| 1 | Run and interpret service/version scans; do passive recon with dorks, whois, DNS; navigate msfconsole and run auxiliary modules; triage alerts and recognize scan traffic in a pcap; write a scoped attack-surface report |
| 2 | Enumerate subdomains via cert logs; exploit a known vulnerable service and catch a shell; tamper with web requests in Burp; find and exploit SQLi; run first-response IR without destroying evidence; write a Snort rule |
| 3 Red | Do Meterpreter post-exploitation, pivot into an internal network, run a Sliver C2 session, crack hashes |
| 3 Blue | Hunt persistence, query a fleet, detect C2 beaconing, trace crypto flows |
| 3 Both | Resolve identities across platforms, correlate AIS and timestamps, recognize honeytokens |
| 4 | Triage pcaps under pressure, do memory forensics, write emergency rules without breaking legit traffic, model an adversary's kill chain, attribute from infrastructure overlap |
| Finale | Run a full chain cold (Red) or detect it behaviorally (Blue); fuse all-source intel into a verified conclusion |

---

## 2. Design pillars

1. **Real syntax, outcome-validated.** Simulated tools accept real commands and fail the
   way the real tool fails. Missions check *what you achieved* (session obtained, fact
   found, evidence preserved), not that you typed one expected string.
2. **The sim teaches, the lab proves.** Every mission ends with a field assignment in your
   own Kali + Metasploitable lab. Lab evidence is what makes a skill "verified".
3. **Story and skill are the same progression.** You learn pivoting because the plot
   needs you deeper inside, not because a tutorial says so.
4. **Three woven ladders.** OSINT, red and blue spiral through every act: one new
   technique per act, scaffolding fading to zero.
5. **Consequence and authorization.** Loud scans raise alerts, bad IR destroys evidence,
   unverified intel leads to traps, and touching out-of-scope systems has a cost.
6. **Everything becomes evidence.** Each mission produces artifacts (notes, output,
   write-up, detections) that feed the portfolio export automatically.

---

## 3. Story bible

### Setting
2026. The **Kestrel Strait** is the flashpoint between two rival powers, **Veyra** and
**Ostmark**. The **Kestrel Summit** is six weeks away. Underneath the diplomacy, the APT
**GREY HERON** runs a quiet campaign against infrastructure on both sides. Nobody knows who
it really works for. (Fictional nations, real dynamics: cable sabotage, ransomware,
pre-positioned grid access.)

### The firm — Meridian Risk
A private security consultancy. You are a newly hired field operator. Meridian pays in
**Meridian Credits (₡)** and requisitions you real tools. The firm's contracts always come
with a signed **Scope Card** (see §5.2).

### Characters
- **Ledger** — your handler. Briefs, debriefs, pays, issues advances. Dry, never rattled.
- **Rook** — rival operator. Faster than you, sloppier. Appears on a ghost leaderboard and
  in missions. **Arc (decided): the mid-campaign twist.** Rook's tradecraft trails show up
  in Act 3 (the persistence Blue hunts, the stray shells Red trips over). In Act 4 Rook's
  operator credentials appear in GREY HERON infrastructure. The official story says
  *traitor*; the mosaic proves *compromised* (Rook's credentials were phished).
- **Ink** — investigative journalist. Feeds OSINT leads; sometimes wrong, sometimes lied
  to, sometimes lying. Ink's help fades from "use this exact tool" (Act 1) to nothing (Act 3+).
- **GREY HERON** — never met. Only seen through infrastructure, lure typos, a ship going
  dark on AIS.

### The rolling news feed
Advances with your progress (not real time). Some stories are GREY HERON disinformation,
and OSINT is how you prove it. The feed also drops small **echo incidents** that reuse
older skills (spaced re-exposure, §6.3).

### The season mystery — designed backward
The public story: the cable cut was Veyra. The truth below is a **proposal; change freely**,
but write the truth first and place clues before building missions.

**Truth (proposal):** GREY HERON is a crew-for-hire working for **Halden Maritime Group**
(fictional), which profits if the Summit collapses. The trawler *Nadia K* cut the cable on a
charter paid from ransomware proceeds, not a weapons program. Rook's credentials were phished
and used to reach Meridian tooling.

| Clue | Where it is found | False flag it competes with |
|------|-------------------|-----------------------------|
| *Nadia K* AIS gap over the cable route at the incident hour | Act 3 shared: The Dark Ship | Veyra-flagged naval traffic nearby |
| Shared TLS cert / registrar between GREY HERON C2 and an old Halden subsidiary dev server | Act 2 Harvest (second SAN, easy to miss) → Act 4 Attribution | Veyra-hosted C2 IP |
| Ransom wallet consolidates into a charter-fuel payment for the trawler | Blue: Follow the Money; Red: found via Ink in Act 4 | "Funds weapons program" claim in the feed |
| Crew posts with timestamps/locations; lure typo habits and UTC+3 working hours | Act 1–2 artifacts; Act 3 identity resolution; Act 4 pretext analysis | Veyra-language strings in the malware |
| Honeytoken key pointing at Veyra-looking infrastructure | Act 3 shared: The Honeytoken | — (this *is* the planted false flag) |

**Endings:** the **true ending** requires the mosaic to reach *Verified* on the key links.
Rushing gives the **official story** ending. The game must signal doubt (Ink or Ledger)
before you commit, so the wrong ending feels earned, not hidden.

---

## 4. Campaign structure and skill ladders

- **Act 1 – "The Knock"** (recon and scanning)
- **Act 2 – "The Breach"** (exploitation, web, first IR)
- **Specialization contract** (end of Act 2): choose **Red** or **Blue**
- **Act 3 – "The Wire"** (post-exploitation / hunting; branches by specialty)
- **Act 4 – "The Turn"** (perspective flip; shared by both tracks)
- **Finale – "Zero Day"** (full chain or behavioral detection, then the mosaic)

"Earn your colors": everyone starts as a generalist. The payoff for choosing is the
branching missions and the Specialist rank, not a price discount. After the finale you may
play the other track's Act 3 missions as **cross-training contracts**.

### 4.1 OSINT spine

| Act | New technique | Mission sketch |
|-----|---------------|----------------|
| 1 | Google dorking (`site:`, `filetype:`), whois, DNS | Find the grid operator's exposed maintenance doc; identify their mail infrastructure |
| 2 | Email→subdomain harvesting, cert-transparency logs, Wayback | Find the forgotten dev server; it becomes the Act 2 target |
| 3 | Identity resolution (Sherlock), AIS plus timestamp correlation, GitHub dorking, honeytokens | Prove the trawler went dark at the incident hour; spot the planted key |
| 4 | IOC pivoting, infrastructure-overlap attribution, spearphish pretext analysis | Find what *you* exposed in Acts 1–3; attribute via shared certs/registrars |
| Finale | All-source fusion | Build the mosaic |

**Verification mechanic (specified):** every intel item has a **source type** (AIS, cert log,
blockchain, social, malware artifact, human/Ink) and an **origin**. *Corroborated* = two
items of different source type *and* different origin. *Verified* = three or more. Acting
on *Unverified* intel can trigger a trap mission.

### 4.2 Red ladder (Metasploit-first)

| Act | New capability | Mission sketch |
|-----|----------------|----------------|
| 1 | msfconsole fluency (`search`, `use`, `show options`, `set`, `run`, `back`), auxiliary scanners, Nmap `-sV -sC` | Map the exposed host; recon is most of the job |
| 2 | First shell (vsftpd-class backdoor), payloads (staged vs stageless, `reverse_tcp`), sessions, Netcat listeners; Burp intercept→tamper→forward; Gobuster, sqlmap | Pop the dev server; tamper a shop price; find and dump the user table |
| 3 | Meterpreter (`sysinfo`, `hashdump`, `migrate`, `upload`), pivoting (`route add`), Sliver C2, Hydra + John | Breach, pivot, catch the callback, crack the admin hash |
| 4 | Red pauses: your own tradecraft is the enemy's | Model GREY HERON's kill chain and predict the next strike |
| Finale | Full chain cold, raw mode | OSINT → scan → exploit → post-ex → pivot → objective, noise meter live |

### 4.3 Blue ladder

| Act | New capability | Mission sketch |
|-----|----------------|----------------|
| 1 | Alert triage, "what is normal", Wireshark basics | 20 alerts, 3 matter; spot the scans *you* ran |
| 2 | IR order of operations (memory before power-off), entry-point analysis, first Snort rule | Hospital ransomware: isolate patient zero, block C2, keep evidence |
| 3 | Hypothesis-driven hunting, persistence mechanisms, fleet queries, beacon detection, crypto tracing | Hunt the persistence from **Rook's operation** (a scripted red-team replay), sweep the fleet, find the heartbeat, follow the money |
| 4 | Memory forensics, pcap under pressure, emergency rules | Defend summit infrastructure against *your own playbook* |
| Finale | Behavioral detection with no signatures | Zero-day drops: spot the anomaly, write the rule, coordinate response |

---

## 5. Core mechanics

### 5.1 The learning loop (every mission)

**Brief** (concept primer, three minutes) → **Sim mission** (10–20 min) →
**Field assignment** (real lab) → **Evidence** (saved output, screenshots, pcaps) →
**Write-up** (report or note) → **Journal** (three prompts) → **Deck update** (review cards).

Budget about 60–120 minutes per mission including the lab. The sim alone is 10–20.

### 5.2 Scope and authorization (new)
Every contract ships a **Scope Card**: in-scope assets, out-of-scope assets, permitted
techniques, testing window, data-handling rule. Scans naturally reveal out-of-scope hosts,
as real networks do. Touching them, or breaking a rule, earns a **Scope Strike**.
- Strikes lower that mission's quality score.
- Three strikes in an act trigger a **Contract Review** scene (Ledger, a legal hold, a delayed
  next contract). It never dead-ends the run.
- Teaches: rules of engagement, the line between tester and criminal, responsible handling.

### 5.3 Terminals and fidelity
- **Strict matching, realistic failure.** Commands must be valid; errors mimic the real tool.
  Fuzziness appears only as a "did you mean…" *after* a failure.
- **Real shell comforts:** tab completion and command history. `help`, `-h`, `man` are
  always free.
- **Simulators:** msfconsole, Nmap, Burp intercept, pcap viewer with real display filters,
  Meridian Console (alert queue and log search), link-graph view, and a shell sim
  for Hydra, John, sqlmap, Gobuster.
- **Pinned versions:** sims state the version they emulate (match your lab, e.g.
  Kali 2026.x / Metasploit 6.x). Revisit when tools update.

### 5.4 Outcome validation
Missions define **goals over world state**, not command strings. Example: `session_open(host=dev01)`
or `fact_found(mail_server)`. Any valid route counts (`nmap -sV`, `-sC -p-`, or a
Metasploit scanner).

### 5.5 Red mechanic: noise meter
0–100. Loud actions (`-T5` scans, full sweeps, repeated failed logins) raise it; slow and
stealthy keeps you ghost. High noise alerts the target and lowers the quality score.

### 5.6 Blue mechanics: Trust and evidence integrity
Blocking legitimate traffic costs client **Trust**. Wrong IR order (power-off before memory
capture) damages the **evidence score**. Both feed the quality score.

### 5.7 Failing forward
Failure has story cost, not just score cost: a burned Ink source, a client who drops you
(replaced by a lower-paying cleanup contract), a trap mission that changes Act 3 offers.
You can always retry; the failed attempt is logged as a journal lesson.

### 5.8 Scaffolding fade

| Stage | What you get |
|-------|--------------|
| Act 1 | Worked example, objective checklist, Ledger hints |
| Act 2 | Checklist, hints |
| **Trial 1** (end of Act 2) | **Raw mode:** no checklist, no hints, no Ledger coaching |
| Act 3 | Objective statement only |
| **Trial 2** (end of Act 3) | Raw mode |
| Act 4 | Hints off, checklist off |
| Finale | Raw mode throughout |

**Hints are free** and tracked as a self-assessment statistic ("hints used"). No payout penalty.

### 5.9 Quality score and report writing
Each mission ends with a short **client report** (template provided). The game checks
completeness against world facts (required sections, findings that match what exists) and
gives you a self-review checklist. Quality combines: outcome (required), the track metric
(noise, Trust/evidence, verification, or Scope Strikes) and report completeness.

### 5.10 Hub screens
Briefing (mission and Scope Card), Shop, Journal, Daily Drill (review deck), Portfolio
(coverage and export), News feed, Practice Range, Settings.

### 5.11 Rules of Engagement screen
Stated up front, in fiction and out: the game targets only fictional infrastructure and
**your own isolated lab** (host-only network, snapshots, no bridging). Never scan or attack
systems you do not own or have written permission to test. Computer-misuse laws apply in
your jurisdiction (for example, South Africa's Cybercrimes Act).

---

## 6. Learning system

### 6.1 Field assignments (the sim-to-real bridge)
Every tool dossier ends with the real install command and a concrete lab task for your
Kali and Metasploitable VMs (Metasploitable 2 for the vsftpd-class lab).
- **Evidence:** pasted output, screenshot, pcap or hash, plus a one-line explanation.
- **Seeded flags:** the lab task includes a per-save seed so the expected output is unique
  and checkable offline. It exists for honesty with yourself, not anti-cheat.
- **Reward:** +25% of the linked mission's base payout and a **Field-Verified** badge.
- **Soft gate:** you can advance without the lab, but unverified items appear as
  *simulated only* in your coverage matrix.

### 6.2 Concept primers
Each mission opens with a short "why": the protocol, the kill-chain stage, and what the
defender sees on the other side. Skills should transfer beyond Metasploit.

### 6.3 Spaced review
- **Daily Drill:** about five minutes of cards generated from commands and concepts you have
  actually used (msfconsole flags, Nmap options, Wireshark filters, Snort syntax), on a
  Leitner-style schedule.
- **Echo incidents:** the news feed occasionally drops small incidents that reuse older skills.
- **Practice Range:** seeded, regenerated hosts, versions and vulns per tool you own. Cheap
  because the world model generates them.

### 6.4 Journal
Three prompts after each mission: *What did I get wrong? What would I do differently? What
would the defender (or attacker) have seen?* One minute, high retention.

### 6.5 Mapping and certs
- Every mission and lab carries **MITRE ATT&CK** tags (red/OSINT) and **D3FEND** tags (blue).
  Verify IDs against the current ATT&CK version when authoring.
- A coverage map relates progress to certs you may pursue: **eJPT, Security+, PNPT, BTL1,
  CySA+**. It shows topic coverage and does not claim equivalence to any exam.

---

## 7. Portfolio pipeline

### 7.1 What the game produces
- **Write-ups:** one report per mission (scope, method, findings, remediation).
- **Detections you wrote:** Snort rules, Sigma rules, hunt queries.
- **ATT&CK/D3FEND coverage matrix:** *simulated only* vs *lab-verified*.
- **Lab documentation:** diagram, build notes, evidence index.
- **Journal highlights** (curated).

### 7.2 One-click export
```
grey-heron-portfolio/
  README.md            # summary, coverage, how to read this
  attack-coverage.md   # matrix: simulated vs lab-verified
  writeups/            # A1-M06-knock-knock.md ...
  detections/          # snort/  sigma/  queries/
  lab/                 # diagram, build notes, evidence/
  journal.md           # curated
  certs.md             # topic coverage map
```

### 7.3 Rules
- Label everything honestly as **simulated engagement (fictional) + own-lab verification**.
- Publish only your own lab, fictional targets, and platforms that allow write-ups.
- Never include real organizations, real credentials, or content a platform forbids sharing.
- The **game repo is itself a portfolio piece:** README, architecture notes, world-model
  design, tests. Write them as you build.

---

## 8. Economy — Meridian Credits (₡)

**Design rule:** credits are a **pacing and gating device, not a scarcity system.** A
diligent player can always afford the next *required* tool before its mission. Surplus
exists so cross-training in both tracks is affordable.

### 8.1 Starter kit (free)
`msfconsole` (Metasploit), `nmap`, Meridian Console (alerts and log search), core shell
utilities (`dig`, `whois`, `curl`), CyberChef-style decoder.

### 8.2 Payout rules
Payout = base × quality multiplier (**0.85–1.15**) + field bonus (+25% of base). No stacked
penalties, no hint penalty. Show an itemized payout screen.

**Ledger advance:** if your balance is below the price of a required tool, Ledger fronts
the difference, repaid from your next payout, no interest. This prevents softlocks after
optional spending or a low-quality run.

### 8.3 Shop (R = required, O = optional)

**Tier 1 — Field kit (Act 1)**

| Tool | Cost | Req | Real world | Unlocks |
|------|------|-----|------------|---------|
| Wireshark | 150 ₡ | R | Free & open source | Pcap triage (Act 1 onward) |
| Netcat | 100 ₡ | R | Free / preinstalled | Listeners, catching reverse shells |
| theHarvester | 200 ₡ | R | Free & open source | OSINT harvesting |

**Tier 2 — Operator kit (Act 2)**

| Tool | Cost | Req | Real world | Unlocks |
|------|------|-----|------------|---------|
| Gobuster | 200 ₡ | R | Free & open source | Web path discovery |
| sqlmap | 300 ₡ | R | Free & open source | SQL-injection branch |
| Burp Suite | 350 ₡ | R | Community free · Pro commercial (check current pricing) | Web-attack branch |
| Snort | 350 ₡ | R | Free & open source (rulesets tiered) | IDS rule writing |
| Nikto | 250 ₡ | O | Free & open source | Web-server audit contracts |

**Tier 3 — Specialist kit (Act 3)**

| Tool | Cost | Req | Real world | Unlocks |
|------|------|-----|------------|---------|
| Sherlock | 250 ₡ | R (both) | Free & open source | Identity-resolution missions |
| Hydra | 400 ₡ | R (Red) | Free & open source | Brute-force missions |
| John the Ripper | 450 ₡ | R (Red) | Free & open source | Hash cracking |
| Sliver | 700 ₡ | R (Red) | Free & open source | C2 operations |
| Wazuh | 450 ₡ | R (Blue) | Free & open source | SOC alerting, file-integrity monitoring |
| Velociraptor | 500 ₡ | R (Blue) | Free & open source | Fleet hunting |
| Hashcat | 350 ₡ | O | Free & open source | Advanced cracking |
| Zeek | 400 ₡ | O | Free & open source | Network metadata analysis |

**Tier 4 — Senior kit (Act 4)**

| Tool | Cost | Req | Real world | Unlocks |
|------|------|-----|------------|---------|
| Volatility | 450 ₡ | R (both) | Free & open source | Memory forensics |
| Maltego | 450 ₡ | R (both) | Community free · Pro commercial | Link-graph attribution |
| Splunk / ELK | 500 ₡ | O | Free tiers · enterprise commercial | Log hunting at scale |

### 8.4 Earnings (first run, base payouts)

| Source | Base |
|--------|------|
| Act 1 (6 missions) | 720 ₡ |
| Act 2 (6 missions) | 1,500 ₡ |
| Act 3 (6 missions, same total on either track) | 2,550 ₡ |
| Act 4 (5 missions) | 3,000 ₡ |
| Finale (track finale 1,200 + The Mosaic 300) | 1,500 ₡ |
| **Main campaign** | **9,270 ₡** |

### 8.5 Affordability check (base payouts, required tools only)

| Act | Earned | Required spend (Red / Blue) | Balance after act (Red / Blue) |
|-----|--------|-----------------------------|--------------------------------|
| 1 | 720 | 450 / 450 | 270 / 270 |
| 2 | 1,500 | 1,200 / 1,200 | 570 / 570 |
| 3 | 2,550 | 1,800 / 1,200 | 1,320 / 1,920 |
| 4 | 3,000 | 900 / 900 | 3,420 / 4,020 |
| Finale | 1,500 | 0 / 0 | 4,920 / 5,520 |

**Tightest point:** Act 2 "Dump" (needs Gobuster + sqlmap = 500 ₡; balance beforehand
660 ₡, 160 ₡ spare, if nothing optional was bought). At the 0.85 floor the Ledger advance may
trigger there. Optional items total 1,500 ₡; cross-track tools cost 950 ₡ (Blue tools for Red)
or 1,550 ₡ (Red tools for Blue). Everything fits within the surplus.

---

## 9. Mission tree

30 authored missions; a single run plays 25. Format: objective · tools · tags · payout.

### Act 1 – The Knock (all players; starter kit plus Tier 1)

| # | Mission | Objective | Tools | Tags | ₡ |
|---|---------|-----------|-------|------|---|
| 1 | First Contact | Meet Ledger, tour the hub, first `nmap -sV` | nmap | T1595 | 80 |
| 2 | Paper Trail | Dork the grid operator's exposed maintenance doc | browser/dork sim | T1593 | 100 |
| 3 | The Mail Server | whois + DNS: identify mail infrastructure | shell | T1590, T1596 | 110 |
| 4 | Recon Console | msfconsole fluency on auxiliary scanners | msfconsole | T1595 | 130 |
| 5 | Twenty Alarms | Triage 20 alerts, find 3; spot your own scans in a pcap | Console, Wireshark | D3FEND | 140 |
| 6 | Knock Knock | Full service scan, first client report (attack surface) | nmap, msf | T1595 | 160 |

### Act 2 – The Breach (all players; Tier 2)

| # | Mission | Objective | Tools | Tags | ₡ |
|---|---------|-----------|-------|------|---|
| 1 | Harvest | Emails→subdomains→cert logs; find the dev server (note the odd second SAN) | theHarvester, cert-log sim | T1596, T1593 | 200 |
| 2 | First Blood | Exploit the dev server, catch your first shell | msfconsole, Netcat | T1190 | 280 |
| 3 | Intercept | Tamper the shop request, prove impact | Burp | T1190 | 260 |
| 4 | Dump | Find the admin path, extract the user table | Gobuster, sqlmap | T1190 | 240 |
| 5 | Patient Zero | IR: find the ransomware entry point, preserve evidence | Console, Wireshark | T1486 context | 260 |
| 6 | Block It | Write the C2 block rule | Snort | T1071 | 260 |

→ **Specialization contract: choose Red or Blue.** Trial 1 (raw mode) precedes it.

### Act 3 – The Wire (Tier 3; shared missions plus track missions)

| Track | Mission | Objective | Tools | Tags | ₡ |
|-------|---------|-----------|-------|------|---|
| Shared | The Dark Ship | AIS gap plus timestamps plus crew-post identity resolution | Sherlock | T1589 | 400 |
| Shared | The Honeytoken | Spot the planted key (GitHub dorking), avoid the trap | — | T1593 | 400 |
| Red | Migrate & Dump | Meterpreter post-ex | msfconsole | T1003, T1055 | 420 |
| Red | Pivot | `route add` into the inner network | msfconsole | T1090, T1021 | 440 |
| Red | The Callback | Catch and operate a Sliver C2 session | Sliver | T1071 | 440 |
| Red | Cracked | Crack the admin hash | Hydra, John | T1110 | 450 |
| Blue | Persisted | Hunt persistence from Rook's operation | Wazuh, Console | T1053, T1547 | 420 |
| Blue | Fleet Sweep | Hunt across the fleet | Velociraptor | D3FEND | 440 |
| Blue | Heartbeat | Detect C2 beaconing in traffic (interval regularity) | Wireshark | T1071 | 440 |
| Blue | Follow the Money | Trace ransom flows | chain-explorer sim | — | 450 |

→ **Trial 2 (raw mode)** closes the act.

### Act 4 – The Turn (both tracks; Tier 4)

| # | Mission | Objective | Tools | ₡ |
|---|---------|-----------|-------|---|
| 1 | Incoming | The summit network is hit with *your* playbook; model the kill chain, predict the next strike | Console | 550 |
| 2 | Packet Storm | Pcap triage under time pressure | Wireshark | 600 |
| 3 | Cold Memory | Find the injected process | Volatility | 650 |
| 4 | Hold the Line | Emergency rules with false-positive scoring | Snort | 600 |
| 5 | The Attribution | Infrastructure-overlap attribution; Rook's credentials appear | Maltego | 600 |

### Finale – Zero Day

- **Red finale:** weaponize the zero-day, full chain, raw mode, noise meter live (1,200 ₡)
- **Blue finale:** stop it with behavioral detection (1,200 ₡)
- **The Mosaic** (shared, 300 ₡): fuse ships, certs, crypto and social into one timeline.
  The **true ending needs Verified key links**, not a second playthrough.

### After the campaign
Cross-training contracts (the other track's Act 3 missions at base payout) and the
Practice Range remain available.

---

## 10. Technical plan

### 10.1 Platform
- Single self-contained web app (HTML/CSS/JS, no backend); runs from a file or static host.
- **Content is inlined or bundled** (not `fetch`ed JSON; browsers block `fetch` on `file://`).
- Saves in `localStorage` **plus export/import of a save string**.

### 10.2 World model (the core architecture)
One data-driven world feeds every tool simulator, so tools stay consistent and missions
are cheap to author.

```
world:
  hosts:     [{id, ip, os, in_scope, services:[{port, product, version, banner}]}]
  vulns:     [{id, host, service, exploit_ref}]
  creds:     [{user, hash, reuse_on:[host]}]
  network:   edges between hosts (for pivoting)
  defenses:  IDS rules, logging coverage, alert thresholds
  events:    append-only log of everything the player did
goals:       state predicates, e.g. session_open(dev01)
scope:       the Scope Card, evaluated against the event log
seed:        per-save value that varies lab flags and Practice Range worlds
```

Tool sims **read** the world and **write** to the event log. The event log drives the noise
meter, scope strikes, the Act 4 flip (what *you* exposed), and the reports.

### 10.3 Terminal engine
One emulator with per-tool personality modules (msfconsole, nmap, burp-proxy, tshark,
console-search, graph). Strict command validation, tab completion, history, real-style
errors. Generic UI for commercial tools (no replicated branding).

### 10.4 Testing and quality
- **Canonical solution transcript** per mission, run automatically so a content change can't
  silently break solvability.
- **Golden transcripts** captured from your real lab, used as fidelity fixtures for the sims.
- **Mission template** (brief, Scope Card, world fixture, goals, validators, canonical
  solution, lab assignment, report template, ATT&CK/D3FEND tags, primer, deck cards,
  journal prompts) and a definition-of-done checklist.
- **Local playtest log:** time-to-first-win, mission duration, stuck points.

### 10.5 Accessibility and look
Default phosphor-green on near-black, plus high-contrast, amber and light themes. Adjustable
font size, keyboard-first, reduced motion, **no meaning encoded in color alone** (labels and
icons). Optional ambient terminal hum, off by default.

### 10.6 Phasing

| Phase | Scope | Done when |
|-------|-------|-----------|
| **v0 slice** | Hub, wallet, world model, outcome validator, Nmap sim, evidence capture, write-up template, portfolio export; missions *First Contact*, *Paper Trail*, *Knock Knock* | You can finish three missions, do the labs, and export a real write-up |
| **v0.5** | Rest of Act 1; msfconsole sim; pcap viewer; Daily Drill; journal | Act 1 fully playable and drill-ready |
| **v1** | Acts 2–4, finale, all sims, Scope Cards, Trials, coverage map | Campaign complete |
| **Later** | Appendix A | Only if wanted |

**Lab-first rule:** the real lab assignments for an act must be doable the week that act
ships. **Time-box the engine:** if a tool sim exceeds a few days, cut it to the commands the
missions need and defer the rest. Building the sims also teaches protocol detail; treat that
as learning, not a prerequisite.

### 10.7 Legal and release notes
Use real tool names descriptively only. Check for collisions on the title before any public
release. Choose a repo license. Keep the game and portfolio free of real targets and
credentials.

---

## 11. Decisions and open questions

**Decided:** title **GREY HERON** · currency **Meridian Credits** · Rook is the
mid-campaign twist (compromised, not willing) · v0 is a 3-mission slice · audio is an
optional hum, off by default · hints are free · credits are pacing, not scarcity.

**Still open:**
1. Confirm or change the **truth** (Halden Maritime Group, the trawler, the compromised Rook).
2. **Lab build:** Kali + Metasploitable 2 as the baseline, and when to add other targets.
3. **Cert targets:** which of eJPT, Security+, PNPT, BTL1, CySA+ to aim at first.
4. **Publishing:** where the portfolio lives (GitHub repo, personal site) and the repo license.
5. **Metrics:** whether to track time spent per mission for your own planning.

---

## Appendix A — Deferred

New Game+ pure Red/Blue careers · seeded daily/weekly challenges and shareable score codes ·
leaderboards · mission editor and public schema · Active Directory / BloodHound branch ·
payout multiplier stacking and hint penalties · audio beyond the optional hum.
