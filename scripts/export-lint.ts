#!/usr/bin/env tsx
/**
 * scripts/export-lint.ts — run on a file or directory of artefacts.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { lint } from '../src/systems/exportlint.js';

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const target = process.argv[2];
if (!target) {
  console.error('usage: npm run export-lint -- <file-or-dir>');
  process.exit(1);
}
const s = statSync(target);
const files = s.isDirectory() ? walk(target) : [target];
let total = 0;
for (const f of files) {
  const txt = readFileSync(f, 'utf8');
  const findings = lint(txt);
  if (findings.length > 0) {
    console.log(`${f}:`);
    for (const x of findings) console.log(`  [${x.kind}] ${x.match} — ${x.reason}`);
    total += findings.length;
  }
}
console.log(`export-lint: ${total} finding(s) across ${files.length} file(s)`);
process.exit(total === 0 ? 0 : 1);