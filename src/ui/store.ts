/**
 * UI store — minimal pub-sub. State is a tiny struct; events flow through.
 *
 * `factEpoch` ticks on every change to the mission's knownFacts, scope
 * strikes, or other derived counters. The MissionBriefing panel subscribes
 * to it so goal checkboxes update live as the player discovers facts.
 */

export interface UiState {
  route: string;
  missionId: string | null;
  /** index of the latest terminal output block the player can pin */
  lastPinnableId: string | null;
  wallet: number;
  /**
   * Bumped whenever anything the briefing panel cares about changes
   * (facts, scope strikes, intel claims). Increment, don't mutate.
   */
  factEpoch: number;
}

export type Listener = (s: UiState) => void;

export class UiStore {
  private state: UiState;
  private listeners: Listener[] = [];

  constructor(initial: UiState) {
    this.state = initial;
  }

  get(): UiState {
    return this.state;
  }

  set(patch: Partial<UiState>): void {
    this.state = { ...this.state, ...patch };
    for (const l of this.listeners) l(this.state);
  }

  /** Bump factEpoch — subscribers will re-read the mission world. */
  bumpFacts(): void {
    this.state = { ...this.state, factEpoch: this.state.factEpoch + 1 };
    for (const l of this.listeners) l(this.state);
  }

  on(l: Listener): () => void {
    this.listeners.push(l);
    return () => {
      this.listeners = this.listeners.filter((x) => x !== l);
    };
  }
}