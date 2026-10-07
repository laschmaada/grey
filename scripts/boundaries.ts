#!/usr/bin/env tsx
/**
 * scripts/boundaries.ts
 *
 * Enforces that core/engine/sims/systems/content do NOT import the UI layer or touch the DOM.
 * This complements the ESLint D6/D14 bans and catches cross-layer leaks at build time.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const LAYERS = [
  'src/core',
  'src/engine',
  'src/sims',
  'src/systems',
  'src/content',
] as const;

const FORBIDDEN_IMPORTS = [
  /\.\.\/\.\/\.\.\/ui\//,
  /\.\.\/\.\/ui\//,
  /\.\.\/ui\//,
  /from\s+['"]@ui\//,
  /from\s+['"]preact['"]/,
  /from\s+['"]react['"]/,
  /from\s+['"]react-dom['"]/,
];

// Avoid matching identifier `window` in identifier context. We want a `\bwindow.` member access.
const FORBIDDEN_GLOBALS = [
  /\bdocument\b/,
  /\bwindow\.\w/,
  /\bnavigator\.\w/,
  /\blocalStorage\b/,
  /\bsessionStorage\b/,
  /\bindexedDB\b/,
  /\bhistory\.(push|replace)State\b/,
  /\blocation\b/,
];

type Violation = { file: string; line: number; rule: string; snippet: string };

function walk(dir: string, out: string[] = []): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      walk(full, out);
    } else if (/\.(ts|tsx|js|mjs|cjs)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

function checkFile(path: string): Violation[] {
  const rel = relative(ROOT, path).replace(/\\/g, '/');
  const src = readFileSync(path, 'utf8');
  const lines = src.split('\n');
  const violations: Violation[] = [];

  // Skip "strings" within each line so that words like `document` or `window`
// inside user-facing help text don't trip the global checks. We strip out
// string-literal content before applying the regex.
function stripStrings(line: string): string {
  return line
    .replace(/'(?:\\.|[^'\\])*'/g, "''")
    .replace(/"(?:\\.|[^"\\])*"/g, '""')
    .replace(/`(?:\\.|[^`\\])*`/g, '``');
}

for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    // Skip comment-only lines for clearer diagnostics
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) {
      continue;
    }
    const codeLine = stripStrings(line);

    for (const pattern of FORBIDDEN_IMPORTS) {
      if (pattern.test(line)) {
        violations.push({
          file: rel,
          line: i + 1,
          rule: 'no-ui-import',
          snippet: line.trim(),
        });
      }
    }

    // Global checks only on non-comment lines, only in source files (not test harness)
    for (const pattern of FORBIDDEN_GLOBALS) {
      if (pattern.test(codeLine)) {
        violations.push({
          file: rel,
          line: i + 1,
          rule: 'no-dom-access',
          snippet: line.trim(),
        });
      }
    }
  }
  return violations;
}

function main(): void {
  const all: Violation[] = [];
  for (const layer of LAYERS) {
    const dir = join(ROOT, layer);
    for (const file of walk(dir)) {
      all.push(...checkFile(file));
    }
  }
  if (all.length === 0) {
    console.log('boundaries: OK');
    process.exit(0);
  }
  console.error(`boundaries: ${all.length} violation(s)`);
  for (const v of all) {
    console.error(`  ${v.file}:${v.line}  [${v.rule}]  ${v.snippet}`);
  }
  process.exit(1);
}

main();