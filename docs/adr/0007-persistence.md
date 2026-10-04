# ADR-0007 — Persistence: localStorage + IndexedDB

**Decision:** Profile in `localStorage` (`greyheron.profile`); artifacts (evidence
pinnables) in IndexedDB with an in-memory fallback. Save envelope has `schemaVersion`,
`contentHash`, migration registry.

**Why:** Single-file build with no server. localStorage is fine for the small profile;
evidence blobs go to IndexedDB.

**Consequences:** Quota errors are caught and surfaced. A `contentHash` mismatch warns
and replays only the campaign stream's derived facts.