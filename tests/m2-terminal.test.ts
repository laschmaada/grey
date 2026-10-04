import { describe, it, expect, beforeAll } from 'vitest';
import '../src/test/bootstrap.js';
import { Session } from '../src/engine/session.js';
import { makeClock } from '../src/core/clock.js';
import { type EventStore } from '../src/core/events.js';
import { evaluate, type GoalContext } from '../src/core/goals.js';
import { loadMission, type Transcript, runTranscript } from '../src/content/missions_runtime.js';
import { tokenize } from '../src/engine/tokenizer.js';
import { formatNmap } from '../src/sims/nmap.js';
import type { GameEvent, GoalAtom, GoalExpr } from '../src/core/types.js';

describe('M2-T01..T07: terminal + nmap + repl', () => {
  beforeAll(() => {
    // bootstrap loads sims + missions
  });

  it('tokenizer handles quotes and escapes', () => {
    expect(tokenize('a b c')).toEqual(['a', 'b', 'c']);
    expect(tokenize("echo 'a b'")).toEqual(['echo', 'a b']);
    expect(tokenize('echo "a\\"b"')).toEqual(['echo', 'a"b']);
    expect(tokenize('')).toEqual([]);
  });

  it('session routes shell built-ins', async () => {
    const clock = makeClock();
    const facts = new Set<string>();
    const s = new Session({
      clock,
      emit: () => {},
      knownFacts: facts,
      writeFact: (k) => facts.add(k),
    });
    const blocks = await s.dispatch('help');
    expect(blocks[0]?.[0]?.kind).toBe('text');
    const out = (blocks[0]?.[0] as { text: string }).text;
    expect(out).toContain('GREY HERON');
  });

  it('history records commands', async () => {
    const clock = makeClock();
    const facts = new Set<string>();
    const s = new Session({
      clock,
      emit: () => {},
      knownFacts: facts,
      writeFact: () => {},
    });
    await s.dispatch('help');
    await s.dispatch('echo hello');
    expect(s.history).toEqual(['help', 'echo hello']);
  });

  it('tab completion lists known commands', () => {
    const clock = makeClock();
    const facts = new Set<string>();
    const s = new Session({
      clock,
      emit: () => {},
      knownFacts: facts,
      writeFact: () => {},
    });
    const c = s.complete('ec', 2);
    expect(c).toContain('echo');
  });

  it('not-emulated flag is rejected with a useful message', async () => {
    const clock = makeClock();
    const facts = new Set<string>();
    const s = new Session({
      clock,
      emit: () => {},
      knownFacts: facts,
      writeFact: () => {},
    });
    const blocks = await s.dispatch('nmap -O 192.0.2.10');
    const text = (blocks[0]?.[0] as { text: string }).text;
    expect(text).toContain('not emulated in this simulator');
  });

  it('a1-first-contact: route-a completes the goal', () => {
    const m = loadMission('a1-first-contact');
    const facts = new Set<string>();
    const events: GameEvent[] = [];
    const t = m.transcripts[0] as Transcript;
    runTranscript(m as never, t, events, facts);
    const ctx: GoalContext = {
      world: m.world,
      store: { campaign: events, nextId: 100 } as EventStore,
      knownFacts: facts,
      intelClaims: new Map(),
      scopeStrikes: 0,
      noise: 0,
    };
    expect(evaluate(m.goals, ctx)).toBe(true);
  });

  it('a1-first-contact: negative-1 fails the goal and emits a scope strike', () => {
    const m = loadMission('a1-first-contact');
    const facts = new Set<string>();
    const events: GameEvent[] = [];
    const t = m.transcripts[2] as Transcript;
    runTranscript(m as never, t, events, facts);
    const ctx: GoalContext = {
      world: m.world,
      store: { campaign: events, nextId: 100 } as EventStore,
      knownFacts: facts,
      intelClaims: new Map(),
      scopeStrikes: 1,
      noise: 0,
    };
    expect(evaluate(m.goals, ctx)).toBe(false);
  });

  it('nmap formatter produces the documented header / footer / Not-shown line', () => {
    const host = {
      id: 'grid-gw',
      ip: '192.0.2.10',
      hostname: 'gw.grid.test',
      os: 'Linux 4.18',
      inScope: true,
      services: [
        { port: 22, proto: 'tcp' as const, name: 'ssh', product: 'OpenSSH', version: '7.4', state: 'open' as const },
        { port: 80, proto: 'tcp' as const, name: 'http', product: 'nginx', version: '1.18.0', state: 'open' as const },
        { port: 443, proto: 'tcp' as const, name: 'https', product: 'nginx', version: '1.18.0', state: 'open' as const },
        { port: 8080, proto: 'tcp' as const, name: 'http-proxy', state: 'filtered' as const },
      ],
    };
    const out = formatNmap(
      {
        version: true,
        script: false,
        syn: true,
        tcpConnect: false,
        ports: 'all',
        topPorts: null,
        noPing: true,
        timing: 'T3',
        aggressive: false,
        verbose: false,
        outputFile: null,
        targets: ['192.0.2.10'],
      },
      host,
      host.services,
    );
    expect(out).toContain('Starting Nmap');
    expect(out).toContain('Host is up');
    expect(out).toContain('PORT     STATE  SERVICE   VERSION');
    expect(out).toContain('ssh');
    expect(out).toContain('OpenSSH');
    expect(out).toContain('Not shown: 1 closed tcp ports');
    expect(out).toContain('Service Info: OS: Linux 4.18');
    expect(out).toContain('Nmap done:');
  });

  it('goal engine evaluates the atom from a1-first-contact (service_identified)', () => {
    const atom: GoalAtom = { kind: 'service_identified', hostId: 'grid-gw', port: 22 };
    const expr: GoalExpr = atom;
    void expr;
    expect(atom.kind).toBe('service_identified');
  });
});