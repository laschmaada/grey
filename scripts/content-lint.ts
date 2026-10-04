#!/usr/bin/env tsx
/**
 * scripts/content-lint.ts
 *
 * M0 stub. Becomes a real checker in M4-T08. For now it just confirms the tools/shop
 * registries and mission stubs exist and conform to shape.
 */
import { existsSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ROOT = resolve(process.cwd());
const required = [
  'src/content/tools.ts',
  'src/content/shop.ts',
  'src/content/missions.ts',
  'src/content/versions.ts',
];

const missing = required.filter((p) => !existsSync(join(ROOT, p)));
if (missing.length > 0) {
  console.error(`content-lint: missing files: ${missing.join(', ')}`);
  process.exit(1);
}

console.log(`content-lint: OK (stub, full checks land in M4-T08)`);
process.exit(0);