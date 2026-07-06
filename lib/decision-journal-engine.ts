import type { HermesMemorySnapshot } from "@/lib/hermes-memory";
import type { ClosedTrade } from "@/lib/paper-trading";
import type {
  DecisionEmotion,
  DecisionJournalEntry,
  DecisionJournalFilter,
  DecisionJournalSummary,
  DecisionReflection,
} from "@/lib/decision-journal-types";

const DECISION_JOURNAL_STORAGE_KEY = "hermes.v1.decision-journal";

export function buildDecisionJournal({
  history,
  reflections,
  memory,
}: {
  history: ClosedTrade[];
  reflections: Record<string, DecisionReflection>;
  memory: HermesMemorySnapshot;
}) {
  const entries = history.map((trade) =>
    buildDecisionJournalEntry({
      trade,
      reflection: reflections[trade.id],
      memory,
    }),
  );

  return {
    entries,
    summary: buildDecisionJournalSummary(entries, memory),
  };
}

export function filterDecisionJournalEntries(
  entries: DecisionJournalEntry[],
  filter: DecisionJournalFilter,
) {
  if (filter === "Wins") return entries.filter((entry) => entry.outcome === "Win");
  if (filter === "Losses") return entries.filter((entry) => entry.outcome === "Loss");
  if (filter === "High Discipline") return entries.filter((entry) => entry.disciplineImpact >= 6);
  if (filter === "Needs Review") return entries.filter((entry) => entry.needsReview);
  if (filter === "Followed Plan") {
    return entries.filter((entry) => entry.reflection?.followedPlan === "Yes" || entry.followedPlan);
  }
  if (filter === "Broke Plan") {
    return entries.filter((entry) => entry.reflection?.followedPlan === "No" || !entry.followedPlan);
  }
  return entries;
}

export function loadDecisionReflections(): Record<string, DecisionReflection> {
  try {
    const raw = window.localStorage.getItem(DECISION_JOURNAL_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, DecisionReflection>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function saveDecisionReflection(reflection: DecisionReflection) {
  const current = loadDecisionReflections();
  const next = {
    ...current,
    [reflection.tradeId]: reflection,
  };
  window.localStorage.setItem(DECISION_JOURNAL_STORAGE_KEY, JSON.stringify(next));
  return next;
}

function buildDecisionJournalEntry({
  trade,
  reflection,
  memory,
}: {
  trade: ClosedTrade;
  reflection?: DecisionReflection;
  memory: HermesMemorySnapshot;
}): DecisionJournalEntry {
  const riskReward = calculateRiskReward(trade);
  const confidence = inferHermesConfidence(trade, riskReward);
  const disciplineImpact = inferDisciplineImpact(trade, riskReward, reflection);
  const wisdomEarned = inferWisdomEarned(trade.qualityScore);

  return {
    tradeId: trade.id,
    symbol: trade.symbol,
    direction: trade.side === "Long" ? "Buy / Sell" : "Short / Cover",
    entry: trade.entryPrice,
    exit: trade.exitPrice,
    pnl: trade.pnl,
    outcome: trade.pnl > 0 ? "Win" : trade.pnl < 0 ? "Loss" : "Closed",
    hermesConfidence: confidence,
    hermesRecommendation: inferRecommendation(confidence, riskReward, trade),
    tradeQuality: inferTradeQuality(trade.qualityScore),
    disciplineImpact,
    wisdomEarned,
    traderDnaMatch: inferTraderDnaMatch(memory, trade),
    dailyGoalMatch: trade.followedPlan ? "Aligned" : "Needs Review",
    riskReward,
    positionSize: trade.notional,
    dateTime: trade.closedAt,
    grade: trade.coach.grade,
    needsReview: !reflection || !trade.followedPlan || trade.qualityScore < 65,
    followedPlan: trade.followedPlan,
    reflection,
  };
}

function buildDecisionJournalSummary(
  entries: DecisionJournalEntry[],
  memory: HermesMemorySnapshot,
): DecisionJournalSummary {
  const average = (values: number[]) =>
    values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  const emotions = entries
    .map((entry) => entry.reflection?.emotion)
    .filter(Boolean) as DecisionEmotion[];
  const mostCommonEmotion = mostCommon(emotions) ?? "Not enough data";
  const mostCommonMistake =
    memory.behavior.overtradingDetected
      ? "Overtrading"
      : memory.behavior.holdingWinnersTooShort
        ? "Closing winners too early"
        : entries.some((entry) => entry.reflection?.reason === "Impulse")
          ? "Impulse entries"
          : memory.weaknesses[0] ?? "Incomplete reflections";

  return {
    totalDecisions: entries.length,
    averageHermesConfidence: Math.round(average(entries.map((entry) => entry.hermesConfidence))),
    averageDisciplineImpact: Math.round(average(entries.map((entry) => entry.disciplineImpact))),
    totalWisdomEarned: entries.reduce((sum, entry) => sum + entry.wisdomEarned, 0),
    mostCommonEmotion,
    mostCommonMistake,
    hermesInsight: buildHermesJournalInsight(entries, mostCommonEmotion, mostCommonMistake),
  };
}

function calculateRiskReward(trade: ClosedTrade) {
  if (!trade.stopLoss || !trade.takeProfit) return null;
  const risk = Math.abs(trade.entryPrice - trade.stopLoss);
  const reward = Math.abs(trade.takeProfit - trade.entryPrice);
  return risk > 0 ? reward / risk : null;
}

function inferHermesConfidence(trade: ClosedTrade, riskReward: number | null) {
  const planBonus = trade.followedPlan ? 10 : -8;
  const riskRewardBonus = riskReward === null ? -8 : riskReward >= 2 ? 7 : -4;
  const score = trade.qualityScore * 0.72 + 18 + planBonus + riskRewardBonus;
  return Math.max(35, Math.min(96, Math.round(score)));
}

function inferDisciplineImpact(
  trade: ClosedTrade,
  riskReward: number | null,
  reflection?: DecisionReflection,
) {
  const reflectionAdjustment =
    reflection?.followedPlan === "Yes" ? 4 : reflection?.followedPlan === "No" ? -6 : 0;
  const planAdjustment = trade.followedPlan ? 6 : -7;
  const riskAdjustment = riskReward && riskReward >= 2 ? 4 : -2;
  return Math.max(-20, Math.min(15, planAdjustment + riskAdjustment + reflectionAdjustment));
}

function inferWisdomEarned(score: number) {
  if (score >= 85) return 15;
  if (score >= 70) return 10;
  if (score >= 55) return 5;
  return 0;
}

function inferRecommendation(
  confidence: number,
  riskReward: number | null,
  trade: ClosedTrade,
) {
  if (!trade.followedPlan) return "Observe Instead";
  if (riskReward !== null && riskReward < 1.2) return "Reduce Position Size";
  if (confidence >= 80) return "Ready to Practice";
  if (confidence >= 62) return "Wait for Pullback";
  return "Needs Review";
}

function inferTradeQuality(score: number) {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Good";
  if (score >= 55) return "Developing";
  return "Needs Patience";
}

function inferTraderDnaMatch(memory: HermesMemorySnapshot, trade: ClosedTrade) {
  if (memory.performance.totalTrades < 3) return "Early Read";
  if (memory.performance.bestPerformingAsset === trade.symbol) return "Strong Match";
  if (memory.performance.worstPerformingAsset === trade.symbol) return "Needs Caution";
  return memory.scores.discipline >= 65 ? "Moderate Match" : "Needs Review";
}

function mostCommon(values: string[]) {
  const counts = new Map<string, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0];
}

function buildHermesJournalInsight(
  entries: DecisionJournalEntry[],
  mostCommonEmotion: string,
  mostCommonMistake: string,
) {
  if (mostCommonEmotion === "Calm") {
    return "You trade more clearly when your emotional state is calm.";
  }

  if (entries.some((entry) => entry.reflection?.reason === "Pullback" && entry.outcome === "Win")) {
    return "Your best decisions are starting to come from planned pullbacks, not impulse entries.";
  }

  if (entries.some((entry) => entry.outcome === "Loss" && entry.followedPlan)) {
    return "Losses with defined risk still strengthen your discipline.";
  }

  return `Hermes is watching ${mostCommonMistake.toLowerCase()} as the next judgment pattern to improve.`;
}
