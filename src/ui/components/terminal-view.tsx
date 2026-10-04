/**
 * Terminal view — Preact component.
 *
 * - Native <input> for prompt
 * - role="log" + aria-live="polite" on the output region
 * - Tab completion, history (↑/↓), Ctrl-C / Ctrl-L
 * - Click-to-pin a pinnable output block (the UI store holds the latest id)
 * - Safe rendering: every span rendered with textContent
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

export function TerminalView(props: TerminalProps) {
  const [history, setHistory] = useState<OutputSpan[][]>([]);
  const [input, setInput] = useState('');
  const [historyCursor, setHistoryCursor] = useState(-1);
  const [completions, setCompletions] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const regionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // greet
    setHistory([
      [{ kind: 'text', text: 'GREY HERON terminal — type `help` to begin.\n' }],
    ]);
  }, []);

  // Render output region with textContent only (D14).
  useEffect(() => {
    if (!regionRef.current) return;
    regionRef.current.textContent = '';
    for (const block of history) {
      for (const span of block) {
        if (span.kind === 'text') {
          regionRef.current.appendChild(document.createTextNode(span.text));
        } else if (span.kind === 'pinnable') {
          const spanEl = document.createElement('span');
          spanEl.textContent = span.text;
          spanEl.setAttribute('data-pinnable', span.id);
          spanEl.style.color = 'var(--gh-accent)';
          spanEl.style.cursor = 'pointer';
          spanEl.addEventListener('click', () => {
            props.store.set({ lastPinnableId: span.id });
            props.onPin?.(span.id, span.text);
          });
          regionRef.current.appendChild(spanEl);
          regionRef.current.appendChild(document.createTextNode('\n'));
        } else if (span.kind === 'link') {
          regionRef.current.appendChild(document.createTextNode(`${span.text} (${span.href})`));
        }
      }
    }
    // Keep the last block in view
    if (regionRef.current) regionRef.current.scrollTop = regionRef.current.scrollHeight;
  }, [history, props.store, props.onPin]);

  async function submit(line: string): Promise<void> {
    const blocks = await props.session.dispatch(line);
    setHistory((h) => [...h, ...blocks]);
    setInput('');
    setHistoryCursor(-1);
    setCompletions([]);
  }

  function onKey(e: KeyboardEvent): void {
    if (e.key === 'Enter') {
      e.preventDefault();
      const v = inputRef.current?.value ?? '';
      if (v.trim().length > 0) void submit(v);
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
      const value = next < h.length ? h[next] ?? '' : '';
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
      setHistory([]);
    } else if (e.key === 'c' && e.ctrlKey) {
      e.preventDefault();
      setInput('');
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div style="display:flex; flex-direction:column; height:100%;">
      <div
        ref={regionRef}
        role="log"
        aria-live="polite"
        style="flex:1; overflow:auto; padding:8px; background: var(--gh-bg); color: var(--gh-fg);"
      ></div>
      {completions.length > 1 && (
        <div style="padding:2px 8px; color: var(--gh-muted);">
          {completions.join('  ')}
        </div>
      )}
      <form
        style="display:flex; padding:8px; border-top: 1px solid var(--gh-border);"
        onSubmit={(e) => {
          e.preventDefault();
          const v = inputRef.current?.value ?? '';
          if (v.trim().length > 0) void submit(v);
        }}
      >
        <label
          for="gh-prompt"
          style="color: var(--gh-accent); margin-right:8px;"
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
          style="flex:1; background: transparent; color: var(--gh-fg); border:none; font-family: inherit; font-size: inherit;"
          autoComplete="off"
          autoCorrect="off"
          spellcheck={false}
        />
      </form>
    </div>
  );
}