/**
 * M5-T01 — msfconsole prompt stack.
 *
 * Three-level stack: shell → msfconsole → module → meterpreter. (We'll add
 * the meterpreter level in M7-T04; here we implement up to the module level.)
 *
 * Commands (msf prompt):
 *   search <name|type> [filter]   list matching modules
 *   use <module>                  select a module → push module prompt
 *   info                          show module info
 *   show options                  list options
 *   set <opt> <value>             set one option
 *   setg <opt> <value>            set a global option
 *   unset <opt>                   unset an option
 *   run / exploit                 run the module
 *   back                          pop module prompt
 *   exit                          pop msf prompt (back to shell)
 *   help                          list the above
 *
 * Real-world Metasploit has thousands of modules. We ship a tiny registry
 * (M2-T01 in the plan) and the run / exit patterns that satisfy the
 * a1-knock-knock and a2-first-blood routes.
 */

import { register } from '../engine/registry.js';
import type { Session } from './session.js';
import type { HandlerCtx } from './registry.js';

export type ModuleKind = 'auxiliary' | 'exploit' | 'post' | 'payload';

export interface ModuleDef {
  /** full name, e.g. "auxiliary/scanner/portscan/tcp" */
  name: string;
  kind: ModuleKind;
  /** what the module needs (REQUIRED) — options the player must set */
  required: string[];
  /** what the module accepts (optional) */
  optional: string[];
  /** what it does when run: returns "facts" + side-effects */
  run(ctx: MsfRunContext): Promise<MsfRunResult> | MsfRunResult;
  /** description shown by info */
  description: string;
}

export interface MsfRunContext {
  session: Session;
  options: Record<string, string>;
  /** module clock — the world shows a real virtual clock for timing */
  clock: { now(): number; advance(ms: number): void };
  /** emit event into the campaign stream */
  emit: (type: string, payload: Record<string, unknown>) => void;
  /** knowledge layer */
  knownFacts: Set<string>;
}

export interface MsfRunResult {
  /** facts asserted as known after the run */
  facts: string[];
  /** events to push into the campaign */
  events: GameEventLite[];
  /** output lines (spans) to print */
  output: string[];
}

interface GameEventLite {
  id: number;
  t: number;
  actor: 'player' | 'npc' | 'system';
  type: string;
  payload: Record<string, unknown>;
}

const modules = new Map<string, ModuleDef>();

export function registerModule(m: ModuleDef): void {
  modules.set(m.name, m);
}

export function getModule(name: string): ModuleDef | undefined {
  return modules.get(name);
}

export function allModuleNames(): string[] {
  return [...modules.keys()];
}

/** Default tiny registry — two aux scanners and the vsftpd-class backdoor stub. */
const TCP_PORT_SCAN: ModuleDef = {
  name: 'auxiliary/scanner/portscan/tcp',
  kind: 'auxiliary',
  required: ['RHOSTS'],
  optional: ['PORTS', 'THREADS'],
  description: 'Auxiliary TCP port scanner. Wraps nmap-style connect scan.',
  run(ctx): MsfRunResult {
    ctx.clock.advance(1500);
    const hosts = (ctx.options['RHOSTS'] ?? '').split(/[ ,]+/).filter((h) => h.length > 0);
    const lines = [
      `[*] Scanning ${hosts.length} host(s) for common open ports…`,
      '[+] 22 (ssh) — open',
      '[+] 80 (http) — open',
      '[+] 443 (https) — open',
      `[*] Scan complete. 3 open ports across ${hosts.length} host(s).`,
    ];
    return {
      facts: hosts.flatMap((h) => [`port:open:${h}:22`, `port:open:${h}:80`, `port:open:${h}:443`]),
      events: [
        {
          id: 0,
          t: ctx.clock.now(),
          actor: 'player',
          type: 'portscan',
          payload: { hosts, ports: [22, 80, 443] },
        },
      ],
      output: lines,
    };
  },
};

const VSFTPD_BACKDOOR: ModuleDef = {
  name: 'exploit/unix/ftp/vsftpd_234_backdoor',
  kind: 'exploit',
  required: ['RHOST'],
  optional: [],
  description: 'vsftpd 2.3.4 backdoor command execution (state transition in the simulator).',
  run(ctx): MsfRunResult {
    ctx.clock.advance(2000);
    const rhost = ctx.options['RHOST'] ?? 'unknown';
    return {
      facts: [`session:${rhost}`, `exploit:vsftpd:${rhost}`],
      events: [
        {
          id: 0,
          t: ctx.clock.now(),
          actor: 'player',
          type: 'session_open',
          payload: { hostId: rhost, type: 'shell', module: 'vsftpd_234_backdoor' },
        },
      ],
      output: [
        `[*] ${ctx.clock.now()}ms — attempting vsftpd 2.3.4 backdoor`,
        `[+] ${ctx.clock.now() + 1500}ms — backdoor triggered`,
        `[*] Command shell session 1 opened (${rhost}:21 → ${rhost}:6200)`,
      ],
    };
  },
};

const SSH_VERSION: ModuleDef = {
  name: 'auxiliary/scanner/ssh/ssh_version',
  kind: 'auxiliary',
  required: ['RHOSTS'],
  optional: [],
  description: 'Collect SSH version banners from a host range.',
  run(ctx): MsfRunResult {
    ctx.clock.advance(800);
    const hosts = (ctx.options['RHOSTS'] ?? '').split(/[ ,]+/).filter((h) => h.length > 0);
    return {
      facts: hosts.flatMap((h) => [`service:${h}:22`, `service:version:${h}:ssh`]),
      events: [
        {
          id: 0,
          t: ctx.clock.now(),
          actor: 'player',
          type: 'service_identified',
          payload: { hosts, port: 22, service: 'ssh' },
        },
      ],
      output: [
        '[*] 192.0.2.10:22   OpenSSH 7.4 (protocol 2.0)',
        '[+] Saved 1 banner to the knowledge layer.',
      ],
    };
  },
};

const FTP_VERSION: ModuleDef = {
  name: 'auxiliary/scanner/ftp/ftp_version',
  kind: 'auxiliary',
  required: ['RHOSTS'],
  optional: [],
  description: 'Collect FTP banner / version.',
  run(): MsfRunResult {
    return {
      facts: ['service:vsftpd:21', 'service:version:21:vsftpd'],
      events: [
        {
          id: 0,
          t: 0,
          actor: 'player',
          type: 'service_identified',
          payload: { port: 21, service: 'ftp' },
        },
      ],
      output: ['[*] vsftpd 2.3.4'],
    };
  },
};

[TCP_PORT_SCAN, VSFTPD_BACKDOOR, SSH_VERSION, FTP_VERSION].forEach(registerModule);

/** The msf prompt-level dispatcher. Operates on a Session — pushes the msf prompt. */
export async function dispatchMsf(line: string, session: Session): Promise<string[]> {
  void session;
  const tokens = line.trim().split(/\s+/);
  const cmd = tokens[0] ?? '';
  switch (cmd) {
    case '':
      return [];
    case 'help':
      return [
        'msf > commands:',
        '  search <name|type> [filter]   list matching modules',
        '  use <module>                  select a module',
        '  info                          show module info (after use)',
        '  show options                  list options (after use)',
        '  set <opt> <value>             set an option',
        '  setg <opt> <value>            set a global option',
        '  unset <opt>                   unset an option',
        '  run / exploit                 run the active module',
        '  back                          pop module prompt',
        '  exit                          pop msf prompt',
      ];
    case 'search': {
      const q = tokens.slice(1).join(' ').toLowerCase();
      const matches = allModuleNames().filter((n) => n.includes(q));
      if (matches.length === 0) return ['[!] No matching modules.'];
      return [`msf> ${matches.length} matching module(s):`, ...matches.map((m) => `  ${m}`)];
    }
    case 'use': {
      const name = tokens.slice(1).join(' ');
      const m = getModule(name);
      if (!m) return [`[-] Unknown module: ${name}`];
      // Push module prompt onto session stack
      const promptName = shortName(name);
      session.pushPrompt(`msf6 ${promptName} > `);
      // Stash the module on a property of the session for downstream commands
      (session as unknown as { __msfModule: string }).__msfModule = name;
      return [`[+] Using ${name}`];
    }
    case 'info': {
      const name = currentModuleName(session);
      const m = name ? getModule(name) : undefined;
      if (!m) return ['[!] No active module. Use first.'];
      return [
        `Name: ${m.name}`,
        `Kind: ${m.kind}`,
        `Description: ${m.description}`,
        `Required: ${m.required.join(', ') || '(none)'}`,
        `Optional: ${m.optional.join(', ') || '(none)'}`,
      ];
    }
    case 'show': {
      const what = tokens[1];
      if (what !== 'options') return ['[!] Only `show options` is emulated.'];
      const name = currentModuleName(session);
      const m = name ? getModule(name) : undefined;
      if (!m) return ['[!] No active module. Use first.'];
      const lines = ['Module options (required):'];
      for (const r of m.required) lines.push(`  ${r.padEnd(20)}  (required)`);
      lines.push('Module options (optional):');
      for (const o of m.optional) lines.push(`  ${o.padEnd(20)}`);
      return lines;
    }
    case 'set':
    case 'setg':
    case 'unset': {
      const rest = tokens.slice(1);
      if (rest.length < 1) return [`[!] ${cmd}: missing argument`];
      const k = rest[0]!;
      const name = currentModuleName(session);
      const m = name ? getModule(name) : undefined;
      if (!m) return ['[!] No active module. Use first.'];
      const opts = (session as unknown as { __msfOpts: Record<string, string> }).__msfOpts ?? {};
      if (cmd === 'unset') {
        delete opts[k];
        (session as unknown as { __msfOpts: Record<string, string> }).__msfOpts = opts;
        return [`Unsetting ${k}…`];
      }
      const v = rest.slice(1).join(' ');
      opts[k] = v;
      (session as unknown as { __msfOpts: Record<string, string> }).__msfOpts = opts;
      return [`${k} => ${v}`];
    }
    case 'run':
    case 'exploit': {
      const name = currentModuleName(session);
      const m = name ? getModule(name) : undefined;
      if (!m) return ['[!] No active module. Use first.'];
      const opts = (session as unknown as { __msfOpts: Record<string, string> }).__msfOpts ?? {};
      const missing = m.required.filter((r) => !opts[r]);
      if (missing.length > 0) {
        return [
          `[-] Missing required option(s): ${missing.join(', ')}`,
          `[*] HINT: \`set RHOSTS 192.0.2.10\` then \`run\``,
        ];
      }
      const ctx: MsfRunContext = {
        session,
        options: opts,
        clock: { now: () => 0, advance: () => {} },
        emit: () => {},
        knownFacts: new Set(),
      };
      const r = await m.run(ctx);
      return r.output;
    }
    case 'back':
      session.popPrompt();
      (session as unknown as Record<string, unknown>).__msfModule = undefined;
      return ['[*] Popped back to msf prompt.'];
    case 'exit':
      session.popPrompt();
      (session as unknown as Record<string, unknown>).__msfModule = undefined;
      return ['[*] Returning to shell.'];
    default:
      return [`msf: unknown command: ${cmd}. Type \`help\`.`];
  }
}

function shortName(full: string): string {
  return full.split('/').slice(-1)[0] ?? full;
}

function currentModuleName(session: Session): string | undefined {
  return (session as unknown as { __msfModule?: string }).__msfModule;
}

/** Register `msfconsole` at the shell level. Entering it stacks the msf prompt. */
register({
  name: 'msfconsole',
  flags: { '-q': 'emulated', '-h': 'emulated' },
  async handle(argv, _ctx: HandlerCtx) {
    if (argv[0] === '-h' || argv[0] === '--help') {
      return [
        [
          {
            kind: 'text',
            text: 'msfconsole — Metasploit framework console (emulated).\n  Usage: msfconsole [-q]\n',
          },
        ],
      ];
    }
    return [
      [
        {
          kind: 'text',
          text:
            'msfconsole (emulated). Hint: this simulator exposes search/use/set/run via the\n`msf` alias; the full prompt stack arrives with the meterpreter level (M7).\n',
        },
      ],
    ];
  },
});

/** Shell-level `msf` alias that runs the prompt-stack dispatcher above. */
register({
  name: 'msf',
  flags: {},
  async handle(argv, ctx: HandlerCtx) {
    const lines = await dispatchMsf(argv.join(' '), ctx as unknown as Session);
    return [lines.map((l) => ({ kind: 'text' as const, text: l + '\n' }))];
  },
});