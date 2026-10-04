/**
 * Emulated tool versions. Constants per D11.
 */
export const TOOL_VERSIONS = {
  nmap: '7.94',
  metasploit: '6.4.x',
  snort: '3.1.x',
  volatility: '3.2.x',
  wireshark: '4.2.x',
  tshark: '4.2.x',
  burp: '2024.1',
  sqlmap: '1.8.x',
  gobuster: '3.6',
  hydra: '9.5',
  john: '1.9.0-jumbo',
  hashcat: '6.2.x',
  wazuh: '4.9.x',
  velociraptor: '0.7.x',
  maltego: '4.3.x',
  sherlock: '0.14.x',
  theharvester: '4.4.x',
  nikto: '2.5.x',
  sliver: '1.5.x',
  netcat: 'openbsd nc 1.226',
  curl: '8.5.x',
} as const;

export type ToolKey = keyof typeof TOOL_VERSIONS;