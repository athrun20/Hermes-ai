import type { ChartDrawing, ChartTradeLevels } from "@/lib/chart-types";
import type { AssetQuote } from "@/lib/market-data";
import type { WorkspaceTimeframe } from "@/lib/market-universe";
import type { HermesMemorySnapshot } from "@/lib/hermes-memory";
import {
  buildCountertrendWarning,
  calculateAlignmentImpact,
  calculateTimeframeAlignmentScore,
  detectAlignmentPattern,
  getAlignmentStatus,
  getHigherTimeframeDirection,
} from "@/lib/timeframe-alignment-score";
import { analyzeTimeframe } from "@/lib/timeframe-analysis";
import { buildTimeframeContexts } from "@/lib/timeframe-context-builder";
import { buildTimeframeMentorSummary } from "@/lib/timeframe-mentor-summary";
import type { MultiTimeframeIntelligence } from "@/lib/multi-timeframe-types";

export function analyzeMultiTimeframeIntelligence({
  quote,
  activeTimeframe,
  drawings,
  tradeLevels,
  traderMemory,
  traderDna,
  dailyGoal,
}: {
  quote: AssetQuote;
  activeTimeframe: WorkspaceTimeframe;
  drawings: ChartDrawing[];
  tradeLevels: ChartTradeLevels;
  traderMemory: HermesMemorySnapshot;
  traderDna: string;
  dailyGoal: string;
}): MultiTimeframeIntelligence {
  const rows = buildTimeframeContexts({
    quote,
    drawings,
    tradeLevels,
    traderDna,
    dailyGoal,
  }).map(({ timeframe, context }) => analyzeTimeframe({ timeframe, context }));
  const alignmentScore = calculateTimeframeAlignmentScore(rows);
  const pattern = detectAlignmentPattern(rows);
  const countertrendWarning = buildCountertrendWarning(rows, activeTimeframe);
  const alignmentImpact = calculateAlignmentImpact(rows, activeTimeframe) + memoryAdjustment(traderMemory);

  return {
    symbol: quote.symbol,
    activeTimeframe,
    rows,
    alignmentScore,
    status: getAlignmentStatus(alignmentScore, pattern),
    pattern,
    mentorSummary: buildTimeframeMentorSummary(pattern, countertrendWarning),
    alignmentImpact: Math.max(-20, Math.min(20, alignmentImpact)),
    higherTimeframeDirection: getHigherTimeframeDirection(rows),
    countertrendWarning,
  };
}

function memoryAdjustment(memory: HermesMemorySnapshot) {
  if (memory.performance.totalTrades === 0) return 0;
  if (memory.scores.discipline >= 80) return 2;
  if (memory.behavior.overtradingDetected) return -2;
  return 0;
}
