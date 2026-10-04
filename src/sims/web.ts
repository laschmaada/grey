/**
 * Web/dork sim (§4.1 M4-T01).
 *
 * Supports: `search <query>` (with site:/filetype:/intitle:/inurl: and quoted phrases),
 * `open <path>` (fetches a web node by path). The search returns ranked nodes whose
 * snippet/title/body contains all query terms. `site:` is matched against the path's
 * leading slash-prefix.
 */

export interface WebNodeLike {
  path: string;
  title: string;
  body?: string;
  snippet?: string;
}

export interface SearchQuery {
  terms: string[];
  quoted: string[];
  site?: string;
  filetype?: string;
  intitle?: string;
  inurl?: string;
}

/** Parse a dork-y query string into a SearchQuery. */
export function parseQuery(q: string): SearchQuery {
  const tokens = q.match(/"[^"]*"|\S+/g) ?? [];
  const out: SearchQuery = { terms: [], quoted: [] };
  for (const t of tokens) {
    if (t.startsWith('site:')) out.site = t.slice('site:'.length);
    else if (t.startsWith('filetype:')) out.filetype = t.slice('filetype:'.length);
    else if (t.startsWith('intitle:')) out.intitle = t.slice('intitle:'.length);
    else if (t.startsWith('inurl:')) out.inurl = t.slice('inurl:'.length);
    else if (t.startsWith('"') && t.endsWith('"')) out.quoted.push(t.slice(1, -1));
    else out.terms.push(t);
  }
  return out;
}

function nodeMatches(node: WebNodeLike, q: SearchQuery, site: string): boolean {
  const haystack = [node.title, node.body ?? '', node.snippet ?? '', node.path]
    .join(' ')
    .toLowerCase();
  for (const term of q.terms) {
    if (!haystack.includes(term.toLowerCase())) return false;
  }
  for (const phrase of q.quoted) {
    if (!haystack.includes(phrase.toLowerCase())) return false;
  }
  if (q.site && !site.includes(q.site)) return false;
  if (q.filetype && !node.path.endsWith('.' + q.filetype)) return false;
  if (q.intitle && !node.title.toLowerCase().includes(q.intitle.toLowerCase())) return false;
  if (q.inurl && !node.path.toLowerCase().includes(q.inurl.toLowerCase())) return false;
  return true;
}

void nodeMatches;

export function searchIndex(
  graph: { rootUrl?: string; nodes: WebNodeLike[] },
  q: SearchQuery,
): WebNodeLike[] {
  const site = q.site ? stripScheme(graph.rootUrl ?? '') : '';
  return graph.nodes.filter((n) => {
    const haystack = [n.title, n.body ?? '', n.snippet ?? '', n.path]
      .join(' ')
      .toLowerCase();
    for (const term of q.terms) {
      if (!haystack.includes(term.toLowerCase())) return false;
    }
    for (const phrase of q.quoted) {
      if (!haystack.includes(phrase.toLowerCase())) return false;
    }
    if (q.site && !site.includes(q.site)) return false;
    if (q.filetype && !n.path.endsWith('.' + q.filetype)) return false;
    if (q.intitle && !n.title.toLowerCase().includes(q.intitle.toLowerCase())) return false;
    if (q.inurl && !n.path.toLowerCase().includes(q.inurl.toLowerCase())) return false;
    return true;
  });
}

function stripScheme(u: string): string {
  return u.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
}