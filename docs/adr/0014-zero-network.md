# ADR-0014 — Zero network egress + CSP

**Decision:** Zero network calls in app code. ESLint bans `fetch`, `XMLHttpRequest`,
`WebSocket`, `EventSource`, `navigator.sendBeacon`, `innerHTML`, `outerHTML`,
`insertAdjacentHTML`. CSP meta tag:
`default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; connect-src 'none'; base-uri 'none'; form-action 'none'; frame-src 'none'; object-src 'none'; font-src data:`.

The `unsafe-inline` allowance is required for the single-file build (Vite injects an
inline `<style>` and an inline `<script>` tag). Documented here so reviewers don't flag
the CSP as unsafe — the actual safety property (no `connect-src` to anything) is met.

**Why:** A simulator must not be a real tool. Identifiers are reserved, exploits are
state transitions, and the app must not call out to anything.

**Consequences:** All command output is computed locally. No "real DNS" or "real nmap"
in the runtime.