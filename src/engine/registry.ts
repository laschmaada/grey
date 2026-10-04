/**
 * Command registry — wires a tool name to its handler. Sessions dispatch through here.
 */

import type { OutputSpan } from './output.js';

export interface CommandSpec {
  name: string;
  /** Emulated flags. Unknown flags → not-emulated (handled in personality). */
  flags: Record<string, 'emulated' | 'accepted-noop' | 'not-emulated'>;
  /** Optional completion for `complete(line, cursor)`. */
  complete?(partial: string): string[];
  /** Handler. argv excludes the command name. Returns typed output spans. */
  handle: (argv: string[], ctx: HandlerCtx) => Promise<OutputSpan[][]> | OutputSpan[][];
}

export interface HandlerCtx {
  /** virtual clock — read or advance. */
  clock: { now(): number; advance(ms: number): void };
  /** working dir (always '/' in the simulator) */
  cwd: string;
  /** emit an event into the campaign/session log */
  emit: (type: string, payload: Record<string, unknown>) => void;
  /** knowledge layer — keys you can read/write */
  knownFacts: Set<string>;
  writeFact(key: string, value?: unknown): void;
}

const registry = new Map<string, CommandSpec>();

export function register(cmd: CommandSpec): void {
  registry.set(cmd.name, cmd);
}

export function get(name: string): CommandSpec | undefined {
  return registry.get(name);
}

export function allNames(): string[] {
  return [...registry.keys()];
}