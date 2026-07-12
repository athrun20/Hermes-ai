/**
 * Deterministic recommended-practice library (educational only).
 * Never blocks trades or alters orders.
 */

import type { BehaviorKey } from "@/lib/learning-engine/types";

export type PracticeFocusKey =
  | BehaviorKey
  | "broken_plan_losses"
  | "entry_exit_optimization"
  | "review_discipline"
  | "build_sample"
  | "reinforce_strength"
  | "no_trade_week";

export type PracticeExercise = {
  focusKey: PracticeFocusKey;
  title: string;
  exercise: string;
};

const PRACTICES: Record<PracticeFocusKey, PracticeExercise> = {
  ignoring_stops: {
    focusKey: "ignoring_stops",
    title: "Stop discipline",
    exercise:
      "Define invalidation before entry and do not widen the stop after execution on the next three paper trades.",
  },
  plan_broken: {
    focusKey: "plan_broken",
    title: "Plan adherence",
    exercise:
      "Review the written trade plan immediately before placing the next paper trade.",
  },
  broken_plan_losses: {
    focusKey: "broken_plan_losses",
    title: "Plan adherence",
    exercise:
      "Review the written trade plan immediately before placing the next paper trade.",
  },
  revenge_trading: {
    focusKey: "revenge_trading",
    title: "Post-loss cooldown",
    exercise:
      "Use a mandatory cooldown after a loss before creating another trade plan.",
  },
  overtrading: {
    focusKey: "overtrading",
    title: "Session trade limit",
    exercise:
      "Set a maximum number of trades for the session and stop after reaching it.",
  },
  entering_too_early: {
    focusKey: "entering_too_early",
    title: "Confirmation-first entry",
    exercise:
      "Wait for the planned confirmation condition before entering the next three paper trades.",
  },
  chasing_breakouts: {
    focusKey: "chasing_breakouts",
    title: "Extended-move filter",
    exercise:
      "Record the distance from VWAP before entry and avoid entering after an extended move.",
  },
  trading_against_htf: {
    focusKey: "trading_against_htf",
    title: "Higher-timeframe bias first",
    exercise:
      "Write the 4H and Daily bias before taking the next intraday setup.",
  },
  entry_exit_optimization: {
    focusKey: "entry_exit_optimization",
    title: "Entry and exit refinement",
    exercise:
      "For the next three paper trades, write one entry trigger and one exit rule before execution, then score adherence after close.",
  },
  review_discipline: {
    focusKey: "review_discipline",
    title: "Review before next session",
    exercise: "Complete the trade review before starting the next session.",
  },
  good_risk_control: {
    focusKey: "good_risk_control",
    title: "Protect risk discipline",
    exercise:
      "Keep defining invalidation first; apply the same stop process on the next three A-quality setups only.",
  },
  strong_patience: {
    focusKey: "strong_patience",
    title: "Protect patience",
    exercise:
      "Repeat the conditions that supported patience: wait for plan confirmation before the next paper entry.",
  },
  good_trend_identification: {
    focusKey: "good_trend_identification",
    title: "Protect trend alignment",
    exercise:
      "Write higher-timeframe bias before entry and take only setups that align with it this week.",
  },
  good_entry_timing: {
    focusKey: "good_entry_timing",
    title: "Protect entry timing",
    exercise:
      "Reuse the same confirmation checklist that produced clean entries on the next three planned paper trades.",
  },
  good_exit_discipline: {
    focusKey: "good_exit_discipline",
    title: "Protect exit discipline",
    exercise:
      "Pre-write take-profit and invalidation, then exit only on those rules for the next three paper trades.",
  },
  plan_followed: {
    focusKey: "plan_followed",
    title: "Protect plan adherence",
    exercise:
      "Continue the plan-first habit: read the written plan out loud before each paper order this week.",
  },
  reinforce_strength: {
    focusKey: "reinforce_strength",
    title: "Reinforce proven process",
    exercise:
      "Repeat the conditions behind your strongest reliable behavior on the next A-quality paper setup only.",
  },
  build_sample: {
    focusKey: "build_sample",
    title: "Build sample size",
    exercise:
      "Complete one planned paper trade with entry, stop, and target defined, then finish its review.",
  },
  no_trade_week: {
    focusKey: "no_trade_week",
    title: "No completed trades this week",
    exercise:
      "Complete one planned paper trade and its review so Hermes can update weekly learning.",
  },
};

/**
 * Resolve a deterministic practice exercise for a focus key.
 */
export function getPracticeExercise(focusKey: PracticeFocusKey): PracticeExercise {
  return PRACTICES[focusKey] ?? PRACTICES.build_sample;
}

/**
 * Map a detected pattern key / label to a practice focus key.
 */
export function patternKeyToPracticeFocus(
  key: string,
  kind: "strength" | "weakness" | "success_pattern" | "recurring_mistake",
): PracticeFocusKey {
  if (key in PRACTICES) return key as PracticeFocusKey;
  if (kind === "strength" || kind === "success_pattern") return "reinforce_strength";
  if (key.includes("plan") && key.includes("broken")) return "broken_plan_losses";
  if (key.includes("stop")) return "ignoring_stops";
  if (key.includes("revenge")) return "revenge_trading";
  if (key.includes("overtrad")) return "overtrading";
  if (key.includes("early") || key.includes("entry")) return "entering_too_early";
  if (key.includes("chase")) return "chasing_breakouts";
  if (key.includes("htf") || key.includes("timeframe")) return "trading_against_htf";
  if (kind === "weakness" || kind === "recurring_mistake") return "entry_exit_optimization";
  return "build_sample";
}
