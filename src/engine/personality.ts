/**
 * Per-tool usage text and "not emulated" messages.
 *
 * The simulator never copies man pages or vendor docs. All text is original.
 */

import { get } from './registry.js';

export const NOT_EMULATED = 'not emulated in this simulator — see field manual';

export interface ToolPersonality {
  /** short blurb shown by `man <tool>` */
  blurb: string;
  /** error message for an invalid option (never the real tool's wording) */
  invalidOption(name: string): string;
  /** error message for an unknown option */
  unknownOption(name: string): string;
}

function blurbFor(tool: string): string {
  return tool === 'nmap'
    ? 'nmap — Network exploration and security auditing. (Emulated; no real network calls.)'
    : tool === 'msfconsole'
      ? 'msfconsole — Metasploit framework console. (Emulated prompt stack; no live modules.)'
      : `${tool} — emulated; see field manual.`;
}

export function personalityFor(tool: string): ToolPersonality {
  return {
    blurb: blurbFor(tool),
    invalidOption: (n: string) => `${tool}: invalid option -- '${n.replace(/^-/, '')}'`,
    unknownOption: (n: string) =>
      `${tool}: unknown option '${n}'. Try \`--help\` or \`man ${tool}\`.`,
  };
}

/** Predicate: did the user pass an unsupported flag? */
export function flagStatus(tool: string, flag: string): 'emulated' | 'accepted-noop' | 'not-emulated' {
  const spec = get(tool);
  if (spec && flag in spec.flags) {
    return spec.flags[flag]!;
  }
  if (flag === '-h' || flag === '--help') return 'emulated';
  return 'not-emulated';
}