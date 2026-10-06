/**
 * Wire the engine, sims, and runtime together so consumers (repl, ui) can import
 * one module to set everything up.
 */

import '../sims/nmap.js';
import '../sims/msf.js';
import '../sims/tshark.js';
import '../sims/gobuster.js';
import '../sims/sqlmap.js';
import '../sims/certlog.js';
import '../sims/netcat.js';
import '../sims/burp.js';
import '../sims/ais.js';
import '../sims/sherlock.js';
import '../sims/hydra_john.js';
import '../sims/sliver.js';
import '../sims/wazuh.js';
import '../sims/velociraptor.js';
import '../engine/msfconsole.js';
import '../engine/meterpreter.js';
import '../engine/meridian.js';
import '../content/missions_runtime.js';
import { register as regCmd } from '../engine/registry.js';
import { Session } from '../engine/session.js';
import { makeClock } from '../core/clock.js';
import { makeEventStore } from '../core/events.js';

// Register a tiny set of build-time helpers if no tests have already registered them.
function ensureBuiltins(): void {
  // `echo` is a built-in inside Session, but we expose it via the registry for tab
  // completion listing (allNames()).
  regCmd({
    name: 'echo',
    flags: {},
    handle: (argv) => [[{ kind: 'text', text: argv.join(' ') + '\n' }]],
  });
  regCmd({
    name: 'history',
    flags: {},
    handle: () => [[{ kind: 'text', text: '(see the on-screen history)\n' }]],
  });
}
ensureBuiltins();

export { registerMission, loadMission, runTranscript } from '../content/missions_runtime.js';
export type { Transcript, MissionDef, LoadedMission, MissionGoalStatus } from '../content/missions_runtime.js';
export { Session, makeClock, makeEventStore };