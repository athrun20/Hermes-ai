import type { HermesMemorySnapshot } from "@/lib/hermes-memory";
import {
  buildHermesIntelligenceLayer,
  type HermesIntelligenceLayer,
} from "@/lib/hermes-intelligence-layer";
import type {
  HermesMarketConsistencyReport,
  HermesMarketQuotesSnapshot,
} from "@/lib/market-data/consumers";
import { buildOpportunityScanner } from "@/lib/opportunity-scanner";
import type { ClosedTrade } from "@/lib/paper-trading";
import type { LivingScroll } from "@/components/living-scroll-modal";

export type TraderDnaBrief = {
  tradingStyle: "Scalper" | "Day Trader" | "Swing Trader" | "Position Trader";
  disciplineScore: number;
  primaryStrength: string;
  areaToImprove: string;
};

export type MorningBriefing = {
  greeting: {
    userName: string;
    introduction: string;
  };
  market: {
    todayMarket: string;
    marketBreadth: string;
    volatility: string;
    sectorLeadership: string;
    biggestRisk: string;
    interpretation: string;
  };
  scroll: LivingScroll;
  traderDna: TraderDnaBrief;
  opportunities: ReturnType<typeof buildOpportunityScanner>["opportunities"];
  dailyGoal: {
    text: string;
    wisdomAvailable: number;
  };
  oath: {
    text: string;
  };
  challenge: {
    text: string;
    reward: number;
  };
  wisdomProgress: {
    level: string;
    current: number;
    nextLevel: number;
  };
  intelligence: HermesIntelligenceLayer;
  /** Step E: shared market-data join for opportunity tickers (metadata only). */
  marketConsistency: HermesMarketConsistencyReport;
};

export function buildMorningBriefing({
  memory,
  history = [],
  marketSnapshot = null,
}: {
  memory?: HermesMemorySnapshot;
  history?: ClosedTrade[];
  /** Shared MarketDataService snapshot — does not change briefing scores. */
  marketSnapshot?: HermesMarketQuotesSnapshot | null;
} = {}): MorningBriefing {
  const scanner = buildOpportunityScanner({ memory, marketSnapshot });
  const traderDna = buildTraderDnaBrief(memory);
  const biggestRisk = detectBiggestRisk(memory);
  const dailyGoal = buildDailyGoal({ memory, biggestRisk });
  const challenge = buildDailyChallenge({ memory });
  const intelligence = buildHermesIntelligenceLayer({
    memory: memory ?? buildFallbackMemory(),
    history,
    morningGoal: dailyGoal.text,
  });

  return {
    greeting: {
      userName: "Jim",
      introduction: pickMentorIntroduction(memory, intelligence),
    },
    market: {
      todayMarket: scanner.marketMood.todayMarket,
      marketBreadth: scanner.marketMood.marketBreadth,
      volatility: scanner.marketMood.volatility,
      sectorLeadership: scanner.marketMood.sectorLeadership,
      biggestRisk,
      interpretation: scanner.marketMood.interpretation,
    },
    scroll: buildBriefingScroll({ memory, dailyGoal: dailyGoal.text, intelligence }),
    traderDna,
    opportunities: scanner.opportunities
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3),
    dailyGoal,
    oath: {
      text: buildDailyOath({ memory, biggestRisk }),
    },
    challenge,
    wisdomProgress: {
      level: "Student Trader",
      current: memory ? calculateWisdom(memory) : 120,
      nextLevel: 200,
    },
    intelligence,
    marketConsistency: scanner.marketConsistency,
  };
}

function buildTraderDnaBrief(memory?: HermesMemorySnapshot): TraderDnaBrief {
  if (!memory || memory.performance.totalTrades < 3) {
    return {
      tradingStyle: "Day Trader",
      disciplineScore: memory?.scores.discipline ?? 50,
      primaryStrength: "Risk Awareness",
      areaToImprove: "Build Sample Size",
    };
  }

  return {
    tradingStyle: detectTradingStyle(memory),
    disciplineScore: memory.scores.discipline,
    primaryStrength: memory.strengths[0] ?? "Risk Management",
    areaToImprove: memory.weaknesses[0] ?? "FOMO Entries",
  };
}

function buildBriefingScroll({
  memory,
  dailyGoal,
  intelligence,
}: {
  memory?: HermesMemorySnapshot;
  dailyGoal: string;
  intelligence: HermesIntelligenceLayer;
}): LivingScroll {
  if (!memory || memory.performance.totalTrades === 0) {
    return {
      title: "Protect Capital First",
      quote: "Begin with clarity. Trade with discipline.",
      insight:
        "Hermes will learn from your completed paper trades. Until then, the strongest signal is whether each trade has a plan.",
      challenge: dailyGoal,
      wisdomPoints: 10,
    };
  }

  if (memory.behavior.holdingWinnersTooShort) {
    return {
      title: "Let Winners Breathe",
      quote: "Patience is a position, too.",
      insight:
        `${intelligence.mostCommonRecentMistake} Yesterday's lesson: ${intelligence.yesterdayLesson}`,
      challenge: dailyGoal,
      wisdomPoints: calculateWisdom(memory),
    };
  }

  return {
    title: "Trade the Plan",
    quote: "The day rewards the trader who arrives prepared.",
    insight:
      memory.performance.bestPerformingAsset !== "N/A"
        ? `Your strongest recent work is in ${memory.performance.bestPerformingAsset}. Discipline streak: ${intelligence.disciplineStreak}. Yesterday's lesson: ${intelligence.yesterdayLesson}`
        : `${intelligence.biggestImprovement} Keep each decision measurable.`,
    challenge: dailyGoal,
    wisdomPoints: calculateWisdom(memory),
  };
}

function buildDailyGoal({
  memory,
  biggestRisk,
}: {
  memory?: HermesMemorySnapshot;
  biggestRisk: string;
}) {
  if (!memory || memory.performance.totalTrades < 3) {
    return {
      text: "Only take A-quality paper setups with entry, stop, and target defined.",
      wisdomAvailable: 10,
    };
  }

  if (memory.behavior.overtradingDetected) {
    return {
      text: "Observe the first 15 minutes before trading.",
      wisdomAvailable: 10,
    };
  }

  if (memory.behavior.holdingWinnersTooShort) {
    return {
      text: "Wait for confirmation before entering, then let the planned trade work.",
      wisdomAvailable: 10,
    };
  }

  if (biggestRisk.toLowerCase().includes("stop")) {
    return {
      text: "Do not move your stop loss.",
      wisdomAvailable: 10,
    };
  }

  return {
    text: "Wait for confirmation before entering.",
    wisdomAvailable: 10,
  };
}

function buildDailyChallenge({ memory }: { memory?: HermesMemorySnapshot }) {
  if (memory?.behavior.revengeTradingDetected) {
    return {
      text: "No revenge trading.",
      reward: 10,
    };
  }

  if (memory?.behavior.overtradingDetected) {
    return {
      text: "Wait 15 minutes before your first trade.",
      reward: 10,
    };
  }

  if ((memory?.scores.riskManagement ?? 50) < 65) {
    return {
      text: "Risk no more than 1%.",
      reward: 10,
    };
  }

  return {
    text: "Only trade A-quality setups.",
    reward: 10,
  };
}

function buildDailyOath({
  memory,
  biggestRisk,
}: {
  memory?: HermesMemorySnapshot;
  biggestRisk: string;
}) {
  if (biggestRisk.toLowerCase().includes("stop")) {
    return "I will respect every stop loss.";
  }

  if (memory?.behavior.overtradingDetected) {
    return "I will only trade quality setups.";
  }

  if (memory?.behavior.holdingWinnersTooShort) {
    return "I will follow my plan.";
  }

  return "I will not chase momentum.";
}

function pickMentorIntroduction(
  memory?: HermesMemorySnapshot,
  intelligence?: HermesIntelligenceLayer,
) {
  const lines = [
    "Begin with clarity.",
    "Discipline creates consistency.",
    "The market rewards preparation.",
  ];
  if (intelligence && intelligence.disciplineStreak >= 2) {
    return `Discipline streak: ${intelligence.disciplineStreak}. Protect it with patience.`;
  }
  const index = memory ? memory.performance.totalTrades % lines.length : 0;
  return lines[index];
}

function detectBiggestRisk(memory?: HermesMemorySnapshot) {
  if (!memory || memory.performance.totalTrades < 3) {
    return "Chasing entries before confirmation";
  }

  if (memory.behavior.overtradingDetected) return "Taking too many trades close together";
  if (memory.behavior.holdingWinnersTooShort) return "Closing winners too early";
  if (memory.behavior.cuttingLossesTooLate) return "Moving or ignoring stop loss";
  return "Chasing entries before confirmation";
}

function detectTradingStyle(memory: HermesMemorySnapshot): TraderDnaBrief["tradingStyle"] {
  const averageHold = memory.performance.averageHoldMinutes;
  const dominantStyle = memory.strategyPreference.dominantStyle;

  if (dominantStyle === "scalper" || averageHold <= 15) return "Scalper";
  if (averageHold >= 1440) return "Position Trader";
  if (dominantStyle === "swing" || averageHold >= 240) return "Swing Trader";
  return "Day Trader";
}

function calculateWisdom(memory: HermesMemorySnapshot) {
  return Math.max(
    10,
    Math.round(
      memory.performance.totalTrades * 4 +
        memory.scores.discipline * 0.25 +
        memory.scores.riskManagement * 0.25,
    ),
  );
}

function buildFallbackMemory(): HermesMemorySnapshot {
  return {
    kind: "hermes-memory-snapshot",
    updatedAt: Date.now(),
    trades: [],
    performance: {
      totalTrades: 0,
      winRate: 0,
      averageProfitLoss: 0,
      averageRMultiple: null,
      averageHoldMinutes: 0,
      bestPerformingAsset: "N/A",
      worstPerformingAsset: "N/A",
    },
    behavior: {
      earlyExitsFrequency: 0,
      revengeTradingDetected: false,
      overtradingDetected: false,
      holdingWinnersTooShort: false,
      cuttingLossesTooLate: false,
      emotionalPatterns: [],
    },
    strategyPreference: {
      breakoutTrader: 0,
      reversalTrader: 0,
      scalper: 0,
      swingTrader: 0,
      dominantStyle: "unknown",
    },
    strengths: [],
    weaknesses: [],
    personality: "Developing Trader",
    scores: {
      riskManagement: 50,
      patience: 50,
      discipline: 50,
    },
  };
}
