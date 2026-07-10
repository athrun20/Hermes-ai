import type { HermesMemorySnapshot } from "@/lib/hermes-memory";
import { ruleBasedConfidenceEngine } from "@/lib/opportunity-confidence-engine";
import { ruleBasedLessonGenerator } from "@/lib/opportunity-lesson-generator";
import { mockMarketDataProvider } from "@/lib/opportunity-market-data";
import { ruleBasedTraderDnaMatcher } from "@/lib/opportunity-trader-dna-matching";
import { calculateOpportunityHermesScore } from "@/lib/hermes-score-engine";
import { scoreCandidateStrategy } from "@/lib/strategy-scoring";
import type {
  ConfidenceEngine,
  LessonGenerator,
  MarketCandidate,
  MarketDataProvider,
  OpportunityScannerResult,
  OpportunityStudy,
  TraderDnaMatcher,
} from "@/lib/opportunity-types";

export type OpportunityEngineDependencies = {
  marketDataProvider: MarketDataProvider;
  confidenceEngine: ConfidenceEngine;
  lessonGenerator: LessonGenerator;
  traderDnaMatcher: TraderDnaMatcher;
};

export type OpportunityEngineInput = {
  memory?: HermesMemorySnapshot;
  dependencies?: Partial<OpportunityEngineDependencies>;
};

const defaultDependencies: OpportunityEngineDependencies = {
  marketDataProvider: mockMarketDataProvider,
  confidenceEngine: ruleBasedConfidenceEngine,
  lessonGenerator: ruleBasedLessonGenerator,
  traderDnaMatcher: ruleBasedTraderDnaMatcher,
};

export function buildOpportunityScanner({
  memory,
  dependencies = {},
}: OpportunityEngineInput = {}): OpportunityScannerResult {
  const services = {
    ...defaultDependencies,
    ...dependencies,
  };
  const candidates = services.marketDataProvider.getCandidates();
  const opportunities = candidates.map((candidate) => {
    const dnaMatch = services.traderDnaMatcher.match(candidate, memory);
    const confidence = services.confidenceEngine.analyzeConfidence(candidate);
    const hermesScore = calculateOpportunityHermesScore({
      candidate,
      confidence: confidence.score,
      traderDnaMatch: dnaMatch.traderDnaMatch,
    });
    const strategy = scoreCandidateStrategy(candidate, memory);
    const alignment = inferCandidateAlignment(candidate);

    return {
      ticker: candidate.ticker,
      companyName: candidate.companyName,
      confidence: hermesScore.score,
      hermesScore,
      confidenceBreakdown: confidence.breakdown,
      trend: candidate.trend,
      riskLevel: candidate.riskLevel,
      potentialRewardPct: candidate.potentialRewardPct,
      setupType: candidate.setupType,
      strategyType: strategy.strategy,
      strategyScore: strategy.score,
      strategyQuality: strategy.quality,
      alignmentScore: alignment.score,
      higherTimeframeDirection: alignment.direction,
      countertrendWarning: alignment.warning,
      reasons: services.lessonGenerator.generateReasons(candidate),
      cautions: services.lessonGenerator.generateCautions(candidate),
      lesson: services.lessonGenerator.generateLesson(candidate),
      hermesVerdict: services.lessonGenerator.generateVerdict(
        candidate,
        confidence.score,
        dnaMatch.traderDnaMatch,
      ),
      ...dnaMatch,
    } satisfies OpportunityStudy;
  }).sort((a, b) => b.strategyScore - a.strategyScore || b.confidence - a.confidence);

  return {
    summary: buildScannerSummary({
      opportunities,
      stocksAnalyzed: services.marketDataProvider.getUniverseCount(),
    }),
    pipeline: services.marketDataProvider.getPipelineStats(),
    marketMood: services.marketDataProvider.getMarketMood(),
    opportunities,
  };
}

function inferCandidateAlignment(candidate: MarketCandidate) {
  let score = candidate.aboveMovingAverages ? 72 : 48;
  if (candidate.trend === "Bullish") score += 10;
  if (candidate.trend === "Bearish") score -= 10;
  if (candidate.supportHeld) score += 7;
  if (candidate.volumeTrend === "Increasing") score += 6;
  if (candidate.priceExtended) score -= 8;
  if (candidate.riskLevel === "High") score -= 6;

  const direction =
    score >= 62 ? "Bullish" : score <= 42 ? "Bearish" : "Neutral";
  const warning =
    candidate.trend === "Bullish" && direction === "Bearish"
      ? "Candidate setup conflicts with higher-timeframe pressure."
      : candidate.trend === "Bearish" && direction === "Bullish"
        ? "Short-term bounce may be countertrend versus higher-timeframe structure."
        : null;

  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    direction,
    warning,
  } as const;
}

function buildScannerSummary({
  opportunities,
  stocksAnalyzed,
}: {
  opportunities: OpportunityStudy[];
  stocksAnalyzed: number;
}) {
  const averageHermesConfidence = Math.round(
    opportunities.reduce((sum, opportunity) => sum + opportunity.confidence, 0) /
      Math.max(1, opportunities.length),
  );
  const bullishCount = opportunities.filter((opportunity) => opportunity.trend === "Bullish").length;
  const highRiskCount = opportunities.filter((opportunity) => opportunity.riskLevel === "High").length;

  return {
    stocksAnalyzed,
    opportunitiesFound: opportunities.length,
    averageHermesConfidence,
    marketMood:
      highRiskCount >= 3
        ? "Defensive"
        : bullishCount >= opportunities.length / 2
          ? "Constructive"
          : "Selective",
  } as const;
}
