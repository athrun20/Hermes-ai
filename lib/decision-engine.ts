import {
  calculateDecisionConfidence,
  calculateDisciplineImpact,
  getDecisionQuality,
  getDecisionRecommendation,
} from "@/lib/decision-score";
import type {
  DecisionChecklistItem,
  DecisionContext,
  DecisionMood,
  DecisionReview,
} from "@/lib/decision-types";
import type { PositionSide } from "@/lib/paper-trading";

export function reviewPaperTradeDecision(context: DecisionContext): DecisionReview {
  const entry = context.ticket.entryPrice ?? context.quote.price;
  const riskReward = calculateDecisionRiskReward({
    entry,
    side: context.ticket.side,
    stopLoss: context.ticket.stopLoss,
    takeProfit: context.ticket.takeProfit,
  });
  const checklist = buildDecisionChecklist(context, riskReward);
  const confidence = calculateDecisionConfidence(checklist);
  const recommendation = getDecisionRecommendation({
    confidence,
    riskReward,
    positionSizePassed: checklist.some((item) => item.id === "position-size" && item.passed),
    beginnerFitPassed: checklist.some((item) => item.id === "trader-dna" && item.passed),
  });

  return {
    kind: "hermes-decision-review",
    symbol: context.quote.symbol,
    action: context.ticket.action,
    side: context.ticket.side,
    confidence,
    tradeQuality: getDecisionQuality(confidence),
    disciplineScoreImpact: calculateDisciplineImpact({ confidence, riskReward }),
    recommendation,
    mentorNote: buildMentorNote(recommendation),
    riskReward,
    checklist,
  };
}

export function calculateDecisionRiskReward({
  entry,
  side,
  stopLoss,
  takeProfit,
}: {
  entry: number;
  side: PositionSide;
  stopLoss?: number;
  takeProfit?: number;
}) {
  if (!entry || !stopLoss || !takeProfit) return null;

  const risk = side === "Long" ? entry - stopLoss : stopLoss - entry;
  const reward = side === "Long" ? takeProfit - entry : entry - takeProfit;

  if (risk <= 0 || reward <= 0) return null;
  return reward / risk;
}

function buildDecisionChecklist(
  context: DecisionContext,
  riskReward: number | null,
): DecisionChecklistItem[] {
  const entry = context.ticket.entryPrice ?? context.quote.price;
  const direction = inferDirection(context.ticket.action, context.ticket.side);
  const trendAligned = isTrendAligned(context.opportunity.bias, direction);
  const marketMoodAligned = isMarketMoodAligned(context.marketMood, direction);
  const positionSizePct =
    context.portfolio.equity > 0 ? (context.ticket.notional / context.portfolio.equity) * 100 : 100;
  const traderDnaCompatible =
    context.memory.performance.totalTrades < 3 ||
    context.memory.scores.discipline >= 55 ||
    context.memory.strengths.some((strength) => strength.toLowerCase().includes("risk"));
  const dailyGoalCompatible = isDailyGoalCompatible(context.dailyGoal, {
    hasStopLoss: Boolean(context.ticket.stopLoss),
    hasTakeProfit: Boolean(context.ticket.takeProfit),
    riskReward,
    positionSizePct,
  });

  return [
    {
      id: "trend",
      label: "Trend aligns with trade direction",
      passed: trendAligned,
      detail: trendAligned
        ? `${context.opportunity.bias} opportunity posture supports a ${direction.toLowerCase()} paper idea.`
        : `${context.opportunity.bias} posture does not clearly support a ${direction.toLowerCase()} idea yet.`,
    },
    {
      id: "entry",
      label: "Entry price is defined",
      passed: Number.isFinite(entry) && entry > 0,
      detail: Number.isFinite(entry) && entry > 0 ? `Planned entry: ${entry.toFixed(2)}.` : "Define the entry before accepting risk.",
    },
    {
      id: "stop-loss",
      label: "Stop Loss is defined",
      passed: Boolean(context.ticket.stopLoss && context.ticket.stopLoss > 0),
      detail: context.ticket.stopLoss
        ? `Invalidation is set at ${context.ticket.stopLoss.toFixed(2)}.`
        : "Hermes wants a clear invalidation level before practice execution.",
    },
    {
      id: "take-profit",
      label: "Take Profit is defined",
      passed: Boolean(context.ticket.takeProfit && context.ticket.takeProfit > 0),
      detail: context.ticket.takeProfit
        ? `Target is set at ${context.ticket.takeProfit.toFixed(2)}.`
        : "Define where the paper trade should prove itself.",
    },
    {
      id: "risk-reward",
      label: "Risk/Reward is at least 2:1",
      passed: riskReward !== null && riskReward >= 2,
      detail: riskReward === null ? "Risk/reward cannot be measured yet." : `Current plan offers ${riskReward.toFixed(2)} : 1.`,
    },
    {
      id: "position-size",
      label: "Position size is acceptable",
      passed: positionSizePct <= 10 && context.ticket.notional <= context.portfolio.buyingPower,
      detail:
        positionSizePct <= 10
          ? `Position uses ${positionSizePct.toFixed(1)}% of paper equity.`
          : `Position uses ${positionSizePct.toFixed(1)}% of paper equity; consider reducing size.`,
    },
    {
      id: "trader-dna",
      label: "Trader DNA compatibility",
      passed: traderDnaCompatible,
      detail: traderDnaCompatible
        ? `${context.memory.personality} profile can practice this setup with discipline.`
        : "Your recent discipline score suggests a simpler setup may be better practice.",
    },
    {
      id: "market-mood",
      label: "Current Market Mood compatibility",
      passed: marketMoodAligned,
      detail: marketMoodAligned
        ? `${context.marketMood} market mood does not fight the trade direction.`
        : `${context.marketMood} market mood asks for patience before this direction.`,
    },
    {
      id: "daily-goal",
      label: "Daily Goal compatibility",
      passed: dailyGoalCompatible,
      detail: dailyGoalCompatible
        ? "The plan respects today's coaching focus."
        : `Today's focus is: ${context.dailyGoal}`,
    },
  ];
}

function inferDirection(action: string, side: PositionSide) {
  if (action === "Sell") return "Bearish";
  if (action === "Cover") return "Bullish";
  return side === "Long" ? "Bullish" : "Bearish";
}

function isTrendAligned(bias: string, direction: string) {
  if (bias === "Neutral") return true;
  return bias === direction;
}

function isMarketMoodAligned(mood: DecisionMood, direction: string) {
  if (mood === "Neutral") return true;
  return mood === direction;
}

function isDailyGoalCompatible(
  dailyGoal: string,
  plan: {
    hasStopLoss: boolean;
    hasTakeProfit: boolean;
    riskReward: number | null;
    positionSizePct: number;
  },
) {
  const goal = dailyGoal.toLowerCase();

  if (goal.includes("stop")) return plan.hasStopLoss;
  if (goal.includes("a-quality")) return plan.hasStopLoss && plan.hasTakeProfit && (plan.riskReward ?? 0) >= 2;
  if (goal.includes("risk")) return plan.positionSizePct <= 10;
  if (goal.includes("confirmation")) return plan.hasStopLoss && plan.hasTakeProfit;
  return true;
}

function buildMentorNote(recommendation: DecisionReview["recommendation"]) {
  if (recommendation === "Ready to Practice") {
    return "Hermes sees a complete paper plan. Execute only if you can accept both the stop and the outcome.";
  }

  if (recommendation === "Reduce Position Size") {
    return "Hermes does not forbid the trade. Hermes asks whether the trade deserves this much risk.";
  }

  if (recommendation === "Wait for Pullback") {
    return "Hermes sees potential, but patience may create a cleaner practice setup.";
  }

  if (recommendation === "Not Beginner Friendly") {
    return "Hermes would rather see a cleaner, simpler setup before you spend paper risk here.";
  }

  return "Hermes does not forbid the trade. Hermes asks whether the trade deserves risk.";
}
