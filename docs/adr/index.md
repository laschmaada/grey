# Architecture Decision Records

| ID | Decision | Status | ADR |
|---|---|---|---|
| D1 | TypeScript `strict` + `noUncheckedIndexedAccess`; ES modules; no `any` without a comment | accepted | [0001](adr/0001-typescript-strict.md) |
| D2 | Vite + `vite-plugin-singlefile`; output `dist/index.html` | accepted | [0002](adr/0002-vite-singlefile.md) |
| D3 | Preact (hooks) with a small pub/sub store | accepted | [0003](adr/0003-preact-ui.md) |
| D4 | Custom DOM terminal with native `<input>` prompt; text rendered via `textContent` | accepted | [0004](adr/0004-custom-terminal.md) |
| D5 | Event-sourced state: campaign + session streams | accepted | [0005](adr/0005-event-sourced.md) |
| D6 | Deterministic virtual clock + scheduler; no `Date.now()` / `Math.random()` in core | accepted | [0006](adr/0006-virtual-clock.md) |
| D7 | Profile in `localStorage`; artifacts in IndexedDB with in-memory fallback | accepted | [0007](adr/0007-persistence.md) |
| D8 | TypeScript modules for structured data; prose as `?raw` Markdown | accepted | [0008](adr/0008-content-format.md) |
| D9 | Vitest; one transcript test per route per mission; coverage floors | accepted | [0009](adr/0009-testing.md) |
| D10 | In-house STORE-method ZIP writer + CRC32 | accepted | [0010](adr/0010-zip.md) |
| D11 | Tool versions are constants in `src/content/versions.ts` | accepted | [0011](adr/0011-versions.md) |
| D12 | Lab baseline: Kali + Metasploitable 2 (host-only) | accepted | [0012](adr/0012-lab-baseline.md) |
| D13 | License: MIT | accepted | [0013](adr/0013-mit.md) |
| D14 | Zero network requests; CSP meta tag; `innerHTML` ban | accepted | [0014](adr/0014-zero-network.md) |

## Reading order

1. **D14** (zero network) — what we are and are not allowed to do at the wire level.
2. **D6** (virtual clock) — the load-bearing determinism property.
3. **D5** (event-sourced) — the source-of-truth model.
4. **D2** (Vite singlefile) — how the simulator ships.
5. **D3** (Preact) — UI layer.
6. **D11** (versions) — what real tools are emulated at what version.
8. **D12** (lab baseline) — the transfer-to-reality handoff.

## Layout

```
docs/adr/
├── 0001-typescript-strict.md
├── 0002-vite-singlefile.md
├── 0003-preact-ui.md
├── 0004-custom-terminal.md
├── 0005-event-sourced.md
├── 0006-virtual-clock.md
├── 0007-persistence.md
├── 0008-content-format.md
├── 0009-testing.md
├── 0010-zip.md
├── 0011-versions.md
├── 0012-lab-baseline.md
├── 0013-mit.md
└── 0014-zero-network.md
```

Each ADR follows the format: **Context**, **Decision**, **Consequences**, with brief where-needed sections for rejected alternatives.