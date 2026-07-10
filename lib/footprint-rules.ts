import type { FootprintEvidenceState } from "@/lib/footprint-evidence-builder";
import type { FootprintDirection, FootprintType } from "@/lib/footprint-types";

export type FootprintRuleMatch = {
  type: FootprintType;
  direction: FootprintDirection;
  evidence: string[];
  baseConfidence: number;
};

export function matchFootprintRules(state: FootprintEvidenceState): FootprintRuleMatch {
  const candidates: FootprintRuleMatch[] = [
    rule("Buyer Absorption", "Bullish", 56, [
      state.nearSupport && "Lower wick rejection near support",
      state.relativeVolume >= 1.15 && "Volume expanded near support",
      state.recoveredAboveSupport && "Candle recovered before close",
      state.aboveVwap && "Price recovered above VWAP",
      state.momentumBearish && "Downside momentum weakened into support",
    ]),
    rule("Seller Absorption", "Bearish", 56, [
      state.nearResistance && "Upper wick rejection near resistance",
      state.relativeVolume >= 1.15 && "Volume expanded near resistance",
      state.rejectedAtResistance && "Candle failed to hold the high",
      state.belowVwap && "Price is below VWAP",
      state.momentumBullish && "Upside momentum is being challenged",
    ]),
    rule("Liquidity Sweep", "Neutral", 54, [
      (state.failedBreakout || state.failedBreakdown) && "Price swept a recent swing level",
      state.relativeVolume >= 1.1 && "Sweep occurred on elevated volume",
      (state.lowerWickPct >= 0.34 || state.upperWickPct >= 0.34) && "Wick shows rejection after the sweep",
    ]),
    rule("Failed Breakout", "Bearish", 58, [
      state.failedBreakout && "Price broke above a prior swing high but closed back below it",
      state.nearResistance && "Move occurred near resistance",
      state.relativeVolume >= 1.05 && "Breakout attempt had visible participation",
      state.momentumBearish && "Momentum failed to confirm the breakout",
    ]),
    rule("Failed Breakdown", "Bullish", 58, [
      state.failedBreakdown && "Price broke below a prior swing low but recovered",
      state.nearSupport && "Move occurred near support",
      state.relativeVolume >= 1.05 && "Breakdown attempt had visible participation",
      state.momentumBullish && "Momentum improved after recovery",
    ]),
    rule("Exhaustion", "Neutral", 50, [
      state.relativeVolume >= 1.35 && "Volume expanded sharply",
      (state.upperWickPct >= 0.38 || state.lowerWickPct >= 0.38) && "Large wick suggests rejection",
      state.bodyPct <= 0.42 && "Candle body is small relative to the range",
    ]),
    rule("Accumulation", "Bullish", 50, [
      state.emaBullish && "EMA structure remains constructive",
      state.nearSupport && "Price is holding near support",
      state.relativeVolume <= 0.95 && "Pullback volume is controlled",
      state.aboveVwap && "Price remains above VWAP",
    ]),
    rule("Distribution", "Bearish", 50, [
      state.nearResistance && "Price is pressing into resistance",
      state.upperWickPct >= 0.28 && "Upper wicks show selling pressure",
      state.relativeVolume <= 1.05 && "Participation is not expanding cleanly",
      state.momentumBearish && "Momentum is weakening",
    ]),
    rule("Hidden Buying", "Bullish", 48, [
      state.lowerWickPct >= 0.3 && "Dips are being bought",
      state.aboveVwap && "Price is above VWAP",
      state.relativeVolume >= 0.95 && "Participation remains present",
    ]),
    rule("Hidden Selling", "Bearish", 48, [
      state.upperWickPct >= 0.3 && "Rallies are being sold",
      state.belowVwap && "Price is below VWAP",
      state.relativeVolume >= 0.95 && "Participation remains present",
    ]),
    rule("Supply Absorbed", "Bullish", 54, [
      state.brokePriorHigh && !state.failedBreakout && "Price accepted above a prior high",
      state.relativeVolume >= 1.1 && "Volume supported the push through supply",
      state.momentumBullish && "Momentum confirmed the move",
    ]),
    rule("Demand Absorbed", "Bearish", 54, [
      state.brokePriorLow && !state.failedBreakdown && "Price accepted below a prior low",
      state.relativeVolume >= 1.1 && "Volume supported the move through demand",
      state.momentumBearish && "Momentum confirmed the move",
    ]),
  ];

  const best = candidates
    .filter((candidate) => candidate.evidence.length >= 3)
    .sort((a, b) => b.baseConfidence + b.evidence.length * 4 - (a.baseConfidence + a.evidence.length * 4))[0];

  return best ?? {
    type: "No clear institutional footprint",
    direction: "Neutral",
    evidence: ["Evidence is not strong enough for a responsible footprint label."],
    baseConfidence: 35,
  };
}

function rule(
  type: FootprintType,
  direction: FootprintDirection,
  baseConfidence: number,
  evidence: Array<string | false | null | undefined>,
): FootprintRuleMatch {
  return {
    type,
    direction,
    baseConfidence,
    evidence: evidence.filter((item): item is string => Boolean(item)),
  };
}
