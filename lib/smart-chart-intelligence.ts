/**
 * Hermes Smart Chart Intelligence v2
 *
 * Chart-first teaching surface: top 3–5 annotations, market story timeline,
 * and confidence-history explanations. Pure / deterministic for identical inputs.
 *
 * Does not change product Confidence, Readiness, Trade Quality, or paper trading.
 * Intelligence v2 outputs (regime/evidence) feed annotations when provided.
 */

import type {
  ConfidenceHistoryEntry,
  MarketStoryEvent,
  SmartChartAnnotation,
  SmartChartAnnotationKind,
  SmartChartIntelligenceInput,
  SmartChartIntelligenceResult,
} from "@/lib/smart-chart-intelligence-types";
import {
  SMART_CHART_HISTORY_MAX,
  SMART_CHART_MAX_ANNOTATIONS,
  SMART_CHART_STORY_MAX,
} from "@/lib/smart-chart-intelligence-types";
import type { HermesEvidence } from "@/lib/intelligence-v2/types";
import type { Candle } from "@/lib/market-data";

export function buildSmartChartIntelligence(
  input: SmartChartIntelligenceInput,
): SmartChartIntelligenceResult {
  const now = input.now ?? lastCandleTime(input.candles) ?? Date.now();
  const candidates = [
    ...detectFromChartPipeline(input, now),
    ...detectFromIntelligenceEvidence(input, now),
    ...detectFromRegime(input, now),
  ].filter((item): item is SmartChartAnnotation => Boolean(item));

  const ranked = rankAndCapAnnotations(candidates, now);
  const confidenceDelta = ranked.reduce(
    (sum, item) => sum + (item.explanation?.confidenceDelta ?? 0),
    0,
  );
  const marketStory = buildMarketStoryTimeline(ranked, candidates, now);
  const confidenceHistory = buildConfidenceHistory(ranked, input, now);

  return {
    kind: "hermes-smart-chart-intelligence-v2",
    annotations: ranked,
    confidenceDelta,
    thesisImpact:
      ranked[0]?.explanation?.thesisImpact ??
      "Hermes is watching the chart for a clearer teaching moment.",
    marketStory,
    confidenceHistory,
    activeAnnotationCount: ranked.length,
  };
}

// ─── Detectors (chart pipeline) ─────────────────────────────────────────────

function detectFromChartPipeline(
  input: SmartChartIntelligenceInput,
  now: number,
): Array<SmartChartAnnotation | null> {
  return [
    detectStructureBreak(input, now),
    detectHigherHighLowerLow(input, now),
    detectBreakoutOrFailure(input, now),
    detectFailedBreakout(input, now),
    detectRetest(input, now),
    detectSupportResistanceReaction(input, now),
    detectVwap(input, now),
    detectEmaReaction(input, now),
    detectVolume(input, now),
    detectLiquiditySweep(input, now),
    detectDemandSupplyZones(input, now),
    detectFootprint(input, now),
    detectMomentum(input, now),
    detectNews(input, now),
  ];
}

function detectStructureBreak(input: SmartChartIntelligenceInput, now: number) {
  const swings = findRecentSwings(input.candles, 12);
  if (!swings) return null;
  const last = input.candles[input.candles.length - 1];
  if (!last) return null;

  const brokeUp =
    swings.priorHigh != null &&
    last.close > swings.priorHigh &&
    last.high >= swings.priorHigh;
  const brokeDown =
    swings.priorLow != null &&
    last.close < swings.priorLow &&
    last.low <= swings.priorLow;

  if (!brokeUp && !brokeDown) return null;

  return annotation({
    id: `structure-break-${brokeUp ? "up" : "down"}-${input.context.symbol}`,
    kind: "structure-break",
    text: brokeUp ? "Structure Break ↑" : "Structure Break ↓",
    tone: brokeUp ? "mint" : "danger",
    price: brokeUp ? swings.priorHigh : swings.priorLow,
    priority: 93,
    confidenceDelta: brokeUp ? 6 : -6,
    whatHappened: brokeUp
      ? "Price closed through a recent swing high, breaking short-term structure."
      : "Price closed through a recent swing low, breaking short-term structure.",
    whyItMatters:
      "Structure breaks reframe whether pullbacks are constructive or defensive.",
    thesisImpact: brokeUp
      ? "Supports a constructive continuation thesis if volume and higher-timeframe agree."
      : "Weakens bullish continuation and raises invalidation risk.",
    sourceModule: "Smart Chart Intelligence v2",
    now,
    candleTime: last.time,
  });
}

function detectHigherHighLowerLow(input: SmartChartIntelligenceInput, now: number) {
  const structure = input.reasoning.marketStructure;
  if (structure === "Higher Highs and Higher Lows") {
    return annotation({
      id: `hh-hl-${input.context.symbol}`,
      kind: "higher-high",
      text: "HH / HL",
      tone: "mint",
      price: input.context.currentPrice,
      priority: 78,
      confidenceDelta: 4,
      whatHappened: `${input.context.symbol} is forming higher highs and higher lows.`,
      whyItMatters: "Bullish market structure defines constructive pullbacks.",
      thesisImpact: "Supports the current bullish thesis when confirmation holds.",
      sourceModule: "Reasoning Engine",
      now,
    });
  }
  if (structure === "Lower Highs and Lower Lows") {
    return annotation({
      id: `lh-ll-${input.context.symbol}`,
      kind: "lower-low",
      text: "LH / LL",
      tone: "danger",
      price: input.context.currentPrice,
      priority: 78,
      confidenceDelta: -4,
      whatHappened: `${input.context.symbol} is forming lower highs and lower lows.`,
      whyItMatters: "Bearish structure makes long entries higher-risk without a break.",
      thesisImpact: "Weakens bullish continuation and raises caution.",
      sourceModule: "Reasoning Engine",
      now,
    });
  }
  return null;
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
      thesisImpact:
        input.context.volume.status === "Rising"
          ? "Improves the thesis."
          : "Keeps the thesis conditional on volume confirmation.",
      sourceModule: "Strategy Intelligence",
      now,
    });
  }
  return null;
}

function detectFailedBreakout(input: SmartChartIntelligenceInput, now: number) {
  if (input.footprint.type === "Failed Breakout") {
    return annotation({
      id: `failed-breakout-${input.context.symbol}`,
      kind: "failed-breakout",
      text: "Failed Breakout",
      tone: "danger",
      price: input.context.currentPrice,
      priority: 92,
      confidenceDelta: -8,
      whatHappened: "Price failed to hold above a breakout area.",
      whyItMatters: "Failed breakouts often trap late entries and shift control.",
      thesisImpact: "Reduces confidence until price repairs structure.",
      sourceModule: "Institutional Footprint Intelligence",
      now,
    });
  }
  // Candle-based failed breakout: pierce prior high then close back inside
  const recent = input.candles.slice(-6);
  if (recent.length < 4) return null;
  const last = recent[recent.length - 1];
  const priorHigh = Math.max(...recent.slice(0, -1).map((c) => c.high));
  const failed = last.high > priorHigh && last.close < priorHigh;
  if (!failed) return null;
  return annotation({
    id: `failed-breakout-candle-${input.context.symbol}`,
    kind: "failed-breakout",
    text: "Failed Breakout",
    tone: "danger",
    price: priorHigh,
    priority: 89,
    confidenceDelta: -6,
    whatHappened: "Price spiked above a prior high but closed back below it.",
    whyItMatters: "Rejection after a breakout attempt often signals weak follow-through.",
    thesisImpact: "Reduces readiness for breakout continuation until a clean retest holds.",
    sourceModule: "Smart Chart Intelligence v2",
    now,
    candleTime: last.time,
  });
}

function detectRetest(input: SmartChartIntelligenceInput, now: number) {
  if (
    input.reasoning.marketStructure !== "Retest" &&
    input.context.distanceFromSupport !== null &&
    input.context.distanceFromSupport > 0.012
  ) {
    return null;
  }
  if (input.reasoning.marketStructure !== "Retest" && input.context.distanceFromSupport === null) {
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

function detectSupportResistanceReaction(input: SmartChartIntelligenceInput, now: number) {
  const last = input.candles[input.candles.length - 1];
  if (!last) return null;
  const nearSupport =
    input.context.distanceFromSupport !== null && input.context.distanceFromSupport < 0.01;
  const nearResistance =
    input.context.distanceFromResistance !== null &&
    input.context.distanceFromResistance < 0.01;

  if (nearSupport) {
    const held = last.close > last.open || last.close > (last.low + last.high) / 2;
    return annotation({
      id: `sr-support-${input.context.symbol}`,
      kind: "support-resistance",
      text: held ? "Support Hold" : "Support Test",
      tone: held ? "mint" : "gold",
      price: input.context.currentPrice,
      priority: 82,
      confidenceDelta: held ? 4 : 0,
      whatHappened: held
        ? "Price is reacting constructively near support."
        : "Price is testing support without clear defense yet.",
      whyItMatters: "Support reactions teach whether risk is defined or still open.",
      thesisImpact: held
        ? "Supports a defensive long thesis only with confirmation."
        : "Thesis remains incomplete until buyers defend the level.",
      sourceModule: "Smart Chart Intelligence v2",
      now,
      candleTime: last.time,
    });
  }

  if (nearResistance) {
    const rejected = last.close < last.open || last.close < (last.low + last.high) / 2;
    return annotation({
      id: `sr-resistance-${input.context.symbol}`,
      kind: "support-resistance",
      text: rejected ? "Resistance Reject" : "Resistance Test",
      tone: rejected ? "danger" : "gold",
      price: input.context.currentPrice,
      priority: 82,
      confidenceDelta: rejected ? -4 : -1,
      whatHappened: rejected
        ? "Price is rejecting near resistance."
        : "Price is pressing resistance without a clear result.",
      whyItMatters: "Resistance reactions limit reward and raise late-entry risk.",
      thesisImpact: rejected
        ? "Weakens breakout thesis until a clean reclaim holds."
        : "Keeps upside conditional on acceptance above the level.",
      sourceModule: "Smart Chart Intelligence v2",
      now,
      candleTime: last.time,
    });
  }
  return null;
}

function detectVwap(input: SmartChartIntelligenceInput, now: number) {
  if (!input.context.vwap) return null;
  const above = input.context.currentPrice >= input.context.vwap;
  const distance =
    Math.abs(input.context.currentPrice - input.context.vwap) / input.context.currentPrice;
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
    whyItMatters:
      "VWAP often separates constructive intraday control from defensive action.",
    thesisImpact: above
      ? "Improves confidence in the current thesis."
      : "Reduces confidence until VWAP is reclaimed.",
    sourceModule: "Native Chart Engine",
    now,
  });
}

function detectEmaReaction(input: SmartChartIntelligenceInput, now: number) {
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
    whatHappened: "Price is reacting near a key EMA.",
    whyItMatters:
      "EMA reactions help identify whether trend participants are defending the move.",
    thesisImpact: supportive ? "Adds structure to the thesis." : "Creates overhead pressure.",
    sourceModule: "Native Chart Engine",
    now,
  });
}

function detectVolume(input: SmartChartIntelligenceInput, now: number) {
  const ratio =
    input.context.volume.average > 0
      ? input.context.volume.current / input.context.volume.average
      : 1;
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
    whatHappened: sweptLow
      ? "Price swept below recent lows and reclaimed them."
      : "Price swept above recent highs and rejected.",
    whyItMatters: "Liquidity sweeps can mark exhaustion of poorly placed stops.",
    thesisImpact: sweptLow
      ? "Can support a reversal thesis after confirmation."
      : "Warns that upside momentum may be fading.",
    sourceModule: "Smart Chart Intelligence v2",
    now,
    candleTime: last.time,
  });
}

function detectDemandSupplyZones(input: SmartChartIntelligenceInput, now: number) {
  if (
    input.context.supportZones.length > 0 &&
    input.context.distanceFromSupport !== null &&
    input.context.distanceFromSupport < 0.015
  ) {
    return annotation({
      id: `demand-zone-${input.context.symbol}`,
      kind: "demand-zone",
      text: "Demand Zone",
      tone: "mint",
      price: input.context.currentPrice,
      priority: 70,
      confidenceDelta: 3,
      whatHappened: "Price is trading near a marked demand / support zone.",
      whyItMatters: "Demand zones are useful only when buyers respond with confirmation.",
      thesisImpact: "Improves structure if the zone holds.",
      sourceModule: "Chart Drawings",
      now,
    });
  }
  if (
    input.context.resistanceZones.length > 0 &&
    input.context.distanceFromResistance !== null &&
    input.context.distanceFromResistance < 0.015
  ) {
    return annotation({
      id: `supply-zone-${input.context.symbol}`,
      kind: "supply-zone",
      text: "Supply Zone",
      tone: "danger",
      price: input.context.currentPrice,
      priority: 70,
      confidenceDelta: -3,
      whatHappened: "Price is trading near a marked supply / resistance zone.",
      whyItMatters: "Supply zones can limit reward and increase rejection risk.",
      thesisImpact: "Reduces readiness if target sits into resistance.",
      sourceModule: "Chart Drawings",
      now,
    });
  }
  return null;
}

function detectFootprint(input: SmartChartIntelligenceInput, now: number) {
  if (
    input.footprint.type === "No clear institutional footprint" ||
    input.footprint.confidence < 58
  ) {
    return null;
  }
  return annotation({
    id: `footprint-${input.footprint.type}-${input.context.symbol}`,
    kind: "footprint",
    text:
      input.footprint.direction === "Bullish"
        ? "Footprint Bid"
        : input.footprint.direction === "Bearish"
          ? "Footprint Offer"
          : "Footprint Watch",
    tone:
      input.footprint.direction === "Bullish"
        ? "mint"
        : input.footprint.direction === "Bearish"
          ? "danger"
          : "gold",
    price: input.context.currentPrice,
    priority: 87,
    confidenceDelta: input.footprint.confidenceImpact,
    whatHappened: input.footprint.explanation,
    whyItMatters:
      "Institutional footprint is an interpretation of large-participant pressure — not known intent.",
    thesisImpact: input.footprint.riskNote,
    sourceModule: "Institutional Footprint Intelligence",
    now,
  });
}

function detectMomentum(input: SmartChartIntelligenceInput, now: number) {
  if (!input.context.macd) return null;
  const accelerating =
    input.context.macd.histogram > 0 &&
    input.context.macd.line > input.context.macd.signal;
  const decelerating =
    input.context.macd.histogram < 0 ||
    input.context.macd.line < input.context.macd.signal;
  if (!accelerating && !decelerating) return null;
  // Prefer stronger of the two when both conditions edge-case
  const isAccel = accelerating && !decelerating
    ? true
    : decelerating && !accelerating
      ? false
      : input.context.macd.histogram > 0;
  return annotation({
    id: `momentum-${isAccel ? "accel" : "decel"}-${input.context.symbol}`,
    kind: "momentum",
    text: isAccel ? "Momentum Up" : "Momentum Fading",
    tone: isAccel ? "mint" : "gold",
    price: input.context.currentPrice,
    priority: 66,
    confidenceDelta: isAccel ? 3 : -4,
    whatHappened: isAccel
      ? "MACD is improving above signal — momentum accelerating."
      : "Momentum is decelerating relative to recent impulse.",
    whyItMatters:
      "Momentum should confirm structure; when it fades, patience becomes more important.",
    thesisImpact: isAccel
      ? "Supports continuation if structure agrees."
      : "Reduces confidence in immediate continuation.",
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
    tone:
      input.news.chartMarker.tone === "danger"
        ? "danger"
        : input.news.chartMarker.tone === "mint"
          ? "mint"
          : "gold",
    price: input.context.currentPrice,
    priority: 95,
    confidenceDelta:
      input.news.urgency === "High" && input.news.sentiment === "Negative"
        ? -7
        : input.news.sentiment === "Positive"
          ? 4
          : -2,
    whatHappened: input.news.hermesInterpretation,
    whyItMatters: "News can change volatility faster than chart structure can adapt.",
    thesisImpact: input.news.riskCaution.active
      ? input.news.riskCaution.message
      : input.news.possibleMarketImpact,
    sourceModule: "News Intelligence",
    now,
  });
}

// ─── Intelligence v2 evidence → annotations ─────────────────────────────────

function detectFromIntelligenceEvidence(
  input: SmartChartIntelligenceInput,
  now: number,
): Array<SmartChartAnnotation | null> {
  const evidence = input.intelligence?.evidence;
  if (!evidence?.length) return [];

  return evidence
    .filter((item) => isChartTeachableEvidence(item))
    .slice(0, 12)
    .map((item) => evidenceToAnnotation(item, input, now));
}

function isChartTeachableEvidence(item: HermesEvidence): boolean {
  const chartCategories = new Set([
    "Market Structure",
    "Multi-Timeframe Alignment",
    "Trend Quality",
    "Institutional Activity",
    "Volume Quality",
    "Momentum",
    "News and Event Risk",
    "Market Regime",
  ]);
  if (!chartCategories.has(item.category)) return false;
  // Prefer items with chart refs or strong claims
  return item.strength >= 55 || Boolean(item.chartReference?.price);
}

function evidenceToAnnotation(
  item: HermesEvidence,
  input: SmartChartIntelligenceInput,
  now: number,
): SmartChartAnnotation | null {
  if (!item?.id || !item.category) return null;
  const kind = mapEvidenceCategoryToKind(item.category, item.claim);
  if (!kind) return null;
  const delta = directionToDelta(item.direction, item.strength);
  const price =
    item.chartReference?.price ??
    input.context.currentPrice;
  const text =
    item.chartReference?.label ??
    shortClaimLabel(item.claim, kind);
  const whatHappened =
    typeof item.claim === "string" && item.claim.trim()
      ? item.claim
      : `${item.category} evidence is active on the chart.`;

  return annotation({
    id: `iv2-${item.id}`,
    kind,
    text,
    tone: delta > 1 ? "mint" : delta < -1 ? "danger" : "gold",
    price,
    priority: 60 + Math.round((item.strength ?? 50) / 5),
    confidenceDelta: delta,
    whatHappened,
    whyItMatters: evidenceWhyItMatters(item.category),
    thesisImpact:
      item.direction === "Supportive"
        ? "Aligned with the current thesis when structure confirms."
        : item.direction === "Contradictory"
          ? "Pressures the thesis until the conflict resolves."
          : "Neutral for thesis — useful context only.",
    sourceModule: item.sourceModules[0] ?? "Intelligence v2 Evidence",
    now,
    evidenceIds: [item.id],
  });
}

function detectFromRegime(
  input: SmartChartIntelligenceInput,
  now: number,
): Array<SmartChartAnnotation | null> {
  const regime = input.intelligence?.regime;
  if (!regime) return [];

  if (regime.structureRegime === "Transition") {
    return [
      annotation({
        id: `regime-transition-${input.context.symbol}`,
        kind: "structure",
        text: "Regime: Transition",
        tone: "gold",
        price: input.context.currentPrice,
        priority: 72,
        confidenceDelta: -2,
        whatHappened: regime.summary,
        whyItMatters:
          "Transition regimes raise false-break risk; wait for clearer structure.",
        thesisImpact: "Reduces readiness for aggressive continuation ideas.",
        sourceModule: "Intelligence v2 Market Regime",
        now,
      }),
    ];
  }

  if (regime.eventRegime === "Event Driven" || regime.eventRegime === "Elevated Event Risk") {
    return [
      annotation({
        id: `regime-event-${input.context.symbol}`,
        kind: "news",
        text: "Event Risk Regime",
        tone: "danger",
        price: input.context.currentPrice,
        priority: 91,
        confidenceDelta: -5,
        whatHappened: `Market regime is ${regime.eventRegime.toLowerCase()}.`,
        whyItMatters: "Event-driven tape can override clean technical structure.",
        thesisImpact: "Prioritize risk control over pattern completion.",
        sourceModule: "Intelligence v2 Market Regime",
        now,
      }),
    ];
  }

  return [];
}

// ─── Ranking, story, history ────────────────────────────────────────────────

function rankAndCapAnnotations(
  candidates: SmartChartAnnotation[],
  now: number,
): SmartChartAnnotation[] {
  const active = candidates
    .filter((item) => !item.expiresAt || item.expiresAt > now)
    .sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      const da = Math.abs(a.explanation?.confidenceDelta ?? 0);
      const db = Math.abs(b.explanation?.confidenceDelta ?? 0);
      if (db !== da) return db - da;
      return a.id.localeCompare(b.id);
    });

  // Dedupe similar kinds (keep highest priority of each kind family)
  const seenFamilies = new Set<string>();
  const unique: SmartChartAnnotation[] = [];
  for (const item of active) {
    const family = kindFamily(item.kind);
    if (seenFamilies.has(family) && unique.length >= 2) {
      // Allow at most one primary of each family once we have 2+ already
      // unless priority is extremely high
      if (item.priority < 90) continue;
    }
    if (seenFamilies.has(family) && item.priority < 88) continue;
    seenFamilies.add(family);
    unique.push(item);
    if (unique.length >= SMART_CHART_MAX_ANNOTATIONS) break;
  }

  return avoidOverlaps(unique.slice(0, SMART_CHART_MAX_ANNOTATIONS));
}

function buildMarketStoryTimeline(
  active: SmartChartAnnotation[],
  allCandidates: SmartChartAnnotation[],
  now: number,
): MarketStoryEvent[] {
  const pool = [...active];
  // Fill story with next-highest candidates not already active
  const activeIds = new Set(active.map((a) => a.id));
  for (const item of allCandidates
    .filter((c) => !activeIds.has(c.id))
    .sort((a, b) => b.priority - a.priority)) {
    if (pool.length >= SMART_CHART_STORY_MAX) break;
    pool.push(item);
  }

  return pool
    .slice(0, SMART_CHART_STORY_MAX)
    .map((item, index) => ({
      id: `story-${item.id}`,
      timestamp: item.createdAt ?? now,
      sequence: index + 1,
      title: item.text,
      kind: item.kind,
      whatHappened: item.explanation?.whatHappened ?? item.text,
      whyItMatters: item.explanation?.whyItMatters ?? "",
      thesisImpact: item.explanation?.thesisImpact ?? "",
      confidenceDelta: item.explanation?.confidenceDelta ?? 0,
      tone: item.tone,
      price: item.price,
      sourceModules: item.explanation?.sourceModule
        ? [item.explanation.sourceModule]
        : ["Smart Chart Intelligence v2"],
      evidenceIds: item.evidenceIds,
    }))
    .sort((a, b) => a.timestamp - b.timestamp || a.sequence - b.sequence)
    .map((event, index) => ({ ...event, sequence: index + 1 }));
}

function buildConfidenceHistory(
  active: SmartChartAnnotation[],
  input: SmartChartIntelligenceInput,
  now: number,
): ConfidenceHistoryEntry[] {
  const fromAnnotations: ConfidenceHistoryEntry[] = active
    .filter((a) => Math.abs(a.explanation?.confidenceDelta ?? 0) >= 2)
    .map((a) => {
      const delta = a.explanation?.confidenceDelta ?? 0;
      return {
        id: `conf-hist-${a.id}`,
        timestamp: a.createdAt ?? now,
        confidenceDelta: delta,
        causeLabel: a.text,
        reason:
          a.explanation?.whatHappened ??
          `Chart teaching event ${a.text} adjusted confidence context.`,
        sourceEventId: a.id,
        direction: delta > 0 ? "up" : delta < 0 ? "down" : "flat",
        sourceModules: a.explanation?.sourceModule
          ? [a.explanation.sourceModule]
          : ["Smart Chart Intelligence v2"],
        confidenceSnapshot: input.intelligence?.currentConfidence ?? null,
      };
    });

  const fromContributions: ConfidenceHistoryEntry[] = (
    input.intelligence?.confidenceContributions ?? []
  )
    .filter((c) => Math.abs(c.contribution) >= 2)
    .slice(0, 4)
    .map((c, i) => ({
      id: `conf-contrib-${c.category}-${i}`,
      timestamp: now - i,
      confidenceDelta: Math.round(c.contribution),
      causeLabel: c.label,
      reason: c.explanation,
      sourceEventId: c.evidenceIds[0] ?? `contribution-${c.category}`,
      direction:
        c.contribution > 0 ? "up" : c.contribution < 0 ? "down" : "flat",
      sourceModules: c.sourceModules,
      confidenceSnapshot: input.intelligence?.currentConfidence ?? null,
    }));

  return [...fromAnnotations, ...fromContributions]
    .sort(
      (a, b) =>
        Math.abs(b.confidenceDelta) - Math.abs(a.confidenceDelta) ||
        b.timestamp - a.timestamp,
    )
    .slice(0, SMART_CHART_HISTORY_MAX);
}

// ─── Helpers ────────────────────────────────────────────────────────────────

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
  candleTime,
  evidenceIds,
}: {
  id: string;
  kind: SmartChartAnnotationKind;
  text: string;
  tone: SmartChartAnnotation["tone"];
  price?: number;
  priority: number;
  confidenceDelta: number;
  whatHappened: string;
  whyItMatters: string;
  thesisImpact: string;
  sourceModule: string;
  now: number;
  candleTime?: number;
  evidenceIds?: string[];
}): SmartChartAnnotation {
  return {
    id,
    kind,
    text,
    tone,
    price,
    priority,
    createdAt: candleTime ?? now,
    expiresAt: now + 120_000,
    evidenceIds,
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
    while (
      usedPrices.some(
        (used) => Math.abs(used - price) / Math.max(1, Math.abs(price)) < 0.004,
      )
    ) {
      price *= 1.004;
    }
    usedPrices.push(price);
    return { ...label, price };
  });
}

function findRecentSwings(candles: Candle[], window: number) {
  const slice = candles.slice(-window);
  if (slice.length < 5) return null;
  const body = slice.slice(0, -1);
  return {
    priorHigh: Math.max(...body.map((c) => c.high)),
    priorLow: Math.min(...body.map((c) => c.low)),
  };
}

function lastCandleTime(candles: Candle[]): number | null {
  const last = candles[candles.length - 1];
  if (!last) return null;
  return typeof last.time === "number" ? last.time : null;
}

function kindFamily(kind: SmartChartAnnotationKind): string {
  if (kind === "structure-break" || kind === "structure" || kind === "higher-high" || kind === "lower-low") {
    return "structure";
  }
  if (kind === "breakout" || kind === "failed-breakout" || kind === "retest") {
    return "breakout";
  }
  if (kind === "demand-zone" || kind === "supply-zone" || kind === "zone" || kind === "support-resistance") {
    return "levels";
  }
  if (kind === "vwap" || kind === "ema") return "mean";
  return kind;
}

function mapEvidenceCategoryToKind(
  category: string,
  claim: string | undefined,
): SmartChartAnnotationKind | null {
  const lower = (claim ?? "").toLowerCase();
  if (category === "News and Event Risk" || lower.includes("news")) return "news";
  if (category === "Institutional Activity" || lower.includes("footprint")) return "footprint";
  if (category === "Volume Quality" || lower.includes("volume")) return "volume";
  if (category === "Momentum" || lower.includes("momentum")) return "momentum";
  if (lower.includes("vwap")) return "vwap";
  if (lower.includes("ema")) return "ema";
  if (lower.includes("liquidity") || lower.includes("sweep")) return "liquidity";
  if (lower.includes("breakout") && lower.includes("fail")) return "failed-breakout";
  if (lower.includes("breakout")) return "breakout";
  if (lower.includes("structure break") || lower.includes("broke")) return "structure-break";
  if (category === "Market Structure" || category === "Trend Quality") return "structure";
  if (category === "Multi-Timeframe Alignment") return "structure";
  if (category === "Market Regime") return "structure";
  return "structure";
}

function directionToDelta(
  direction: HermesEvidence["direction"],
  strength: number,
): number {
  const mag = Math.max(1, Math.min(8, Math.round(strength / 15)));
  if (direction === "Supportive") return mag;
  if (direction === "Contradictory") return -mag;
  return 0;
}

function shortClaimLabel(claim: string | undefined, kind: SmartChartAnnotationKind): string {
  const defaults: Partial<Record<SmartChartAnnotationKind, string>> = {
    structure: "Structure",
    "structure-break": "Structure Break",
    volume: "Volume",
    momentum: "Momentum",
    footprint: "Footprint",
    news: "News",
    vwap: "VWAP",
    ema: "EMA",
    liquidity: "Liquidity",
  };
  if (!claim || typeof claim !== "string") {
    return defaults[kind] ?? "Chart evidence";
  }
  if (claim.length <= 28) return claim;
  return defaults[kind] ?? claim.slice(0, 26) + "…";
}

function evidenceWhyItMatters(category: string): string {
  switch (category) {
    case "Market Structure":
      return "Structure frames whether the path of least resistance still holds.";
    case "Multi-Timeframe Alignment":
      return "Higher-timeframe disagreement raises countertrend risk on lower frames.";
    case "Institutional Activity":
      return "Large-participant pressure can accelerate or fade technical moves.";
    case "Volume Quality":
      return "Participation quality separates durable moves from thin noise.";
    case "Momentum":
      return "Momentum confirms or challenges the active structure thesis.";
    case "News and Event Risk":
      return "Event risk can invalidate clean chart setups without warning.";
    case "Market Regime":
      return "Regime tells Hermes how to weight every other chart clue.";
    default:
      return "This evidence shapes how Hermes teaches the current chart setup.";
  }
}
