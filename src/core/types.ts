/**
 * World model — §4.2.
 *
 * Pinned paths are JSON-pointer-like dotted strings into the world that seeded jitter
 * (latency, banner text, ephemeral ports, MAC octets) must never touch. They are
 * what transcript tests assert against.
 */

export type IPAddress = string; // dotted-quad, only from reserved ranges in content
export type HostId = string;
export type Track = 'shared' | 'red' | 'blue';
export type ServiceState = 'open' | 'closed' | 'filtered';

export interface Service {
  port: number;
  proto: 'tcp' | 'udp';
  name: string;
  product?: string;
  version?: string;
  banner?: string;
  state: ServiceState;
  cpe?: string;
}

export interface Host {
  id: HostId;
  ip: IPAddress;
  hostname?: string;
  os: string;
  inScope: boolean;
  services: Service[];
  /** role tag helps the simulator reason about the host (gateway, mail, web, etc.) */
  role?: string;
  /** fleet index used by Velociraptor-style blue missions */
  fleetIndex?: number;
}

export type VulnKind = 'rce' | 'lfi' | 'sqli' | 'creds' | 'config' | 'backdoor';

export interface Vuln {
  id: string;
  hostId: HostId;
  servicePort?: number;
  kind: VulnKind;
  description: string;
  /** ref into the modules list — never a working exploit */
  moduleRef?: string;
}

export interface Cred {
  id: string;
  hostId: HostId;
  user: string;
  secret: string; // plaintext for the simulator; never a real credential
  source: 'found' | 'cracked' | 'leaked' | 'planted';
}

export interface Edge {
  from: HostId;
  to: HostId;
  /** e.g. "subnet-192.0.2.0/24" or "vpn-tunnel" */
  kind: string;
  /** route metric used by Meterpreter route table */
  metric?: number;
}

export interface DnsRecord {
  name: string; // fqdn ending in .test / .example / .invalid
  type: 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT' | 'NS';
  value: string;
}

export interface WebNode {
  path: string;
  title: string;
  body?: string;
  /** optional content snippets for dork index */
  snippet?: string;
}

export interface WebGraph {
  rootUrl: string;
  nodes: WebNode[];
  /** outbound links path → path */
  links: Array<[string, string]>;
  /** dork index, simple inverted-keyword map */
  index: Map<string, Set<string>>;
}

export interface Doc {
  id: string;
  hostId?: HostId;
  path: string;
  content: string; // free text, may contain seeded secrets
  /** classification hint used by report completeness check */
  classification?: 'public' | 'internal' | 'sensitive';
}

export interface Defenses {
  hostIds: HostId[];
  idsRules?: string[]; // ids rule IDs that are deployed
  waf?: boolean;
  fim?: boolean; // file integrity monitoring
}

export interface TrafficProfile {
  /** average packets/sec background */
  baseline: number;
  /** beacon interval (ms) for known-bad runs */
  beaconMs?: number;
  beaconJitterMs?: number;
}

export interface World {
  seed: number;
  hosts: Host[];
  vulns: Vuln[];
  creds: Cred[];
  edges: Edge[];
  dns: DnsRecord[];
  web: WebGraph;
  docs: Doc[];
  defenses: Defenses;
  traffic?: TrafficProfile;
  /** paths that seeded jitter must not modify */
  pinned: string[];
}

export interface ScopeCard {
  inScope: HostId[];
  outOfScope: HostId[];
  permitted: string[]; // methods allowed
  forbidden: string[]; // methods forbidden
  dataRule: string; // human-readable rule, e.g. "no data exfiltration"
  window?: [number, number]; // virtual ms
}

/** Game event (§4.3). Append-only. */
export interface GameEvent {
  id: number;
  t: number; // virtual ms
  actor: 'player' | 'npc' | 'system';
  type: string;
  payload: Record<string, unknown>;
}

/** Fact the player has learned. Separate from world truth. */
export interface Fact {
  key: string;
  value: unknown;
  discoveredAt: number;
  via: number; // event id that produced it
}

export type SourceType = 'ais' | 'certlog' | 'blockchain' | 'social' | 'artifact' | 'human';

export interface IntelItem {
  id: string;
  claim: string;
  sourceType: SourceType;
  origin: string;
  discoveredAt: number;
}

export type IntelState = 'unverified' | 'corroborated' | 'verified';

export interface Artifact {
  id: string;
  kind: 'note' | 'output' | 'writeup' | 'detection' | 'pcap';
  label: string;
  bytes?: Uint8Array; // serialised payload, optional for notes
  mime?: string;
  createdAt: number;
  missionId?: string;
}

/** Goal expression nodes — §4.4. */
export type GoalAtom =
  | { kind: 'host_discovered'; hostId: HostId }
  | { kind: 'service_identified'; hostId: HostId; port: number }
  | { kind: 'fact_found'; key: string }
  | { kind: 'scan_performed'; scan: 'tcp' | 'udp' | 'version' | 'full' | 'os' }
  | { kind: 'session_open'; hostId: HostId; type?: 'shell' | 'meterpreter' }
  | { kind: 'credential_obtained'; user: string; hostId: HostId }
  | { kind: 'file_retrieved'; path: string }
  | { kind: 'evidence_preserved'; hostId: HostId }
  | { kind: 'host_isolated'; hostId: HostId }
  | { kind: 'rule_written'; id: string }
  | { kind: 'rule_blocks'; flowSet: string }
  | { kind: 'rule_fp_below'; max: number }
  | { kind: 'alerts_triaged'; setId: string }
  | { kind: 'intel_verified'; claim: string }
  | { kind: 'report_submitted'; id: string }
  | { kind: 'noise_below'; n: number }
  | { kind: 'scope_strikes_below'; n: number }
  | { kind: 'custom'; name: string; args?: Record<string, unknown> };

export type GoalExpr =
  | { all: GoalExpr[] }
  | { any: GoalExpr[] }
  | { not: GoalExpr }
  | GoalAtom;

/** Save envelope (§4.7). */
export interface SaveEnvelope {
  schemaVersion: number;
  contentHash: string;
  seed: number;
  profile: Profile;
  campaign: GameEvent[];
  session?: { missionId: string; events: GameEvent[] };
}

export interface Profile {
  name: string;
  wallet: number; // credits ₡
  trust: number; // 0..1
  evidenceIntegrity: number; // 0..1
  noise: number; // 0..N
  ownedTools: string[];
  purchasedTools: string[];
  track?: 'red' | 'blue' | 'shared';
  /** which missions completed, by id */
  completedMissions: string[];
  /** which field assignments verified by lab evidence */
  fieldVerified: string[];
  /** reputation / rank */
  rank: string;
  /** ADR-generated news log */
  seenNews: string[];
}

/** Errors thrown by validateWorld — used by transcript tests. */
export class WorldValidationError extends Error {
  constructor(
    public readonly path: string,
    message: string,
  ) {
    super(`world.${path}: ${message}`);
  }
}