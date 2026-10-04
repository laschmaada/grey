# Architecture (skeleton — fills in as milestones land)

## Layers (current boot)

```
src/
  core/      world model, types, RNG, clock, events, reducers, knowledge, goals, save
  engine/    tokenizer, registry, session, completion, output, personality, jobs
  sims/      per-tool emulators (M2+) — nmap, msf, tshark, snort, ...
  systems/   economy, quality, review, portfolio, zip, export-lint, ...
  content/   versions, tools, missions, truth
  ui/        Preact app + store
  test/      harness, transcripts, fixtures
scripts/    boundaries, content-lint, economy-check, size-check, repl, export-lint, contrast-check
```

## Boundaries

`scripts/boundaries.ts` enforces that `core/engine/sims/systems/content` do not import
the UI layer or touch DOM globals (`document`, `window`, `localStorage`, ...). ESLint
additionally bans `Date`, `Math.random`, `fetch`, `XMLHttpRequest`, `WebSocket`,
`EventSource`, `innerHTML` and `insertAdjacentHTML` in those layers.

## Save flow

UI store → 100% derivation from the event log → `save(profile, campaign, session?)` →
envelope `{ schemaVersion, contentHash, seed, profile, campaign, session? }` → base64url
JSON with checksum → localStorage (`greyheron.profile`) for the envelope metadata;
IndexedDB for evidence bytes.

## Mission render

### Milestone status
- **Boot**: M0–M4 — repo bootstrapped, headless core + nmap sim + web/dork sim + 3
  Act 1 missions wired, hub shell, portfolio export ZIP, lint gates.
- **Stubs**: M5–M9 — see `docs/deferred.md` for the cut rationale.