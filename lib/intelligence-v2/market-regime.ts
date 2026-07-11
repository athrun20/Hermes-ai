/**
 * Phase 1 — Market Regime adapter (pure).
 * Maps existing vision / news / MTF / tape fields into multi-dimension MarketRegime.
 * Does not invent composite product scores or change primary metrics.
 */

import type { AssetQuote, Candle } from "@/lib/market-data";
import type { HermesVisionContext, HermesVisionResult } from "@/lib/hermes-vision-types";
import type { MultiTimeframeIntelligence } from "@/lib/multi-timeframe-types";
import type { NewsIntelligenceResult } from "@/lib/news-types";
import type {
  DataQuality,
  DirectionalBias,
  EventRegime,
  LiquidityRegime,
  MarketRegime,
  StructureRegime,
  VolatilityRegime,
} from "@/lib/intelligence-v2/types";

export type MarketRegimeInput = {
  quote: Pick<AssetQuote, "symbol" | "price" | "change24h">;
  candles: Candle[];
  visionContext?: Pick<
    HermesVisionContext,
    "candleTrend" | "averageCandleRange" | "currentPrice" | "volume" | "rsi"
  >;
  vision?: Pick<
    HermesVisionResult,
    "trendScore" | "volumeScore" | "momentumScore" | "setupStructureScore"
  >;
  multiTimeframe?: Pick<
    MultiTimeframeIntelligence,
    "status" | "alignmentScore" | "higherTimeframeDirection" | "countertrendWarning" | "pattern"
  >;
  news?: Pick<NewsIntelligenceResult, "urgency" | "sentiment" | "riskCaution">;
  now?: number;
};

export function buildMarketRegime(input: MarketRegimeInput): MarketRegime {
  const sourceTimestamp = input.now ?? Date.now();
  const supportingSignals: string[] = [];
  const conflictingSignals: string[] = [];
  const dataQuality = assessDataQuality(input);

  const structureRegime = mapStructureRegime(input, supportingSignals, conflictingSignals);
  const volatilityRegime = mapVolatilityRegime(input, supportingSignals, conflictingSignals);
  const liquidityRegime = mapLiquidityRegime(input, supportingSignals, conflictingSignals);
  const eventRegime = mapEventRegime(input, supportingSignals, conflictingSignals);
  const directionalBias = mapDirectionalBias(input, supportingSignals, conflictingSignals);

  const confidence = regimeConfidence({
    dataQuality,
    supportingCount: supportingSignals.length,
    conflictingCount: conflictingSignals.length,
    structureRegime,
    liquidityRegime,
    eventRegime,
  });

  const summary = buildSummary({
    symbol: input.quote.symbol,
    structureRegime,
    volatilityRegime,
    liquidityRegime,
    eventRegime,
    directionalBias,
    dataQuality,
  });

  return {
    kind: "hermes-market-regime-v1",
    symbol: input.quote.symbol,
    structureRegime,
    volatilityRegime,
    liquidityRegime,
    eventRegime,
    directionalBias,
    summary,
    confidence,
    supportingSignals,
    conflictingSignals,
    sourceTimestamp,
    dataQuality,
  };
}

function assessDataQuality(input: MarketRegimeInput): DataQuality {
  let score = 0;
  if (input.candles.length >= 8) score += 1;
  if (input.candles.length >= 20) score += 1;
  if (input.visionContext) score += 1;
  if (input.vision) score += 1;
  if (input.multiTimeframe) score += 1;
  if (input.news) score += 1;

  if (score <= 1) return "Poor";
  if (score <= 2) return "Limited";
  if (score <= 4) return "Adequate";
  return "Good";
}

function mapStructureRegime(
  input: MarketRegimeInput,
  supporting: string[],
  conflicting: string[],
): StructureRegime {
  const mtf = input.multiTimeframe;
  if (mtf) {
    if (mtf.status === "Strong Alignment" || mtf.status === "Constructive") {
      if (mtf.countertrendWarning) {
        conflicting.push(`MTF countertrend: ${mtf.countertrendWarning}`);
        return "Transition";
      }
      supporting.push(`MTF ${mtf.status} (alignment ${mtf.alignmentScore})`);
      return "Trending";
    }
    if (mtf.status === "Conflict" || mtf.status === "Mixed") {
      conflicting.push(`MTF ${mtf.status}`);
      return "Transition";
    }
    if (mtf.status === "No Clear Alignment") {
      supporting.push("MTF no clear alignment → range-like structure");
      return "Range";
    }
  }

  const trend = input.visionContext?.candleTrend;
  const trendScore = input.vision?.trendScore;
  const structureScore = input.vision?.setupStructureScore;

  if (trend === "Neutral") {
    supporting.push("Vision candle trend neutral");
    if (typeof structureScore === "number" && structureScore < 45) {
      conflicting.push("Weak setup structure with neutral trend");
      return "Unclear";
    }
    return "Range";
  }

  if (trend === "Bullish" || trend === "Bearish") {
    supporting.push(`Vision candle trend ${trend}`);
    if (typeof trendScore === "number") {
      if (trendScore >= 62) return "Trending";
      if (trendScore < 48) return "Range";
      return "Transition";
    }
    return "Trending";
  }

  if (Math.abs(input.quote.change24h) < 0.5) {
    supporting.push("Quiet 24h change suggests range");
    return "Range";
  }

  if (!input.vision && !input.multiTimeframe && input.candles.length < 8) {
    return "Unclear";
  }

  return "Transition";
}

function mapVolatilityRegime(
  input: MarketRegimeInput,
  supporting: string[],
  conflicting: string[],
): VolatilityRegime {
  const price = input.visionContext?.currentPrice || input.quote.price;
  const range = input.visionContext?.averageCandleRange;
  const absChange = Math.abs(input.quote.change24h);

  let rangePct: number | null = null;
  if (typeof range === "number" && price > 0) {
    rangePct = (range / price) * 100;
    supporting.push(`Average candle range ${rangePct.toFixed(2)}% of price`);
  } else if (input.candles.length >= 4) {
    const ranges = input.candles.map((c) => ((c.high - c.low) / Math.max(c.close, 0.01)) * 100);
    rangePct = ranges.reduce((a, b) => a + b, 0) / ranges.length;
    supporting.push(`Candle range average ${rangePct.toFixed(2)}%`);
  } else {
    conflicting.push("Limited volatility inputs; using change24h only");
  }

  if ((rangePct !== null && rangePct >= 2.4) || absChange >= 6) {
    return "Extreme";
  }
  if ((rangePct !== null && rangePct >= 1.5) || absChange >= 3.5) {
    return "High";
  }
  if ((rangePct !== null && rangePct >= 0.7) || absChange >= 1.2) {
    return "Normal";
  }
  if (rangePct === null && absChange < 1.2 && input.candles.length < 4) {
    return "Normal"; // default when unknown — not Extreme
  }
  return "Low";
}

function mapLiquidityRegime(
  input: MarketRegimeInput,
  supporting: string[],
  conflicting: string[],
): LiquidityRegime {
  const volume = input.visionContext?.volume;
  if (volume) {
    const ratio = volume.average > 0 ? volume.current / volume.average : 1;
    supporting.push(`Volume ${volume.status} (current/avg ${ratio.toFixed(2)})`);
    if (ratio < 0.35) return "Dislocated";
    if (volume.status === "Fading" || ratio < 0.55) return "Thin";
    if (volume.status === "Rising" || ratio > 1.35) return "Healthy";
    return "Healthy";
  }

  const volumeScore = input.vision?.volumeScore;
  if (typeof volumeScore === "number") {
    supporting.push(`Vision volume score ${volumeScore}`);
    if (volumeScore < 35) return "Dislocated";
    if (volumeScore < 48) return "Thin";
    return "Healthy";
  }

  conflicting.push("No volume context; liquidity unknown");
  return "Unknown";
}

function mapEventRegime(
  input: MarketRegimeInput,
  supporting: string[],
  conflicting: string[],
): EventRegime {
  const news = input.news;
  if (!news) {
    conflicting.push("No news intelligence; event regime unknown");
    return "Unknown";
  }

  supporting.push(`News urgency ${news.urgency}, sentiment ${news.sentiment}`);
  if (news.urgency === "High" || news.riskCaution.active) {
    if (news.riskCaution.active) supporting.push("News risk caution active");
    return "Event Driven";
  }
  if (news.urgency === "Medium") return "Elevated Event Risk";
  return "Normal";
}

function mapDirectionalBias(
  input: MarketRegimeInput,
  supporting: string[],
  conflicting: string[],
): DirectionalBias {
  const votes: DirectionalBias[] = [];

  if (input.visionContext?.candleTrend === "Bullish") votes.push("Bullish");
  if (input.visionContext?.candleTrend === "Bearish") votes.push("Bearish");
  if (input.visionContext?.candleTrend === "Neutral") votes.push("Neutral");

  const htf = input.multiTimeframe?.higherTimeframeDirection;
  if (htf) {
    if (htf.includes("Bullish")) votes.push("Bullish");
    else if (htf.includes("Bearish")) votes.push("Bearish");
    else votes.push("Neutral");
    supporting.push(`HTF direction ${htf}`);
  }

  if (input.quote.change24h > 1) votes.push("Bullish");
  else if (input.quote.change24h < -1) votes.push("Bearish");
  else votes.push("Neutral");

  if (input.news?.sentiment === "Positive") votes.push("Bullish");
  if (input.news?.sentiment === "Negative") votes.push("Bearish");

  if (votes.length === 0) return "Neutral";

  const bull = votes.filter((v) => v === "Bullish").length;
  const bear = votes.filter((v) => v === "Bearish").length;
  const neutral = votes.filter((v) => v === "Neutral").length;

  if (bull > 0 && bear > 0 && Math.abs(bull - bear) <= 1) {
    conflicting.push("Directional votes mixed across tape, MTF, and news");
    return "Mixed";
  }
  if (bull > bear && bull > neutral) return "Bullish";
  if (bear > bull && bear > neutral) return "Bearish";
  if (neutral >= bull && neutral >= bear) return "Neutral";
  return "Mixed";
}

function regimeConfidence({
  dataQuality,
  supportingCount,
  conflictingCount,
  structureRegime,
  liquidityRegime,
  eventRegime,
}: {
  dataQuality: DataQuality;
  supportingCount: number;
  conflictingCount: number;
  structureRegime: StructureRegime;
  liquidityRegime: LiquidityRegime;
  eventRegime: EventRegime;
}): number {
  let confidence =
    dataQuality === "Good" ? 78 : dataQuality === "Adequate" ? 62 : dataQuality === "Limited" ? 45 : 28;

  confidence += Math.min(12, supportingCount * 2);
  confidence -= Math.min(24, conflictingCount * 6);

  if (structureRegime === "Unclear") confidence -= 12;
  if (liquidityRegime === "Unknown") confidence -= 8;
  if (eventRegime === "Unknown") confidence -= 6;
  if (dataQuality === "Poor" || dataQuality === "Limited") {
    confidence = Math.min(confidence, 52);
  }

  return Math.max(15, Math.min(88, Math.round(confidence)));
}

function buildSummary({
  symbol,
  structureRegime,
  volatilityRegime,
  liquidityRegime,
  eventRegime,
  directionalBias,
  dataQuality,
}: {
  symbol: string;
  structureRegime: StructureRegime;
  volatilityRegime: VolatilityRegime;
  liquidityRegime: LiquidityRegime;
  eventRegime: EventRegime;
  directionalBias: DirectionalBias;
  dataQuality: DataQuality;
}): string {
  const qualityNote =
    dataQuality === "Poor" || dataQuality === "Limited"
      ? " Data quality is limited, so regime labels should be treated cautiously."
      : "";

  return `${symbol}: structure ${structureRegime.toLowerCase()}, volatility ${volatilityRegime.toLowerCase()}, liquidity ${liquidityRegime.toLowerCase()}, event regime ${eventRegime.toLowerCase()}, bias ${directionalBias.toLowerCase()}.${qualityNote} Downstream evidence should be read inside this environment.`;
}
