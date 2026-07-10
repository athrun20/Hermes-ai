import type {
  SmartChartAnnotation,
  SmartChartIntelligenceInput,
  SmartChartIntelligenceResult,
} from "@/lib/smart-chart-intelligence-types";

const MAX_ACTIVE_ANNOTATIONS = 5;

export function buildSmartChartIntelligence(input: SmartChartIntelligenceInput): SmartChartIntelligenceResult {
  const now = Date.now();
  const candidates = [
    detectStructure(input, now),
    detectBreakoutOrFailure(input, now),
    detectRetest(input, now),
    detectVwap(input, now),
    detectEmaInteraction(input, now),
    detectVolume(input, now),
    detectLiquiditySweep(input, now),
    detectZones(input, now),
    detectFootprint(input, now),
    detectMomentum(input, now),
    detectNews(input, now),
  ].filter((item): item is SmartChartAnnotation => Boolean(item));

  const annotations = avoidOverlaps(
    candidates
      .filter((item) => !item.expiresAt || item.expiresAt > now)
      .sort((a, b) => b.priority - a.priority)
      .slice(0, MAX_ACTIVE_ANNOTATIONS),
  );
  const confidenceDelta = annotations.reduce(
    (sum, item) => sum + (item.explanation?.confidenceDelta ?? 0),
    0,
  );

  return {
    kind: "hermes-smart-chart-intelligence-v1",
    annotations,
    confidenceDelta,
    thesisImpact:
      annotations[0]?.explanation?.thesisImpact ??
      "Hermes is watching the chart for a clearer teaching moment.",
  };
}

function detectStructure(input: SmartChartIntelligenceInput, now: number) {
  const label =
    input.reasoning.marketStructure === "Higher Highs and Higher Lows"
      ? "HH / HL"
      : input.reasoning.marketStructure === "Lower Highs and Lower Lows"
        ? "LH / LL"
        : null;
  if (!label) return null;
  return annotation({
    id: `structure-${input.context.symbol}-${label}`,
    kind: "structure",
    text: label,
    tone: label === "HH / HL" ? "mint" : "danger",
    price: input.context.currentPrice,
    priority: 78,
    confidenceDelta: label === "HH / HL" ? 4 : -4,
    whatHappened: `${input.context.symbol} is forming ${label === "HH / HL" ? "higher highs and higher lows" : "lower highs and lower lows"}.`,
    whyItMatters: "Market structure defines whether pullbacks are constructive or defensive.",
    thesisImpact: label === "HH / HL" ? "Supports the current bullish thesis." : "Weakens bullish continuation and raises caution.",
    sourceModule: "Reasoning Engine",
    now,
  });
}

function detectBreakoutOrFailure(input: SmartChartIntelligenceInput, now: number) {
  if (input.reasoning.marketStructure === "Breakout") {
    return annotation({
      id: `breakout-${input.context.symbol}`,
      kind: "breakout",
      text: "Breakout",
      tone: "mint",
      price: input.context.currentPrice,
      priority: 88,
      confidenceDelta: input.context.volume.status === "Rising" ? 6 : 2,
      whatHappened: "Price is attempting to push beyond the prior structure.",
      whyItMatters: "Breakouts need participation; without volume they can fail quickly.",
      thesisImpact: input.context.volume.status === "Rising" ? "Improves the thesis." : "Keeps the thesis conditional on volume confirmation.",
      sourceModule: "Strategy Intelligence",
      now,
    });
  }
  if (input.footprint.type === "Failed Breakout") {
    return annotation({
      id: `failed-breakout-${input.context.symbol}`,
      kind: "breakout",
      text: "Failed Breakout",
      tone: "danger",
      price: input.context.currentPrice,
      priority: 92,
      confidenceDelta: -8,
      whatHappened: "Price failed to hold above a breakout area.",
      whyItMatters: "Failed breakouts often trap late entries and shift control back to sellers.",
      thesisImpact: "Reduces confidence until price repairs structure.",
      sourceModule: "Institutional Footprint Intelligence",
      now,
    });
  }
  return null;
}

function detectRetest(input: SmartChartIntelligenceInput, now: number) {
  if (input.reasoning.marketStructure !== "Retest" && input.context.distanceFromSupport !== null && input.context.distanceFromSupport > 0.012) {
    return null;
  }
  return annotation({
    id: `retest-${input.context.symbol}`,
    kind: "retest",
    text: "Retest",
    tone: "gold",
    price: input.context.currentPrice,
    priority: 76,
    confidenceDelta: 2,
    whatHappened: "Price is close to a structure test.",
    whyItMatters: "Retests reveal whether prior buyers defend the level.",
    thesisImpact: "Keeps the thesis alive, but confirmation is still required.",
    sourceModule: "Hermes Vision",
    now,
  });
}

function detectVwap(input: SmartChartIntelligenceInput, now: number) {
  if (!input.context.vwap) return null;
  const above = input.context.currentPrice >= input.context.vwap;
  const distance = Math.abs(input.context.currentPrice - input.context.vwap) / input.context.currentPrice;
  if (distance > 0.012) return null;
  return annotation({
    id: `vwap-${above ? "reclaim" : "loss"}-${input.context.symbol}`,
    kind: "vwap",
    text: above ? "VWAP Reclaim" : "VWAP Loss",
    tone: above ? "mint" : "danger",
    price: input.context.vwap,
    priority: 86,
    confidenceDelta: above ? 5 : -6,
    whatHappened: `Price is ${above ? "holding above" : "losing"} VWAP.`,
    whyItMatters: "VWAP often separates constructive intraday control from defensive action.",
    thesisImpact: above ? "Improves confidence in the current thesis." : "Reduces confidence until VWAP is reclaimed.",
    sourceModule: "Native Chart Engine",
    now,
  });
}

function detectEmaInteraction(input: SmartChartIntelligenceInput, now: number) {
  const ema = input.context.ema20 ?? input.context.ema50;
  if (!ema) return null;
  const distance = Math.abs(input.context.currentPrice - ema) / input.context.currentPrice;
  if (distance > 0.01) return null;
  const supportive = input.context.currentPrice >= ema;
  return annotation({
    id: `ema-${supportive ? "support" : "resistance"}-${input.context.symbol}`,
    kind: "ema",
    text: supportive ? "EMA Support" : "EMA Resistance",
    tone: supportive ? "mint" : "danger",
    price: ema,
    priority: 74,
    confidenceDelta: supportive ? 3 : -3,
    whatHappened: `Price is reacting near a key EMA.`,
    whyItMatters: "EMA reactions help identify whether trend participants are defending the move.",
    thesisImpact: supportive ? "Adds structure to the thesis." : "Creates overhead pressure.",
    sourceModule: "Native Chart Engine",
    now,
  });
}

function detectVolume(input: SmartChartIntelligenceInput, now: number) {
  const ratio = input.context.volume.average > 0 ? input.context.volume.current / input.context.volume.average : 1;
  if (ratio < 0.75) {
    return annotation({
      id: `weak-volume-${input.context.symbol}`,
      kind: "volume",
      text: "Weak Volume",
      tone: "gold",
      price: input.context.currentPrice,
      priority: 84,
      confidenceDelta: -5,
      whatHappened: "Current volume is below normal participation.",
      whyItMatters: "Moves without volume are easier to fade and harder to trust.",
      thesisImpact: "Keeps readiness limited until participation improves.",
      sourceModule: "Volume Intelligence",
      now,
    });
  }
  if (ratio > 1.35) {
    return annotation({
      id: `volume-confirmed-${input.context.symbol}`,
      kind: "volume",
      text: "Volume Confirmed",
      tone: "mint",
      price: input.context.currentPrice,
      priority: 84,
      confidenceDelta: 5,
      whatHappened: "Volume expanded above average.",
      whyItMatters: "Participation confirms that the move is not purely cosmetic.",
      thesisImpact: "Improves confidence if structure also holds.",
      sourceModule: "Volume Intelligence",
      now,
    });
  }
  return null;
}

function detectLiquiditySweep(input: SmartChartIntelligenceInput, now: number) {
  const recent = input.candles.slice(-8);
  if (recent.length < 4) return null;
  const last = recent[recent.length - 1];
  const priorLow = Math.min(...recent.slice(0, -1).map((candle) => candle.low));
  const priorHigh = Math.max(...recent.slice(0, -1).map((candle) => candle.high));
  const sweptLow = last.low < priorLow && last.close > priorLow;
  const sweptHigh = last.high > priorHigh && last.close < priorHigh;
  if (!sweptLow && !sweptHigh) return null;
  return annotation({
    id: `liquidity-sweep-${input.context.symbol}-${sweptLow ? "low" : "high"}`,
    kind: "liquidity",
    text: sweptLow ? "Stop Hunt" : "Liquidity Sweep",
    tone: sweptLow ? "mint" : "danger",
    price: sweptLow ? last.low : last.high,
    priority: 90,
    confidenceDelta: sweptLow ? 4 : -4,
    whatHappened: sweptLow ? "Price swept below recent lows and reclaimed them." : "Price swept above recent highs and rejected.",
    whyItMatters: "Liquidity sweeps can mark exhaustion of poorly placed stops.",
    thesisImpact: sweptLow ? "Can support a reversal thesis after confirmation." : "Warns that upside momentum may be fading.",
    sourceModule: "Smart Chart Intelligence",
    now,
  });
}

function detectZones(input: SmartChartIntelligenceInput, now: number) {
  if (input.context.supportZones.length > 0 && input.context.distanceFromSupport !== null && input.context.distanceFromSupport < 0.015) {
    return annotation({
      id: `demand-zone-${input.context.symbol}`,
      kind: "zone",
      text: "Demand Zone",
      tone: "mint",
      price: input.context.currentPrice,
      priority: 70,
      confidenceDelta: 3,
      whatHappened: "Price is trading near a marked support zone.",
      whyItMatters: "Demand zones are useful only when buyers respond with confirmation.",
      thesisImpact: "Improves structure if the zone holds.",
      sourceModule: "Chart Drawings",
      now,
    });
  }
  if (input.context.resistanceZones.length > 0 && input.context.distanceFromResistance !== null && input.context.distanceFromResistance < 0.015) {
    return annotation({
      id: `supply-zone-${input.context.symbol}`,
      kind: "zone",
      text: "Supply Zone",
      tone: "danger",
      price: input.context.currentPrice,
      priority: 70,
      confidenceDelta: -3,
      whatHappened: "Price is trading near a marked resistance zone.",
      whyItMatters: "Supply zones can limit reward and increase rejection risk.",
      thesisImpact: "Reduces readiness if target sits into resistance.",
      sourceModule: "Chart Drawings",
      now,
    });
  }
  return null;
}

function detectFootprint(input: SmartChartIntelligenceInput, now: number) {
  if (input.footprint.type === "No clear institutional footprint" || input.footprint.confidence < 58) return null;
  return annotation({
    id: `footprint-${input.footprint.type}-${input.context.symbol}`,
    kind: "footprint",
    text: input.footprint.direction === "Bullish" ? "Footprint Bid" : input.footprint.direction === "Bearish" ? "Footprint Offer" : "Footprint Watch",
    tone: input.footprint.direction === "Bullish" ? "mint" : input.footprint.direction === "Bearish" ? "danger" : "gold",
    price: input.context.currentPrice,
    priority: 87,
    confidenceDelta: input.footprint.confidenceImpact,
    whatHappened: input.footprint.explanation,
    whyItMatters: "Institutional footprint can reveal whether large participants are supporting or fading the move.",
    thesisImpact: input.footprint.riskNote,
    sourceModule: "Institutional Footprint Intelligence",
    now,
  });
}

function detectMomentum(input: SmartChartIntelligenceInput, now: number) {
  if (!input.context.macd) return null;
  const accelerating = input.context.macd.histogram > 0 && input.context.macd.line > input.context.macd.signal;
  const decelerating = input.context.macd.histogram < 0 || input.context.macd.line < input.context.macd.signal;
  if (!accelerating && !decelerating) return null;
  return annotation({
    id: `momentum-${accelerating ? "accel" : "decel"}-${input.context.symbol}`,
    kind: "momentum",
    text: accelerating ? "Momentum Up" : "Momentum Fading",
    tone: accelerating ? "mint" : "gold",
    price: input.context.currentPrice,
    priority: 66,
    confidenceDelta: accelerating ? 3 : -4,
    whatHappened: accelerating ? "MACD is improving above signal." : "Momentum is decelerating.",
    whyItMatters: "Momentum should confirm structure; when it fades, patience becomes more important.",
    thesisImpact: accelerating ? "Supports continuation if structure agrees." : "Reduces confidence in immediate continuation.",
    sourceModule: "Momentum Intelligence",
    now,
  });
}

function detectNews(input: SmartChartIntelligenceInput, now: number) {
  if (!input.news.chartMarker.active) return null;
  return annotation({
    id: `news-catalyst-${input.context.symbol}`,
    kind: "news",
    text: "News Catalyst",
    tone: input.news.chartMarker.tone === "danger" ? "danger" : input.news.chartMarker.tone === "mint" ? "mint" : "gold",
    price: input.context.currentPrice,
    priority: 95,
    confidenceDelta: input.news.urgency === "High" && input.news.sentiment === "Negative" ? -7 : input.news.sentiment === "Positive" ? 4 : -2,
    whatHappened: input.news.hermesInterpretation,
    whyItMatters: "News can change volatility faster than chart structure can adapt.",
    thesisImpact: input.news.riskCaution.active ? input.news.riskCaution.message : input.news.possibleMarketImpact,
    sourceModule: "News Intelligence",
    now,
  });
}

function annotation({
  id,
  kind,
  text,
  tone,
  price,
  priority,
  confidenceDelta,
  whatHappened,
  whyItMatters,
  thesisImpact,
  sourceModule,
  now,
}: Omit<SmartChartAnnotation, "explanation" | "createdAt" | "expiresAt"> & {
  confidenceDelta: number;
  whatHappened: string;
  whyItMatters: string;
  thesisImpact: string;
  sourceModule: string;
  now: number;
}): SmartChartAnnotation {
  return {
    id,
    kind,
    text,
    tone,
    price,
    priority,
    createdAt: now,
    expiresAt: now + 90_000,
    explanation: {
      whatHappened,
      whyItMatters,
      thesisImpact,
      confidenceDelta,
      sourceModule,
    },
  };
}

function avoidOverlaps(labels: SmartChartAnnotation[]) {
  const usedPrices: number[] = [];
  return labels.map((label) => {
    if (!label.price) return label;
    let price = label.price;
    while (usedPrices.some((used) => Math.abs(used - price) / Math.max(1, Math.abs(price)) < 0.004)) {
      price *= 1.004;
    }
    usedPrices.push(price);
    return { ...label, price };
  });
}
