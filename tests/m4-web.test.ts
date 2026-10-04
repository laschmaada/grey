import { describe, it, expect } from 'vitest';
import { parseQuery, searchIndex } from '../src/sims/web.js';

const NODES = [
  {
    path: '/about.html',
    title: 'About Meridian Risk',
    body: 'A boutique consultancy in Ostmark.',
    snippet: 'About Meridian',
  },
  {
    path: '/papers/greyheron.pdf',
    title: 'GREY HERON whitepaper',
    body: 'A short whitepaper on AIS gaps.',
    snippet: 'AIS gaps',
  },
  {
    path: '/jobs/index.html',
    title: 'Careers',
    body: 'Send CV to jobs@example.test',
    snippet: 'jobs',
  },
];

describe('M4-T01: web/dork sim', () => {
  it('matches simple terms', () => {
    const r = searchIndex({ nodes: NODES }, parseQuery('about'));
    expect(r.map((n) => n.path)).toContain('/about.html');
  });

  it('quoted phrases match exactly', () => {
    const r = searchIndex({ nodes: NODES }, parseQuery('"AIS gaps"'));
    expect(r.map((n) => n.path)).toContain('/papers/greyheron.pdf');
  });

  it('site: filter restricts to a path prefix', () => {
    const r = searchIndex(
      { rootUrl: 'http://example.test/', nodes: NODES },
      parseQuery('site:example.test'),
    );
    expect(r.map((n) => n.path)).toContain('/about.html');
  });

  it('filetype: restricts to extension', () => {
    const r = searchIndex({ nodes: NODES }, parseQuery('filetype:pdf'));
    expect(r.map((n) => n.path)).toEqual(['/papers/greyheron.pdf']);
  });

  it('intitle: matches the title', () => {
    const r = searchIndex({ nodes: NODES }, parseQuery('intitle:Careers'));
    expect(r.map((n) => n.path)).toContain('/jobs/index.html');
  });

  it('inurl: matches a path substring', () => {
    const r = searchIndex({ nodes: NODES }, parseQuery('inurl:jobs'));
    expect(r.map((n) => n.path)).toContain('/jobs/index.html');
  });

  it('parseQuery classifies each token', () => {
    const q = parseQuery('site:example.test intitle:foo "AIS gaps" bar');
    expect(q.site).toBe('example.test');
    expect(q.intitle).toBe('foo');
    expect(q.quoted).toEqual(['AIS gaps']);
    expect(q.terms).toEqual(['bar']);
  });
});