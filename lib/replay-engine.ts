import { formatCurrency, type Candle } from "@/lib/market-data";
import type { HermesIntelligenceLayer } from "@/lib/hermes-intelligence-layer";
import { getDurationLabel, type ClosedTrade } from "@/lib/paper-trading";

export type ReplayTimelineItem = {
  label: string;
  value: string;
  tone: "neutral" | "mint" | "gold" | "danger" | "muted";
};

export type ReplayReview = {
  wentWell: string[];
  couldImprove: string[];
  decisionQuality: string;
  riskManagement: string;
  discipline: string;
  traderDnaAlignment: string;
  dailyGoalAlignment: string;
  morningGoal: string;
  decisionReviewReference: string;
  recommendationFollowThrough: string;
};

export type ReplaySummary = {
  grade: ClosedTrade["coach"]["grade"];
  wisdomEarned: number;
  lessonLearned: string;
};

export type ReplaySession = {
  trade: ClosedTrade;
  timeline: ReplayTimelineItem[];
  candles: Candle[];
  review: ReplayReview;
  summary: ReplaySummary;
  marketConditions: string;
};

export function buildReplaySession(
  trade: ClosedTrade,
  intelligence?: HermesIntelligenceLayer,
): ReplaySession {
  const riskReward = calculateReplayRiskReward(trade);
  const marketConditions = buildMarketConditions(trade);

  return {
    trade,
    timeline: [
      { label: "Entry", value: formatCurrency(trade.entryPrice), tone: "mint" },
      {
        label: "Stop Loss",
        value: trade.stopLoss ? formatCurrency(trade.stopLoss) : "Not defined",
        tone: trade.stopLoss ? "gold" : "danger",
      },
      {
        label: "Take Profit",
        value: trade.takeProfit ? formatCurrency(trade.takeProfit) : "Not defined",
        tone: trade.takeProfit ? "gold" : "danger",
      },
      { label: "Exit", value: formatCurrency(trade.exitPrice), tone: "muted" },
      { label: "P/L", value: formatCurrency(trade.pnl), tone: trade.pnl >= 0 ? "mint" : "danger" },
      { label: "Holding Time", value: getDurationLabel(trade.openedAt, trade.closedAt), tone: "neutral" },
      { label: "Market Conditions", value: marketConditions, tone: "muted" },
    ],
    candles: buildReplayCandles(trade),
    review: {
      wentWell: [
        trade.followedPlan
          ? "The trade had a defined stop and target before review."
          : "The trade was completed and recorded, which gives Hermes material for learning.",
        trade.pnl >= 0
          ? "The exit produced a paper gain without needing real capital."
          : "The loss is now measurable, which is the point of paper practice.",
      ],
      couldImprove: [
        riskReward && riskReward >= 2
          ? "Review whether patience could have improved the entry."
          : "Require at least 2:1 risk/reward before taking similar setups.",
        trade.stopLoss ? "Study whether the stop was placed at true invalidation." : "Define a stop before entry next time.",
      ],
      decisionQuality:
        trade.qualityScore >= 80
          ? "Strong process. The setup had enough structure to review clearly."
          : trade.qualityScore >= 60
            ? "Developing process. The trade had useful structure, but needs cleaner rules."
            : "Weak process. Hermes needs a clearer plan before execution.",
      riskManagement:
        riskReward && riskReward >= 2
          ? `Risk/reward was constructive at ${riskReward.toFixed(2)} : 1.`
          : "Risk management needs a stronger reward profile before execution.",
      discipline: trade.followedPlan
        ? "Discipline was supported by a measurable plan."
        : "Discipline was harder to evaluate because the plan was incomplete.",
      traderDnaAlignment:
        trade.side === "Long"
          ? "This replay supports trend-following and patience review."
          : "This replay supports downside discipline and controlled short-side practice.",
      dailyGoalAlignment: trade.followedPlan
        ? `The trade aligned with the daily goal: ${intelligence?.morningContext.goal ?? "planned execution"}.`
        : `The trade only partially aligned with the daily goal: ${intelligence?.morningContext.goal ?? "define the plan earlier"}.`,
      morningGoal: intelligence?.morningContext.goal ?? "No morning goal was recorded for this replay.",
      decisionReviewReference:
        trade.qualityScore >= 75
          ? "The completed trade resembles a Decision Engine review that was ready to practice."
          : trade.qualityScore >= 60
            ? "The completed trade resembles a Decision Engine review that needed refinement."
            : "The completed trade resembles a Decision Engine review Hermes would have asked you to slow down.",
      recommendationFollowThrough: `Hermes follow-through: ${intelligence?.replayHistory.followedHermesRecommendation ?? inferRecommendationFollowThrough(trade)}.`,
    },
    summary: {
      grade: trade.coach.grade,
      wisdomEarned: getReplayWisdom(trade.qualityScore),
      lessonLearned: buildLesson(trade, riskReward),
    },
    marketConditions,
  };
}

function inferRecommendationFollowThrough(trade: ClosedTrade) {
  if (trade.followedPlan && trade.qualityScore >= 75) return "Likely";
  if (trade.followedPlan || trade.qualityScore >= 60) return "Partially";
  return "No";
}

function buildReplayCandles(trade: ClosedTrade): Candle[] {
  const count = 28;
  const start = Math.floor(trade.openedAt / 1000) - 12 * 60;
  const step = Math.max(60, Math.floor((trade.closedAt - trade.openedAt) / 1000 / Math.max(1, count - 8)));
  const direction = trade.exitPrice >= trade.entryPrice ? 1 : -1;
  const span = trade.exitPrice - trade.entryPrice;
  let previousClose = trade.entryPrice * (1 - direction * 0.002);

  return Array.from({ length: count }, (_, index) => {
    const progress = index / (count - 1);
    const curve = Math.sin(progress * Math.PI * 2) * trade.entryPrice * 0.0015;
    const close = trade.entryPrice + span * progress + curve;
    const open = previousClose;
    const high = Math.max(open, close, trade.stopLoss ?? close, trade.takeProfit ?? close) + trade.entryPrice * 0.001;
    const low = Math.min(open, close, trade.stopLoss ?? close, trade.takeProfit ?? close) - trade.entryPrice * 0.001;
    previousClose = close;

    return {
      time: start + index * step,
      open,
      high,
      low,
      close,
    };
  });
}

function calculateReplayRiskReward(trade: ClosedTrade) {
  if (!trade.stopLoss || !trade.takeProfit) return null;

  const risk = Math.abs(trade.entryPrice - trade.stopLoss);
  const reward = Math.abs(trade.takeProfit - trade.entryPrice);
  return risk > 0 ? reward / risk : null;
}

function buildMarketConditions(trade: ClosedTrade) {
  if (Math.abs(trade.returnPct) >= 2) return "Expanded range";
  if (trade.pnl >= 0) return "Constructive follow-through";
  return "Choppy conditions";
}

function getReplayWisdom(score: number) {
  if (score >= 85) return 15;
  if (score >= 70) return 10;
  if (score >= 55) return 5;
  return 0;
}

function buildLesson(trade: ClosedTrade, riskReward: number | null) {
  if (!trade.stopLoss || !trade.takeProfit) {
    return "A trade without a complete plan is harder to improve.";
  }

  if (trade.pnl >= 0 && riskReward && riskReward >= 2) {
    return "Good paper trades are built before the entry, not after the outcome.";
  }

  if (trade.pnl < 0) {
    return "A defined loss is tuition when the process is reviewed honestly.";
  }

  return "Replay the decision, not just the result.";
}
