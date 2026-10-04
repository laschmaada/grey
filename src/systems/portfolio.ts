/**
 * Portfolio export (M4-T06).
 *
 * Builds the ZIP and writes it via Blob (browser) / Buffer (Node REPL).
 */

import { writeZip, type ZipEntry } from './zip.js';
import { lint, type LintFinding } from './exportlint.js';

export interface PortfolioFile {
  path: string;
  content: string;
}

export interface PortfolioInput {
  readme: string;
  attackCoverage: string;
  writeups: PortfolioFile[];
  detections: PortfolioFile[];
  lab: PortfolioFile[];
  journal: string;
  certs: string;
  /** campaign seed, written into the export for reproducibility */
  seed: number;
}

export interface PortfolioResult {
  zipBytes: Uint8Array;
  files: ReadonlyArray<ZipEntry>;
  findings: ReadonlyArray<LintFinding>;
}

const TEXT = (s: string): Uint8Array => new TextEncoder().encode(s);

export function buildPortfolio(input: PortfolioInput): PortfolioResult {
  const files: ZipEntry[] = [
    { name: 'README.md', content: TEXT(input.readme) },
    { name: 'attack-coverage.md', content: TEXT(input.attackCoverage) },
    { name: 'journal.md', content: TEXT(input.journal) },
    { name: 'certs.md', content: TEXT(input.certs) },
  ];
  for (const w of input.writeups) files.push({ name: `writeups/${w.path}`, content: TEXT(w.content) });
  for (const d of input.detections) files.push({ name: `detections/${d.path}`, content: TEXT(d.content) });
  for (const l of input.lab) files.push({ name: `lab/${l.path}`, content: TEXT(l.content) });

  // Lint the combined text content for export-time warnings.
  const all = [
    input.readme,
    input.attackCoverage,
    input.journal,
    input.certs,
    ...input.writeups.map((f) => f.content),
    ...input.detections.map((f) => f.content),
    ...input.lab.map((f) => f.content),
  ].join('\n\n');
  const findings = lint(all);

  const zipBytes = writeZip(files);
  return { zipBytes, files, findings };
}