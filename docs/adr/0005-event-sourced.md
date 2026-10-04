# ADR-0005 — Event-sourced state

**Decision:** Two streams: `campaign` (committed events of finished missions) and
`session` (current attempt). Success commits session → campaign; retry discards.

**Consequences:** Save envelope = `{ schemaVersion, contentHash, seed, profile, campaign,
session? }`. Replay is equality-tested in M1-T03.