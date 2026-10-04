# ADR-0003 — Preact UI, framework-free core

**Decision:** Preact (hooks) for UI; core/engine/sims/systems/content are framework-free.

**Why:** The simulation logic is the product; UI is a thin shell. Keeping core free of
Preact prevents accidental DOM coupling and makes the engine testable in happy-dom/node.

**Consequences:** State plumbing between layers uses plain TS events / pub-sub. UI store is
in `src/ui/store.ts`.