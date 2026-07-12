/**
 * Learning Engine integration adapters.
 * Map existing product artifacts → LearningEvent without embedding pattern logic.
 *
 * Uses structural input types (not hard imports from paper-trading / journal engines)
 * so Learning Engine stays isolated from market and execution modules.
 */

import {
  createTradeCompletedEvent,
  createTradeReviewedEvent,
  createJournalReflectionEvent,
  createReplayCompletedEvent,
  outcomeFromPnl,
} from "@/lib/learning-engine/events";
import type { LearningEvent } from "@/lib/learning-engine/types";

/** Structural paper-trade shape for adapters (compatible with ClosedTrade). */
export type PaperTradeLearningInput = {
  id: string;
  symbol: string;
  side: "Long" | "Short";
  entryPrice: number;
  exitPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  openedAt: number;
  closedAt: number;
  pnl: number;
  followedPlan: boolean;
  qualityScore: number;
  coach?: { grade?: string };
};

export type DecisionReflectionLearningInput = {
  tradeId: string;
  reason: string;
  emotion: string;
  followedPlan: "Yes" | "Partially" | "No" | string;
  lesson: string;
  updatedAt: number;
};

export type DecisionJournalEntryLearningInput = {
  tradeId: string;
  symbol: string;
  outcome: "Win" | "Loss" | "Closed" | string;
  grade?: string;
  needsReview?: boolean;
  disciplineImpact?: number;
  followedPlan?: boolean;
};

export type ReplaySessionLearningInput = {
  trade: PaperTradeLearningInput;
  summary: {
    grade: string;
    lessonLearned: string;
  };
  review?: {
    couldImprove?: string[];
    decisionQuality?: string;
  };
};

/**
 * Map a closed paper trade into TradeCompleted.
 * Uses only structured trade fields — no emotional inference.
 */
export function paperTradeToLearningEvent(
  trade: PaperTradeLearningInput,
  options?: { timeframe?: string; strategyContext?: string },
): LearningEvent {
  const holdMinutes = Math.max(
    1,
    Math.floor((trade.closedAt - trade.openedAt) / 60_000),
  );
  const tags = buildPaperTradeTags(trade, holdMinutes);

  return createTradeCompletedEvent({
    id: `trade-completed:${trade.id}`,
    timestamp: trade.closedAt,
    symbol: trade.symbol,
    timeframe: options?.timeframe,
    strategyContext: options?.strategyContext,
    side: trade.side,
    pnl: trade.pnl,
    followedPlan: trade.followedPlan,
    qualityScore: trade.qualityScore,
    holdMinutes,
    tags,
    source: "paper-trading",
    metadata: {
      entryPrice: trade.entryPrice,
      exitPrice: trade.exitPrice,
      hasStop: Boolean(trade.stopLoss),
      hasTarget: Boolean(trade.takeProfit),
      grade: trade.coach?.grade ?? null,
      planDefined: Boolean(trade.stopLoss && trade.takeProfit),
    },
  });
}

/**
 * Map a decision-journal reflection + entry context into TradeReviewed.
 */
export function reviewToLearningEvent(input: {
  reflection: DecisionReflectionLearningInput;
  entry?: DecisionJournalEntryLearningInput;
  trade?: PaperTradeLearningInput;
}): LearningEvent {
  const { reflection, entry, trade } = input;
  const grade = entry?.grade ?? trade?.coach?.grade;
  const tags = [
    "review",
    reflection.followedPlan === "Yes"
      ? "plan_followed"
      : reflection.followedPlan === "No"
        ? "plan_broken"
        : "plan_partial",
    `reason:${slug(reflection.reason)}`,
    grade ? `grade:${String(grade).toLowerCase()}` : "",
    entry?.needsReview ? "needs_review" : "",
  ];

  return createTradeReviewedEvent({
    id: `trade-reviewed:${reflection.tradeId}:${reflection.updatedAt}`,
    timestamp: reflection.updatedAt,
    symbol: entry?.symbol ?? trade?.symbol,
    outcome: entry
      ? entry.outcome === "Win"
        ? "Win"
        : entry.outcome === "Loss"
          ? "Loss"
          : "Neutral"
      : trade
        ? outcomeFromPnl(trade.pnl)
        : "Neutral",
    tags,
    lesson: clipStructured(reflection.lesson, 160),
    source: "decision-journal",
  });
}

/**
 * Map journal reflection into JournalReflectionAdded.
 * Structured fields only — raw lesson text is NOT stored in learning memory.
 */
export function journalToLearningEvent(
  reflection: DecisionReflectionLearningInput,
): LearningEvent {
  return createJournalReflectionEvent({
    id: `journal-reflection:${reflection.tradeId}:${reflection.updatedAt}`,
    timestamp: reflection.updatedAt,
    tags: [
      "journal",
      `reason:${slug(reflection.reason)}`,
      `emotion:${slug(reflection.emotion)}`,
      reflection.followedPlan === "Yes"
        ? "plan_followed"
        : reflection.followedPlan === "No"
          ? "plan_broken"
          : "plan_partial",
      reflection.emotion === "FOMO" ? "fomo" : "",
      reflection.reason === "Impulse" ? "early_entry" : "",
    ],
    reflection: undefined,
    source: "decision-journal",
  });
}

/**
 * Map a completed replay session view into ReplayCompleted.
 */
export function replayToLearningEvent(session: ReplaySessionLearningInput): LearningEvent {
  const trade = session.trade;
  const missedStop = !trade.stopLoss;
  const missedTarget = !trade.takeProfit;
  const tags = [
    "replay",
    trade.followedPlan ? "plan_followed" : "plan_broken",
    missedStop ? "missed_stop_definition" : "stop_defined",
    missedTarget ? "missed_target_definition" : "target_defined",
    `grade:${String(session.summary.grade).toLowerCase()}`,
  ];

  return createReplayCompletedEvent({
    id: `replay-completed:${trade.id}`,
    timestamp: Date.now(),
    symbol: trade.symbol,
    tags,
    lesson: clipStructured(session.summary.lessonLearned, 160),
  });
}

function buildPaperTradeTags(trade: PaperTradeLearningInput, holdMinutes: number): string[] {
  const tags: string[] = [];

  if (trade.stopLoss) tags.push("stop_defined");
  else tags.push("no_stop");

  if (trade.takeProfit) tags.push("target_defined");
  else tags.push("no_target");

  if (trade.followedPlan) tags.push("plan_followed");
  else tags.push("plan_broken");

  if (!trade.stopLoss || !trade.takeProfit) tags.push("incomplete_plan");
  if (holdMinutes < 5) tags.push("early_exit_window");
  if (holdMinutes >= 240) tags.push("patience");

  const risk =
    trade.stopLoss && Math.abs(trade.entryPrice - trade.stopLoss) > 0
      ? Math.abs(trade.entryPrice - trade.stopLoss)
      : 0;
  const reward = trade.takeProfit
    ? Math.abs(trade.takeProfit - trade.entryPrice)
    : 0;
  const rr = risk > 0 ? reward / risk : 0;
  if (rr >= 2) tags.push("risk_control");
  if (rr > 0 && rr < 1) tags.push("poor_rr");

  if (trade.stopLoss && trade.side === "Long" && trade.exitPrice <= trade.stopLoss) {
    tags.push("stop_touched");
  }
  if (trade.stopLoss && trade.side === "Short" && trade.exitPrice >= trade.stopLoss) {
    tags.push("stop_touched");
  }
  if (trade.takeProfit && trade.side === "Long" && trade.exitPrice >= trade.takeProfit) {
    tags.push("target_touched");
    tags.push("exit_discipline");
  }
  if (trade.takeProfit && trade.side === "Short" && trade.exitPrice <= trade.takeProfit) {
    tags.push("target_touched");
    tags.push("exit_discipline");
  }

  return tags;
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function clipStructured(text: string | undefined, max: number): string | undefined {
  if (!text) return undefined;
  const t = text.trim();
  if (!t) return undefined;
  return t.length <= max ? t : `${t.slice(0, max - 1).trim()}…`;
}

