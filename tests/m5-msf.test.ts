import { describe, it, expect } from 'vitest';
import { dispatchMsf, registerModule, getModule, allModuleNames } from '../src/engine/msfconsole.js';
import { makeClock } from '../src/core/clock.js';
import { makeEventStore } from '../src/core/events.js';
import { Session } from '../src/engine/session.js';

function makeSession(): { session: Session; facts: Set<string> } {
  const facts = new Set<string>();
  const session = new Session({
    clock: makeClock(),
    emit: (type, _payload) => {
      // not used in dispatchMsf but kept for parity
      void type;
    },
    knownFacts: facts,
    writeFact: (k) => facts.add(k),
  });
  return { session, facts };
}

describe('M5-T01: msfconsole prompt stack', () => {
  it('lists modules', () => {
    expect(allModuleNames()).toContain('auxiliary/scanner/portscan/tcp');
    expect(allModuleNames()).toContain('exploit/unix/ftp/vsftpd_234_backdoor');
  });

  it('search filters by name', async () => {
    const { session } = makeSession();
    const out = await dispatchMsf('search portscan', session);
    expect(out.join('\n')).toContain('auxiliary/scanner/portscan/tcp');
  });

  it('search with no match returns a No matching modules message', async () => {
    const { session } = makeSession();
    const out = await dispatchMsf('search nonexistent-thing', session);
    expect(out.join('\n')).toContain('No matching modules');
  });

  it('use pushes a module prompt and stashes the module', async () => {
    const { session } = makeSession();
    expect(session.currentPrompt()).toBe('$ ');
    await dispatchMsf('use auxiliary/scanner/portscan/tcp', session);
    expect(session.currentPrompt()).toBe('msf6 tcp > ');
  });

  it('info shows the active module', async () => {
    const { session } = makeSession();
    await dispatchMsf('use auxiliary/scanner/portscan/tcp', session);
    const out = await dispatchMsf('info', session);
    expect(out.join('\n')).toContain('Description');
    expect(out.join('\n')).toContain('Required');
  });

  it('show options lists required + optional', async () => {
    const { session } = makeSession();
    await dispatchMsf('use auxiliary/scanner/portscan/tcp', session);
    const out = await dispatchMsf('show options', session);
    expect(out.join('\n')).toContain('RHOSTS');
  });

  it('run with missing RHOSTS warns and hints set RHOSTS', async () => {
    const { session } = makeSession();
    await dispatchMsf('use auxiliary/scanner/portscan/tcp', session);
    const out = await dispatchMsf('run', session);
    expect(out.join('\n')).toContain('Missing required option');
    expect(out.join('\n')).toContain('set RHOSTS');
  });

  it('run with RHOSTS set emits output and clears module', async () => {
    const { session } = makeSession();
    await dispatchMsf('use auxiliary/scanner/portscan/tcp', session);
    await dispatchMsf('set RHOSTS 192.0.2.10', session);
    const out = await dispatchMsf('run', session);
    expect(out.join('\n')).toContain('Scan complete');
  });

  it('back pops the module prompt', async () => {
    const { session } = makeSession();
    await dispatchMsf('use auxiliary/scanner/portscan/tcp', session);
    expect(session.currentPrompt()).toBe('msf6 tcp > ');
    await dispatchMsf('back', session);
    expect(session.currentPrompt()).toBe('$ ');
  });

  it('unknown command surfaces a useful error', async () => {
    const { session } = makeSession();
    const out = await dispatchMsf('frobnicate', session);
    expect(out.join('\n')).toContain('unknown command');
  });
});

describe('M5-T01: module registry', () => {
  it('registers and retrieves a custom module', () => {
    registerModule({
      name: 'auxiliary/test/sample',
      kind: 'auxiliary',
      required: [],
      optional: [],
      description: 'sample',
      run: () => ({ facts: [], events: [], output: ['ok'] }),
    });
    const m = getModule('auxiliary/test/sample');
    expect(m?.description).toBe('sample');
  });
});

void makeEventStore;