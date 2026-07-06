import {
  calculateDecisionConfidence,
  calculateDisciplineImpact,
  calculateWisdomEarned,
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
  const confidence = calculateDecisionConfidence(checklist, { riskReward });
  const tradeQuality = getDecisionQuality(confidence);
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
    tradeQuality,
    disciplineScoreImpact: calculateDisciplineImpact({ confidence, riskReward }),
    recommendation,
    mentorNote: buildMentorNote(recommendation),
    whyNotPerfect: buildWhyNotPerfect({ checklist, riskReward, context }),
    finalThought: buildFinalThought({ context, riskReward, recommendation }),
    wisdomEarned: calculateWisdomEarned(tradeQuality),
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
      section: "Market",
      label: "Trend aligns with trade direction",
      passed: trendAligned,
      detail: trendAligned
        ? `${context.opportunity.bias} opportunity posture supports a ${direction.toLowerCase()} paper idea.`
        : `${context.opportunity.bias} posture does not clearly support a ${direction.toLowerCase()} idea yet.`,
    },
    {
      id: "entry",
      section: "Plan",
      label: "Entry price is defined",
      passed: Number.isFinite(entry) && entry > 0,
      detail: Number.isFinite(entry) && entry > 0 ? `Planned entry: ${entry.toFixed(2)}.` : "Define the entry before accepting risk.",
    },
    {
      id: "stop-loss",
      section: "Plan",
      label: "Stop Loss is defined",
      passed: Boolean(context.ticket.stopLoss && context.ticket.stopLoss > 0),
      detail: context.ticket.stopLoss
        ? `Invalidation is set at ${context.ticket.stopLoss.toFixed(2)}.`
        : "Hermes wants a clear invalidation level before practice execution.",
    },
    {
      id: "take-profit",
      section: "Plan",
      label: "Take Profit is defined",
      passed: Boolean(context.ticket.takeProfit && context.ticket.takeProfit > 0),
      detail: context.ticket.takeProfit
        ? `Target is set at ${context.ticket.takeProfit.toFixed(2)}.`
        : "Define where the paper trade should prove itself.",
    },
    {
      id: "risk-reward",
      section: "Risk",
      label: "Risk/Reward is at least 2:1",
      passed: riskReward !== null && riskReward >= 2,
      detail: riskReward === null ? "Risk/reward cannot be measured yet." : `Current plan offers ${riskReward.toFixed(2)} : 1.`,
    },
    {
      id: "position-size",
      section: "Risk",
      label: "Position size is acceptable",
      passed: positionSizePct <= 10 && context.ticket.notional <= context.portfolio.buyingPower,
      detail:
        positionSizePct <= 10
          ? `Position uses ${positionSizePct.toFixed(1)}% of paper equity.`
          : `Position uses ${positionSizePct.toFixed(1)}% of paper equity; consider reducing size.`,
    },
    {
      id: "trader-dna",
      section: "You",
      label: "Trader DNA compatibility",
      passed: traderDnaCompatible,
      detail: traderDnaCompatible
        ? `${context.memory.personality} profile can practice this setup with discipline. Current streak: ${context.intelligence?.disciplineStreak ?? 0}.`
        : "Your recent discipline score suggests a simpler setup may be better practice.",
    },
    {
      id: "market-mood",
      section: "Market",
      label: "Current Market Mood compatibility",
      passed: marketMoodAligned,
      detail: marketMoodAligned
        ? `${context.marketMood} market mood does not fight the trade direction.`
        : `${context.marketMood} market mood asks for patience before this direction.`,
    },
    {
      id: "daily-goal",
      section: "You",
      label: "Daily Goal compatibility",
      passed: dailyGoalCompatible,
      detail: dailyGoalCompatible
        ? `The plan respects today's coaching focus: ${context.dailyGoal}`
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
    return "This trade respects your current plan. Every trade carries uncertainty. This one carries discipline.";
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

function buildWhyNotPerfect({
  checklist,
  riskReward,
  context,
}: {
  checklist: DecisionChecklistItem[];
  riskReward: number | null;
  context: DecisionContext;
}) {
  const failed = checklist.find((item) => !item.passed);

  if (failed) {
    return failed.detail;
  }

  if ((riskReward ?? 0) < 2.5) {
    return "Risk/reward meets the minimum but could improve.";
  }

  if (context.marketMood !== context.opportunity.bias && context.marketMood !== "Neutral") {
    return "Market mood supports caution, even when the plan is complete.";
  }

  if (context.intelligence?.replayHistory.followedHermesRecommendation === "Partially") {
    return "Recent replay history shows partial follow-through, so Hermes keeps the score grounded.";
  }

  if (Math.abs(context.quote.change24h) > 3) {
    return "Entry is slightly extended after a larger daily move.";
  }

  return "Volume confirmation is still developing, so Hermes leaves room for uncertainty.";
}

function buildFinalThought({
  context,
  riskReward,
  recommendation,
}: {
  context: DecisionContext;
  riskReward: number | null;
  recommendation: DecisionReview["recommendation"];
}) {
  const style = context.memory.personality.toLowerCase();
  const strength =
    context.memory.strengths[0]?.toLowerCase() ?? "planned paper trading";
  const rewardText =
    riskReward && riskReward >= 2
      ? "your reward justifies the attempt"
      : "the reward still needs to justify the risk";
  const caution =
    recommendation === "Reduce Position Size"
      ? "The main concern is position size."
      : recommendation === "Wait for Pullback"
        ? "The main concern is whether the entry still offers enough patience."
        : recommendation === "Not Beginner Friendly"
          ? "The main concern is complexity."
          : "The main concern is whether you can accept the stop without improvising.";

  const replayReference = context.intelligence?.yesterdayLesson
    ? `Yesterday's replay lesson: ${context.intelligence.yesterdayLesson}`
    : "No prior replay lesson is available yet.";

  return `This setup reflects your ${style} profile and your current strength in ${strength}. Your risk is defined and ${rewardText}. ${caution} ${replayReference} If price has moved too far from support, waiting may improve the plan.`;
}
