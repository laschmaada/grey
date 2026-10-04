/**
 * §4.1 — Tokenizer.
 *
 * Splits a command line into argv with quote and escape handling:
 *   "nmap -sV 'host 1' 10.0.0.1"  →  ["nmap", "-sV", "host 1", "10.0.0.1"]
 *   "echo \"a\\\"b\""                 →  ["echo", "a\"b"]
 * Backslash escapes the next character (only meaningful inside double-quotes).
 * Single quotes are literal — no escapes inside.
 */

export type Token = string;

export function tokenize(input: string): Token[] {
  const out: Token[] = [];
  let cur = '';
  let inSingle = false;
  let inDouble = false;
  let escape = false;

  for (let i = 0; i < input.length; i++) {
    const c = input[i]!;
    if (escape) {
      cur += c;
      escape = false;
      continue;
    }
    if (c === '\\' && inDouble) {
      escape = true;
      continue;
    }
    if (c === "'" && !inDouble) {
      inSingle = !inSingle;
      continue;
    }
    if (c === '"' && !inSingle) {
      inDouble = !inDouble;
      continue;
    }
    if (!inSingle && !inDouble && /\s/.test(c)) {
      if (cur.length > 0) {
        out.push(cur);
        cur = '';
      }
      continue;
    }
    cur += c;
  }
  if (cur.length > 0) out.push(cur);
  return out;
}

/** Common predicate: is this token a "flag"? */
export function isFlag(t: string): boolean {
  return t.startsWith('-') && t.length > 1;
}