import type { HermesMemorySnapshot } from "@/lib/hermes-memory";
import type { NewsIntelligenceResult } from "@/lib/news-types";
import type { MarketCandidate } from "@/lib/opportunity-types";
import type { HermesVisionContext, HermesVisionResult } from "@/lib/hermes-vision-types";
import type { MultiTimeframeIntelligence } from "@/lib/multi-timeframe-types";
import type { InstitutionalFootprintResult } from "@/lib/footprint-types";
import { getStrategyDefinition } from "@/lib/strategy-library";
import type { StrategyQuality, StrategySignal, StrategyType } from "@/lib/strategy-types";

export type StrategyScoringContext = {
  context: HermesVisionContext;
  vision: HermesVisionResult;
  news: NewsIntelligenceResult;
  traderMemory: HermesMemorySnapshot;
  confidence: number;
  timeframe: string;
  multiTimeframe?: MultiTimeframeIntelligence;
  footprint?: InstitutionalFootprintResult;
};

export function scoreStrategy(type: StrategyType, input: StrategyScoringContext): StrategySignal {
  const definition = getStrategyDefinition(type);
  const whyItFits: string[] = [];
  const riskNotes = new Set<string>();
  let score = baseScore(type, input);

  if (input.context.candleTrend === "Bullish") {
    addFor(type, ["Trend Pullback", "Trend Continuation", "Momentum Breakout", "VWAP Reclaim"], 10);
    whyFor(type, ["Trend Pullback", "Trend Continuation", "Momentum Breakout"], "Trend remains constructive.");
  }

  if (input.context.ema20 && input.context.ema50) {
    if (input.context.ema20 >= input.context.ema50) {
      addFor(type, ["Trend Pullback", "Trend Continuation", "Support Bounce"], 12);
      whyFor(type, ["Trend Pullback", "Trend Continuation"], "EMA20 remains above EMA50.");
    } else {
      addFor(type, ["Reversal", "Resistance Rejection"], 8);
      riskNotes.add("Moving-average structure is not yet fully constructive.");
    }
  }

  if (input.context.vwap) {
    if (input.context.currentPrice >= input.context.vwap) {
      addFor(type, ["VWAP Reclaim", "Trend Continuation", "Momentum Breakout"], 10);
      whyFor(type, ["VWAP Reclaim"], "Price is trading above VWAP.");
    } else {
      addFor(type, ["Reversal", "Support Bounce"], 4);
      riskNotes.add("Price remains below VWAP, so confirmation matters.");
    }
  }

  if (input.context.rsi) {
    if (input.context.rsi > 45 && input.context.rsi < 66) {
      addFor(type, ["Trend Pullback", "Trend Continuation", "Support Bounce"], 8);
      whyItFits.push("RSI is constructive without being stretched.");
    } else if (input.context.rsi >= 70) {
      addFor(type, ["Momentum Breakout", "Resistance Rejection"], 4);
      riskNotes.add("RSI is stretched; avoid chasing without confirmation.");
    } else if (input.context.rsi <= 35) {
      addFor(type, ["Reversal", "Support Bounce"], 8);
      whyFor(type, ["Reversal", "Support Bounce"], "RSI is near an exhaustion area.");
    }
  }

  if (input.context.macd) {
    if (input.context.macd.line > input.context.macd.signal) {
      addFor(type, ["Momentum Breakout", "Trend Continuation", "VWAP Reclaim"], 8);
      whyFor(type, ["Momentum Breakout", "Trend Continuation"], "MACD is confirming momentum.");
    } else {
      addFor(type, ["Range Trading", "Consolidation", "Resistance Rejection"], 5);
      riskNotes.add("MACD has not confirmed continuation yet.");
    }
  }

  if (input.context.volume.status === "Rising") {
    addFor(type, ["Momentum Breakout", "Opening Range Breakout", "VWAP Reclaim"], 10);
    whyFor(type, ["Momentum Breakout", "Opening Range Breakout"], "Volume is expanding.");
  } else if (input.context.volume.status === "Fading") {
    addFor(type, ["Trend Pullback", "Consolidation", "Range Trading"], 7);
    whyFor(type, ["Trend Pullback", "Consolidation"], "Volume is fading during the pause.");
    riskNotes.add("Fading volume lowers breakout quality.");
  }

  if (input.context.distanceFromSupport !== null && input.context.distanceFromSupport < 0.015) {
    addFor(type, ["Support Bounce", "Trend Pullback", "Range Trading"], 12);
    whyFor(type, ["Support Bounce", "Trend Pullback"], "Price is near marked support.");
  }

  if (input.context.distanceFromResistance !== null && input.context.distanceFromResistance < 0.015) {
    addFor(type, ["Resistance Rejection", "Momentum Breakout", "Range Trading"], 10);
    whyFor(type, ["Resistance Rejection", "Momentum Breakout"], "Price is testing resistance.");
    if (type === "Trend Pullback") riskNotes.add("Nearby resistance may limit reward.");
  }

  if (input.context.riskReward !== null) {
    if (input.context.riskReward >= 2) {
      score += 8;
      whyItFits.push(`Risk/reward is acceptable at ${input.context.riskReward.toFixed(2)}:1.`);
    } else {
      score -= 12;
      riskNotes.add("Risk/reward is below the Hermes minimum.");
    }
  }

  if (input.news.urgency === "High") {
    score -= input.news.sentiment === "Negative" ? 12 : 5;
    riskNotes.add("High-urgency news can distort clean strategy reads.");
  }

  if (input.multiTimeframe) {
    if (type === "Trend Pullback" || type === "Trend Continuation") {
      if (input.multiTimeframe.higherTimeframeDirection.includes("Bullish")) {
        score += 10;
        whyItFits.push("Higher timeframes support the trend strategy.");
      } else if (input.multiTimeframe.higherTimeframeDirection.includes("Bearish")) {
        score -= 14;
        riskNotes.add("Higher timeframes do not support a bullish trend strategy.");
      }
    }

    if (type === "Momentum Breakout" && input.multiTimeframe.countertrendWarning) {
      score -= 12;
      riskNotes.add("Breakout idea conflicts with higher-timeframe structure.");
    }

    if (type === "Reversal" && input.multiTimeframe.countertrendWarning) {
      whyItFits.push("This is a countertrend reversal study, not a trend-following setup.");
      riskNotes.add("Reversal setup is countertrend and needs stricter confirmation.");
    }

    if (input.multiTimeframe.status === "Conflict" || input.multiTimeframe.status === "No Clear Alignment") {
      score += type === "No Valid Strategy" ? 10 : -8;
      riskNotes.add("Timeframes are not cleanly aligned.");
    } else if (input.multiTimeframe.status === "Strong Alignment") {
      score += 8;
      whyItFits.push("Multi-timeframe alignment supports the strategy.");
    }
  }

  if (input.footprint) {
    if (type === "Trend Continuation" && input.footprint.type === "Supply Absorbed") {
      score += 8;
      whyItFits.push("Supply appears to be absorbed, which can support continuation.");
    }
    if (type === "Support Bounce" && input.footprint.type === "Buyer Absorption") {
      score += 10;
      whyItFits.push("Buyer absorption supports the support-bounce thesis.");
    }
    if (type === "Momentum Breakout" && input.footprint.type === "Failed Breakout") {
      score -= 14;
      riskNotes.add("Failed breakout footprint weakens momentum-breakout quality.");
    }
    if (type === "Reversal" && (input.footprint.type === "Exhaustion" || input.footprint.type === "Liquidity Sweep")) {
      score += 9;
      whyItFits.push("Exhaustion or a liquidity sweep can support a reversal study.");
    }
    if (input.footprint.type === "Distribution" && ["Trend Pullback", "Trend Continuation"].includes(type)) {
      score -= 10;
      riskNotes.add("Distribution risk conflicts with long-biased trend strategy.");
    }
  }

  score += traderDnaAdjustment(type, input.traderMemory);
  score += input.confidence >= 75 ? 4 : input.confidence < 55 ? -6 : 0;

  if (whyItFits.length === 0) whyItFits.push(definition.purpose);
  if (riskNotes.size === 0) riskNotes.add(definition.riskNote);

  const finalScore = clamp(type === "No Valid Strategy" ? Math.max(score, noValidStrategyScore(input)) : score);
  return {
    type,
    score: finalScore,
    quality: strategyQuality(finalScore),
    whyItFits: whyItFits.slice(0, 5),
    nextConfirmation: nextConfirmation(type, input),
    riskNotes: Array.from(riskNotes).slice(0, 3),
    traderDnaFit: traderDnaFit(type, input.traderMemory),
  };

  function addFor(strategy: StrategyType, types: StrategyType[], points: number) {
    if (types.includes(strategy)) score += points;
  }

  function whyFor(strategy: StrategyType, types: StrategyType[], reason: string) {
    if (types.includes(strategy)) whyItFits.push(reason);
  }
}

export function scoreCandidateStrategy(candidate: MarketCandidate, memory?: HermesMemorySnapshot) {
  let score = 42;
  const strategy = candidateToStrategy(candidate);

  if (candidate.trend === "Bullish") score += 12;
  if (candidate.aboveMovingAverages) score += 12;
  if (candidate.volumeTrend === "Increasing") score += 10;
  if (candidate.volumeTrend === "Fading" && strategy === "Trend Pullback") score += 7;
  if (candidate.supportHeld) score += 10;
  if (candidate.momentumScore >= 75) score += 10;
  if (candidate.priceExtended) score -= 10;
  if (candidate.earningsSoon) score -= 8;
  if (candidate.riskLevel === "Low") score += 8;
  if (candidate.riskLevel === "High") score -= 10;

  const dominant = memory?.strategyPreference.dominantStyle;
  if (dominant === "breakout" && strategy === "Momentum Breakout") score += 5;
  if (dominant === "swing" && strategy === "Trend Pullback") score += 5;
  if (dominant === "reversal" && strategy === "Reversal") score += 5;
  if (dominant === "scalper" && strategy === "VWAP Reclaim") score += 5;

  return {
    strategy,
    score: clamp(score),
    quality: strategyQuality(score),
  };
}

function baseScore(type: StrategyType, input: StrategyScoringContext) {
  if (type === "No Valid Strategy") return 20;
  if (type === "Opening Range Breakout" && !["1m", "5m", "15m", "30m"].includes(input.timeframe)) return 24;
  if (type === "Consolidation") return 42;
  return 38;
}

function traderDnaAdjustment(type: StrategyType, memory: HermesMemorySnapshot) {
  const dominant = memory.strategyPreference.dominantStyle;
  if (dominant === "breakout" && ["Momentum Breakout", "Opening Range Breakout"].includes(type)) return 6;
  if (dominant === "swing" && ["Trend Pullback", "Trend Continuation"].includes(type)) return 6;
  if (dominant === "reversal" && ["Reversal", "Range Trading"].includes(type)) return 6;
  if (dominant === "scalper" && ["VWAP Reclaim", "Opening Range Breakout"].includes(type)) return 6;
  return 0;
}

function traderDnaFit(type: StrategyType, memory: HermesMemorySnapshot): StrategySignal["traderDnaFit"] {
  if (memory.performance.totalTrades < 3) return "Neutral";
  const adjustment = traderDnaAdjustment(type, memory);
  if (adjustment > 0) return "Aligned";
  if (memory.behavior.overtradingDetected && ["Momentum Breakout", "Opening Range Breakout"].includes(type)) return "Poor Fit";
  return "Neutral";
}

function nextConfirmation(type: StrategyType, input: StrategyScoringContext) {
  if (type === "Momentum Breakout") return "Wait for a close above resistance with volume expansion.";
  if (type === "Trend Pullback") return "Wait for a confirmation candle near EMA20, VWAP, or support.";
  if (type === "VWAP Reclaim") return "Wait for price to hold VWAP after reclaiming it.";
  if (type === "Support Bounce") return "Wait for support to hold with a stronger close.";
  if (type === "Resistance Rejection") return "Wait for a failed close above resistance.";
  if (type === "Consolidation") return "Wait for compression to resolve with volume.";
  if (type === "No Valid Strategy") return "Wait until structure, risk, or momentum becomes clearer.";
  return getStrategyDefinition(type).confirmation;
}

function noValidStrategyScore(input: StrategyScoringContext) {
  const missingPlan = input.context.riskReward === null;
  const weakScores = [input.vision.trendScore, input.vision.momentumScore, input.vision.volumeScore, input.vision.setupStructureScore].filter((score) => score < 50).length;
  return missingPlan || weakScores >= 3 ? 64 : 28;
}

function candidateToStrategy(candidate: MarketCandidate): StrategyType {
  if (candidate.setupType === "Breakout") return "Momentum Breakout";
  if (candidate.setupType === "Pullback") return "Trend Pullback";
  if (candidate.setupType === "Support Bounce") return "Support Bounce";
  if (candidate.setupType === "Range Reversal") return "Reversal";
  return "Trend Continuation";
}

function strategyQuality(score: number): StrategyQuality {
  const normalized = clamp(score);
  if (normalized >= 82) return "Excellent";
  if (normalized >= 68) return "Strong";
  if (normalized >= 52) return "Developing";
  return "Weak";
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}
