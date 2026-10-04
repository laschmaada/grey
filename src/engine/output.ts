/**
 * Output span model.
 *
 * Output is a list of typed spans — never raw HTML. The terminal view renders each
 * span via `textContent`. Pinnable spans are blocks the player can save as evidence.
 */

export type OutputSpan =
  | { kind: 'text'; text: string; color?: string }
  | { kind: 'pinnable'; id: string; text: string; label?: string }
  | { kind: 'link'; text: string; href: string };

export function span(text: string, color?: string): OutputSpan {
  return color ? { kind: 'text', text, color } : { kind: 'text', text };
}

export function pinnable(id: string, text: string, label?: string): OutputSpan {
  return label ? { kind: 'pinnable', id, text, label } : { kind: 'pinnable', id, text };
}

export function join(blocks: ReadonlyArray<ReadonlyArray<OutputSpan>>): OutputSpan[][] {
  return blocks.map((b) => [...b]);
}