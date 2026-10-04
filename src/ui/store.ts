/**
 * UI store — minimal pub-sub. State is a tiny struct; events flow through.
 */

export interface UiState {
  route: string;
  missionId: string | null;
  /** index of the latest terminal output block the player can pin */
  lastPinnableId: string | null;
  wallet: number;
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

  on(l: Listener): () => void {
    this.listeners.push(l);
    return () => {
      this.listeners = this.listeners.filter((x) => x !== l);
    };
  }
}