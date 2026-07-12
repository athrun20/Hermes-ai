/**
 * Phase 2 — Evidence adapters.
 * Convert existing engine outputs into HermesEvidence[] without recalculating scores.
 * No final recommendations, no Buy/Sell instructions, no unsupported institutional intent claims.
 */

import type { HermesVisionResult } from "@/lib/hermes-vision-types";
import type { MultiTimeframeIntelligence } from "@/lib/multi-timeframe-types";
import type { InstitutionalFootprintResult } from "@/lib/footprint-types";
import type { NewsIntelligenceResult } from "@/lib/news-types";
import type {
  AnySmartChartIntelligenceResult,
  SmartChartIntelligenceResult,
} from "@/lib/smart-chart-intelligence-types";
import type { HermesMemorySnapshot } from "@/lib/hermes-memory";
import type { TradingPersonalityProfile } from "@/lib/hermes-memory";
import type {
  EvidenceCategory,
  EvidenceDirection,
  EvidenceReliability,
  HermesEvidence,
  IntelligenceStage,
  MarketRegime,
} from "@/lib/intelligence-v2/types";
import type { CoinSymbol } from "@/lib/market-data";

function item(
  partial: Omit<HermesEvidence, "timestamp"> & { timestamp?: number },
): HermesEvidence {
  return {
    ...partial,
    strength: clamp(partial.strength),
    timestamp: partial.timestamp ?? 0,
  };
}

export function adaptVisionEvidence(
  vision: HermesVisionResult,
  options?: { symbol?: CoinSymbol; regime?: MarketRegime; now?: number },
): HermesEvidence[] {
  const now = options?.now ?? 0;
  const symbol = options?.symbol ?? vision.symbol;
  const out: HermesEvidence[] = [];
  const seenDimensions = new Set<string>();

  for (const dimension of vision.dimensions) {
    const key = dimension.dimension;
    if (seenDimensions.has(key)) continue;
    seenDimensions.add(key);

    const category = mapVisionDimension(dimension.dimension);
    const stage: IntelligenceStage =
      dimension.dimension === "Risk" ? "Risk Assessment" : "Technical Structure";

    out.push(
      item({
        id: `vision-${symbol}-${dimension.dimension.toLowerCase()}`,
        stage,
        category,
        claim: `${dimension.dimension} is ${dimension.verdict.toLowerCase()}: ${
          dimension.reasons[0] ?? vision.primaryInsight
        }`,
        direction: directionFromScore(dimension.score),
        strength: dimension.score,
        reliability: reliabilityFromScore(dimension.score),
        sourceModules: ["hermes-vision-engine"],
        symbol,
        timestamp: now,
        metadata: {
          dimension: dimension.dimension,
          verdict: dimension.verdict,
          score: dimension.score,
        },
      }),
    );
  }

  // Avoid duplicating dimension narrative if primary insight restates structure
  if (vision.primaryInsight && !vision.dimensions.some((d) => d.reasons[0] === vision.primaryInsight)) {
    out.push(
      item({
        id: `vision-${symbol}-insight`,
        stage: "Market Context",
        category: "Market Structure",
        claim: vision.primaryInsight,
        direction: "Neutral",
        strength: clamp(50 + vision.confidenceAdjustment),
        reliability: "Medium",
        sourceModules: ["hermes-vision-engine"],
        symbol,
        timestamp: now,
      }),
    );
  }

  if (vision.caution.active) {
    out.push(
      item({
        id: `vision-${symbol}-caution`,
        stage: "Risk Assessment",
        category: "Risk/Reward",
        claim: vision.caution.message,
        direction: "Contradictory",
        strength: 70,
        reliability: "Medium",
        sourceModules: ["hermes-vision-engine"],
        symbol,
        timestamp: now,
      }),
    );
  }

  return out;
}

export function adaptMultiTimeframeEvidence(
  multiTimeframe: MultiTimeframeIntelligence,
  options?: { now?: number; regime?: MarketRegime },
): HermesEvidence[] {
  const now = options?.now ?? 0;
  const symbol = multiTimeframe.symbol;
  const supportive =
    multiTimeframe.status === "Strong Alignment" || multiTimeframe.status === "Constructive";
  const contradictory =
    multiTimeframe.status === "Conflict" || Boolean(multiTimeframe.countertrendWarning);

  const out: HermesEvidence[] = [
    item({
      id: `mtf-${symbol}-alignment`,
      stage: "Technical Structure",
      category: "Multi-Timeframe Alignment",
      claim: multiTimeframe.mentorSummary,
      direction: contradictory ? "Contradictory" : supportive ? "Supportive" : "Neutral",
      strength: multiTimeframe.alignmentScore,
      reliability: reliabilityFromScore(multiTimeframe.alignmentScore),
      sourceModules: ["multi-timeframe-engine"],
      symbol,
      timeframe: multiTimeframe.activeTimeframe,
      timestamp: now,
      metadata: {
        status: multiTimeframe.status,
        pattern: multiTimeframe.pattern,
        alignmentImpact: multiTimeframe.alignmentImpact,
      },
    }),
  ];

  if (multiTimeframe.countertrendWarning) {
    out.push(
      item({
        id: `mtf-${symbol}-countertrend`,
        stage: "Technical Structure",
        category: "Multi-Timeframe Alignment",
        claim: multiTimeframe.countertrendWarning,
        direction: "Contradictory",
        strength: 68,
        reliability: "Medium",
        sourceModules: ["multi-timeframe-engine"],
        symbol,
        timeframe: multiTimeframe.activeTimeframe,
        timestamp: now,
        metadata: { sourceEventId: `mtf-countertrend-${symbol}` },
      }),
    );
  }

  return out;
}

export function adaptFootprintEvidence(
  footprint: InstitutionalFootprintResult,
  options?: { symbol?: CoinSymbol; now?: number },
): HermesEvidence[] {
  const now = options?.now ?? 0;
  const symbol = options?.symbol;
  const unclear = footprint.type === "No clear institutional footprint";

  // Reliability reflects footprint confidence quality, not certainty of intent
  const reliability = unclear
    ? "Low"
    : footprint.confirmationStatus === "Confirmed" && footprint.confidence >= 70
      ? "High"
      : footprint.confirmationStatus === "Unclear" || footprint.confidence < 50
        ? "Low"
        : "Medium";

  const direction: EvidenceDirection = unclear
    ? "Neutral"
    : footprint.direction === "Bullish"
      ? "Supportive"
      : footprint.direction === "Bearish"
        ? "Contradictory"
        : "Neutral";

  const claim = unclear
    ? "No clear institutional footprint is visible in the available evidence."
    : `Footprint pattern labeled ${footprint.type} with ${footprint.strength.toLowerCase()} strength and ${footprint.confirmationStatus.toLowerCase()} confirmation. ${footprint.explanation}`;

  return [
    item({
      id: `footprint-${symbol ?? "sym"}-primary`,
      stage: "Institutional Activity",
      category: "Institutional Activity",
      claim,
      direction,
      strength: footprint.confidence,
      reliability,
      sourceModules: ["institutional-footprint-engine"],
      symbol,
      timestamp: now,
      chartReference: footprint.chartLabels.find((l) => typeof l.price === "number")
        ? {
            price: footprint.chartLabels.find((l) => typeof l.price === "number")?.price,
            label: footprint.chartLabels[0]?.text,
          }
        : undefined,
      metadata: {
        type: footprint.type,
        strength: footprint.strength,
        confirmationStatus: footprint.confirmationStatus,
        // Explicitly not asserting intent
        intentClaim: false,
        confidenceImpact: footprint.confidenceImpact,
      },
    }),
  ];
}

export function adaptNewsEvidence(
  news: NewsIntelligenceResult,
  options?: { now?: number },
): HermesEvidence[] {
  const now = options?.now ?? 0;
  const symbol = news.symbol;
  const direction: EvidenceDirection =
    news.sentiment === "Positive"
      ? "Supportive"
      : news.sentiment === "Negative"
        ? "Contradictory"
        : "Neutral";

  const urgencyStrength =
    news.urgency === "High" ? 78 : news.urgency === "Medium" ? 58 : 38;

  const out: HermesEvidence[] = [
    item({
      id: `news-${symbol}-context`,
      stage: "Market Context",
      category: "News and Event Risk",
      claim: news.hermesInterpretation || news.possibleMarketImpact,
      direction,
      strength: urgencyStrength,
      reliability: news.urgency === "High" ? "Medium" : "Low",
      sourceModules: ["news-intelligence-engine", "mock-news-feed"],
      symbol,
      timestamp: now,
      metadata: {
        urgency: news.urgency,
        sentiment: news.sentiment,
        sourceEventId: `news-context-${symbol}`,
      },
    }),
  ];

  if (news.riskCaution.active) {
    out.push(
      item({
        id: `news-${symbol}-risk-caution`,
        stage: "Risk Assessment",
        category: "News and Event Risk",
        claim: news.riskCaution.message,
        direction: "Contradictory",
        strength: news.urgency === "High" ? 80 : 65,
        reliability: "Medium",
        sourceModules: ["news-intelligence-engine"],
        symbol,
        timestamp: now,
        metadata: { sourceEventId: `news-risk-${symbol}` },
      }),
    );
  }

  return out;
}

export function adaptSmartChartEvidence(
  smartChart: AnySmartChartIntelligenceResult | SmartChartIntelligenceResult,
  options?: { symbol?: CoinSymbol; now?: number },
): HermesEvidence[] {
  const now = options?.now ?? 0;
  const symbol = options?.symbol;
  const out: HermesEvidence[] = [];
  const seenClaims = new Set<string>();

  for (const annotation of smartChart.annotations.slice(0, 5)) {
    const claim =
      annotation.explanation?.whatHappened ||
      annotation.explanation?.thesisImpact ||
      annotation.text;
    const claimKey = claim.toLowerCase().slice(0, 80);
    if (seenClaims.has(claimKey)) continue;
    seenClaims.add(claimKey);

    const delta = annotation.explanation?.confidenceDelta ?? 0;
    out.push(
      item({
        id: `smart-chart-${symbol ?? "sym"}-${annotation.id}`,
        stage: "Technical Structure",
        category: mapSmartChartKind(annotation.kind),
        claim,
        direction: delta > 0 ? "Supportive" : delta < 0 ? "Contradictory" : "Neutral",
        strength: clamp(55 + Math.abs(delta) * 4),
        reliability: "Medium",
        sourceModules: [
          "smart-chart-intelligence",
          ...(annotation.explanation?.sourceModule
            ? [annotation.explanation.sourceModule]
            : []),
        ],
        symbol,
        timestamp: now,
        chartReference:
          typeof annotation.price === "number"
            ? { price: annotation.price, label: annotation.text }
            : undefined,
        expiration: annotation.expiresAt,
        metadata: {
          annotationKind: annotation.kind,
          sourceEventId: annotation.id,
        },
      }),
    );
  }

  // Do not add a separate "delta" evidence row if annotations already carry deltas
  // (avoids duplicate conclusions from the same chart event set)

  return out;
}

export function adaptMemoryDnaEvidence(
  memory: HermesMemorySnapshot,
  options?: {
    personality?: TradingPersonalityProfile;
    dailyGoal?: string;
    now?: number;
    symbol?: CoinSymbol;
  },
): HermesEvidence[] {
  const now = options?.now ?? 0;
  const archetype = options?.personality?.archetype ?? memory.personality;
  const out: HermesEvidence[] = [
    item({
      id: "memory-dna-profile",
      stage: "Trader Profile",
      category: "Trader DNA Fit",
      claim: `Trader profile: ${archetype}. Dominant style ${memory.strategyPreference.dominantStyle}. Discipline ${memory.scores.discipline}/100.`,
      direction: memory.scores.discipline >= 60 ? "Supportive" : "Contradictory",
      strength: memory.scores.discipline,
      reliability: memory.performance.totalTrades >= 5 ? "High" : "Low",
      sourceModules: ["hermes-memory"],
      symbol: options?.symbol,
      timestamp: now,
      metadata: {
        dominantStyle: memory.strategyPreference.dominantStyle,
        totalTrades: memory.performance.totalTrades,
      },
    }),
  ];

  if (options?.dailyGoal) {
    out.push(
      item({
        id: "memory-daily-goal",
        stage: "Trader Profile",
        category: "Trader DNA Fit",
        claim: `Daily goal: ${options.dailyGoal}`,
        direction: "Neutral",
        strength: 50,
        reliability: "Medium",
        sourceModules: ["morning-briefing", "hermes-memory"],
        timestamp: now,
      }),
    );
  }

  if (memory.behavior.revengeTradingDetected || memory.behavior.overtradingDetected) {
    out.push(
      item({
        id: "memory-behavior-flags",
        stage: "Historical Memory",
        category: "Trader DNA Fit",
        claim: memory.behavior.revengeTradingDetected
          ? "Historical memory flags revenge-trading behavior risk."
          : "Historical memory flags overtrading behavior risk.",
        direction: "Contradictory",
        strength: 72,
        reliability: "Medium",
        sourceModules: ["hermes-memory"],
        timestamp: now,
        metadata: {
          revengeTradingDetected: memory.behavior.revengeTradingDetected,
          overtradingDetected: memory.behavior.overtradingDetected,
        },
      }),
    );
  }

  // One weakness max to avoid multi-duplicate DNA noise
  if (memory.weaknesses[0]) {
    out.push(
      item({
        id: "memory-primary-weakness",
        stage: "Historical Memory",
        category: "Trader DNA Fit",
        claim: `Known weakness: ${memory.weaknesses[0]}`,
        direction: "Contradictory",
        strength: 55,
        reliability: "Medium",
        sourceModules: ["hermes-memory"],
        timestamp: now,
      }),
    );
  }

  return out;
}

/** Optional helper: regime as evidence for collection stage (not a second regime scorer). */
export function adaptRegimeEvidence(regime: MarketRegime): HermesEvidence[] {
  return [
    item({
      id: `regime-${regime.symbol}-summary`,
      stage: "Market Regime",
      category: "Market Regime",
      claim: regime.summary,
      direction:
        regime.eventRegime === "Event Driven" || regime.volatilityRegime === "Extreme"
          ? "Contradictory"
          : regime.structureRegime === "Trending" && regime.liquidityRegime === "Healthy"
            ? "Supportive"
            : "Neutral",
      strength: regime.confidence,
      reliability:
        regime.dataQuality === "Good"
          ? "High"
          : regime.dataQuality === "Poor" || regime.dataQuality === "Limited"
            ? "Low"
            : "Medium",
      sourceModules: ["intelligence-v2/market-regime"],
      symbol: regime.symbol,
      timestamp: regime.sourceTimestamp,
      metadata: {
        structureRegime: regime.structureRegime,
        volatilityRegime: regime.volatilityRegime,
        dataQuality: regime.dataQuality,
      },
    }),
  ];
}

function mapVisionDimension(
  dimension: HermesVisionResult["dimensions"][number]["dimension"],
): EvidenceCategory {
  if (dimension === "Structure" || dimension === "Confirmation") return "Market Structure";
  if (dimension === "Trend") return "Trend Quality";
  if (dimension === "Momentum") return "Momentum";
  if (dimension === "Volume") return "Volume Quality";
  return "Risk/Reward";
}

function mapSmartChartKind(kind: string): EvidenceCategory {
  if (kind === "volume") return "Volume Quality";
  if (kind === "momentum") return "Momentum";
  if (kind === "footprint" || kind === "liquidity") return "Institutional Activity";
  if (kind === "news") return "News and Event Risk";
  return "Market Structure";
}

function directionFromScore(score: number): EvidenceDirection {
  if (score >= 58) return "Supportive";
  if (score <= 42) return "Contradictory";
  return "Neutral";
}

function reliabilityFromScore(score: number): EvidenceReliability {
  if (score >= 72) return "High";
  if (score >= 50) return "Medium";
  return "Low";
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}
