/**
 * Session — prompt stack, history, completion, jobs table.
 *
 * The session is the runtime state of the terminal. It does NOT touch the DOM;
 * the UI renders spans by reading `history`. Output is captured via `dispatch`.
 */

import { tokenize } from './tokenizer.js';
import { allNames, get, type HandlerCtx } from './registry.js';
import { flagStatus, NOT_EMULATED, personalityFor } from './personality.js';
import type { OutputSpan } from './output.js';

export interface SessionOpts {
  clock: HandlerCtx['clock'];
  emit: HandlerCtx['emit'];
  knownFacts: Set<string>;
  writeFact: (k: string, v?: unknown) => void;
}

export class Session {
  history: string[] = [];
  historyCursor = -1;
  /** prompt stack: outer first, innermost last. */
  promptStack: string[] = ['$ '];
  jobs: Array<{ id: number; name: string; startedAt: number }> = [];
  private nextJobId = 1;

  constructor(public readonly opts: SessionOpts) {}

  pushPrompt(p: string): void {
    this.promptStack.push(p);
  }

  popPrompt(): string | undefined {
    return this.promptStack.pop();
  }

  currentPrompt(): string {
    const p = this.promptStack[this.promptStack.length - 1] ?? '$ ';
    return `${p}`;
  }

  /** Tab completion: returns candidates for the partial last token. */
  complete(line: string, _cursor: number): string[] {
    const tokens = tokenize(line);
    const last = tokens[tokens.length - 1] ?? '';
    if (tokens.length <= 1 && !line.endsWith(' ')) {
      return allNames().filter((n) => n.startsWith(last));
    }
    const cmd = tokens[0]!;
    const spec = get(cmd);
    if (spec) {
      return (Object.keys(spec.flags).filter((f) => f.startsWith(last)) ?? []).concat(
        spec.complete?.(last) ?? [],
      );
    }
    return [];
  }

  /** Dispatch a command line. Returns output spans. */
  async dispatch(line: string): Promise<OutputSpan[][]> {
    const trimmed = line.trim();
    if (trimmed.length === 0) return [];
    this.history.push(trimmed);
    this.historyCursor = this.history.length;

    const tokens = tokenize(trimmed);
    const cmd = tokens[0]!;
    const argv = tokens.slice(1);

    // shell built-ins
    if (cmd === 'help') return [this.helpOutput()];
    if (cmd === 'clear') return [];
    if (cmd === 'history') return [this.historyOutput()];
    if (cmd === 'echo') return [[{ kind: 'text', text: argv.join(' ') + '\n' }]];
    if (cmd === 'exit') return [[{ kind: 'text', text: 'logout\n' }]];
    if (cmd === 'man') return [this.manOutput(argv[0] ?? '')];

    const spec = get(cmd);
    if (!spec) {
      return [
        [
          {
            kind: 'text',
            text: `${cmd}: command not found. Try \`help\`.`,
          },
        ],
      ];
    }

    const flags = Object.keys(spec.flags);
    for (const tok of argv) {
      if (tok.startsWith('-')) {
        const status = flagStatus(cmd, tok);
        if (status === 'not-emulated') {
          return [
            [
              {
                kind: 'text',
                text: `${cmd}: option '${tok}' is ${NOT_EMULATED}.\n`,
              },
            ],
          ];
        }
      }
    }
    void flags;

    // invalid-option detection is per-tool; we rely on the handler's own parsing
    void personalityFor;

    const ctx: HandlerCtx = {
      clock: this.opts.clock,
      cwd: '/',
      emit: this.opts.emit,
      knownFacts: this.opts.knownFacts,
      writeFact: this.opts.writeFact,
    };
    try {
      return await spec.handle(argv, ctx);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return [[{ kind: 'text', text: `${cmd}: error: ${msg}\n` }]];
    }
  }

  /** Add a background job. */
  addJob(name: string): number {
    const id = this.nextJobId++;
    this.jobs.push({ id, name, startedAt: this.opts.clock.now() });
    return id;
  }

  private helpOutput(): OutputSpan[] {
    const lines = [
      'GREY HERON — emulated terminal. Available commands:',
      '  help                show this message',
      '  man <tool>          short blurb for a tool',
      '  clear               clear screen (UI-only)',
      '  history             show command history',
      '  echo <text>         print text',
      '  nmap [opts] [target] service/version scan (emulated)',
      '  msfconsole [-q]     open msfconsole prompt (emulated)',
      '  exit                leave current prompt',
    ];
    return lines.map((l) => ({ kind: 'text' as const, text: l + '\n' }));
  }

  private manOutput(tool: string): OutputSpan[] {
    if (!tool) return [{ kind: 'text', text: 'What manual page do you want?\n' }];
    return [{ kind: 'text', text: personalityFor(tool).blurb + '\n' }];
  }

  private historyOutput(): OutputSpan[] {
    return this.history.map((h, i) => ({
      kind: 'text' as const,
      text: `  ${(i + 1).toString().padStart(4)}  ${h}\n`,
    }));
  }
}