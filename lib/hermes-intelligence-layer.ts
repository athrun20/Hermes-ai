import type { HermesMemorySnapshot } from "@/lib/hermes-memory";
import type { ClosedTrade } from "@/lib/paper-trading";
import { buildReplaySession } from "@/lib/replay-engine";

export type HermesIntelligenceLayer = {
  kind: "hermes-intelligence-layer-v1";
  disciplineStreak: number;
  mostCommonRecentMistake: string;
  biggestImprovement: string;
  yesterdayReplay: {
    tradeId: string;
    symbol: string;
    side: string;
    grade: string;
    lesson: string;
  } | null;
  yesterdayLesson: string;
  replayHistory: {
    reviewedTrades: number;
    latestReviewQuality: string;
    followedHermesRecommendation: "Likely" | "Partially" | "No" | "Unknown";
  };
  morningContext: {
    goal: string;
    focus: string;
  };
};

export function buildHermesIntelligenceLayer({
  memory,
  history = [],
  morningGoal = "Only take A-quality paper setups with entry, stop, and target defined.",
}: {
  memory: HermesMemorySnapshot;
  history?: ClosedTrade[];
  morningGoal?: string;
}): HermesIntelligenceLayer {
  const latestReplayTrade = findYesterdayTrade(history) ?? history[0] ?? null;
  const replay = latestReplayTrade ? buildReplaySession(latestReplayTrade) : null;

  return {
    kind: "hermes-intelligence-layer-v1",
    disciplineStreak: calculateDisciplineStreak(history),
    mostCommonRecentMistake: detectMostCommonMistake(memory),
    biggestImprovement: detectBiggestImprovement(memory),
    yesterdayReplay: replay
      ? {
          tradeId: replay.trade.id,
          symbol: replay.trade.symbol,
          side: replay.trade.side,
          grade: replay.summary.grade,
          lesson: replay.summary.lessonLearned,
        }
      : null,
    yesterdayLesson:
      replay?.summary.lessonLearned ??
      "No replay is available yet. Close and review a paper trade to create a lesson.",
    replayHistory: {
      reviewedTrades: history.length,
      latestReviewQuality: replay?.review.decisionQuality ?? "No completed replay yet.",
      followedHermesRecommendation: latestReplayTrade
        ? inferRecommendationFollowThrough(latestReplayTrade)
        : "Unknown",
    },
    morningContext: {
      goal: morningGoal,
      focus: buildMorningFocus(memory, morningGoal),
    },
  };
}

function calculateDisciplineStreak(history: ClosedTrade[]) {
  let streak = 0;

  for (const trade of history) {
    if (!trade.followedPlan) break;
    streak += 1;
  }

  return streak;
}

function findYesterdayTrade(history: ClosedTrade[]) {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const target = yesterday.toDateString();

  return history.find((trade) => new Date(trade.closedAt).toDateString() === target);
}

function detectMostCommonMistake(memory: HermesMemorySnapshot) {
  if (memory.behavior.overtradingDetected) return "Overtrading after a setup appears.";
  if (memory.behavior.revengeTradingDetected) return "Trading too soon after a loss.";
  if (memory.behavior.holdingWinnersTooShort) return "Closing winners before the plan has time to work.";
  if (memory.behavior.cuttingLossesTooLate) return "Letting losses move past invalidation.";
  return memory.weaknesses[0] ?? "Incomplete trade plans.";
}

function detectBiggestImprovement(memory: HermesMemorySnapshot) {
  if (memory.scores.riskManagement >= 75) return "Risk definition is becoming more consistent.";
  if (memory.scores.discipline >= 75) return "Plan discipline is strengthening.";
  if (memory.scores.patience >= 75) return "Patience is improving across recent trades.";
  return memory.strengths[0] ?? "You are building enough paper history for Hermes to learn.";
}

function inferRecommendationFollowThrough(trade: ClosedTrade) {
  if (trade.followedPlan && trade.qualityScore >= 75) return "Likely";
  if (trade.followedPlan || trade.qualityScore >= 60) return "Partially";
  return "No";
}

function buildMorningFocus(memory: HermesMemorySnapshot, morningGoal: string) {
  if (memory.performance.totalTrades === 0) return morningGoal;
  if (memory.behavior.overtradingDetected) return "Slow the session down before adding another trade.";
  if (memory.behavior.holdingWinnersTooShort) return "Practice letting good trades reach target or invalidation.";
  return morningGoal;
}
