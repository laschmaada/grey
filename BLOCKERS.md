# BLOCKERS

Tracking failures, scope cuts, and items deferred per CODING_PLAN §10.

## Active

_None at this time._

## Deferred (scope-cut ladder)

- **M5+** — Act 2 sims (msfconsole prompt stack, traffic generator + pcap writer, tshark
  display-filter subset, Snort rule engine, Burp proxy panel, gobuster/sqlmap, hydra/john,
  meterpreter, sliver, wazuh/velociraptor, AIS, sherlock, maltego, volatility, adversary model).
  Reason: M0–M4 contract (§11) only requires the v0.1 gate (G4) to pass. M5–M9 are
  scheduled for v0.2/v1.0. The shape (mission registry, missions stub list, mission
  templates where the schema is needed for content-lint) is in place; the engines are not.

## Workaround log

- **vite-plugin-singlefile output name**: the plan specified `grey-heron.html` but the
  conventional singlefile output is `dist/index.html`. Standardised on `dist/index.html`
  for Pages deploy and from-`file://` boot. Recorded in `_DEV_APOLOGIES` and CHANGELOG.
- **ESLint `Math.random` detection**: ESLint's `no-restricted-globals` rejects the
  identifier `Math` (would break `Math.floor`, etc.). Plan narrowed the ban to a
  custom check via `boundaries.ts` for `Math.random` and ESLint comment `// eslint`
  hints in source where a math call is needed.
- **size-check w3.org matches**: XML namespace identifiers (`http://www.w3.org/2000/svg`)
  appear inside the inlined HTML; they are not network calls (CSP `connect-src 'none'`
  blocks actual fetch). Size-check allowlists `w3.org` and only fails on real http(s).