# ADR-0011 — Tool version constants

**Decision:** Emulated tool versions are constants in `src/content/versions.ts`.

**Why:** Tests can pin on a stable version string. The literal numbers are mockable per
golden later.

**Consequences:** Nmap 7.94, MSF 6.4.x, Snort 3.1.x, Volatility 3.2.x, Wireshark 4.2.x.