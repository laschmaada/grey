import type { ToolKey } from './versions.js';

/**
 * Tool metadata. Cost 0 means starter-kit (free).
 * `track` defines which track may purchase/use the tool.
 * `tier` is the shop tier (1..4) — required by §9.
 */
export interface ToolDef {
  key: ToolKey | string;
  name: string;
  cost: number;
  tier: 1 | 2 | 3 | 4;
  track: 'shared' | 'red' | 'blue' | 'either-red' | 'either-blue';
  description: string;
  required?: boolean;
  optional?: boolean;
}

export const TOOLS: readonly ToolDef[] = [
  // Starter kit (free)
  {
    key: 'nmap',
    name: 'Nmap',
    cost: 0,
    tier: 1,
    track: 'shared',
    description: 'Network mapper. Service/version scanning.',
    required: true,
  },
  {
    key: 'metasploit',
    name: 'Metasploit Framework',
    cost: 0,
    tier: 1,
    track: 'shared',
    description: 'Exploit framework. msfconsole prompt.',
    required: true,
  },
  {
    key: 'meridian-console',
    name: 'Meridian Console',
    cost: 0,
    tier: 1,
    track: 'shared',
    description: 'SIEM-lite. Alert queue and log search.',
    required: true,
  },
  {
    key: 'shell',
    name: 'Shell utilities',
    cost: 0,
    tier: 1,
    track: 'shared',
    description: 'dig, whois, curl, host.',
    required: true,
  },
  {
    key: 'decoder',
    name: 'Decoder',
    cost: 0,
    tier: 1,
    track: 'shared',
    description: 'Encoder/decoder.',
    required: true,
  },
  // Tier 1 paid
  {
    key: 'wireshark',
    name: 'Wireshark',
    cost: 150,
    tier: 1,
    track: 'shared',
    description: 'Packet capture & analysis.',
    required: true,
  },
  {
    key: 'netcat',
    name: 'Netcat',
    cost: 100,
    tier: 1,
    track: 'shared',
    description: 'TCP/UDP read-write.',
    required: true,
  },
  {
    key: 'theharvester',
    name: 'theHarvester',
    cost: 200,
    tier: 1,
    track: 'shared',
    description: 'OSINT email/subdomain harvester.',
    required: true,
  },
  // Tier 2 paid
  {
    key: 'gobuster',
    name: 'Gobuster',
    cost: 200,
    tier: 2,
    track: 'shared',
    description: 'Directory/DNS brute-forcer.',
    required: true,
  },
  {
    key: 'sqlmap',
    name: 'sqlmap',
    cost: 300,
    tier: 2,
    track: 'shared',
    description: 'SQL injection detection/exploitation.',
    required: true,
  },
  {
    key: 'burp',
    name: 'Burp Suite',
    cost: 350,
    tier: 2,
    track: 'shared',
    description: 'Web proxy/intercept/repeater.',
    required: true,
  },
  {
    key: 'snort',
    name: 'Snort',
    cost: 350,
    tier: 2,
    track: 'shared',
    description: 'IDS — header+options rules.',
    required: true,
  },
  {
    key: 'nikto',
    name: 'Nikto',
    cost: 250,
    tier: 2,
    track: 'shared',
    description: 'Web server scanner.',
    optional: true,
  },
  // Tier 3 paid
  {
    key: 'sherlock',
    name: 'Sherlock',
    cost: 250,
    tier: 3,
    track: 'shared',
    description: 'Username enumeration across sites.',
    required: true,
  },
  {
    key: 'hydra',
    name: 'Hydra',
    cost: 400,
    tier: 3,
    track: 'red',
    description: 'Online brute-force.',
    required: true,
  },
  {
    key: 'john',
    name: 'John the Ripper',
    cost: 450,
    tier: 3,
    track: 'red',
    description: 'Offline hash cracking.',
    required: true,
  },
  {
    key: 'sliver',
    name: 'Sliver',
    cost: 700,
    tier: 3,
    track: 'red',
    description: 'C2 framework.',
    required: true,
  },
  {
    key: 'wazuh',
    name: 'Wazuh',
    cost: 450,
    tier: 3,
    track: 'blue',
    description: 'Host-based detection (FIM).',
    required: true,
  },
  {
    key: 'velociraptor',
    name: 'Velociraptor',
    cost: 500,
    tier: 3,
    track: 'blue',
    description: 'Endpoint querying (VQL subset).',
    required: true,
  },
  {
    key: 'hashcat',
    name: 'Hashcat',
    cost: 350,
    tier: 3,
    track: 'shared',
    description: 'GPU hash cracker.',
    optional: true,
  },
  {
    key: 'zeek',
    name: 'Zeek',
    cost: 400,
    tier: 3,
    track: 'shared',
    description: 'Network security monitor.',
    optional: true,
  },
  // Tier 4 paid
  {
    key: 'volatility',
    name: 'Volatility',
    cost: 450,
    tier: 4,
    track: 'shared',
    description: 'Memory forensics.',
    required: true,
  },
  {
    key: 'maltego',
    name: 'Maltego',
    cost: 450,
    tier: 4,
    track: 'shared',
    description: 'Link analysis.',
    required: true,
  },
  {
    key: 'splunk',
    name: 'Splunk/ELK',
    cost: 500,
    tier: 4,
    track: 'shared',
    description: 'Log search.',
    optional: true,
  },
] as const;

export function findTool(key: string): ToolDef | undefined {
  return TOOLS.find((t) => t.key === key);
}