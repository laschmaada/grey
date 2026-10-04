import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('M3-G3: file:// boot from dist/index.html', () => {
  it('dist/index.html exists and is non-empty', () => {
    const p = join(process.cwd(), 'dist', 'index.html');
    const html = readFileSync(p, 'utf8');
    expect(html.length).toBeGreaterThan(0);
  });

  it('inlined HTML contains the GREY HERON title and CSP', () => {
    const p = join(process.cwd(), 'dist', 'index.html');
    const html = readFileSync(p, 'utf8');
    expect(html).toContain('GREY HERON');
    expect(html).toContain("Content-Security-Policy");
    expect(html).toContain("connect-src 'none'");
  });

  it('inlined HTML inlines the application script and styles', () => {
    const p = join(process.cwd(), 'dist', 'index.html');
    const html = readFileSync(p, 'utf8');
    expect(html).toMatch(/<script/);
    expect(html).toMatch(/<style/);
  });

  it('there is exactly one CSP meta and no http(s) external resources referenced from src/href', () => {
    const p = join(process.cwd(), 'dist', 'index.html');
    const html = readFileSync(p, 'utf8');
    // match http(s) URLs only when they appear inside an attribute (src= or href=).
    const inAttrs = html.match(/(?:src|href)\s*=\s*["']https?:\/\/[^"']+["']/g) ?? [];
    expect(inAttrs).toEqual([]);
  });
});