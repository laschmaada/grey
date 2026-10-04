/**
 * msfconsole — M5-T01 stub. Registers a command that responds to `msfconsole` and
 * drops a placeholder note that the prompt stack is not yet implemented.
 */

import { register } from '../engine/registry.js';

register({
  name: 'msfconsole',
  flags: {
    '-q': 'emulated',
    '-x': 'not-emulated',
    '-h': 'emulated',
  },
  handle(argv, ctx) {
    void argv;
    ctx.emit('command', { tool: 'msfconsole' });
    return [
      [
        {
          kind: 'text',
          text:
            'msfconsole: prompt stack stub. Full msf implementation lands in M5-T01 (deferred — see BLOCKERS.md).\n',
        },
      ],
    ];
  },
});

void register;