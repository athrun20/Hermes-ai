import type { StrategyType } from "@/lib/strategy-types";

export type StrategyDefinition = {
  type: StrategyType;
  purpose: string;
  confirmation: string;
  riskNote: string;
};

export const strategyLibrary: StrategyDefinition[] = [
  {
    type: "Trend Pullback",
    purpose: "Study a controlled pause inside a constructive trend.",
    confirmation: "Wait for a reclaim candle or higher low near EMA20, VWAP, or support.",
    riskNote: "Avoid pullbacks that lose structure or sit too close to resistance.",
  },
  {
    type: "Momentum Breakout",
    purpose: "Study expansion through a clearly watched level.",
    confirmation: "Look for volume expansion and a close above resistance.",
    riskNote: "Avoid chasing extended candles without a clean invalidation level.",
  },
  {
    type: "Range Trading",
    purpose: "Study mean reversion between known support and resistance.",
    confirmation: "Wait for rejection at range edge with momentum stabilizing.",
    riskNote: "Do not use range logic when trend expansion is already underway.",
  },
  {
    type: "Trend Continuation",
    purpose: "Study a trend that remains intact after confirmation.",
    confirmation: "Look for higher highs, higher lows, and participation above moving averages.",
    riskNote: "Continuation gets weaker when RSI is stretched and volume fades.",
  },
  {
    type: "Reversal",
    purpose: "Study a possible change in direction after exhaustion.",
    confirmation: "Wait for failed breakdown/breakout and momentum turn.",
    riskNote: "Reversals need stricter confirmation because the prior trend still matters.",
  },
  {
    type: "Support Bounce",
    purpose: "Study demand appearing at a planned support area.",
    confirmation: "Wait for support to hold with improving candle close and volume.",
    riskNote: "A bounce without volume can become only a pause before continuation lower.",
  },
  {
    type: "Resistance Rejection",
    purpose: "Study supply appearing at a planned resistance area.",
    confirmation: "Wait for rejection wick or failed close above resistance.",
    riskNote: "Short-side ideas need clean invalidation above the level.",
  },
  {
    type: "VWAP Reclaim",
    purpose: "Study price recovering a key intraday fairness line.",
    confirmation: "Wait for price to reclaim and hold VWAP with participation.",
    riskNote: "A reclaim that immediately loses VWAP is not yet confirmation.",
  },
  {
    type: "Opening Range Breakout",
    purpose: "Study expansion after the early range defines risk.",
    confirmation: "Wait for a range break with volume and a controlled retest.",
    riskNote: "Opening range ideas are lower quality later in the session without fresh compression.",
  },
  {
    type: "Consolidation",
    purpose: "Study compression before a directional decision.",
    confirmation: "Wait for expansion out of the range with volume.",
    riskNote: "Compression is preparation, not a reason to predict direction.",
  },
  {
    type: "No Valid Strategy",
    purpose: "Protect capital when the chart does not offer a clean lesson.",
    confirmation: "Wait for trend, range, risk, or news context to become clearer.",
    riskNote: "Forcing trades from unclear structure weakens discipline.",
  },
];

export function getStrategyDefinition(type: StrategyType) {
  return strategyLibrary.find((item) => item.type === type) ?? strategyLibrary[strategyLibrary.length - 1];
}
