# ADR-0009 — Vitest, transcript tests, coverage floors

**Decision:** Vitest. One transcript test per route per mission. Coverage floors:
core ≥ 85%, systems ≥ 80% (lines).

**Why:** Outcome-based validation. "Session opened" is a fact in the event log, not a
regex on stdout.

**Consequences:** Coverage is enforced by `vite.config.ts` thresholds.