import { describe, it, expect, beforeEach } from 'vitest';
import '../src/test/bootstrap.js';
import { render } from 'preact';
import { App } from '../src/ui/app.js';

describe('M3-T08: UI smoke tests (happy-dom)', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
    window.location.hash = '';
  });

  it('App renders the hub and lists at least one mission', () => {
    const root = document.getElementById('app')!;
    render(<App />, root);
    const html = (root as HTMLElement).innerHTML;
    expect(html).toContain('GREY HERON');
    expect(html).toContain('First Contact');
  });

  it('terminal input has aria-label and accepts commands', async () => {
    window.location.hash = '#/mission/a1-first-contact';
    const root = document.getElementById('app')!;
    render(<App />, root);
    // Force a hashchange so the route reflects the hash in this environment.
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    await new Promise((r) => setTimeout(r, 0));
    const input = document.querySelector<HTMLInputElement>('#gh-prompt');
    expect(input, 'expected #gh-prompt input in mission view').not.toBeNull();
    expect(input!.getAttribute('aria-label')).toBe('command input');
    input!.value = 'help';
    input!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await new Promise((r) => setTimeout(r, 0));
    const region = document.querySelector<HTMLElement>('[role="log"]');
    expect(region).not.toBeNull();
    expect(region!.textContent ?? '').toMatch(/GREY HERON/);
  });
});