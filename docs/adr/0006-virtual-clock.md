# ADR-0006 — Deterministic virtual clock

**Decision:** Core uses a virtual clock + scheduler. No `Date.now()` / `Math.random()`
in core/engine/sims/systems/content (lint-enforced; ESLint blocks `Date` identifier;
boundaries.ts also flags `Math.random` and DOM access).

**Why:** Missions must replay from a seed deterministically. Real time would make
transcript tests flaky and pcap ordering non-reproducible.

**Consequences:** The UI offers "fast-forward"; tests `clock.advance(ms)`.