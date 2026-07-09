import type { HermesMemorySnapshot } from "@/lib/hermes-memory";
import { ruleBasedConfidenceEngine } from "@/lib/opportunity-confidence-engine";
import { ruleBasedLessonGenerator } from "@/lib/opportunity-lesson-generator";
import { mockMarketDataProvider } from "@/lib/opportunity-market-data";
import { ruleBasedTraderDnaMatcher } from "@/lib/opportunity-trader-dna-matching";
import { calculateOpportunityHermesScore } from "@/lib/hermes-score-engine";
import type {
  ConfidenceEngine,
  LessonGenerator,
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
  });

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
