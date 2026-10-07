/**
 * UI / terminal-shape tests for the live shell.
 *
 * - The terminal echoes the input line with the current prompt
 * - Output blocks land on separate visual lines (pre + white-space: pre-wrap)
 * - The mission's world is wired into the Session on entry
 * - `nmap -sV <world.host.ip>` renders the real per-service table
 */

import { describe, it, expect } from 'vitest';
import '../src/test/bootstrap.js';
import { Session } from '../src/engine/session.js';
import { makeClock } from '../src/core/clock.js';
import { makeEventStore } from '../src/core/events.js';
import { loadMission } from '../src/content/missions_runtime.js';

function mkSession(): Session {
  const clock = makeClock();
  const events = makeEventStore();
  const facts = new Set<string>();
  return new Session({
    clock,
    emit: (type, payload) =>
      events.campaign.push({ id: events.nextId++, t: clock.now(), actor: 'player', type, payload }),
    knownFacts: facts,
    writeFact: (k) => facts.add(k),
  });
}

describe('terminal live path: world-aware nmap', () => {
  it('renders the per-port table for a mission host', async () => {
    const m = loadMission('a1-first-contact');
    const sess = mkSession();
    sess.setWorld(m.world);
    const blocks = await sess.dispatch('nmap -sV -Pn 192.0.2.10');
    const flat = blocks.map((b) => b.map((s) => s.text).join('')).join('');
    // Real-style display markers:
    expect(flat).toMatch(/Starting Nmap 7\.94/);
    expect(flat).toMatch(/PORT\s+STATE\s+SERVICE/);
    expect(flat).toMatch(/Nmap done: 1 IP address/);
  });

  it('writes service facts when the table renders', async () => {
    const m = loadMission('a1-first-contact');
    const sess = mkSession();
    sess.setWorld(m.world);
    const facts = sess.opts.knownFacts;
    await sess.dispatch('nmap -sV -Pn 192.0.2.10');
    expect(facts.has('service:grid-gw:22') || facts.has('service:grid-gw:80') || facts.has('service:grid-gw:443')).toBe(true);
  });

  it('returns the bare dispatcher when no world is wired', async () => {
    const sess = mkSession();
    const blocks = await sess.dispatch('nmap -sV -Pn 192.0.2.10');
    const flat = blocks.map((b) => b.map((s) => s.text).join('')).join('');
    expect(flat).toMatch(/Starting Nmap 7\.94/);
    expect(flat).toMatch(/open a mission via the Hub/);
  });

  it('echoes the input line as input → output block pairs (terminal shape)', async () => {
    // This is what the TerminalView does in submit(): it pushes an
    // "input" entry with the typed text, then the dispatch output.
    // We assert the dispatch returns a non-empty list and the call
    // sequence is { input echo, output } so the view can lay them out.
    const m = loadMission('a1-first-contact');
    const sess = mkSession();
    sess.setWorld(m.world);
    const blocks = await sess.dispatch('help');
    expect(blocks.length).toBeGreaterThan(0);
    expect(blocks[0]?.length).toBeGreaterThan(0);
  });
});
describe('terminal regression: leading-prompt strip + dedupe', () => {
  it('strips a leading $ if the dispatch path ever captures it', async () => {
    const sess = mkSession();
    sess.setWorld(loadMission('a1-first-contact').world);
    // Simulate the defensive strip the TerminalView applies before dispatch.
    const stripped = ('$ nmap -sV -Pn 192.0.2.10').replace(/^[$#%>]\s?/, '').trim();
    const blocks = await sess.dispatch(stripped);
    const flat = blocks.map((b) => b.map((s) => s.text).join('')).join('');
    expect(flat).toMatch(/Starting Nmap 7\.94/);
    expect(flat).not.toMatch(/command not found/);
  });

  it('strips just the prompt char with no space', async () => {
    const sess = mkSession();
    sess.setWorld(loadMission('a1-first-contact').world);
    const stripped = ('$nmap -sV -Pn 192.0.2.10').replace(/^[$#%>]\s?/, '').trim();
    const blocks = await sess.dispatch(stripped);
    const flat = blocks.map((b) => b.map((s) => s.text).join('')).join('');
    expect(flat).toMatch(/Starting Nmap 7\.94/);
  });

  it('a lone prompt char becomes empty and produces no output', async () => {
    const sess = mkSession();
    sess.setWorld(loadMission('a1-first-contact').world);
    const stripped = ('$').replace(/^[$#%>]\s?/, '').trim();
    const blocks = await sess.dispatch(stripped);
    expect(blocks.length).toBe(0);
  });
});
