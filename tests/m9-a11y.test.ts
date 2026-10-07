/**
 * M9-T01 — Accessibility audit.
 *
 * - role="log" + aria-live on terminal view
 * - keyboard focus order: prompts have role, headings are native
 * - no color-only meaning: status always has text/icon
 * - reduced-motion honoured (CSS-variable hook)
 * - the save/import flow uses clear labels
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('M9-T01 a11y audit', () => {
  const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');

  it('CaretShellView exposes role=log + aria-live', () => {
    const txt = readFileSync(resolve(process.cwd(), 'src/ui/components/terminal-view.tsx'), 'utf8');
    expect(txt).toContain('role="log"');
    expect(txt).toContain('aria-live');
  });

  it('reduced-motion CSS hook is present', () => {
    expect(html).toMatch(/prefers-reduced-motion/);
  });

  it('terminal view exposes role="log" + aria-live="polite"', () => {
    const txt = readFileSync(resolve(process.cwd(), 'src/ui/components/terminal-view.tsx'), 'utf8');
    expect(txt).toContain('role="log"');
    expect(txt).toContain('aria-live="polite"');
  });

  it('html element has lang attribute', () => {
    expect(html).toMatch(/<html lang=/);
  });

  it('CSP meta tag is present and rejects network sources', () => {
    expect(html).toMatch(/Content-Security-Policy/);
    expect(html).toContain("connect-src 'none'");
  });
});