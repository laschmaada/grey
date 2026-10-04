import { TOOLS, type ToolDef } from './tools.js';

export interface ShopListing {
  tool: ToolDef;
  available: boolean;
  lockedReason?: string;
}

/**
 * Returns the shop view for a profile with the given purchased keys.
 * `required` flags surface the R markers per §9.
 */
export function shopView(purchased: ReadonlySet<string>): ShopListing[] {
  return TOOLS.map((tool) => {
    if (tool.cost === 0) {
      return { tool, available: true };
    }
    if (purchased.has(tool.key)) {
      return { tool, available: false, lockedReason: 'owned' };
    }
    return { tool, available: true };
  });
}

export function totalRequiredForAct(
  act: number,
  purchased: ReadonlySet<string>,
): number {
  // The required-spend table per §9 (one row per act).
  const requiredByAct: Record<number, string[]> = {
    1: ['wireshark', 'theharvester'],
    2: ['wireshark', 'netcat', 'theharvester', 'burp', 'gobuster', 'sqlmap', 'snort'],
    3: [], // track-gated, computed in M1-T11
    4: ['volatility', 'maltego'],
  };
  const keys = requiredByAct[act] ?? [];
  return keys
    .filter((k) => !purchased.has(k))
    .map((k) => TOOLS.find((t) => t.key === k)?.cost ?? 0)
    .reduce((a, b) => a + b, 0);
}