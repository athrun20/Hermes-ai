import type { HermesMemorySnapshot, PeriodInsight, TradingPersonalityProfile } from "@/lib/hermes-memory";
import type { NewsIntelligenceResult, NewsKeywordTone, NewsSourceType, NewsUrgency } from "@/lib/news-types";
import type { ClosedTrade } from "@/lib/paper-trading";
import type { HermesScoreResult } from "@/lib/hermes-score-types";
import type { HermesVisionResult } from "@/lib/hermes-vision-types";
import type { ReasoningResult } from "@/lib/reasoning-types";

export type WeightedConfidenceComponent = {
  name: "Trend" | "Momentum" | "Volume" | "Structure" | "Risk" | "News";
  score: number;
  weight: number;
  contribution: number;
  status: "Strong" | "Constructive" | "Developing" | "Weak";
  reason: string;
  details: string[];
};

export type WeightedConfidenceEngineResult = {
  score: number;
  label: string;
  explanation: string;
  components: WeightedConfidenceComponent[];
};

export type HermesTimelineItem = {
  id: string;
  time: string;
  category: "Market" | "Risk" | "News" | "Memory" | "Plan";
  title: string;
  message: string;
  tone: "mint" | "gold" | "danger" | "muted";
};

export type SmartMarketEvent = {
  id: string;
  sourceType: NewsSourceType;
  eventType: "Press Release" | "Earnings" | "SEC Filing" | "Macroeconomic" | "Market News";
  headline: string;
  summary: string;
  urgency: NewsUrgency;
  sentiment: NewsIntelligenceResult["sentiment"];
  keywords: Array<{ keyword: string; tone: NewsKeywordTone }>;
  impact: string;
};

export type RiskMeterResult = {
  overall: number;
  label: "Calm" | "Measured" | "Elevated" | "Defensive";
  components: Array<{
    label: "Plan Risk" | "Market Risk" | "News Risk" | "Behavior Risk";
    score: number;
    reason: string;
  }>;
};

export type TraderDnaEvolution = {
  style: string;
  confidence: "Learning" | "Developing" | "Reliable";
  strengths: string[];
  weaknesses: string[];
  recommendedSetups: string[];
  improvementSignal: string;
};

export type MentorReport = {
  grade: "A" | "B" | "C" | "D";
  title: string;
  summary: string;
  recurringMistakes: string[];
  improvements: string[];
  personalizedGoals: string[];
};

const CONFIDENCE_WEIGHTS: Record<WeightedConfidenceComponent["name"], number> = {
  Trend: 0.2,
  Momentum: 0.16,
  Volume: 0.14,
  Structure: 0.18,
  Risk: 0.2,
  News: 0.12,
};

export function buildWeightedConfidenceEngine({
  hermesScore,
  news,
  reasoning,
  chartConfidenceDelta = 0,
}: {
  hermesScore: HermesScoreResult;
  news: NewsIntelligenceResult;
  reasoning?: ReasoningResult;
  chartConfidenceDelta?: number;
}): WeightedConfidenceEngineResult {
  if (reasoning) {
    const components = buildReasoningConfidenceComponents(reasoning);
    const weakest = [...components].sort((a, b) => a.score - b.score)[0];
    const strongest = [...components].sort((a, b) => b.score - a.score)[0];
    return {
      score: clamp(reasoning.confidenceScore + chartConfidenceDelta),
      label: reasoning.confidenceScore >= 85 ? "Institutional Quality" : reasoning.confidenceScore >= 72 ? "Worth Studying" : reasoning.confidenceScore >= 58 ? "Needs Confirmation" : "Protect Capital",
      explanation: `Hermes confidence is ${clamp(reasoning.confidenceScore + chartConfidenceDelta)} because ${strongest.name.toLowerCase()} is ${strongest.status.toLowerCase()}, while ${weakest.name.toLowerCase()} still needs attention.`,
      components,
    };
  }

  const base = new Map(hermesScore.breakdown.map((item) => [item.category, item]));
  const components: WeightedConfidenceComponent[] = (["Trend", "Momentum", "Volume", "Structure", "Risk"] as const).map((name) => {
    const item = base.get(name);
    const score = item?.score ?? 55;
    const weight = CONFIDENCE_WEIGHTS[name];
    return {
      name,
      score,
      weight,
      contribution: Math.round(score * weight),
      status: scoreToStatus(score),
      reason: item?.reason ?? `${name} is still developing.`,
      details: buildComponentDetails(name, score, item?.reason),
    };
  });

  const newsScore = scoreNews(news);
  components.push({
    name: "News",
    score: newsScore,
    weight: CONFIDENCE_WEIGHTS.News,
    contribution: Math.round(newsScore * CONFIDENCE_WEIGHTS.News),
    status: scoreToStatus(newsScore),
    reason: buildNewsReason(news),
    details: [
      `Sentiment: ${news.sentiment}.`,
      `Urgency: ${news.urgency}.`,
      news.possibleMarketImpact,
    ],
  });

  const score = clamp(Math.round(components.reduce((sum, item) => sum + item.score * item.weight, 0) + chartConfidenceDelta));
  const weakest = [...components].sort((a, b) => a.score - b.score)[0];
  const strongest = [...components].sort((a, b) => b.score - a.score)[0];

  return {
    score,
    label: score >= 85 ? "Institutional Quality" : score >= 72 ? "Worth Studying" : score >= 58 ? "Needs Confirmation" : "Protect Capital",
    explanation: `Hermes confidence is ${score} because ${strongest.name.toLowerCase()} is ${strongest.status.toLowerCase()}, while ${weakest.name.toLowerCase()} still needs attention.`,
    components,
  };
}

function buildReasoningConfidenceComponents(reasoning: ReasoningResult): WeightedConfidenceComponent[] {
  const categoryMap: Record<WeightedConfidenceComponent["name"], string[]> = {
    Trend: ["Trend Quality", "Multi-Timeframe Alignment"],
    Momentum: ["Momentum"],
    Volume: ["Volume Quality"],
    Structure: ["Market Structure", "Institutional Activity"],
    Risk: ["Risk/Reward", "Trade Plan", "Portfolio Exposure"],
    News: ["News and Event Risk"],
  };
  const allEvidence = [
    ...reasoning.supportingEvidence,
    ...reasoning.conflictingEvidence,
    ...reasoning.neutralEvidence,
  ];

  return (Object.keys(categoryMap) as WeightedConfidenceComponent["name"][]).map((name) => {
    const evidence = allEvidence.filter((item) => categoryMap[name].includes(item.category));
    const contribution = evidence.reduce((sum, item) => sum + item.confidenceContribution, 0);
    const score = clamp(60 + contribution);
    return {
      name,
      score,
      weight: CONFIDENCE_WEIGHTS[name],
      contribution: Math.round(score * CONFIDENCE_WEIGHTS[name]),
      status: scoreToStatus(score),
      reason: evidence[0]?.explanation ?? `${name} is being interpreted by Hermes Reasoning.`,
      details: evidence.slice(0, 3).map((item) => `${item.label}: ${item.explanation}`),
    };
  });
}

export function buildHermesTimeline({
  confidence,
  vision,
  news,
  memory,
}: {
  confidence: WeightedConfidenceEngineResult;
  vision: HermesVisionResult;
  news: NewsIntelligenceResult;
  memory: HermesMemorySnapshot;
}): HermesTimelineItem[] {
  const now = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date());
  const weakest = [...confidence.components].sort((a, b) => a.score - b.score)[0];
  const items: HermesTimelineItem[] = [
    {
      id: `confidence-${confidence.score}-${weakest.name}`,
      time: now,
      category: "Market",
      title: `${confidence.label}`,
      message: confidence.explanation,
      tone: confidence.score >= 75 ? "mint" : confidence.score >= 58 ? "gold" : "danger",
    },
    {
      id: `vision-${vision.suggestedAction}-${vision.confidenceAdjustment}`,
      time: now,
      category: "Plan",
      title: vision.suggestedAction,
      message: vision.primaryInsight,
      tone: vision.riskScore >= 70 ? "mint" : vision.riskScore >= 50 ? "gold" : "danger",
    },
  ];

  if (news.urgency !== "Low" || news.detectedKeywords.length > 0) {
    items.push({
      id: `news-${news.urgency}-${news.sentiment}-${news.detectedKeywords.length}`,
      time: now,
      category: "News",
      title: `${news.urgency} news context`,
      message: news.hermesInterpretation,
      tone: news.sentiment === "Negative" ? "danger" : news.urgency === "High" ? "gold" : "muted",
    });
  }

  if (memory.performance.totalTrades > 0) {
    items.push({
      id: `memory-${memory.performance.totalTrades}-${memory.scores.discipline}`,
      time: now,
      category: "Memory",
      title: "Memory referenced",
      message: buildMemoryTimelineMessage(memory),
      tone: memory.scores.discipline >= 75 ? "mint" : memory.scores.discipline >= 55 ? "gold" : "danger",
    });
  }

  return items.slice(0, 4);
}

export function buildSmartMarketEvents(news: NewsIntelligenceResult): SmartMarketEvent[] {
  return [...news.pressReleases, ...news.news].map((item) => {
    const eventType = detectEventType(item.sourceType, `${item.headline} ${item.summary}`);
    return {
      id: item.id,
      sourceType: item.sourceType,
      eventType,
      headline: item.headline,
      summary: summarizeEvent(item.summary, item.urgency, eventType),
      urgency: item.urgency,
      sentiment: item.sentiment,
      keywords: item.matches.map((match) => ({ keyword: match.keyword, tone: match.tone })),
      impact: item.possibleMarketImpact,
    };
  });
}

export function buildRiskMeter({
  confidence,
  news,
  memory,
}: {
  confidence: WeightedConfidenceEngineResult;
  news: NewsIntelligenceResult;
  memory: HermesMemorySnapshot;
}): RiskMeterResult {
  const riskComponent = confidence.components.find((item) => item.name === "Risk")?.score ?? 55;
  const structureComponent = confidence.components.find((item) => item.name === "Structure")?.score ?? 55;
  const planRisk = clamp(Math.round((riskComponent + structureComponent) / 2));
  const newsRisk = news.urgency === "High" ? (news.sentiment === "Negative" ? 35 : 52) : news.urgency === "Medium" ? 62 : 78;
  const behaviorRisk = memory.performance.totalTrades === 0
    ? 64
    : clamp(Math.round((memory.scores.discipline + memory.scores.riskManagement) / 2));
  const marketRisk = confidence.score;
  const overall = clamp(Math.round(planRisk * 0.35 + marketRisk * 0.25 + newsRisk * 0.2 + behaviorRisk * 0.2));

  return {
    overall,
    label: overall >= 78 ? "Calm" : overall >= 64 ? "Measured" : overall >= 48 ? "Elevated" : "Defensive",
    components: [
      { label: "Plan Risk", score: planRisk, reason: "Defined levels and risk/reward quality." },
      { label: "Market Risk", score: marketRisk, reason: "Trend, momentum, volume, and structure." },
      { label: "News Risk", score: newsRisk, reason: news.hermesInterpretation },
      { label: "Behavior Risk", score: behaviorRisk, reason: buildMemoryRiskReason(memory) },
    ],
  };
}

export function buildTraderDnaEvolution({
  memory,
  personality,
}: {
  memory: HermesMemorySnapshot;
  personality: TradingPersonalityProfile;
}): TraderDnaEvolution {
  const recommendedSetups = memory.strategyPreference.dominantStyle === "scalper"
    ? ["Opening range practice", "VWAP reclaim study", "Tight-risk pullback"]
    : memory.strategyPreference.dominantStyle === "swing"
      ? ["Trend continuation", "Support bounce", "Breakout retest"]
      : memory.strategyPreference.dominantStyle === "reversal"
        ? ["Range reversal", "Failed breakdown", "Mean reversion study"]
        : ["Trend continuation", "Pullback to structure", "Confirmation setup"];

  return {
    style: personality.archetype,
    confidence: memory.performance.totalTrades >= 12 ? "Reliable" : memory.performance.totalTrades >= 4 ? "Developing" : "Learning",
    strengths: memory.strengths.slice(0, 3),
    weaknesses: memory.weaknesses.slice(0, 3),
    recommendedSetups,
    improvementSignal: buildImprovementSignal(memory),
  };
}

export function buildSessionReport({
  history,
  memory,
}: {
  history: ClosedTrade[];
  memory: HermesMemorySnapshot;
}): MentorReport {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const sessionTrades = history.filter((trade) => trade.closedAt >= todayStart.getTime());
  const pnl = sessionTrades.reduce((sum, trade) => sum + trade.pnl, 0);
  const winRate = percent(sessionTrades.filter((trade) => trade.pnl > 0).length, sessionTrades.length);
  const grade = gradeFromScore(Math.round(winRate * 0.5 + memory.scores.discipline * 0.3 + memory.scores.riskManagement * 0.2));

  return {
    grade,
    title: sessionTrades.length > 0 ? "Session Report" : "Session Readiness",
    summary: sessionTrades.length > 0
      ? `Today has ${sessionTrades.length} completed paper trade${sessionTrades.length === 1 ? "" : "s"}, ${formatMoney(pnl)} realized, and a ${winRate}% win rate.`
      : "No completed paper trades today. Hermes is watching preparation quality before outcome quality.",
    recurringMistakes: buildMistakes(memory),
    improvements: buildImprovements(memory),
    personalizedGoals: buildGoals(memory),
  };
}

export function buildWeeklyMentorReview({
  weekly,
  memory,
}: {
  weekly: PeriodInsight;
  memory: HermesMemorySnapshot;
}): MentorReport {
  const score = Math.round(weekly.winRate * 0.4 + memory.scores.discipline * 0.35 + memory.scores.patience * 0.25);
  return {
    grade: gradeFromScore(score),
    title: "Weekly Review",
    summary: `${weekly.tradeCount} paper trade${weekly.tradeCount === 1 ? "" : "s"} reviewed. Win rate ${weekly.winRate}%, average hold ${weekly.averageHoldMinutes} minutes.`,
    recurringMistakes: weekly.risks.length > 0 ? weekly.risks.slice(0, 3) : buildMistakes(memory),
    improvements: weekly.highlights.length > 0 ? weekly.highlights.slice(0, 3) : buildImprovements(memory),
    personalizedGoals: weekly.nextActions.length > 0 ? weekly.nextActions.slice(0, 3) : buildGoals(memory),
  };
}

function buildComponentDetails(name: WeightedConfidenceComponent["name"], score: number, reason?: string) {
  return [
    reason ?? `${name} is measured from the current Hermes chart context.`,
    score >= 75 ? "This component supports study." : score >= 55 ? "This component needs confirmation." : "This component argues for patience.",
  ];
}

function scoreNews(news: NewsIntelligenceResult) {
  if (news.urgency === "High" && news.sentiment === "Negative") return 38;
  if (news.urgency === "High" && news.sentiment === "Positive") return 66;
  if (news.urgency === "Medium" && news.sentiment === "Negative") return 52;
  if (news.sentiment === "Positive") return 70;
  if (news.sentiment === "Negative") return 48;
  return 64;
}

function buildNewsReason(news: NewsIntelligenceResult) {
  if (news.urgency === "High") return `${news.sentiment} catalyst may increase volatility.`;
  if (news.detectedKeywords.length > 0) return `${news.detectedKeywords.length} market-moving keyword${news.detectedKeywords.length === 1 ? "" : "s"} detected.`;
  return "No urgent news pressure is detected.";
}

function detectEventType(sourceType: NewsSourceType, text: string): SmartMarketEvent["eventType"] {
  const normalized = text.toLowerCase();
  if (sourceType === "filing" || normalized.includes("sec")) return "SEC Filing";
  if (sourceType === "macro-event" || normalized.includes("inflation") || normalized.includes("fed") || normalized.includes("jobs")) return "Macroeconomic";
  if (normalized.includes("earnings") || normalized.includes("guidance") || normalized.includes("revenue")) return "Earnings";
  if (sourceType === "press-release") return "Press Release";
  return "Market News";
}

function summarizeEvent(summary: string, urgency: NewsUrgency, eventType: SmartMarketEvent["eventType"]) {
  if (urgency === "High") return `${eventType} may move expectations quickly. Hermes waits for price and volume confirmation.`;
  return summary;
}

function buildMemoryTimelineMessage(memory: HermesMemorySnapshot) {
  if (memory.behavior.overtradingDetected) return "Recent frequency is elevated. Hermes will favor fewer, cleaner decisions.";
  if (memory.performance.bestPerformingAsset !== "N/A") return `${memory.performance.bestPerformingAsset} remains your strongest recent asset. Respect what the data says.`;
  return "Hermes Memory is measuring discipline, patience, and risk quality over time.";
}

function buildMemoryRiskReason(memory: HermesMemorySnapshot) {
  if (memory.performance.totalTrades === 0) return "Hermes needs completed paper trades to judge behavior risk.";
  if (memory.behavior.revengeTradingDetected) return "Post-loss trading bursts have appeared in memory.";
  if (memory.behavior.overtradingDetected) return "Trading frequency is above your cleanest rhythm.";
  return "Discipline and risk-management memory are part of the risk read.";
}

function buildImprovementSignal(memory: HermesMemorySnapshot) {
  if (memory.performance.totalTrades === 0) return "Complete paper trades to let Hermes build a reliable profile.";
  if (memory.behavior.holdingWinnersTooShort) return "Main signal: give planned winners more room before exiting.";
  if (memory.behavior.cuttingLossesTooLate) return "Main signal: respect invalidation earlier.";
  if (memory.behavior.overtradingDetected) return "Main signal: reduce frequency and demand cleaner confirmation.";
  return "Main signal: keep repeating defined-risk decisions.";
}

function buildMistakes(memory: HermesMemorySnapshot) {
  const mistakes = [
    memory.behavior.holdingWinnersTooShort ? "Closing winners before the plan matures." : "",
    memory.behavior.cuttingLossesTooLate ? "Letting losses move beyond the intended risk." : "",
    memory.behavior.overtradingDetected ? "Taking too many decisions close together." : "",
    memory.behavior.revengeTradingDetected ? "Trading again too quickly after a loss." : "",
  ].filter(Boolean);
  return mistakes.length > 0 ? mistakes.slice(0, 3) : ["No recurring mistake is reliable yet."];
}

function buildImprovements(memory: HermesMemorySnapshot) {
  return [
    memory.strengths[0] ?? "Defined paper trading process is forming.",
    memory.scores.discipline >= 70 ? "Discipline is improving." : "Discipline can improve through fewer, clearer trades.",
    memory.scores.riskManagement >= 70 ? "Risk management is supporting better decisions." : "Risk management needs more consistent stop and target planning.",
  ];
}

function buildGoals(memory: HermesMemorySnapshot) {
  if (memory.behavior.overtradingDetected) return ["Take fewer trades.", "Wait for confirmation.", "Journal the reason before execution."];
  if (memory.behavior.holdingWinnersTooShort) return ["Let one planned winner reach target.", "Review exits before closing.", "Avoid reducing targets out of fear."];
  return ["Define entry, stop, and target.", "Risk only paper capital you accept losing.", "Replay one completed trade."];
}

function scoreToStatus(score: number): WeightedConfidenceComponent["status"] {
  if (score >= 78) return "Strong";
  if (score >= 64) return "Constructive";
  if (score >= 48) return "Developing";
  return "Weak";
}

function gradeFromScore(score: number): MentorReport["grade"] {
  if (score >= 82) return "A";
  if (score >= 68) return "B";
  if (score >= 52) return "C";
  return "D";
}

function percent(wins: number, total: number) {
  if (total === 0) return 0;
  return Math.round((wins / total) * 100);
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}
