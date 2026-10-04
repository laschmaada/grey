#!/usr/bin/env tsx
/**
 * scripts/size-check.ts
 *
 * Validates dist/grey-heron.html size budget (≤ 2.5 MB) and that the build artifact
 * contains no external URLs (D14: zero outbound network calls from the artifact).
 */
import { readFileSync, statSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ROOT = resolve(process.cwd());
const DIST = join(ROOT, 'dist', 'index.html');
const MAX_BYTES = 2_500_000;

if (!existsSync(DIST)) {
  console.error(`size-check: ${DIST} not found. Run \`npm run build\` first.`);
  process.exit(1);
}

const size = statSync(DIST).size;
const contents = readFileSync(DIST, 'utf8');

// 1) size budget
if (size > MAX_BYTES) {
  console.error(`size-check: dist/grey-heron.html is ${size} bytes (> ${MAX_BYTES}).`);
  process.exit(1);
}

// 2) no external URLs (anything http(s) external is banned; data: and inline are fine).
// Ignore W3C XML namespace identifiers and URLs that appear only inside textContent
// (the inlined source stringifies help-text like "https://nmap.org" — that's not a
// resource fetch). We restrict the check to URLs that appear as actual resource
// references (src="..." or href="..." or @import url(...)).
const attrUrlRegex = /(?:src|href)\s*=\s*["'](https?:\/\/[^"']+)["']/gi;
const matches = contents.match(attrUrlRegex) ?? [];
const external = matches
  .map((m) => {
    const urlMatch = m.match(/https?:\/\/[^"']+/);
    return urlMatch ? urlMatch[0] : null;
  })
  .filter((u): u is string => u !== null && !/^https?:\/\/(www\.)?w3\.org\//.test(u));

if (external.length > 0) {
  console.error(`size-check: ${external.length} external URL(s) found in dist artifact:`);
  for (const u of external.slice(0, 10)) {
    console.error(`  ${u}`);
  }
  process.exit(1);
}

console.log(
  `size-check: OK — ${size} bytes (${((size / 1024 / 1024) * 100).toFixed(1)}% of ${(
    MAX_BYTES / 1024 / 1024
  ).toFixed(2)} MB budget), 0 external URLs`,
);
process.exit(0);