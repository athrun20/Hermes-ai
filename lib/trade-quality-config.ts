import type { TradeQualityCategory, TradeQualityCap } from "@/lib/trade-quality-types";

export const tradeQualityWeights: Record<TradeQualityCategory, number> = {
  Trend: 10,
  Momentum: 8,
  Volume: 8,
  Structure: 10,
  "Multi-Timeframe Alignment": 10,
  "Institutional Footprint": 6,
  "News Context": 5,
  "Entry Quality": 8,
  "Stop Quality": 8,
  "Target Quality": 6,
  "Risk / Reward": 8,
  "Position Size": 4,
  "Strategy Fit": 4,
  "Trader DNA Fit": 2,
  "Daily Goal Alignment": 1,
  "Plan Completeness": 2,
};

export const tradeQualityCaps = {
  missingStop: {
    id: "missing-stop",
    cap: 59,
    reason: "Missing stop loss caps the trade below strong quality.",
  },
  missingTarget: {
    id: "missing-target",
    cap: 64,
    reason: "Missing take profit caps the trade until reward is defined.",
  },
  missingEntry: {
    id: "missing-entry",
    cap: 54,
    reason: "Missing entry prevents Hermes from judging risk accurately.",
  },
  riskRewardBelowOne: {
    id: "risk-reward-below-one",
    cap: 49,
    reason: "Risk/reward below 1:1 is capped as avoid-for-now quality.",
  },
  oversizedPosition: {
    id: "oversized-position",
    cap: 44,
    reason: "Position size exceeds allowed paper risk.",
  },
  dailyConflict: {
    id: "daily-conflict",
    cap: 59,
    reason: "Trade conflicts strongly with the Daily timeframe.",
  },
  newsRiskWithoutStop: {
    id: "news-risk-without-stop",
    cap: 39,
    reason: "Major news risk without a defined stop creates high process risk.",
  },
  incompletePlan: {
    id: "incomplete-plan",
    cap: 74,
    reason: "Plan completeness below 70% prevents A or B quality.",
  },
} satisfies Record<string, TradeQualityCap>;
