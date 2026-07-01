import { journal } from "@/lib/market-data";
import {
  DEFAULT_SETTINGS,
  STARTING_BALANCE,
  type ClosedTrade,
  type JournalEntry,
  type PaperPosition,
  type PaperSettings,
} from "@/lib/paper-trading";
import type { CoinSymbol, Timeframe } from "@/lib/market-data";

export type PersistedHermesState = {
  version: 1;
  cash: number;
  buyingPower: number;
  positions: PaperPosition[];
  history: ClosedTrade[];
  journalEntries: JournalEntry[];
  settings: PaperSettings;
  selectedSymbol: CoinSymbol;
  timeframe: Timeframe;
  savedAt: number;
};

export const HERMES_STORAGE_KEY = "hermes.v1.3.paper-account";

export const defaultJournalEntries: JournalEntry[] = journal.map((entry, index) => ({
  id: `journal-${index + 1}`,
  ...entry,
}));

export const defaultPersistedState: PersistedHermesState = {
  version: 1,
  cash: STARTING_BALANCE,
  buyingPower: STARTING_BALANCE,
  positions: [],
  history: [],
  journalEntries: defaultJournalEntries,
  settings: DEFAULT_SETTINGS,
  selectedSymbol: "BTC",
  timeframe: "1H",
  savedAt: Date.now(),
};

export function loadHermesState(): PersistedHermesState | null {
  try {
    const raw = window.localStorage.getItem(HERMES_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<PersistedHermesState>;
    if (!Array.isArray(parsed.positions) || !Array.isArray(parsed.history)) {
      return null;
    }

    return {
      ...defaultPersistedState,
      ...parsed,
      settings: {
        ...DEFAULT_SETTINGS,
        ...parsed.settings,
      },
      journalEntries: parsed.journalEntries ?? defaultJournalEntries,
      savedAt: parsed.savedAt ?? Date.now(),
    };
  } catch {
    return null;
  }
}

export function saveHermesState(state: PersistedHermesState): void {
  window.localStorage.setItem(HERMES_STORAGE_KEY, JSON.stringify(state));
}

export function clearHermesState(): void {
  window.localStorage.removeItem(HERMES_STORAGE_KEY);
}
