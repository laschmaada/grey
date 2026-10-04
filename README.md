# GREY HERON

A story-driven, browser-based simulator that teaches real offensive, defensive and OSINT skills — Metasploit-first — and turns everything you do into portfolio evidence.

> **Status:** v0.1 (M4). The M0–M4 gates pass; M5+ work is tracked in `PROGRESS.md`.

## Quickstart

```bash
npm install
npm run dev          # local dev
npm run build        # produces dist/grey-heron.html
npm run verify       # typecheck + lint + tests + gates
npm run repl -- a1-first-contact
```

Open `dist/grey-heron.html` directly from `file://` — no server required.

## What it is

A **simulator**, not a tool. No real scanning, no working exploits, no network. Everything you run is emulated against an in-memory world model seeded with fictional infrastructure (reserved IPs and `.test`/`.example`/`.invalid` domains). Field assignments in each mission tell you how to practise the same operation in your own lab.

## Lab setup

See [`docs/lab/BUILD.md`](docs/lab/BUILD.md) for the Kali + Metasploitable 2 host-only setup. Capturing golden outputs for fixtures: [`docs/lab/CAPTURE_GOLDEN.md`](docs/lab/CAPTURE_GOLDEN.md).

## Mission index, story truth, economy

- [`DESIGN.md`](DESIGN.md) — game design
- [`CODING_PLAN.md`](CODING_PLAN.md) — engineering plan
- [`docs/architecture.md`](docs/architecture.md)
- [`docs/milestones/`](docs/milestones/)

## Safety

The product is a **simulator**. It contains no working exploit code, no real scanning or network tooling, and no outbound network requests. All identifiers are reserved for documentation. See [`docs/safety.md`](docs/safety.md).

## License

MIT — see [`LICENSE`](LICENSE).