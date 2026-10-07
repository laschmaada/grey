/**
 * Terminal view — Preact component.
 *
 * Renders like a real terminal:
 *   - `<pre role="log" aria-live="polite">` so `\n` and indentation survive
 *   - each user command is echoed as `prompt command\n` before its output
 *   - each output block is followed by a blank line so multi-block output
 *     (e.g. nmap's header + table + summary) reads as separate visual blocks
 *   - the input row at the bottom shows the current prompt (from the
 *     session's prompt-stack state — shell → msf → module → meterpreter)
 *   - Tab completion, history (↑/↓), Ctrl-C (cancel current input),
 *     Ctrl-L (clear screen), Ctrl-U (kill line), click-to-pin pinnable spans
 *
 * Rendering uses `textContent` only. No `innerHTML` / `outerHTML` /
 * `insertAdjacentHTML` (D14). Pinnable spans are styled via inline
 * element.style.color / cursor (allowed by the D14 ban — those are
 * DOM property setters, not HTML insertion).
 */

import { useEffect, useRef, useState } from 'preact/hooks';
import { Session } from '../../engine/session.js';
import type { OutputSpan } from '../../engine/output.js';
import type { UiStore } from '../store.js';

export interface TerminalProps {
  session: Session;
  store: UiStore;
  /** Called when the user clicks a pinnable span. */
  onPin?: (id: string, text: string) => void;
}

interface LogEntry {
  /** "input" echoes the prompt + command the player entered; "output" is what the sim printed */
  kind: 'input' | 'output';
  /** for "input" entries: the typed text */
  text: string;
  /** for "output" entries: the spans to render */
  spans: OutputSpan[];
}

export function TerminalView(props: TerminalProps) {
  const [log, setLog] = useState<LogEntry[]>([]);
  const [input, setInput] = useState('');
  const [historyCursor, setHistoryCursor] = useState(-1);
  const [completions, setCompletions] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const logRef = useRef<HTMLPreElement | null>(null);

  // Greet on first mount.
  useEffect(() => {
    setLog([
      {
        kind: 'output',
        text: '',
        spans: [
          {
            kind: 'text',
            text: [
              'GREY HERON — emulated terminal. Type `help` for a list of commands.',
              'Each command echoes your input and prints the simulated tool output.',
              '',
            ].join('\n'),
          },
        ],
      },
    ]);
  }, []);

  // Auto-scroll to bottom whenever the log grows.
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [log]);

  // Keep focus on the prompt whenever the log changes (so the user can
  // immediately keep typing after a command completes).
  useEffect(() => {
    inputRef.current?.focus();
  }, [log]);

  async function submit(line: string): Promise<void> {
    const trimmed = line.trim();
    if (trimmed.length === 0) {
      // echo the empty prompt and do nothing
      setLog((cur) => [...cur, { kind: 'input', text: '', spans: [] }]);
      return;
    }
    // 1. echo the input line first
    const inputEntry: LogEntry = { kind: 'input', text: trimmed, spans: [] };
    // 2. dispatch
    let blocks: OutputSpan[][] = [];
    try {
      blocks = await props.session.dispatch(trimmed);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      blocks = [[{ kind: 'text', text: `error: ${msg}\n` }]];
    }
    // 3. dispatch already recorded the input into session.history.
    // 4. append: each block is its own log row, then a trailing blank row
    //    so the next command echoes with breathing room
    const newEntries: LogEntry[] = [inputEntry];
    for (const block of blocks) {
      newEntries.push({ kind: 'output', text: '', spans: block });
    }
    if (blocks.length > 0) {
      newEntries.push({ kind: 'output', text: '', spans: [{ kind: 'text', text: '' }] });
    }
    setLog((cur) => [...cur, ...newEntries]);
    setInput('');
    setHistoryCursor(-1);
    setCompletions([]);
  }

  function onKey(e: KeyboardEvent): void {
    if (e.key === 'Enter') {
      e.preventDefault();
      const v = inputRef.current?.value ?? '';
      void submit(v);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const h = props.session.history;
      if (h.length === 0) return;
      const next = historyCursor < 0 ? h.length - 1 : Math.max(0, historyCursor - 1);
      setHistoryCursor(next);
      const value = h[next] ?? '';
      setInput(value);
      if (inputRef.current) inputRef.current.value = value;
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const h = props.session.history;
      if (h.length === 0) return;
      if (historyCursor < 0) return;
      const next = Math.min(h.length, historyCursor + 1);
      setHistoryCursor(next);
      const value = next < h.length ? (h[next] ?? '') : '';
      setInput(value);
      if (inputRef.current) inputRef.current.value = value;
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const v = inputRef.current?.value ?? '';
      const cands = props.session.complete(v, v.length);
      setCompletions(cands);
      if (cands.length === 1) {
        setInput(cands[0] ?? '');
        if (inputRef.current) inputRef.current.value = cands[0] ?? '';
      }
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      setLog([]);
    } else if (e.key === 'c' && e.ctrlKey) {
      e.preventDefault();
      setInput('');
      if (inputRef.current) inputRef.current.value = '';
    } else if (e.key === 'u' && e.ctrlKey) {
      e.preventDefault();
      setInput('');
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div
      style="display:flex; flex-direction:column; height:100%; background: var(--gh-bg);"
    >
      <pre
        ref={logRef}
        role="log"
        aria-live="polite"
        style="flex:1; overflow:auto; padding:8px 12px; margin:0; color: var(--gh-fg); font-family: inherit; font-size: inherit; line-height: 1.35; white-space: pre-wrap; word-break: break-word;"
      >
        {log.map((entry, i) => renderEntry(entry, i, props))}
      </pre>
      {completions.length > 1 && (
        <div style="padding:2px 12px; color: var(--gh-muted); border-top: 1px solid var(--gh-border); background: var(--gh-bg);">
          {completions.join('  ')}
        </div>
      )}
      <form
        style="display:flex; padding:6px 12px; border-top: 1px solid var(--gh-border); background: var(--gh-bg);"
        onSubmit={(e) => {
          e.preventDefault();
          const v = inputRef.current?.value ?? '';
          void submit(v);
        }}
      >
        <label
          for="gh-prompt"
          style="color: var(--gh-accent); margin-right:8px; white-space: pre;"
          aria-label="terminal prompt"
        >
          {props.session.currentPrompt()}
        </label>
        <input
          ref={inputRef}
          id="gh-prompt"
          aria-label="command input"
          value={input}
          onKeyDown={onKey}
          onInput={(e) => setInput((e.currentTarget as HTMLInputElement).value)}
          spellcheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          style="flex:1; background: transparent; color: var(--gh-fg); border:none; outline: none; font-family: inherit; font-size: inherit; caret-color: var(--gh-accent);"
        />
      </form>
    </div>
  );
}

function renderEntry(entry: LogEntry, _i: number, props: TerminalProps) {
  if (entry.kind === 'input') {
    return (
      <span>
        <span style="color: var(--gh-accent);">{props.session.currentPrompt()}</span>
        {entry.text}
        {'\n'}
      </span>
    );
  }
  // output: render each span in order
  return (
    <span>
      {entry.spans.map((span, j) => renderSpan(span, j, props))}
    </span>
  );
}

function renderSpan(s: OutputSpan, _j: number, props: TerminalProps) {
  if (s.kind === 'text') {
    return <span style={s.color ? { color: s.color } : undefined}>{s.text}</span>;
  }
  if (s.kind === 'pinnable') {
    return (
      <span
        style="color: var(--gh-accent); cursor: pointer; text-decoration: underline;"
        data-pinnable={s.id}
        onClick={() => {
          props.store.set({ lastPinnableId: s.id });
          props.onPin?.(s.id, s.text);
        }}
        title={s.label ?? 'click to pin as evidence'}
      >
        {s.text}
      </span>
    );
  }
  // link — show text only (no <a href> to keep zero-network discipline)
  return <span style="color: var(--gh-muted);">{s.text} ({s.href})</span>;
}