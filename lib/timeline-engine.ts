import type { HermesMemorySnapshot } from "@/lib/hermes-memory";
import type { NewsIntelligenceResult } from "@/lib/news-types";
import type { HermesVisionContext, HermesVisionResult } from "@/lib/hermes-vision-types";
import { applyConfidenceDelta, type LiveConfidenceSnapshot } from "@/lib/confidence-engine";
import type { LiveTimelineCategory, LiveTimelineEvent, LiveTimelineTone } from "@/lib/timeline-events";

export type TimelineEngineInput = {
  context: HermesVisionContext;
  vision: HermesVisionResult;
  confidence: LiveConfidenceSnapshot;
  news: NewsIntelligenceResult;
  memory: HermesMemorySnapshot;
};

export function buildTimelineEvents(input: TimelineEngineInput): LiveTimelineEvent[] {
  const events = [
    detectVolumeEvent(input),
    detectTrendEvent(input),
    detectMomentumEvent(input),
    detectRiskEvent(input),
    detectStructureEvent(input),
    detectNewsEvent(input),
    detectTraderBehaviorEvent(input),
    detectTradePlanEvent(input),
  ].filter((event): event is LiveTimelineEvent => Boolean(event));

  return dedupeEvents(events)
    .sort((a, b) => Math.abs(b.confidenceChange) - Math.abs(a.confidenceChange))
    .slice(0, 4);
}

function detectVolumeEvent({ context, confidence }: TimelineEngineInput) {
  const ratio = context.volume.average > 0 ? context.volume.current / context.volume.average : 1;
  if (ratio >= 1.25 || context.volume.status === "Rising") {
    return event({
      category: "Volume",
      title: "Volume increasing",
      explanation: "Buyers are becoming more active, but Hermes still wants confirmation before risk expands.",
      delta: 4,
      confidence,
      signature: `volume-rising-${Math.round(ratio * 10)}`,
      tone: "mint",
    });
  }
  if (ratio <= 0.72 || context.volume.status === "Fading") {
    return event({
      category: "Volume",
      title: "Weak volume",
      explanation: "Participation is fading. Breakouts deserve more patience when volume does not confirm.",
      delta: -5,
      confidence,
      signature: `volume-fading-${Math.round(ratio * 10)}`,
      tone: "gold",
    });
  }
  return null;
}

function detectTrendEvent({ context, confidence }: TimelineEngineInput) {
  if (context.ema20 && context.currentPrice > context.ema20 && context.ema20 >= (context.ema50 ?? context.ema20)) {
    return event({
      category: "Trend",
      title: "EMA20 reclaimed",
      explanation: "Price is back above the short-term trend while the moving-average structure remains constructive.",
      delta: 6,
      confidence,
      signature: `trend-ema20-reclaim-${context.symbol}`,
      tone: "mint",
    });
  }
  if (context.ema20 && context.currentPrice < context.ema20) {
    return event({
      category: "Trend",
      title: "Short-term trend lost",
      explanation: "Price is below EMA20. Hermes reduces confidence until the chart repairs structure.",
      delta: -6,
      confidence,
      signature: `trend-ema20-lost-${context.symbol}`,
      tone: "danger",
    });
  }
  return null;
}

function detectMomentumEvent({ context, confidence }: TimelineEngineInput) {
  if (context.rsi && context.rsi >= 70) {
    return event({
      category: "Momentum",
      title: "Momentum stretched",
      explanation: "RSI is above 70. Strength is visible, but chasing becomes easier here.",
      delta: -4,
      confidence,
      signature: `momentum-rsi-high-${Math.round(context.rsi)}`,
      tone: "gold",
    });
  }
  if (context.macd && context.macd.line > context.macd.signal && context.macd.histogram > 0) {
    return event({
      category: "Momentum",
      title: "MACD improving",
      explanation: "Momentum is turning constructive as MACD leads its signal line.",
      delta: 4,
      confidence,
      signature: `momentum-macd-positive-${context.symbol}`,
      tone: "mint",
    });
  }
  if (context.macd && context.macd.line < context.macd.signal) {
    return event({
      category: "Momentum",
      title: "Momentum fading",
      explanation: "MACD is below signal. Hermes wants confirmation before trusting continuation.",
      delta: -4,
      confidence,
      signature: `momentum-macd-fading-${context.symbol}`,
      tone: "gold",
    });
  }
  return null;
}

function detectRiskEvent({ context, confidence }: TimelineEngineInput) {
  if (context.riskReward !== null && context.riskReward >= 2) {
    return event({
      category: "Risk",
      title: "Risk/reward acceptable",
      explanation: `The current plan offers ${context.riskReward.toFixed(2)}:1 reward versus risk.`,
      delta: 5,
      confidence,
      signature: `risk-good-${Math.round(context.riskReward * 10)}`,
      tone: "mint",
    });
  }
  if (context.riskReward !== null && context.riskReward < 2) {
    return event({
      category: "Risk",
      title: "Risk/reward weak",
      explanation: "Reward does not yet justify the planned risk. Improve entry, stop, or target before review.",
      delta: -8,
      confidence,
      signature: `risk-weak-${Math.round(context.riskReward * 10)}`,
      tone: "danger",
    });
  }
  return null;
}

function detectStructureEvent({ context, confidence }: TimelineEngineInput) {
  if (context.distanceFromResistance !== null && context.distanceFromResistance < 0.012) {
    return event({
      category: "Structure",
      title: "Resistance tested",
      explanation: "Price is close to resistance. Watch for confirmation above the level instead of anticipating it.",
      delta: 2,
      confidence,
      signature: `structure-resistance-${context.symbol}`,
      tone: "gold",
    });
  }
  if (context.distanceFromSupport !== null && context.distanceFromSupport < 0.012) {
    return event({
      category: "Structure",
      title: "Support nearby",
      explanation: "Price is near support. This can improve structure if the level holds with participation.",
      delta: 3,
      confidence,
      signature: `structure-support-${context.symbol}`,
      tone: "mint",
    });
  }
  return null;
}

function detectNewsEvent({ news, confidence }: TimelineEngineInput) {
  if (news.urgency === "High") {
    return event({
      category: "News",
      title: `${news.sentiment} catalyst detected`,
      explanation: news.hermesInterpretation,
      delta: news.sentiment === "Negative" ? -8 : 4,
      confidence,
      signature: `news-${news.urgency}-${news.sentiment}`,
      tone: news.sentiment === "Negative" ? "danger" : "gold",
    });
  }
  if (news.detectedKeywords.length > 0) {
    return event({
      category: "News",
      title: "Keyword catalyst found",
      explanation: `${news.detectedKeywords[0].keyword} appeared in the mock feed. Hermes treats it as context, not a signal.`,
      delta: 1,
      confidence,
      signature: `news-keyword-${news.detectedKeywords[0].keyword}`,
      tone: "muted",
    });
  }
  return null;
}

function detectTraderBehaviorEvent({ memory, confidence }: TimelineEngineInput) {
  if (memory.behavior.overtradingDetected) {
    return event({
      category: "Trader Behavior",
      title: "Frequency elevated",
      explanation: "Hermes Memory sees trading frequency rising. Favor fewer, higher-quality decisions.",
      delta: -5,
      confidence,
      signature: "behavior-overtrading",
      tone: "gold",
    });
  }
  if (memory.scores.discipline >= 78) {
    return event({
      category: "Trader Behavior",
      title: "Discipline supporting plan",
      explanation: "Your recent paper-trading memory supports a more patient decision process.",
      delta: 3,
      confidence,
      signature: `behavior-discipline-${memory.scores.discipline}`,
      tone: "mint",
    });
  }
  return null;
}

function detectTradePlanEvent({ context, vision, confidence }: TimelineEngineInput) {
  const hasPlan = Boolean(context.tradeLevels.entry && context.tradeLevels.stop && context.tradeLevels.target);
  if (hasPlan && vision.suggestedAction === "Ready for Decision Review") {
    return event({
      category: "Trade Plan",
      title: "Plan ready for review",
      explanation: "Entry, stop, and target are defined. Hermes can now judge whether the paper trade deserves risk.",
      delta: 4,
      confidence,
      signature: `plan-ready-${context.symbol}`,
      tone: "mint",
    });
  }
  if (!hasPlan) {
    return event({
      category: "Trade Plan",
      title: "Plan incomplete",
      explanation: "Hermes needs entry, stop, and target before confidence can fully reflect risk.",
      delta: -3,
      confidence,
      signature: `plan-incomplete-${context.symbol}`,
      tone: "muted",
    });
  }
  return null;
}

function event({
  category,
  title,
  explanation,
  delta,
  confidence,
  signature,
  tone,
}: {
  category: LiveTimelineCategory;
  title: string;
  explanation: string;
  delta: number;
  confidence: LiveConfidenceSnapshot;
  signature: string;
  tone: LiveTimelineTone;
}): LiveTimelineEvent {
  const confidenceAfter = applyConfidenceDelta(confidence.score, delta);
  return {
    id: `${signature}-${confidence.score}-${confidenceAfter}`,
    signature,
    time: new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit" }).format(new Date()),
    category,
    title,
    explanation,
    confidenceBefore: confidence.score,
    confidenceAfter,
    confidenceChange: confidenceAfter - confidence.score,
    tone,
  };
}

function dedupeEvents(events: LiveTimelineEvent[]) {
  const seen = new Set<string>();
  return events.filter((item) => {
    if (seen.has(item.signature)) return false;
    seen.add(item.signature);
    return true;
  });
}
