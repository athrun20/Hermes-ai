/**
 * Phase 2 — collect evidence from available adapters + deterministic dedupe.
 */

import type { HermesVisionResult } from "@/lib/hermes-vision-types";
import type { MultiTimeframeIntelligence } from "@/lib/multi-timeframe-types";
import type { InstitutionalFootprintResult } from "@/lib/footprint-types";
import type { NewsIntelligenceResult } from "@/lib/news-types";
import type { SmartChartIntelligenceResult } from "@/lib/smart-chart-intelligence-types";
import type { HermesMemorySnapshot, TradingPersonalityProfile } from "@/lib/hermes-memory";
import type { HermesEvidence, MarketRegime } from "@/lib/intelligence-v2/types";
import type { CoinSymbol } from "@/lib/market-data";
import {
  adaptFootprintEvidence,
  adaptMemoryDnaEvidence,
  adaptMultiTimeframeEvidence,
  adaptNewsEvidence,
  adaptRegimeEvidence,
  adaptSmartChartEvidence,
  adaptVisionEvidence,
} from "@/lib/intelligence-v2/evidence-adapters";
import { dedupeHermesEvidence } from "@/lib/intelligence-v2/dedupe-evidence";

export type CollectEvidenceInput = {
  regime: MarketRegime;
  vision?: HermesVisionResult;
  multiTimeframe?: MultiTimeframeIntelligence;
  footprint?: InstitutionalFootprintResult;
  news?: NewsIntelligenceResult;
  smartChart?: SmartChartIntelligenceResult;
  memory?: HermesMemorySnapshot;
  personality?: TradingPersonalityProfile;
  dailyGoal?: string;
  symbol?: CoinSymbol;
  now?: number;
  /** When true (default), apply deterministic dedupe that preserves contradictions. */
  dedupe?: boolean;
};

export function collectHermesEvidence(input: CollectEvidenceInput): HermesEvidence[] {
  const now = input.now ?? 0;
  const symbol = input.symbol ?? input.regime.symbol;
  const items: HermesEvidence[] = [];

  items.push(...adaptRegimeEvidence(input.regime));

  if (input.vision) {
    items.push(...adaptVisionEvidence(input.vision, { symbol, regime: input.regime, now }));
  }
  if (input.multiTimeframe) {
    items.push(...adaptMultiTimeframeEvidence(input.multiTimeframe, { now, regime: input.regime }));
  }
  if (input.news) {
    items.push(...adaptNewsEvidence(input.news, { now }));
  }
  if (input.footprint) {
    items.push(...adaptFootprintEvidence(input.footprint, { symbol, now }));
  }
  if (input.smartChart) {
    items.push(...adaptSmartChartEvidence(input.smartChart, { symbol, now }));
  }
  if (input.memory) {
    items.push(
      ...adaptMemoryDnaEvidence(input.memory, {
        personality: input.personality,
        dailyGoal: input.dailyGoal,
        now,
        symbol,
      }),
    );
  }

  if (input.dedupe === false) return items;
  return dedupeHermesEvidence(items);
}
