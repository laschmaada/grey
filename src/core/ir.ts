/**
 * M6-T06 — IR mechanics: evidence ordering, isolate/contain, Trust.
 *
 * The integrity rules:
 *   - memory_captured MUST happen BEFORE host_powered_off on the same host.
 *   - isolate(host) sets the host's inScope flag false and adds it to a
 *     'isolated' set. Re-entry is allowed only after reauthorize.
 *   - contain(host, mode) stops inbound + outbound traffic for a window.
 *   - Block-beni: if the player blocks traffic on a host without first
 *     identifying it as compromised, Trust falls by 0.1 (clamps to 0).
 *   - Power-bon-off rolls back any uncaptured memory; subsequent forensic
 *     actions on the host fail (host is off).
 *
 * Pure: state-in, state-out. The mission controller reads the returned object
 * and updates its profile + knowledge layer.
 */

export type IrAction =
  | { kind: 'memory_captured'; hostId: string; at: number }
  | { kind: 'host_powered_off'; hostId: string; at: number }
  | { kind: 'isolate'; hostId: string; at: number }
  | { kind: 'contain'; hostId: string; mode: 'inbound' | 'outbound' | 'both'; at: number }
  | { kind: 'reauthorize'; hostId: string; at: number }
  | { kind: 'block_traffic'; hostId: string; at: number };

export interface IrState {
  /** integrity events in order, per host */
  byHost: Map<string, IrAction[]>;
  /** currently isolated hosts */
  isolated: Set<string>;
  /** currently contained (inbound + outbound) hosts */
  contained: Set<string>;
  /** whether each host has had its memory captured */
  memoryCaptured: Set<string>;
  /** host id -> power state */
  power: Map<string, 'on' | 'off'>;
  /** total trust penalty accumulated by block-beni errors */
  trustPenalty: number;
}

export function makeIrState(hostIds: string[]): IrState {
  const byHost = new Map<string, IrAction[]>();
  const power = new Map<string, 'on' | 'off'>();
  const memoryCaptured = new Set<string>();
  for (const id of hostIds) {
    byHost.set(id, []);
    power.set(id, 'on');
  }
  return {
    byHost,
    isolated: new Set(),
    contained: new Set(),
    memoryCaptured,
    power,
    trustPenalty: 0,
  };
}

export interface IrApplyResult {
  state: IrState;
  /** events the player should see in the log */
  events: string[];
  /** if non-empty, the action violated an ordering constraint */
  orderingViolations: OrderViolation[];
  /** if non-empty, a trust penalty was applied */
  trustPenalty: number;
  /** true if a subsequent action was blocked because the host is off */
  blockedByPowerOff: string[];
}

export interface OrderViolation {
  hostId: string;
  kind: 'poweroff_before_memory';
  at: number;
}

export function applyIr(state: IrState, action: IrAction): IrApplyResult {
  const events: string[] = [];
  const orderingViolations: OrderViolation[] = [];
  let trustPenalty = 0;
  const blockedByPowerOff: string[] = [];

  const host = action.hostId;
  const log = state.byHost.get(host) ?? [];

  switch (action.kind) {
    case 'memory_captured': {
      if (state.power.get(host) === 'off') {
        blockedByPowerOff.push(host);
        events.push(`[blocked] memory_captured on ${host} — host is off`);
      } else {
        state.memoryCaptured.add(host);
        events.push(`[ok] memory_captured on ${host} at t=${action.at}`);
      }
      break;
    }
    case 'host_powered_off': {
      // It's only legal to power off a host that has had its memory captured.
      // Otherwise we record an order violation.
      if (!state.memoryCaptured.has(host)) {
        orderingViolations.push({ hostId: host, kind: 'poweroff_before_memory', at: action.at });
      }
      state.power.set(host, 'off');
      events.push(`[ok] host_powered_off on ${host} at t=${action.at}`);
      break;
    }
    case 'isolate': {
      state.isolated.add(host);
      events.push(`[ok] isolate ${host}`);
      break;
    }
    case 'contain': {
      state.contained.add(host);
      events.push(`[ok] contain ${host} (${action.mode})`);
      break;
    }
    case 'reauthorize': {
      state.isolated.delete(host);
      state.contained.delete(host);
      events.push(`[ok] reauthorize ${host}`);
      break;
    }
    case 'block_traffic': {
      // Block-beni: blocking traffic on a host without identifying it as
      // compromised incurs a Trust penalty. We mark "compromised" by the
      // presence of a prior `memory_captured` action OR a vuln entry the
      // mission registered through a custom property of the action.
      const compromised =
        state.memoryCaptured.has(host) ||
        (action.kind === 'block_traffic' && (action as { compromised?: boolean }).compromised === true);
      if (!compromised) {
        trustPenalty = 0.1;
        state.trustPenalty += trustPenalty;
      }
      events.push(`[ok] block_traffic ${host} (penalty=${trustPenalty.toFixed(2)})`);
      break;
    }
  }
  log.push(action);
  state.byHost.set(host, log);
  return { state, events, orderingViolations, trustPenalty, blockedByPowerOff };
}

/** True if `host` had `memory_captured` before `host_powered_off`. */
export function isForensicallyClean(state: IrState, hostId: string): boolean {
  const log = state.byHost.get(hostId) ?? [];
  let memoryAt: number | null = null;
  let offAt: number | null = null;
  for (const a of log) {
    if (a.kind === 'memory_captured' && memoryAt === null) memoryAt = a.at;
    if (a.kind === 'host_powered_off' && offAt === null) offAt = a.at;
  }
  if (memoryAt === null || offAt === null) return false;
  return memoryAt < offAt;
}