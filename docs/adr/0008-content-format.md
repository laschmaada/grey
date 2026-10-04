# ADR-0008 — Content modules + prose as `?raw` Markdown

**Decision:** Structured data in TypeScript modules; prose in Markdown imported with Vite
`?raw`.

**Why:** Diffable. No JSON5 cleverness. TypeScript gives the compiler coverage.

**Consequences:** All strings the player reads (briefs, primers, report templates,
field text) are in Markdown files; never inline JSX strings.