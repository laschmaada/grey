# ADR-0002 — Vite + singlefile

**Decision:** Vite for dev/build, `vite-plugin-singlefile` to inline all assets into one
HTML file at `dist/index.html`.

**Why:** Single-file is the simplest deploy target. Works from `file://`, Pages, any
static host. No backend.

**Consequences:** CSS inlined in `<style>` and JS in `<script>`. `unsafe-inline`
required in the CSP `style-src` and `script-src`. Bundle cap: 2.5 MB.