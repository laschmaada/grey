#!/usr/bin/env tsx
/**
 * scripts/repl.ts — `npm run repl -- <missionId>`.
 *
 * Plays a mission in the terminal. Meta commands:
 *   :goals       print current goal predicates and their truth values
 *   :status      print current profile (wallet, noise, trust, mission)
 *   :wallet      print wallet
 *   :events      print the last 20 events
 *
 * For M2, the REPL wires the registered commands to the Session and the world
 * fixture for the mission id. M2-T06.
 */

import { Session } from '../src/engine/session.js';
import { makeClock } from '../src/core/clock.js';
import { makeEventStore, type EventStore } from '../src/core/events.js';
import { MISSIONS } from '../src/content/missions.js';
import { loadMission } from '../src/content/missions_runtime.js';
import { evaluate, type GoalContext } from '../src/core/goals.js';
import { createInterface } from 'node:readline';

async function main(): Promise<void> {
  const id = process.argv[2];
  if (!id) {
    console.error('usage: npm run repl -- <missionId>');
    process.exit(1);
  }
  const mission = MISSIONS.find((m) => m.id === id);
  if (!mission) {
    console.error(`repl: unknown mission '${id}'`);
    process.exit(1);
  }

  const clock = makeClock();
  const store = makeEventStore();
  const knownFacts = new Set<string>();
  const world = loadMission(id);

  const session = new Session({
    clock,
    emit: (type, payload) => {
      store.campaign.push({
        id: store.nextId++,
        t: clock.now(),
        actor: 'player',
        type,
        payload,
      });
    },
    knownFacts,
    writeFact: (k) => knownFacts.add(k),
  });

  console.log(`GREY HERON — replaying ${mission.id} '${mission.title}'`);
  console.log(`Type 'help' for commands, ':goals' / ':status' / ':wallet' / ':events' for meta.`);

  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: false });
  const prompt = () => process.stdout.write(session.currentPrompt());

  for await (const line of rl) {
    const text = (line ?? '').replace(/\r$/, '');
    if (text.startsWith(':')) {
      handleMeta(text, { session, store, clock, world, knownFacts });
      prompt();
      continue;
    }
    const blocks = await session.dispatch(text);
    for (const block of blocks) {
      for (const span of block) {
        if (span.kind === 'text') process.stdout.write(span.text);
      }
    }
    const ctx: GoalContext = {
      world: world.world,
      store,
      knownFacts,
      intelClaims: new Map(),
      scopeStrikes: 0,
      noise: 0,
    };
    const ok = evaluate(world.goals, ctx);
    if (ok) {
      console.log('\n*** Mission goal satisfied. ***');
    }
    prompt();
  }
}

interface MetaCtx {
  session: Session;
  store: EventStore;
  clock: ReturnType<typeof makeClock>;
  world: ReturnType<typeof loadMission>;
  knownFacts: Set<string>;
}

function handleMeta(cmd: string, ctx: MetaCtx): void {
  if (cmd === ':goals') {
    console.log('goal:', JSON.stringify(ctx.world.goals, null, 2));
    return;
  }
  if (cmd === ':status') {
    console.log('clock:', ctx.clock.now(), 'ms');
    console.log('facts:', [...ctx.knownFacts].join(', ') || '(none)');
    return;
  }
  if (cmd === ':wallet') {
    console.log('wallet: derived from events; see PROGRESS.md §6');
    return;
  }
  if (cmd === ':events') {
    const last = ctx.store.campaign.slice(-20);
    for (const e of last) {
      console.log(`  #${e.id} t=${e.t} ${e.type} ${JSON.stringify(e.payload)}`);
    }
    return;
  }
  console.log('unknown meta command');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});