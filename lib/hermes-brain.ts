import type {
  ClosedTrade,
  JournalEntry,
  PaperPosition,
  PerformanceStats,
  PositionSide,
  PortfolioSnapshot,
  TradeGrade,
} from "@/lib/paper-trading";
import { getPositionPnl, getTradeGrade, STARTING_BALANCE } from "@/lib/paper-trading";
import type { AssetQuote, CoinSymbol } from "@/lib/market-data";

export type BrainBias = "Bullish" | "Bearish" | "Neutral";
export type BrainRiskLevel = "Low" | "Moderate" | "Elevated" | "High";
export type BrainSignal = "positive" | "negative" | "neutral";

export type BrainFinding = {
  label: string;
  signal: BrainSignal;
  detail: string;
};

export type TradeAnalysis = {
  kind: "trade-analysis";
  tradeId: string;
  symbol: CoinSymbol;
  side: "Long" | "Short";
  score: number;
  grade: TradeGrade;
  verdict: string;
  pnl: number;
  returnPct: number;
  riskReward: number | null;
  durationMinutes: number;
  findings: BrainFinding[];
  nextBestAction: string;
};

export type PortfolioAnalysis = {
  kind: "portfolio-analysis";
  healthScore: number;
  riskLevel: BrainRiskLevel;
  equity: number;
  buyingPower: number;
  exposure: number;
  openPositionCount: number;
  realizedPnl: number;
  unrealizedPnl: number;
  findings: BrainFinding[];
};

export type TradingHabits = {
  kind: "trading-habits";
  sampleSize: number;
  dominantSide: "Long" | "Short" | "Balanced";
  averageHoldMinutes: number;
  planAdherenceRate: number;
  winRate: number;
  habits: BrainFinding[];
};

export type OpportunityScore = {
  kind: "opportunity-score";
  symbol: CoinSymbol;
  score: number;
  bias: BrainBias;
  grade: TradeGrade;
  components: {
    trend: number;
    riskReward: number;
    volatility: number;
    journalAlignment: number;
    portfolioFit: number;
  };
  explanation: string;
};

export type DailyScroll = {
  kind: "daily-scroll";
  title: string;
  marketPosture: BrainBias;
  priority: string;
  checklist: string[];
  avoid: string[];
  coachingNote: string;
};

export type WeeklyReview = {
  kind: "weekly-review";
  summary: string;
  grade: TradeGrade;
  winRate: number;
  realizedPnl: number;
  strengths: string[];
  weaknesses: string[];
  nextWeekPlan: string[];
};

export type BrainPerformanceStats = PerformanceStats & {
  realizedPnl: number;
};

export type TradingPersonality = {
  kind: "trading-personality";
  archetype: string;
  confidenceStyle: string;
  riskStyle: string;
  strengths: string[];
  blindSpots: string[];
  coachingPrompt: string;
};

export type RiskAssessment = {
  kind: "risk-assessment";
  riskScore: number;
  riskLevel: BrainRiskLevel;
  maxPositionSizeSuggestion: number;
  openExposure: number;
  warnings: BrainFinding[];
  safeguards: string[];
};

export type HermesMemory = {
  kind: "hermes-memory";
  tradeCount: number;
  bestPerformingAsset: CoinSymbol | "N/A";
  weakestAsset: CoinSymbol | "N/A";
  winRate: number;
  averagePnl: number;
  averageHoldMinutes: number;
  repeatedMistakes: string[];
  strengths: string[];
  commonTradeType: "long" | "short" | "breakout" | "reversal" | "scalp" | "balanced" | "unknown";
  coachingInsight: string;
};

export type OpportunityScanItem = {
  asset: CoinSymbol;
  setupScore: number;
  bias: BrainBias;
  riskLevel: BrainRiskLevel;
  reason: string;
  suggestedAction: "Watch" | "Wait" | "Paper Trade Setup";
};

export type OpportunityScannerResult = {
  kind: "opportunity-scanner";
  generatedAt: number;
  topAsset: CoinSymbol;
  items: OpportunityScanItem[];
};

export type TradeTicketSuggestion = {
  value: number;
  confidence: number;
  explanation: string;
};

export type TradePlanVerdict = {
  label: "Strong Setup" | "Caution" | "Avoid";
  confidence: number;
  explanation: string;
};

export type TradeTicketSuggestions = {
  kind: "trade-ticket-suggestions";
  symbol: CoinSymbol;
  side: PositionSide;
  entryPrice: number;
  setupQuality: number;
  confidence: number;
  riskLevel: "Low" | "Medium" | "High";
  bias: BrainBias;
  entry: TradeTicketSuggestion;
  stopLoss: TradeTicketSuggestion;
  takeProfit: TradeTicketSuggestion;
  riskReward: number;
  notes: string[];
  verdict: TradePlanVerdict;
  explanation: string;
};

const mockTrade: ClosedTrade = {
  id: "mock-trade-btc-1",
  symbol: "BTC",
  side: "Long",
  entryPrice: 67800,
  exitPrice: 70400,
  quantity: 0.05,
  notional: 3390,
  stopLoss: 66900,
  takeProfit: 70800,
  openedAt: 1719849600000,
  closedAt: 1719856800000,
  pnl: 130,
  returnPct: 3.83,
  followedPlan: true,
  qualityScore: 88,
  coach: {
    grade: "B+",
    doneWell: "Waited for support confirmation before entering.",
    wentWrong: "Exited slightly before the planned target.",
    riskManagement: "Risk was predefined and position size stayed reasonable.",
    entryFeedback: "Entry aligned with the planned pullback zone.",
    exitFeedback: "Exit protected profit, but left some planned reward on the table.",
    improvement: "Let partial positions work toward the full target when the thesis remains valid.",
  },
};

const mockPortfolio: PortfolioSnapshot = {
  startingBalance: STARTING_BALANCE,
  cash: 6850,
  buyingPower: 6850,
  equity: 10380,
  unrealizedPnl: 130,
  realizedPnl: 250,
  dailyPnl: 180,
};

const mockPositions: PaperPosition[] = [
  {
    id: "mock-open-eth",
    symbol: "ETH",
    side: "Long",
    entryPrice: 3650,
    quantity: 0.5,
    notional: 1825,
    stopLoss: 3575,
    takeProfit: 3910,
    openedAt: 1719860000000,
  },
  {
    id: "mock-open-sol",
    symbol: "SOL",
    side: "Short",
    entryPrice: 160,
    quantity: 4,
    notional: 640,
    stopLoss: 164,
    takeProfit: 148,
    openedAt: 1719861800000,
  },
];

const mockHistory: ClosedTrade[] = [
  mockTrade,
  {
    ...mockTrade,
    id: "mock-trade-sol-1",
    symbol: "SOL",
    side: "Short",
    entryPrice: 162,
    exitPrice: 155,
    notional: 810,
    quantity: 5,
    pnl: 35,
    returnPct: 4.32,
    qualityScore: 82,
    followedPlan: true,
    closedAt: 1719770400000,
  },
  {
    ...mockTrade,
    id: "mock-trade-eth-1",
    symbol: "ETH",
    side: "Long",
    entryPrice: 3720,
    exitPrice: 3650,
    notional: 1860,
    quantity: 0.5,
    pnl: -35,
    returnPct: -1.88,
    qualityScore: 58,
    followedPlan: false,
    closedAt: 1719684000000,
  },
];

const mockJournal: JournalEntry[] = [
  {
    id: "mock-journal-1",
    date: "Jul 01",
    pair: "BTC/USD",
    setup: "Trend pullback",
    risk: "1.0%",
    result: "+2.3R",
    status: "Closed",
  },
  {
    id: "mock-journal-2",
    date: "Jun 30",
    pair: "ETH/USD",
    setup: "Early breakout",
    risk: "1.2%",
    result: "-1.0R",
    status: "Closed",
  },
];

export function analyzeTrade(trade: ClosedTrade = mockTrade): TradeAnalysis {
  const riskReward = calculateTradeRiskReward(trade);
  const durationMinutes = Math.max(1, Math.round((trade.closedAt - trade.openedAt) / 60000));
  const findings: BrainFinding[] = [
    {
      label: "Outcome",
      signal: trade.pnl >= 0 ? "positive" : "negative",
      detail: trade.pnl >= 0 ? "Trade closed with realized profit." : "Trade closed with realized loss.",
    },
    {
      label: "Plan adherence",
      signal: trade.followedPlan ? "positive" : "negative",
      detail: trade.followedPlan ? "Stop and target were part of the plan." : "Plan discipline was incomplete.",
    },
    {
      label: "Risk/reward",
      signal: riskReward && riskReward >= 2 ? "positive" : "neutral",
      detail: riskReward ? `${riskReward.toFixed(2)}R estimated setup quality.` : "Risk/reward unavailable.",
    },
    {
      label: "Duration",
      signal: durationMinutes >= 5 ? "positive" : "neutral",
      detail: `${durationMinutes} minute hold suggests ${durationMinutes >= 5 ? "patience" : "very fast execution"}.`,
    },
  ];

  return {
    kind: "trade-analysis",
    tradeId: trade.id,
    symbol: trade.symbol,
    side: trade.side,
    score: trade.qualityScore,
    grade: getTradeGrade(trade.qualityScore),
    verdict: trade.qualityScore >= 76 ? "High-quality paper trade" : "Needs tighter process",
    pnl: round(trade.pnl),
    returnPct: round(trade.returnPct),
    riskReward,
    durationMinutes,
    findings,
    nextBestAction:
      trade.pnl >= 0
        ? "Repeat the setup only if the same risk conditions appear."
        : "Review entry timing and require a complete stop/target plan next time.",
  };
}

export function analyzePortfolio({
  snapshot = mockPortfolio,
  positions = mockPositions,
  prices = { ETH: 3710, SOL: 154 },
}: {
  snapshot?: PortfolioSnapshot;
  positions?: PaperPosition[];
  prices?: Partial<Record<CoinSymbol, number>>;
} = {}): PortfolioAnalysis {
  const exposure = positions.reduce((sum, position) => sum + position.notional, 0);
  const exposurePct = snapshot.equity > 0 ? (exposure / snapshot.equity) * 100 : 0;
  const healthScore = clamp(
    76 + (snapshot.realizedPnl > 0 ? 8 : -8) - Math.max(0, exposurePct - 45) * 0.7,
  );
  const riskLevel = exposurePct > 70 ? "High" : exposurePct > 45 ? "Elevated" : exposurePct > 20 ? "Moderate" : "Low";
  const unrealized = positions.reduce(
    (sum, position) => sum + getPositionPnl(position, prices[position.symbol] ?? position.entryPrice),
    0,
  );

  return {
    kind: "portfolio-analysis",
    healthScore,
    riskLevel,
    equity: round(snapshot.equity),
    buyingPower: round(snapshot.buyingPower),
    exposure: round(exposure),
    openPositionCount: positions.length,
    realizedPnl: round(snapshot.realizedPnl),
    unrealizedPnl: round(unrealized || snapshot.unrealizedPnl),
    findings: [
      {
        label: "Exposure",
        signal: exposurePct <= 45 ? "positive" : "negative",
        detail: `${round(exposurePct)}% of equity is deployed in open paper trades.`,
      },
      {
        label: "Buying power",
        signal: snapshot.buyingPower > snapshot.equity * 0.4 ? "positive" : "neutral",
        detail: "Cash buffer remains available for selective setups.",
      },
      {
        label: "Open risk",
        signal: riskLevel === "High" ? "negative" : "neutral",
        detail: `${riskLevel} risk based on open notional exposure.`,
      },
    ],
  };
}

export function detectTradingHabits({
  history = mockHistory,
  journalEntries = mockJournal,
}: {
  history?: ClosedTrade[];
  journalEntries?: JournalEntry[];
} = {}): TradingHabits {
  const longCount = history.filter((trade) => trade.side === "Long").length;
  const shortCount = history.filter((trade) => trade.side === "Short").length;
  const wins = history.filter((trade) => trade.pnl > 0).length;
  const planTrades = history.filter((trade) => trade.followedPlan).length;
  const averageHoldMinutes = average(
    history.map((trade) => Math.max(1, (trade.closedAt - trade.openedAt) / 60000)),
  );

  return {
    kind: "trading-habits",
    sampleSize: history.length,
    dominantSide: longCount === shortCount ? "Balanced" : longCount > shortCount ? "Long" : "Short",
    averageHoldMinutes: Math.round(averageHoldMinutes),
    planAdherenceRate: percent(planTrades, history.length),
    winRate: percent(wins, history.length),
    habits: [
      {
        label: "Directional preference",
        signal: Math.abs(longCount - shortCount) <= 1 ? "positive" : "neutral",
        detail: `${longCount} long trades and ${shortCount} short trades detected.`,
      },
      {
        label: "Journaling",
        signal: journalEntries.length >= history.length ? "positive" : "neutral",
        detail: `${journalEntries.length} journal records available for coaching context.`,
      },
      {
        label: "Planning",
        signal: planTrades >= history.length * 0.7 ? "positive" : "negative",
        detail: `${percent(planTrades, history.length)}% of trades followed the plan.`,
      },
    ],
  };
}

export function generateHermesMemory({
  history = mockHistory,
  journalEntries = mockJournal,
}: {
  history?: ClosedTrade[];
  journalEntries?: JournalEntry[];
} = {}): HermesMemory {
  const wins = history.filter((trade) => trade.pnl > 0);
  const planned = history.filter((trade) => trade.followedPlan);
  const averageHoldMinutes = Math.round(
    average(history.map((trade) => Math.max(1, (trade.closedAt - trade.openedAt) / 60000))),
  );
  const pnlByAsset = groupPnlByAsset(history);
  const rankedAssets = Object.entries(pnlByAsset).sort(([, a], [, b]) => b - a);
  const repeatedMistakes = detectRepeatedMistakes(history, journalEntries);
  const strengths = detectStrengths(history, journalEntries);
  const commonTradeType = detectCommonTradeType(history, journalEntries);

  return {
    kind: "hermes-memory",
    tradeCount: history.length,
    bestPerformingAsset: (rankedAssets[0]?.[0] as CoinSymbol | undefined) ?? "N/A",
    weakestAsset: (rankedAssets[rankedAssets.length - 1]?.[0] as CoinSymbol | undefined) ?? "N/A",
    winRate: percent(wins.length, history.length),
    averagePnl: round(average(history.map((trade) => trade.pnl))),
    averageHoldMinutes,
    repeatedMistakes,
    strengths,
    commonTradeType,
    coachingInsight: buildMemoryInsight({
      history,
      repeatedMistakes,
      strengths,
      averageHoldMinutes,
      best: (rankedAssets[0]?.[0] as CoinSymbol | undefined) ?? "N/A",
      weakest: (rankedAssets[rankedAssets.length - 1]?.[0] as CoinSymbol | undefined) ?? "N/A",
    }),
  };
}

export function scanOpportunities({
  opportunities = ["BTC", "ETH", "SOL", "LINK"].map((symbol) =>
    calculateOpportunityScore({ symbol: symbol as CoinSymbol }),
  ),
  memory = generateHermesMemory(),
  risk = generateRiskAssessment(),
}: {
  opportunities?: OpportunityScore[];
  memory?: HermesMemory;
  risk?: RiskAssessment;
} = {}): OpportunityScannerResult {
  const items = opportunities
    .map((opportunity) => {
      const memoryAdjustment =
        opportunity.symbol === memory.bestPerformingAsset
          ? 5
          : opportunity.symbol === memory.weakestAsset
            ? -5
            : 0;
      const setupScore = clamp(opportunity.score + memoryAdjustment);
      const riskLevel =
        risk.riskLevel === "High"
          ? "High"
          : setupScore >= 75
            ? "Moderate"
            : setupScore >= 58
              ? "Elevated"
              : "High";
      const suggestedAction =
        setupScore >= 74 && riskLevel !== "High"
          ? "Paper Trade Setup"
          : setupScore >= 58
            ? "Watch"
            : "Wait";

      return {
        asset: opportunity.symbol,
        setupScore,
        bias: opportunity.bias,
        riskLevel,
        reason: buildOpportunityReason(opportunity, memoryAdjustment, memory),
        suggestedAction,
      } satisfies OpportunityScanItem;
    })
    .sort((a, b) => b.setupScore - a.setupScore);

  return {
    kind: "opportunity-scanner",
    generatedAt: Date.now(),
    topAsset: items[0]?.asset ?? "BTC",
    items,
  };
}

export function generateTradeTicketSuggestions({
  quote,
  side = "Long",
  opportunity = calculateOpportunityScore({ symbol: quote.symbol }),
}: {
  quote: AssetQuote;
  side?: PositionSide;
  opportunity?: OpportunityScore;
}): TradeTicketSuggestions {
  const conviction = opportunity.score;
  const riskLevel: TradeTicketSuggestions["riskLevel"] =
    opportunity.components.volatility >= 68 && conviction >= 72
      ? "Low"
      : conviction >= 58
        ? "Medium"
        : "High";
  const stopPct = conviction >= 76 ? 0.014 : conviction >= 58 ? 0.018 : 0.024;
  const rewardMultiple = conviction >= 76 ? 2.4 : conviction >= 58 ? 2 : 1.6;
  const targetPct = stopPct * rewardMultiple;
  const entry = side === "Long" ? quote.price * 0.999 : quote.price * 1.001;
  const stopLoss =
    side === "Long" ? entry * (1 - stopPct) : entry * (1 + stopPct);
  const takeProfit =
    side === "Long" ? entry * (1 + targetPct) : entry * (1 - targetPct);
  const confidence = clamp(
    conviction * 0.7 + opportunity.components.riskReward * 0.2 + opportunity.components.volatility * 0.1,
  );
  const verdict = buildTradePlanVerdict({
    confidence,
    bias: opportunity.bias,
    riskLevel,
    symbol: quote.symbol,
  });

  return {
    kind: "trade-ticket-suggestions",
    symbol: quote.symbol,
    side,
    entryPrice: round(quote.price),
    setupQuality: conviction,
    confidence,
    riskLevel,
    bias: opportunity.bias,
    entry: {
      value: round(entry),
      confidence: clamp(confidence - 2),
      explanation:
        side === "Long"
          ? "Entry is placed near current price with a small pullback buffer."
          : "Entry is placed near current price with a small bounce buffer.",
    },
    stopLoss: {
      value: round(stopLoss),
      confidence: clamp(confidence - 4),
      explanation: `${riskLevel} risk buffer based on ${quote.symbol} momentum, volatility, and current paper setup quality.`,
    },
    takeProfit: {
      value: round(takeProfit),
      confidence: clamp(confidence + (rewardMultiple >= 2 ? 2 : -2)),
      explanation: `Targets about ${round(rewardMultiple)}R from the current market price while keeping the setup manual.`,
    },
    riskReward: round(rewardMultiple),
    notes: [
      side === "Long" ? "Entry near current pullback support." : "Entry near current bounce resistance.",
      side === "Long" ? "Stop sits below the planned entry zone." : "Stop sits above the planned entry zone.",
      side === "Long" ? "Target looks toward the next upside extension." : "Target looks toward the next downside extension.",
      `${opportunity.bias} market bias from rule-based Hermes Brain.`,
      rewardMultiple >= 2 ? "Risk/reward meets Hermes criteria." : "Risk/reward is acceptable but needs caution.",
    ],
    verdict,
    explanation: `${quote.symbol} ${side.toLowerCase()} suggestion uses Hermes Brain opportunity score ${conviction}/100 and remains paper-only guidance.`,
  };
}

export function calculateOpportunityScore({
  symbol = "BTC",
  bias = "Bullish",
  confidence = 78,
  riskLevel = "Moderate",
  journalAlignment = 64,
  portfolioFit = 72,
}: {
  symbol?: CoinSymbol;
  bias?: BrainBias;
  confidence?: number;
  riskLevel?: BrainRiskLevel;
  journalAlignment?: number;
  portfolioFit?: number;
} = {}): OpportunityScore {
  const trend = bias === "Bullish" ? confidence : bias === "Bearish" ? 100 - confidence : 55;
  const riskReward = riskLevel === "Low" ? 82 : riskLevel === "Moderate" ? 68 : riskLevel === "Elevated" ? 48 : 32;
  const volatility = riskLevel === "High" ? 35 : riskLevel === "Elevated" ? 52 : 70;
  const score = clamp(trend * 0.3 + riskReward * 0.25 + volatility * 0.15 + journalAlignment * 0.15 + portfolioFit * 0.15);
  const finalBias: BrainBias = score >= 66 ? "Bullish" : score <= 44 ? "Bearish" : "Neutral";

  return {
    kind: "opportunity-score",
    symbol,
    score,
    bias: finalBias,
    grade: getTradeGrade(score),
    components: {
      trend: Math.round(trend),
      riskReward: Math.round(riskReward),
      volatility: Math.round(volatility),
      journalAlignment: Math.round(journalAlignment),
      portfolioFit: Math.round(portfolioFit),
    },
    explanation: `${symbol} receives a ${score}/100 opportunity score from ${finalBias.toLowerCase()} trend, ${riskLevel.toLowerCase()} risk, journal alignment, and portfolio fit.`,
  };
}

export function generateDailyScroll({
  portfolio = analyzePortfolio(),
  habits = detectTradingHabits(),
  topOpportunity = calculateOpportunityScore(),
  memory = generateHermesMemory(),
}: {
  portfolio?: PortfolioAnalysis;
  habits?: TradingHabits;
  topOpportunity?: OpportunityScore;
  memory?: HermesMemory;
} = {}): DailyScroll {
  const lesson =
    memory.repeatedMistakes.some((mistake) => mistake.toLowerCase().includes("early"))
      ? "Today's lesson: Practice patient exits."
      : portfolio.riskLevel === "High" || portfolio.riskLevel === "Elevated"
        ? "Today's lesson: Protect Capital First."
        : "Today's lesson: Trade the plan, not the impulse.";

  return {
    kind: "daily-scroll",
    title: "Hermes Daily Scroll",
    marketPosture: topOpportunity.bias,
    priority: `${lesson} Focus on ${topOpportunity.symbol} only if the setup remains above ${topOpportunity.score}/100 quality.`,
    checklist: [
      "Confirm paper account risk before any entry.",
      "Require stop-loss and take-profit before opening a position.",
      memory.bestPerformingAsset !== "N/A"
        ? `Respect memory: ${memory.bestPerformingAsset} has been your strongest asset recently.`
        : "Respect memory: wait for more trade history before increasing conviction.",
      "Avoid adding exposure if portfolio risk becomes elevated.",
      "Journal the thesis before closing the trade.",
    ],
    avoid: [
      portfolio.riskLevel === "High" ? "Avoid opening new trades until exposure falls." : "Avoid chasing candles away from planned entry zones.",
      habits.planAdherenceRate < 70 ? "Avoid trades without a written plan." : "Avoid oversizing after a winning streak.",
      memory.weakestAsset !== "N/A" ? `Avoid forcing ${memory.weakestAsset} setups until execution improves.` : "Avoid inventing patterns from a tiny sample size.",
    ],
    coachingNote: `${memory.coachingInsight} Current portfolio health is ${portfolio.healthScore}/100 and plan adherence is ${habits.planAdherenceRate}%.`,
  };
}

export function generateWeeklyReview({
  history = mockHistory,
  performance = mockPerformance(history),
}: {
  history?: ClosedTrade[];
  performance?: BrainPerformanceStats;
} = {}): WeeklyReview {
  const grade = getTradeGrade(clamp(55 + performance.winRate * 0.3 + Math.min(20, performance.averageRiskReward * 5)));
  const profitable = performance.realizedPnl > 0;

  return {
    kind: "weekly-review",
    summary: profitable
      ? "The week was profitable with evidence of repeatable execution."
      : "The week needs review because realized P/L did not confirm the process.",
    grade,
    winRate: round(performance.winRate),
    realizedPnl: round(performance.realizedPnl),
    strengths: [
      `${history.filter((trade) => trade.followedPlan).length} trades followed the predefined plan.`,
      `Average risk/reward registered at ${round(performance.averageRiskReward)}R.`,
    ],
    weaknesses: [
      performance.averageLoss < -50 ? "Average loss remains too large relative to account size." : "Losses stayed contained, but review early exits.",
      performance.winRate < 50 ? "Win rate needs more selective entries." : "Avoid becoming aggressive after a solid win rate.",
    ],
    nextWeekPlan: [
      "Trade fewer, higher-quality paper setups.",
      "Require complete stop and target fields before entry.",
      "Review every closed trade before placing another one.",
    ],
  };
}

export function generateTradingPersonality({
  habits = detectTradingHabits(),
  risk = generateRiskAssessment(),
}: {
  habits?: TradingHabits;
  risk?: RiskAssessment;
} = {}): TradingPersonality {
  const archetype =
    habits.dominantSide === "Balanced"
      ? "Balanced tactician"
      : habits.dominantSide === "Long"
        ? "Trend-seeking long trader"
        : "Defensive short-side tactician";

  return {
    kind: "trading-personality",
    archetype,
    confidenceStyle: habits.winRate >= 60 ? "Confident after confirmation" : "Cautious and still forming conviction",
    riskStyle: risk.riskLevel === "Low" || risk.riskLevel === "Moderate" ? "Measured" : "Aggressive under pressure",
    strengths: [
      "Uses paper mode to practice without live execution risk.",
      "Responds well to structured setup review.",
    ],
    blindSpots: [
      habits.planAdherenceRate < 70 ? "May enter before the plan is complete." : "May become too rigid around predefined plans.",
      risk.riskLevel === "High" ? "Can carry too much open exposure." : "May miss trades while waiting for perfect confirmation.",
    ],
    coachingPrompt: "Before the next paper trade, state the invalidation level and why the setup deserves risk.",
  };
}

export function generateRiskAssessment({
  snapshot = mockPortfolio,
  positions = mockPositions,
}: {
  snapshot?: PortfolioSnapshot;
  positions?: PaperPosition[];
} = {}): RiskAssessment {
  const openExposure = positions.reduce((sum, position) => sum + position.notional, 0);
  const exposurePct = snapshot.equity > 0 ? (openExposure / snapshot.equity) * 100 : 0;
  const riskScore = clamp(25 + exposurePct + Math.max(0, -snapshot.dailyPnl / 20));
  const riskLevel = riskScore >= 80 ? "High" : riskScore >= 60 ? "Elevated" : riskScore >= 35 ? "Moderate" : "Low";

  return {
    kind: "risk-assessment",
    riskScore,
    riskLevel,
    maxPositionSizeSuggestion: round(snapshot.equity * 0.1),
    openExposure: round(openExposure),
    warnings: [
      {
        label: "Exposure",
        signal: exposurePct > 50 ? "negative" : "neutral",
        detail: `${round(exposurePct)}% of equity is currently deployed.`,
      },
      {
        label: "Daily P/L",
        signal: snapshot.dailyPnl >= 0 ? "positive" : "negative",
        detail: `Daily paper P/L is ${round(snapshot.dailyPnl)}.`,
      },
    ],
    safeguards: [
      "Keep every paper trade below the suggested max position size.",
      "Stop trading for the session after two avoidable rule breaks.",
      "Do not open a trade unless stop-loss and take-profit are defined.",
    ],
  };
}

function calculateTradeRiskReward(trade: ClosedTrade): number | null {
  if (!trade.stopLoss || !trade.takeProfit) {
    return null;
  }

  const risk = Math.abs(trade.entryPrice - trade.stopLoss);
  const reward = Math.abs(trade.takeProfit - trade.entryPrice);
  return risk > 0 ? round(reward / risk) : null;
}

function groupPnlByAsset(history: ClosedTrade[]): Partial<Record<CoinSymbol, number>> {
  return history.reduce<Partial<Record<CoinSymbol, number>>>((totals, trade) => {
    totals[trade.symbol] = (totals[trade.symbol] ?? 0) + trade.pnl;
    return totals;
  }, {});
}

function detectRepeatedMistakes(history: ClosedTrade[], journalEntries: JournalEntry[]) {
  const mistakes: string[] = [];
  const missingPlans = history.filter((trade) => !trade.stopLoss || !trade.takeProfit).length;
  const earlyExits = history.filter((trade) => trade.takeProfit && trade.pnl > 0 && trade.exitPrice !== trade.takeProfit).length;
  const losses = history.filter((trade) => trade.pnl < 0).length;
  const earlyBreakouts = journalEntries.filter((entry) => entry.setup.toLowerCase().includes("early")).length;

  if (missingPlans >= 2 || missingPlans > history.length * 0.35) {
    mistakes.push("Entering before the stop-loss and target are fully defined.");
  }

  if (earlyExits >= 2 || earlyBreakouts > 0) {
    mistakes.push("Closing or entering too early before confirmation completes.");
  }

  if (losses > history.length * 0.45) {
    mistakes.push("Taking too many low-quality setups relative to the current win rate.");
  }

  return mistakes.length > 0 ? mistakes : ["No dominant repeated mistake detected yet."];
}

function detectStrengths(history: ClosedTrade[], journalEntries: JournalEntry[]) {
  const strengths: string[] = [];
  const planned = history.filter((trade) => trade.followedPlan).length;
  const winners = history.filter((trade) => trade.pnl > 0).length;

  if (planned >= history.length * 0.6) {
    strengths.push("You often define risk before closing trades.");
  }

  if (winners >= history.length * 0.55) {
    strengths.push("Your recent paper trades show a positive win-rate profile.");
  }

  if (journalEntries.length >= Math.max(1, history.length)) {
    strengths.push("You maintain enough journal context for coaching.");
  }

  return strengths.length > 0 ? strengths : ["You are building useful sample size through paper trading."];
}

function detectCommonTradeType(
  history: ClosedTrade[],
  journalEntries: JournalEntry[],
): HermesMemory["commonTradeType"] {
  const setupText = journalEntries.map((entry) => entry.setup.toLowerCase()).join(" ");
  if (setupText.includes("breakout")) return "breakout";
  if (setupText.includes("reversal") || setupText.includes("reclaim")) return "reversal";
  if (setupText.includes("scalp")) return "scalp";

  const longCount = history.filter((trade) => trade.side === "Long").length;
  const shortCount = history.filter((trade) => trade.side === "Short").length;
  if (longCount === 0 && shortCount === 0) return "unknown";
  if (Math.abs(longCount - shortCount) <= 1) return "balanced";
  return longCount > shortCount ? "long" : "short";
}

function buildMemoryInsight({
  history,
  repeatedMistakes,
  strengths,
  averageHoldMinutes,
  best,
  weakest,
}: {
  history: ClosedTrade[];
  repeatedMistakes: string[];
  strengths: string[];
  averageHoldMinutes: number;
  best: CoinSymbol | "N/A";
  weakest: CoinSymbol | "N/A";
}) {
  if (history.length === 0) {
    return "Hermes Memory is waiting for completed paper trades before drawing strong conclusions.";
  }

  if (repeatedMistakes.some((mistake) => mistake.toLowerCase().includes("early"))) {
    return "Your recent trades show early execution patterns. Focus today on patience and confirmation.";
  }

  if (best !== "N/A" && weakest !== "N/A" && best !== weakest) {
    return `Your ${best} trades are performing better than your ${weakest} trades. Favor cleaner ${best} setups until the pattern changes.`;
  }

  if (averageHoldMinutes < 5) {
    return "Your average hold time is very short. Slow down exits unless the plan is invalidated.";
  }

  return strengths[0] ?? "Hermes Memory sees a stable paper trading process forming.";
}

function buildOpportunityReason(
  opportunity: OpportunityScore,
  memoryAdjustment: number,
  memory: HermesMemory,
) {
  const memoryText =
    memoryAdjustment > 0
      ? "boosted by your recent asset performance"
      : memoryAdjustment < 0
        ? "reduced because this has been a weaker asset for you"
        : "not materially changed by memory";

  return `${opportunity.symbol} scores ${opportunity.score}/100 from trend, risk/reward, volatility, journal alignment, and portfolio fit; ${memoryText}.`;
}

function buildTradePlanVerdict({
  confidence,
  bias,
  riskLevel,
  symbol,
}: {
  confidence: number;
  bias: BrainBias;
  riskLevel: TradeTicketSuggestions["riskLevel"];
  symbol: CoinSymbol;
}): TradePlanVerdict {
  if (confidence >= 78 && riskLevel !== "High") {
    return {
      label: "Strong Setup",
      confidence,
      explanation: `${symbol} aligns with Hermes criteria and shows ${bias.toLowerCase()} planning quality.`,
    };
  }

  if (confidence >= 52) {
    return {
      label: "Caution",
      confidence,
      explanation:
        riskLevel === "High"
          ? "Setup quality is workable, but risk is elevated enough to require smaller sizing."
          : "Setup is developing, but confirmation should improve before adding conviction.",
    };
  }

  return {
    label: "Avoid",
    confidence,
    explanation: "This setup does not currently meet Hermes criteria for a high-quality paper trade.",
  };
}

function mockPerformance(history: ClosedTrade[]): BrainPerformanceStats {
  const wins = history.filter((trade) => trade.pnl > 0);
  const losses = history.filter((trade) => trade.pnl < 0);
  return {
    winRate: percent(wins.length, history.length),
    totalTrades: history.length,
    averageWin: average(wins.map((trade) => trade.pnl)),
    averageLoss: average(losses.map((trade) => trade.pnl)),
    largestWin: wins.length > 0 ? Math.max(...wins.map((trade) => trade.pnl)) : 0,
    largestLoss: losses.length > 0 ? Math.min(...losses.map((trade) => trade.pnl)) : 0,
    averageRiskReward: average(history.map((trade) => calculateTradeRiskReward(trade) ?? 0)),
    realizedPnl: history.reduce((sum, trade) => sum + trade.pnl, 0),
  };
}

function average(values: number[]) {
  return values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
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
