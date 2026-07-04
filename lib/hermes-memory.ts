import type { CoinSymbol } from "@/lib/market-data";
import type { ClosedTrade, JournalEntry, PositionSide } from "@/lib/paper-trading";

export type MemorySignal = "positive" | "negative" | "neutral";
export type MemoryScoreBand = "Excellent" | "Strong" | "Developing" | "Needs Work";
export type MemoryCadence = "inactive" | "selective" | "steady" | "active" | "overtrading";

export type MemoryTradeRecord = {
  id: string;
  symbol: CoinSymbol;
  side: PositionSide;
  entryPrice: number;
  exitPrice: number;
  pnl: number;
  returnPct: number;
  rMultiple: number | null;
  riskRewardRatio: number | null;
  holdMinutes: number;
  followedPlan: boolean;
  qualityScore: number;
  openedAt: number;
  closedAt: number;
  setup: string;
};

export type AssetPerformance = {
  symbol: CoinSymbol;
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
  totalPnl: number;
  averagePnl: number;
  averageRMultiple: number | null;
};

export type SetupPreference = {
  setup: string;
  trades: number;
  winRate: number;
  averagePnl: number;
};

export type EmotionalPattern = {
  label: string;
  signal: MemorySignal;
  occurrences: number;
  detail: string;
};

export type MemoryScores = {
  riskManagement: number;
  patience: number;
  discipline: number;
};

export type TradingFrequency = {
  cadence: MemoryCadence;
  tradesPerWeek: number;
  tradesPerMonth: number;
  activeDays: number;
  detail: string;
};

export type HermesMemoryState = {
  kind: "hermes-memory-v1";
  version: 1;
  updatedAt: number;
  tradeCount: number;
  trades: MemoryTradeRecord[];
  metrics: {
    winRate: number;
    averageRMultiple: number | null;
    averageHoldMinutes: number;
    realizedPnl: number;
    averagePnl: number;
  };
  assets: {
    best: AssetPerformance[];
    worst: AssetPerformance[];
    all: AssetPerformance[];
  };
  tradingFrequency: TradingFrequency;
  preferredSetups: SetupPreference[];
  emotionalPatterns: EmotionalPattern[];
  scores: MemoryScores;
};

export type UserProfile = {
  kind: "hermes-user-profile";
  generatedAt: number;
  tradeCount: number;
  winRate: number;
  averageRMultiple: number | null;
  bestAssets: AssetPerformance[];
  weakestAssets: AssetPerformance[];
  preferredSetups: SetupPreference[];
  scores: MemoryScores;
  summary: string;
};

export type PeriodInsight = {
  kind: "hermes-weekly-insights" | "hermes-monthly-insights";
  generatedAt: number;
  periodStart: number;
  periodEnd: number;
  tradeCount: number;
  winRate: number;
  averageRMultiple: number | null;
  averageHoldMinutes: number;
  realizedPnl: number;
  highlights: string[];
  risks: string[];
  nextActions: string[];
};

export type TradingPersonalityProfile = {
  kind: "hermes-trading-personality";
  generatedAt: number;
  archetype: string;
  confidenceStyle: string;
  riskStyle: string;
  executionStyle: string;
  strengths: string[];
  blindSpots: string[];
  coachingPrompt: string;
};

export type HermesMemorySnapshot = {
  kind: "hermes-memory-snapshot";
  updatedAt: number;
  trades: MemoryTradeRecord[];
  performance: {
    totalTrades: number;
    winRate: number;
    averageProfitLoss: number;
    averageRMultiple: number | null;
    averageHoldMinutes: number;
    bestPerformingAsset: CoinSymbol | "N/A";
    worstPerformingAsset: CoinSymbol | "N/A";
  };
  behavior: {
    earlyExitsFrequency: number;
    revengeTradingDetected: boolean;
    overtradingDetected: boolean;
    holdingWinnersTooShort: boolean;
    cuttingLossesTooLate: boolean;
    emotionalPatterns: EmotionalPattern[];
  };
  strategyPreference: {
    breakoutTrader: number;
    reversalTrader: number;
    scalper: number;
    swingTrader: number;
    dominantStyle: "breakout" | "reversal" | "scalper" | "swing" | "balanced" | "unknown";
  };
  strengths: string[];
  weaknesses: string[];
  personality: string;
  scores: MemoryScores;
};

const HERMES_MEMORY_STORAGE_KEY = "hermes-memory-v1";
let runtimeMemory: HermesMemoryState | null = null;

export function updateHermesMemory(trade: ClosedTrade): HermesMemorySnapshot {
  const memory = updateMemory({
    previousMemory: readPersistedMemoryState(),
    completedTrades: [trade],
  });

  persistMemoryState(memory);
  return toHermesMemorySnapshot(memory);
}

export function getHermesMemory(): HermesMemorySnapshot {
  return toHermesMemorySnapshot(readPersistedMemoryState());
}

export function getWeeklyInsights(): PeriodInsight {
  return generateWeeklyInsights({ memory: readPersistedMemoryState() });
}

export function getMonthlyInsights(): PeriodInsight {
  return generateMonthlyInsights({ memory: readPersistedMemoryState() });
}

export function detectTradingPersonality(): TradingPersonalityProfile {
  return generateTradingPersonality(readPersistedMemoryState());
}

export function updateMemory({
  previousMemory,
  completedTrades = [],
  journalEntries = [],
  now = Date.now(),
}: {
  previousMemory?: HermesMemoryState;
  completedTrades?: ClosedTrade[];
  journalEntries?: JournalEntry[];
  now?: number;
} = {}): HermesMemoryState {
  const tradeMap = new Map<string, MemoryTradeRecord>();
  previousMemory?.trades.forEach((trade) => {
    tradeMap.set(trade.id, trade);
  });
  completedTrades.forEach((trade) => {
    tradeMap.set(trade.id, toMemoryTradeRecord(trade, journalEntries));
  });

  const trades = Array.from(tradeMap.values()).sort((a, b) => b.closedAt - a.closedAt);
  const assetPerformance = rankAssetPerformance(trades);
  const preferredSetups = rankPreferredSetups(trades);

  return {
    kind: "hermes-memory-v1",
    version: 1,
    updatedAt: now,
    tradeCount: trades.length,
    trades,
    metrics: {
      winRate: percent(trades.filter((trade) => trade.pnl > 0).length, trades.length),
      averageRMultiple: nullableAverage(trades.map((trade) => trade.rMultiple)),
      averageHoldMinutes: Math.round(average(trades.map((trade) => trade.holdMinutes))),
      realizedPnl: round(trades.reduce((sum, trade) => sum + trade.pnl, 0)),
      averagePnl: round(average(trades.map((trade) => trade.pnl))),
    },
    assets: {
      best: assetPerformance.slice(0, 3),
      worst: [...assetPerformance].reverse().slice(0, 3),
      all: assetPerformance,
    },
    tradingFrequency: calculateTradingFrequency(trades, now),
    preferredSetups,
    emotionalPatterns: detectEmotionalPatterns(trades, journalEntries),
    scores: {
      riskManagement: calculateRiskManagementScore(trades),
      patience: calculatePatienceScore(trades),
      discipline: calculateDisciplineScore(trades),
    },
  };
}

export function generateUserProfile(memory: HermesMemoryState): UserProfile {
  return {
    kind: "hermes-user-profile",
    generatedAt: memory.updatedAt,
    tradeCount: memory.tradeCount,
    winRate: memory.metrics.winRate,
    averageRMultiple: memory.metrics.averageRMultiple,
    bestAssets: memory.assets.best,
    weakestAssets: memory.assets.worst,
    preferredSetups: memory.preferredSetups,
    scores: memory.scores,
    summary: buildUserSummary(memory),
  };
}

export function generateWeeklyInsights({
  memory,
  now = Date.now(),
}: {
  memory: HermesMemoryState;
  now?: number;
}): PeriodInsight {
  return generatePeriodInsights({
    kind: "hermes-weekly-insights",
    memory,
    periodStart: now - 7 * 24 * 60 * 60 * 1000,
    periodEnd: now,
  });
}

export function generateMonthlyInsights({
  memory,
  now = Date.now(),
}: {
  memory: HermesMemoryState;
  now?: number;
}): PeriodInsight {
  return generatePeriodInsights({
    kind: "hermes-monthly-insights",
    memory,
    periodStart: now - 30 * 24 * 60 * 60 * 1000,
    periodEnd: now,
  });
}

export function generateTradingPersonality(memory: HermesMemoryState): TradingPersonalityProfile {
  const longCount = memory.trades.filter((trade) => trade.side === "Long").length;
  const shortCount = memory.trades.filter((trade) => trade.side === "Short").length;
  const scoreAverage = average([
    memory.scores.riskManagement,
    memory.scores.patience,
    memory.scores.discipline,
  ]);
  const archetype =
    memory.tradingFrequency.cadence === "overtrading"
      ? "High-tempo operator"
      : longCount > shortCount * 1.5
        ? "Trend-seeking long trader"
        : shortCount > longCount * 1.5
          ? "Short-side tactician"
          : "Balanced market tactician";

  return {
    kind: "hermes-trading-personality",
    generatedAt: memory.updatedAt,
    archetype,
    confidenceStyle:
      memory.metrics.winRate >= 60
        ? "Builds confidence through confirmation and repeatable wins."
        : "Still developing confidence and benefits from stricter setup filters.",
    riskStyle:
      memory.scores.riskManagement >= 75
        ? "Measured risk manager"
        : "Risk process needs firmer pre-trade rules",
    executionStyle:
      memory.scores.patience >= 75
        ? "Patient executor"
        : "Fast executor who should slow down exits and invalidation checks",
    strengths: buildPersonalityStrengths(memory, scoreAverage),
    blindSpots: buildPersonalityBlindSpots(memory),
    coachingPrompt: "Before the next paper trade, write the setup, invalidation level, target, and reason the trade deserves risk.",
  };
}

function toHermesMemorySnapshot(memory: HermesMemoryState): HermesMemorySnapshot {
  const strategyPreference = detectStrategyPreference(memory.trades);
  const behavior = detectBehaviorSummary(memory);

  return {
    kind: "hermes-memory-snapshot",
    updatedAt: memory.updatedAt,
    trades: memory.trades,
    performance: {
      totalTrades: memory.tradeCount,
      winRate: memory.metrics.winRate,
      averageProfitLoss: memory.metrics.averagePnl,
      averageRMultiple: memory.metrics.averageRMultiple,
      averageHoldMinutes: memory.metrics.averageHoldMinutes,
      bestPerformingAsset: memory.assets.best[0]?.symbol ?? "N/A",
      worstPerformingAsset: memory.assets.worst[0]?.symbol ?? "N/A",
    },
    behavior,
    strategyPreference,
    strengths: detectTopStrengths(memory, strategyPreference).slice(0, 3),
    weaknesses: detectTopWeaknesses(memory, behavior).slice(0, 3),
    personality: generateTradingPersonality(memory).archetype,
    scores: memory.scores,
  };
}

function readPersistedMemoryState(): HermesMemoryState {
  if (typeof window === "undefined") {
    runtimeMemory ??= createEmptyMemory();
    return runtimeMemory;
  }

  try {
    const stored = window.localStorage.getItem(HERMES_MEMORY_STORAGE_KEY);
    if (!stored) {
      runtimeMemory ??= createEmptyMemory();
      return runtimeMemory;
    }

    const parsed = JSON.parse(stored) as HermesMemoryState;
    if (parsed?.kind !== "hermes-memory-v1" || !Array.isArray(parsed.trades)) {
      runtimeMemory ??= createEmptyMemory();
      return runtimeMemory;
    }

    runtimeMemory = parsed;
    return parsed;
  } catch {
    runtimeMemory ??= createEmptyMemory();
    return runtimeMemory;
  }
}

function persistMemoryState(memory: HermesMemoryState) {
  runtimeMemory = memory;

  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(HERMES_MEMORY_STORAGE_KEY, JSON.stringify(memory));
  } catch {
    // Memory remains available in runtime state if browser storage is unavailable.
  }
}

function createEmptyMemory(): HermesMemoryState {
  return updateMemory({
    completedTrades: [],
    now: Date.now(),
  });
}

function detectBehaviorSummary(memory: HermesMemoryState): HermesMemorySnapshot["behavior"] {
  const earlyExits = memory.trades.filter(
    (trade) => trade.pnl > 0 && trade.holdMinutes < 10,
  ).length;
  const losingTrades = memory.trades.filter((trade) => trade.pnl < 0);
  const lateLosses = losingTrades.filter(
    (trade) => trade.returnPct <= -2.5 || (trade.rMultiple !== null && trade.rMultiple <= -1.2),
  ).length;
  const winnersHeldTooShort = memory.trades.filter(
    (trade) => trade.pnl > 0 && trade.holdMinutes < 15,
  ).length;

  return {
    earlyExitsFrequency: percent(earlyExits, memory.tradeCount),
    revengeTradingDetected: countPostLossTradeBursts(memory.trades) > 0,
    overtradingDetected: memory.tradingFrequency.cadence === "overtrading",
    holdingWinnersTooShort: winnersHeldTooShort > Math.max(1, memory.tradeCount * 0.25),
    cuttingLossesTooLate: lateLosses > Math.max(1, losingTrades.length * 0.35),
    emotionalPatterns: memory.emotionalPatterns,
  };
}

function detectStrategyPreference(trades: MemoryTradeRecord[]): HermesMemorySnapshot["strategyPreference"] {
  const styleCounts = {
    breakoutTrader: 0,
    reversalTrader: 0,
    scalper: 0,
    swingTrader: 0,
  };

  trades.forEach((trade) => {
    const setup = trade.setup.toLowerCase();
    if (setup.includes("breakout") || setup.includes("momentum")) styleCounts.breakoutTrader += 1;
    if (setup.includes("reversal") || setup.includes("reclaim")) styleCounts.reversalTrader += 1;
    if (setup.includes("scalp") || trade.holdMinutes <= 10) styleCounts.scalper += 1;
    if (setup.includes("swing") || trade.holdMinutes >= 240) styleCounts.swingTrader += 1;
  });

  const ranked = Object.entries(styleCounts).sort(([, a], [, b]) => b - a);
  const [topStyle, topCount] = ranked[0] ?? ["unknown", 0];
  const secondCount = ranked[1]?.[1] ?? 0;
  const dominantStyle =
    topCount === 0
      ? "unknown"
      : topCount === secondCount
        ? "balanced"
        : styleNameToPreference(topStyle);

  return {
    ...styleCounts,
    dominantStyle,
  };
}

function detectTopStrengths(
  memory: HermesMemoryState,
  strategyPreference: HermesMemorySnapshot["strategyPreference"],
) {
  const strengths: string[] = [];

  if (memory.metrics.winRate >= 55) strengths.push("Positive win rate across completed paper trades.");
  if ((memory.metrics.averageRMultiple ?? 0) >= 1.5) strengths.push("Average R multiple shows reward discipline.");
  if (memory.scores.riskManagement >= 70) strengths.push("Risk management process is becoming consistent.");
  if (memory.scores.patience >= 70) strengths.push("Average hold time suggests patient execution.");
  if (strategyPreference.dominantStyle !== "unknown") {
    strengths.push(`Clear ${strategyPreference.dominantStyle} strategy preference is forming.`);
  }

  return strengths.length > 0 ? strengths : ["Completed trades are creating useful coaching data."];
}

function detectTopWeaknesses(
  memory: HermesMemoryState,
  behavior: HermesMemorySnapshot["behavior"],
) {
  const weaknesses: string[] = [];

  if (behavior.earlyExitsFrequency >= 30) weaknesses.push("Early exits are appearing too frequently.");
  if (behavior.revengeTradingDetected) weaknesses.push("Post-loss trade bursts suggest possible revenge trading.");
  if (behavior.overtradingDetected) weaknesses.push("Trade frequency is high enough to reduce selectivity.");
  if (behavior.holdingWinnersTooShort) weaknesses.push("Winning trades are often held too briefly.");
  if (behavior.cuttingLossesTooLate) weaknesses.push("Some losing trades are being cut too late.");
  if (memory.scores.discipline < 65) weaknesses.push("Discipline score needs stronger plan adherence.");

  return weaknesses.length > 0 ? weaknesses : ["No major rule-based weakness detected yet."];
}

function generatePeriodInsights({
  kind,
  memory,
  periodStart,
  periodEnd,
}: {
  kind: PeriodInsight["kind"];
  memory: HermesMemoryState;
  periodStart: number;
  periodEnd: number;
}): PeriodInsight {
  const trades = memory.trades.filter(
    (trade) => trade.closedAt >= periodStart && trade.closedAt <= periodEnd,
  );
  const wins = trades.filter((trade) => trade.pnl > 0);
  const losses = trades.filter((trade) => trade.pnl < 0);
  const averageRMultiple = nullableAverage(trades.map((trade) => trade.rMultiple));
  const realizedPnl = round(trades.reduce((sum, trade) => sum + trade.pnl, 0));

  return {
    kind,
    generatedAt: periodEnd,
    periodStart,
    periodEnd,
    tradeCount: trades.length,
    winRate: percent(wins.length, trades.length),
    averageRMultiple,
    averageHoldMinutes: Math.round(average(trades.map((trade) => trade.holdMinutes))),
    realizedPnl,
    highlights: buildPeriodHighlights({ trades, wins, realizedPnl, averageRMultiple }),
    risks: buildPeriodRisks({ trades, losses, memory }),
    nextActions: buildPeriodNextActions({ trades, memory }),
  };
}

function toMemoryTradeRecord(
  trade: ClosedTrade,
  journalEntries: JournalEntry[],
): MemoryTradeRecord {
  return {
    id: trade.id,
    symbol: trade.symbol,
    side: trade.side,
    entryPrice: round(trade.entryPrice),
    exitPrice: round(trade.exitPrice),
    pnl: round(trade.pnl),
    returnPct: round(trade.returnPct),
    rMultiple: calculateRMultiple(trade),
    riskRewardRatio: calculateRiskRewardRatio(trade),
    holdMinutes: Math.max(1, Math.round((trade.closedAt - trade.openedAt) / 60000)),
    followedPlan: trade.followedPlan,
    qualityScore: trade.qualityScore,
    openedAt: trade.openedAt,
    closedAt: trade.closedAt,
    setup: inferSetup(trade, journalEntries),
  };
}

function memoryRecordToClosedTrade(record: MemoryTradeRecord): ClosedTrade {
  return {
    id: record.id,
    symbol: record.symbol,
    side: record.side,
    entryPrice: record.entryPrice,
    exitPrice: record.exitPrice,
    quantity: 1,
    notional: Math.abs(record.pnl) > 0 && Math.abs(record.returnPct) > 0
      ? Math.abs(record.pnl / (record.returnPct / 100))
      : 0,
    stopLoss: undefined,
    takeProfit: undefined,
    openedAt: record.openedAt,
    closedAt: record.closedAt,
    pnl: record.pnl,
    returnPct: record.returnPct,
    followedPlan: record.followedPlan,
    qualityScore: record.qualityScore,
    coach: {
      grade: "C",
      doneWell: "",
      wentWrong: "",
      riskManagement: "",
      entryFeedback: "",
      exitFeedback: "",
      improvement: "",
    },
  };
}

function rankAssetPerformance(trades: MemoryTradeRecord[]): AssetPerformance[] {
  const grouped = new Map<CoinSymbol, MemoryTradeRecord[]>();
  trades.forEach((trade) => {
    grouped.set(trade.symbol, [...(grouped.get(trade.symbol) ?? []), trade]);
  });

  return Array.from(grouped.entries())
    .map(([symbol, symbolTrades]) => {
      const wins = symbolTrades.filter((trade) => trade.pnl > 0).length;
      const losses = symbolTrades.filter((trade) => trade.pnl < 0).length;
      const totalPnl = symbolTrades.reduce((sum, trade) => sum + trade.pnl, 0);

      return {
        symbol,
        trades: symbolTrades.length,
        wins,
        losses,
        winRate: percent(wins, symbolTrades.length),
        totalPnl: round(totalPnl),
        averagePnl: round(average(symbolTrades.map((trade) => trade.pnl))),
        averageRMultiple: nullableAverage(symbolTrades.map((trade) => trade.rMultiple)),
      };
    })
    .sort((a, b) => b.totalPnl - a.totalPnl);
}

function rankPreferredSetups(trades: MemoryTradeRecord[]): SetupPreference[] {
  const grouped = new Map<string, MemoryTradeRecord[]>();
  trades.forEach((trade) => {
    grouped.set(trade.setup, [...(grouped.get(trade.setup) ?? []), trade]);
  });

  return Array.from(grouped.entries())
    .map(([setup, setupTrades]) => {
      const wins = setupTrades.filter((trade) => trade.pnl > 0).length;

      return {
        setup,
        trades: setupTrades.length,
        winRate: percent(wins, setupTrades.length),
        averagePnl: round(average(setupTrades.map((trade) => trade.pnl))),
      };
    })
    .sort((a, b) => b.trades - a.trades || b.averagePnl - a.averagePnl)
    .slice(0, 5);
}

function calculateTradingFrequency(
  trades: MemoryTradeRecord[],
  now: number,
): TradingFrequency {
  const lastSevenDays = trades.filter((trade) => trade.closedAt >= now - 7 * 24 * 60 * 60 * 1000);
  const lastThirtyDays = trades.filter((trade) => trade.closedAt >= now - 30 * 24 * 60 * 60 * 1000);
  const activeDays = new Set(
    lastThirtyDays.map((trade) => new Date(trade.closedAt).toDateString()),
  ).size;
  const tradesPerWeek = round(lastSevenDays.length);
  const tradesPerMonth = round(lastThirtyDays.length);
  const cadence: MemoryCadence =
    tradesPerMonth === 0
      ? "inactive"
      : tradesPerWeek <= 2
        ? "selective"
        : tradesPerWeek <= 7
          ? "steady"
          : tradesPerWeek <= 14
            ? "active"
            : "overtrading";

  return {
    cadence,
    tradesPerWeek,
    tradesPerMonth,
    activeDays,
    detail: buildFrequencyDetail(cadence),
  };
}

function detectEmotionalPatterns(
  trades: MemoryTradeRecord[],
  journalEntries: JournalEntry[],
): EmotionalPattern[] {
  const veryFastTrades = trades.filter((trade) => trade.holdMinutes < 5).length;
  const missingPlans = trades.filter((trade) => !trade.followedPlan).length;
  const earlyJournalMentions = journalEntries.filter((entry) =>
    entry.setup.toLowerCase().includes("early"),
  ).length;
  const lossClusters = countConsecutiveLossClusters(trades);
  const oversizedLosses = trades.filter((trade) => trade.returnPct <= -3).length;

  return [
    {
      label: "Impulse entries",
      signal: veryFastTrades + earlyJournalMentions > trades.length * 0.3 ? "negative" : "neutral",
      occurrences: veryFastTrades + earlyJournalMentions,
      detail: "Very short holds or early-entry journal notes can indicate impatient execution.",
    },
    {
      label: "Plan avoidance",
      signal: missingPlans > trades.length * 0.35 ? "negative" : "positive",
      occurrences: missingPlans,
      detail: "Trades without plan adherence weaken review quality and discipline.",
    },
    {
      label: "Loss response",
      signal: lossClusters > 0 || oversizedLosses > 0 ? "negative" : "neutral",
      occurrences: lossClusters + oversizedLosses,
      detail: "Clusters of losses or oversized losses can signal emotional follow-up decisions.",
    },
  ];
}

function calculateRiskManagementScore(trades: MemoryTradeRecord[]) {
  if (trades.length === 0) return 50;

  const plannedRate = percent(trades.filter((trade) => trade.followedPlan).length, trades.length);
  const averageRMultiple = nullableAverage(trades.map((trade) => trade.rMultiple)) ?? 0;
  const largeLossPenalty = trades.filter((trade) => trade.returnPct <= -3).length * 7;
  return clamp(plannedRate * 0.65 + Math.max(0, averageRMultiple) * 12 + 25 - largeLossPenalty);
}

function calculatePatienceScore(trades: MemoryTradeRecord[]) {
  if (trades.length === 0) return 50;

  const averageHoldMinutes = average(trades.map((trade) => trade.holdMinutes));
  const fastTradePenalty = percent(trades.filter((trade) => trade.holdMinutes < 5).length, trades.length) * 0.4;
  return clamp(45 + Math.min(35, averageHoldMinutes / 2) - fastTradePenalty);
}

function calculateDisciplineScore(trades: MemoryTradeRecord[]) {
  if (trades.length === 0) return 50;

  const plannedRate = percent(trades.filter((trade) => trade.followedPlan).length, trades.length);
  const qualityAverage = average(trades.map((trade) => trade.qualityScore));
  return clamp(plannedRate * 0.55 + qualityAverage * 0.45);
}

function buildUserSummary(memory: HermesMemoryState) {
  if (memory.tradeCount === 0) {
    return "Hermes Memory is ready, but needs completed paper trades before forming a reliable profile.";
  }

  const best = memory.assets.best[0]?.symbol ?? "N/A";
  const cadence = memory.tradingFrequency.cadence;
  return `Profile built from ${memory.tradeCount} completed trades. Win rate is ${memory.metrics.winRate}% with ${memory.metrics.averageRMultiple ?? 0} average R, strongest asset ${best}, and ${cadence} trading cadence.`;
}

function buildPersonalityStrengths(memory: HermesMemoryState, scoreAverage: number) {
  const strengths: string[] = [];

  if (memory.scores.riskManagement >= 70) strengths.push("Usually defines risk before reviewing trades.");
  if (memory.scores.patience >= 70) strengths.push("Shows patience through healthier average hold time.");
  if (memory.scores.discipline >= 70) strengths.push("Maintains discipline across plan adherence and trade quality.");
  if (memory.metrics.winRate >= 55) strengths.push("Recent outcomes show a positive win-rate profile.");
  if (scoreAverage < 70) strengths.push("Keeps generating paper data that Hermes can coach from.");

  return strengths;
}

function buildPersonalityBlindSpots(memory: HermesMemoryState) {
  const blindSpots: string[] = [];

  if (memory.scores.riskManagement < 65) blindSpots.push("Risk definition needs to be more consistent before entry.");
  if (memory.scores.patience < 65) blindSpots.push("May close or rotate trades before the thesis has enough time.");
  if (memory.scores.discipline < 65) blindSpots.push("Plan adherence and execution quality need tighter repetition.");
  if (memory.tradingFrequency.cadence === "overtrading") blindSpots.push("High trade frequency may be reducing selectivity.");

  return blindSpots.length > 0 ? blindSpots : ["May become overconfident after a run of clean paper trades."];
}

function buildPeriodHighlights({
  trades,
  wins,
  realizedPnl,
  averageRMultiple,
}: {
  trades: MemoryTradeRecord[];
  wins: MemoryTradeRecord[];
  realizedPnl: number;
  averageRMultiple: number | null;
}) {
  if (trades.length === 0) {
    return ["No completed paper trades in this period."];
  }

  return [
    `${wins.length} winning trades out of ${trades.length}.`,
    `Realized paper P/L was ${realizedPnl}.`,
    averageRMultiple ? `Average R multiple was ${averageRMultiple}.` : "Average R multiple needs more complete stop-loss data.",
  ];
}

function buildPeriodRisks({
  trades,
  losses,
  memory,
}: {
  trades: MemoryTradeRecord[];
  losses: MemoryTradeRecord[];
  memory: HermesMemoryState;
}) {
  const risks: string[] = [];

  if (trades.length === 0) risks.push("No fresh trade sample is available.");
  if (losses.length > trades.length * 0.45) risks.push("Loss rate was elevated during this period.");
  if (memory.scores.riskManagement < 65) risks.push("Risk management score remains below Hermes standards.");
  if (memory.scores.patience < 65) risks.push("Patience score suggests exits or rotations may be too fast.");

  return risks.length > 0 ? risks : ["No major rule-based risk pattern detected."];
}

function buildPeriodNextActions({
  trades,
  memory,
}: {
  trades: MemoryTradeRecord[];
  memory: HermesMemoryState;
}) {
  const bestAsset = memory.assets.best[0]?.symbol;

  return [
    bestAsset ? `Favor only clean ${bestAsset} paper setups until the pattern changes.` : "Build more sample size before increasing conviction.",
    trades.some((trade) => !trade.followedPlan)
      ? "Require entry, stop, and target before every paper trade."
      : "Keep the pre-trade plan checklist unchanged.",
    memory.scores.patience < 65
      ? "Hold trades until invalidation or target unless the thesis clearly changes."
      : "Continue reviewing whether exits match the original plan.",
  ];
}

function styleNameToPreference(style: string): HermesMemorySnapshot["strategyPreference"]["dominantStyle"] {
  if (style === "breakoutTrader") return "breakout";
  if (style === "reversalTrader") return "reversal";
  if (style === "scalper") return "scalper";
  if (style === "swingTrader") return "swing";
  return "unknown";
}

function countPostLossTradeBursts(trades: MemoryTradeRecord[]) {
  let bursts = 0;
  const sortedTrades = [...trades].sort((a, b) => a.closedAt - b.closedAt);

  sortedTrades.forEach((trade, index) => {
    if (trade.pnl >= 0) {
      return;
    }

    const nextTrades = sortedTrades.slice(index + 1).filter(
      (nextTrade) => nextTrade.openedAt - trade.closedAt <= 60 * 60 * 1000,
    );

    if (nextTrades.length >= 2) {
      bursts += 1;
    }
  });

  return bursts;
}

function calculateRiskRewardRatio(trade: ClosedTrade) {
  if (!trade.stopLoss || !trade.takeProfit) return null;

  const risk = Math.abs(trade.entryPrice - trade.stopLoss);
  const reward = Math.abs(trade.takeProfit - trade.entryPrice);
  return risk > 0 ? round(reward / risk) : null;
}

function calculateRMultiple(trade: ClosedTrade) {
  if (!trade.stopLoss) return null;

  const risk = Math.abs(trade.entryPrice - trade.stopLoss);
  if (risk <= 0) return null;

  const result =
    trade.side === "Long"
      ? trade.exitPrice - trade.entryPrice
      : trade.entryPrice - trade.exitPrice;
  return round(result / risk);
}

function inferSetup(trade: ClosedTrade, journalEntries: JournalEntry[]) {
  const journalMatch = journalEntries.find((entry) => entry.pair.startsWith(trade.symbol));
  if (journalMatch?.setup) return normalizeSetup(journalMatch.setup);
  if (trade.returnPct > 2 && trade.closedAt - trade.openedAt >= 60 * 60 * 1000) {
    return "trend continuation";
  }

  if (trade.side === "Short") return "short setup";
  return "long setup";
}

function normalizeSetup(setup: string) {
  return setup.trim().toLowerCase() || "unlabeled setup";
}

function countConsecutiveLossClusters(trades: MemoryTradeRecord[]) {
  let clusters = 0;
  let streak = 0;

  [...trades]
    .sort((a, b) => a.closedAt - b.closedAt)
    .forEach((trade) => {
      if (trade.pnl < 0) {
        streak += 1;
        if (streak === 3) clusters += 1;
      } else {
        streak = 0;
      }
    });

  return clusters;
}

function buildFrequencyDetail(cadence: MemoryCadence) {
  if (cadence === "inactive") return "No completed paper trades in the last 30 days.";
  if (cadence === "selective") return "Low frequency suggests selective trading.";
  if (cadence === "steady") return "Steady frequency with enough sample size for coaching.";
  if (cadence === "active") return "Active frequency; review selectivity before adding more trades.";
  return "Very high frequency may indicate overtrading.";
}

function average(values: number[]) {
  return values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function nullableAverage(values: Array<number | null>) {
  const validValues = values.filter((value): value is number => value !== null);
  return validValues.length > 0 ? round(average(validValues)) : null;
}

function percent(value: number, total: number) {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}
