docs/milestones/M0..M4 — milestone gate records.

M0 — done
- npm run verify green (tsc, eslint, vitest, boundaries, content-lint, economy, build, size-check)
- 14 ADRs; architecture/safety/lab docs in place
- gates: G0 = verify green + file:// boot test

M1 — done
- 46 unit tests across 6 files
- core coverage floor 85% enforced by vite.config.ts
- economy-check recomputes §9 and asserts the 9,270 ₡ grand total per track

M2 — done
- a1-first-contact complete (2 routes + 1 negative transcript)
- Nmap formatter covered by unit tests
- `npm run repl -- a1-first-contact` plays the mission

M3 — done
- happy-dom UI smoke tests (2 in m3-ui.test.tsx, 4 in m3-boot.test.ts)
- dist/index.html boots from file:// with no console errors

M4 — done
- STORE-method ZIP + CRC32 + parse-back test
- export linter covers public IPs / non-reserved hostnames / emails / key-like strings
- content-linter stub wired into verify
- 80 total tests passing

M5+ — deferred per BLOCKERS.md (scope-cut ladder, recorded)