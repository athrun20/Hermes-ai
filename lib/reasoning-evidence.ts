import type { ReasoningEngineInput, ReasoningEvidence } from "@/lib/reasoning-types";

export function buildReasoningEvidence(input: ReasoningEngineInput): ReasoningEvidence[] {
  const now = Date.now();
  return [
    ...marketStructureEvidence(input, now),
    ...timeframeEvidence(input, now),
    ...trendEvidence(input, now),
    ...footprintEvidence(input, now),
    ...volumeEvidence(input, now),
    ...momentumEvidence(input, now),
    ...riskEvidence(input, now),
    ...newsEvidence(input, now),
    ...traderDnaEvidence(input, now),
    ...portfolioEvidence(input, now),
  ];
}

function marketStructureEvidence({ context, vision }: ReasoningEngineInput, timestamp: number): ReasoningEvidence[] {
  const supportive = vision.setupStructureScore >= 65;
  return [
    evidence({
      id: "structure-quality",
      label: supportive ? "Structure remains constructive" : "Structure needs confirmation",
      category: "Market Structure",
      direction: supportive ? "Supportive" : "Contradictory",
      impact: vision.setupStructureScore >= 75 || vision.setupStructureScore < 45 ? "High" : "Medium",
      confidenceContribution: scaleContribution(vision.setupStructureScore, 18),
      explanation: vision.dimensions.find((item) => item.dimension === "Structure")?.reasons[0] ?? vision.primaryInsight,
      sourceModule: "Hermes Vision",
      timeframe: context.symbol,
      timestamp,
    }),
  ];
}

function timeframeEvidence({ multiTimeframe }: ReasoningEngineInput, timestamp: number): ReasoningEvidence[] {
  if (!multiTimeframe) return [fallback("multi-timeframe-missing", "Multi-timeframe data is incomplete", "Multi-Timeframe Alignment", timestamp)];
  return [
    evidence({
      id: "multi-timeframe-alignment",
      label: `${multiTimeframe.status}: ${multiTimeframe.higherTimeframeDirection}`,
      category: "Multi-Timeframe Alignment",
      direction: multiTimeframe.status === "Conflict" ? "Contradictory" : multiTimeframe.status === "Mixed" ? "Neutral" : "Supportive",
      impact: multiTimeframe.status === "Strong Alignment" || multiTimeframe.status === "Conflict" ? "High" : "Medium",
      confidenceContribution: scaleContribution(multiTimeframe.alignmentScore + multiTimeframe.alignmentImpact, 18),
      explanation: multiTimeframe.countertrendWarning ?? multiTimeframe.mentorSummary,
      sourceModule: "Multi-Timeframe Intelligence",
      timeframe: multiTimeframe.activeTimeframe,
      timestamp,
    }),
  ];
}

function trendEvidence({ context, vision }: ReasoningEngineInput, timestamp: number): ReasoningEvidence[] {
  const emaAligned = Boolean(context.ema20 && context.ema50 && context.ema20 >= context.ema50);
  return [
    evidence({
      id: "trend-quality",
      label: emaAligned ? "EMA alignment supports trend" : "Trend alignment is mixed",
      category: "Trend Quality",
      direction: vision.trendScore >= 62 ? "Supportive" : vision.trendScore < 48 ? "Contradictory" : "Neutral",
      impact: vision.trendScore >= 78 || vision.trendScore < 45 ? "High" : "Medium",
      confidenceContribution: scaleContribution(vision.trendScore, 12),
      explanation: vision.dimensions.find((item) => item.dimension === "Trend")?.reasons[0] ?? `${context.candleTrend} candle trend.`,
      sourceModule: "Hermes Vision",
      timestamp,
    }),
  ];
}

function footprintEvidence({ footprint }: ReasoningEngineInput, timestamp: number): ReasoningEvidence[] {
  if (!footprint) return [fallback("footprint-missing", "Institutional footprint is not available", "Institutional Activity", timestamp)];
  const direction = footprint.direction === "Bullish" ? "Supportive" : footprint.direction === "Bearish" ? "Contradictory" : "Neutral";
  return [
    evidence({
      id: "institutional-footprint",
      label: footprint.type,
      category: "Institutional Activity",
      direction,
      impact: footprint.strength === "Strong" ? "High" : footprint.strength === "Developing" ? "Medium" : "Low",
      confidenceContribution: scaleContribution(footprint.confidence + footprint.confidenceImpact, 12),
      explanation: footprint.explanation,
      sourceModule: "Institutional Footprint Intelligence",
      timestamp,
    }),
  ];
}

function volumeEvidence({ context, vision }: ReasoningEngineInput, timestamp: number): ReasoningEvidence[] {
  const ratio = context.volume.average > 0 ? context.volume.current / context.volume.average : 1;
  return [
    evidence({
      id: "volume-quality",
      label: ratio >= 1.2 ? "Volume is expanding" : ratio <= 0.75 ? "Volume is weak" : "Volume is neutral",
      category: "Volume Quality",
      direction: ratio >= 1.1 ? "Supportive" : ratio <= 0.8 ? "Contradictory" : "Neutral",
      impact: ratio >= 1.35 || ratio <= 0.7 ? "High" : "Medium",
      confidenceContribution: scaleContribution(vision.volumeScore, 10),
      explanation: `Current volume is ${Math.round(ratio * 100)}% of average.`,
      sourceModule: "Native Chart Volume",
      timestamp,
    }),
  ];
}

function momentumEvidence({ context, vision }: ReasoningEngineInput, timestamp: number): ReasoningEvidence[] {
  const rsi = context.rsi ?? 50;
  const macdBullish = context.macd ? context.macd.line > context.macd.signal : false;
  return [
    evidence({
      id: "momentum-condition",
      label: macdBullish ? "Momentum improving" : rsi >= 70 ? "Momentum stretched" : "Momentum unconfirmed",
      category: "Momentum",
      direction: macdBullish && rsi < 70 ? "Supportive" : rsi >= 70 || vision.momentumScore < 45 ? "Contradictory" : "Neutral",
      impact: rsi >= 70 || macdBullish ? "Medium" : "Low",
      confidenceContribution: scaleContribution(vision.momentumScore, 8),
      explanation: `RSI ${Math.round(rsi)} and MACD ${macdBullish ? "above" : "not above"} signal.`,
      sourceModule: "RSI / MACD",
      timestamp,
    }),
  ];
}

function riskEvidence(input: ReasoningEngineInput, timestamp: number): ReasoningEvidence[] {
  const rr = input.context.riskReward ?? input.tradeQuality?.riskReward ?? null;
  return [
    evidence({
      id: "risk-reward",
      label: rr === null ? "Risk/reward incomplete" : rr >= 2 ? "Risk/reward acceptable" : "Risk/reward needs work",
      category: "Risk/Reward",
      direction: rr === null ? "Neutral" : rr >= 2 ? "Supportive" : "Contradictory",
      impact: rr === null ? "Medium" : rr >= 3 || rr < 1 ? "High" : "Medium",
      confidenceContribution: scaleContribution(rr === null ? 48 : rr >= 3 ? 90 : rr >= 2 ? 76 : rr >= 1 ? 52 : 25, 10),
      explanation: rr === null ? "Entry, stop, and target are required to measure risk." : `Current plan offers ${rr.toFixed(2)}:1.`,
      sourceModule: "Trade Quality Engine",
      timestamp,
    }),
  ];
}

function newsEvidence({ news }: ReasoningEngineInput, timestamp: number): ReasoningEvidence[] {
  if (!news) return [fallback("news-missing", "News context is unavailable", "News and Event Risk", timestamp)];
  return [
    evidence({
      id: "news-context",
      label: `${news.sentiment} news, ${news.urgency} urgency`,
      category: "News and Event Risk",
      direction: news.urgency === "High" && news.sentiment === "Negative" ? "Contradictory" : news.sentiment === "Positive" && news.urgency !== "High" ? "Supportive" : "Neutral",
      impact: news.urgency === "High" ? "High" : news.urgency === "Medium" ? "Medium" : "Low",
      confidenceContribution: scaleContribution(news.urgency === "High" ? 45 : news.sentiment === "Positive" ? 72 : news.sentiment === "Negative" ? 50 : 62, 6),
      explanation: news.hermesInterpretation,
      sourceModule: "News Intelligence",
      timestamp,
    }),
  ];
}

function traderDnaEvidence({ memory, strategy }: ReasoningEngineInput, timestamp: number): ReasoningEvidence[] {
  const fit = strategy?.currentStrategy.traderDnaFit ?? "Neutral";
  const score = fit === "Aligned" ? 84 : fit === "Poor Fit" ? 38 : memory && memory.scores.discipline >= 70 ? 70 : 58;
  return [
    evidence({
      id: "trader-dna-fit",
      label: `Trader DNA fit: ${fit}`,
      category: "Trader DNA Fit",
      direction: fit === "Aligned" ? "Supportive" : fit === "Poor Fit" ? "Contradictory" : "Neutral",
      impact: fit === "Poor Fit" ? "High" : "Medium",
      confidenceContribution: scaleContribution(score, 6),
      explanation: memory
        ? `${memory.personality} profile with discipline score ${memory.scores.discipline}.`
        : "Trader DNA has limited history, so Hermes keeps this factor neutral.",
      sourceModule: "Trader DNA",
      timestamp,
    }),
  ];
}

function portfolioEvidence({ portfolio, plan }: ReasoningEngineInput, timestamp: number): ReasoningEvidence[] {
  if (!portfolio || !plan) return [];
  const exposure = portfolio.equity > 0 ? (plan.notional / portfolio.equity) * 100 : 100;
  return [
    evidence({
      id: "portfolio-exposure",
      label: exposure <= 10 ? "Paper exposure controlled" : "Paper exposure elevated",
      category: "Portfolio Exposure",
      direction: exposure <= 10 ? "Supportive" : exposure > 25 ? "Contradictory" : "Neutral",
      impact: exposure > 25 ? "High" : "Low",
      confidenceContribution: exposure <= 10 ? 2 : exposure > 25 ? -8 : -2,
      explanation: `Planned paper position uses ${exposure.toFixed(1)}% of equity.`,
      sourceModule: "Paper Portfolio",
      timestamp,
    }),
  ];
}

function evidence(item: ReasoningEvidence): ReasoningEvidence {
  return item;
}

function fallback(id: string, label: string, category: ReasoningEvidence["category"], timestamp: number): ReasoningEvidence {
  return evidence({
    id,
    label,
    category,
    direction: "Neutral",
    impact: "Low",
    confidenceContribution: 0,
    explanation: "Hermes is using a neutral read until this module provides enough data.",
    sourceModule: "Reasoning Adapter",
    timestamp,
  });
}

function scaleContribution(score: number, weight: number) {
  return Math.round(((Math.max(0, Math.min(100, score)) - 50) / 50) * weight);
}
