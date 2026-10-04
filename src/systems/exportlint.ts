/**
 * Export linter — M4-T07.
 *
 * Scans text for: public IPs (outside RFC 1918 / 5737 / loopback / link-local),
 * non-reserved hostnames, non-reserved emails, key-like strings.
 */

const RESERVED_TLDS: string[] = ['.test', '.example', '.invalid', '.localhost'];
void RESERVED_TLDS;

const RFC1918 = [/^10\./, /^172\.(1[6-9]|2[0-9]|3[01])\./, /^192\.168\./];
const DOC_RANGES = [/^192\.0\.2\./, /^198\.51\.100\./, /^203\.0\.113\./];
const LOOPBACK = [/^127\./, /^::1$/, /^0\.0\.0\.0$/];
const LINK_LOCAL = [/^169\.254\./, /^fe80:/];

function isReserved(ip: string): boolean {
  return [...RFC1918, ...DOC_RANGES, ...LOOPBACK, ...LINK_LOCAL].some((r) => r.test(ip));
}

export interface LintFinding {
  kind: 'public-ip' | 'public-hostname' | 'public-email' | 'key-like';
  match: string;
  reason: string;
}

const IP_RE = /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g;
const ANY_HOSTNAME_RE = /\b(?:[a-z0-9-]+\.)+(?:com|org|net|io|co|biz|gov|edu|info|app|dev|me|us|uk|de|fr|jp|cn|ru|br|in|au|ca|eu|nl|es|it|pl|se|ch|at|be|tr|kr|tw|hk|sg|mx|za|ng|ke|cl|pe|ve|ar|co\.uk|com\.au|co\.jp|co\.kr)\b/gi;
const RESERVED_TLD_RE = /\.(?:test|example|invalid|localhost)$/i;
const ANY_EMAIL_RE = /\b[a-z0-9._%+-]+@[a-z0-9.-]+\.(?:com|org|net|io|co|biz|gov|edu|info|app|dev|me|us|uk|de|fr|jp|cn|ru|br|in|au|ca|eu|nl|es|it|pl|se|ch|at|be|tr|kr|tw|hk|sg|mx|za|ng|ke|cl|pe|ve|ar|co\.uk|com\.au|co\.jp|co\.kr)\b/gi;
const KEY_RE = /\b(?:[A-Za-z0-9+/]{32,}={0,2})\b/g; // base64-ish blobs

export function lint(text: string): LintFinding[] {
  const out: LintFinding[] = [];

  // IPs
  for (const m of text.matchAll(IP_RE)) {
    const v = m[0]!;
    if (!isReserved(v)) {
      out.push({ kind: 'public-ip', match: v, reason: 'not in RFC 1918 / 5737 / loopback / link-local' });
    }
  }

  // Hostnames / emails — scan broadly, then check whether each is reserved.
  for (const m of text.matchAll(ANY_EMAIL_RE)) {
    const v = m[0]!;
    if (!RESERVED_TLD_RE.test(v)) {
      out.push({ kind: 'public-email', match: v, reason: 'email not under .test/.example/.invalid' });
    }
  }
  for (const m of text.matchAll(ANY_HOSTNAME_RE)) {
    const v = m[0]!;
    if (!RESERVED_TLD_RE.test(v)) {
      // Ignore common false positives (file extensions like "scan.txt")
      const tail = v.split('.').slice(-1)[0]!;
      if (/^[a-z]{2,}$/.test(tail)) {
        out.push({ kind: 'public-hostname', match: v, reason: 'hostname not under reserved TLD' });
      }
    }
  }

  // Key-like
  for (const m of text.matchAll(KEY_RE)) {
    const v = m[0]!;
    if (v.length >= 40) {
      out.push({ kind: 'key-like', match: v.slice(0, 16) + '…', reason: 'long base64-ish blob — possible key/secret' });
    }
  }

  return out;
}