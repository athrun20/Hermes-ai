/**
 * TF-aware freshness classification.
 * CoinGecko is never assumed exchange-grade real-time.
 */

import type { DataQuality, Timeframe } from "@/lib/market-data/types";
import { timeframeIntervalMs } from "@/lib/market-data/timeframe-map";

export type FreshnessInput = {
  sourceTimestamp: number;
  receivedTimestamp: number;
  now?: number;
  timeframe?: Timeframe;
  /** Public aggregators are delayed-capable even when "fresh". */
  mayBeDelayed?: boolean;
  /** Force fixture / unavailable without age math. */
  forcedQuality?: DataQuality;
  missingCriticalFields?: boolean;
};

/**
 * Classify displayable quality from timestamps + TF cadence.
 * Live only when policy genuinely qualifies (and not mayBeDelayed public feeds).
 */
export function classifyFreshness(input: FreshnessInput): DataQuality {
  if (input.forcedQuality) return input.forcedQuality;
  if (input.missingCriticalFields) return "Partial";

  const now = input.now ?? Date.now();
  const age = Math.max(0, now - input.sourceTimestamp);
  const receiveLag = Math.max(0, input.receivedTimestamp - input.sourceTimestamp);

  const tf = input.timeframe ?? "1H";
  const interval = timeframeIntervalMs(tf);
  // Cadence windows scale with TF — not one universal stale threshold.
  const liveMax = Math.min(interval * 0.25, tf === "1D" || tf === "1W" ? 45 * 60_000 : 5 * 60_000);
  const delayedMax = Math.min(interval * 1.5, tf === "1D" || tf === "1W" ? 6 * 60 * 60_000 : 30 * 60_000);
  const staleMax = Math.min(interval * 6, tf === "1D" || tf === "1W" ? 48 * 60 * 60_000 : 3 * 60 * 60_000);

  if (!Number.isFinite(input.sourceTimestamp) || input.sourceTimestamp <= 0) {
    return "Unavailable";
  }
  if (age > staleMax) return "Stale";
  if (age > delayedMax || receiveLag > delayedMax) return "Delayed";

  // Public aggregators (CoinGecko): even "fresh" data is Delayed, not Live.
  if (input.mayBeDelayed) {
    return age <= liveMax ? "Delayed" : "Delayed";
  }

  if (age <= liveMax) return "Live";
  if (age <= delayedMax) return "Delayed";
  return "Stale";
}

export function computeDelayMs(sourceTimestamp: number, receivedTimestamp: number): number {
  if (!Number.isFinite(sourceTimestamp) || !Number.isFinite(receivedTimestamp)) return 0;
  return Math.max(0, receivedTimestamp - sourceTimestamp);
}
