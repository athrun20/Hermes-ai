/**
 * Hermes Conviction (pure internal stage).
 *
 * Answers: how strongly would Hermes act on its current Judgment and Opinion,
 * given regime, readiness, risk quality, data quality, and unresolved contradictions?
 *
 * Does NOT:
 * - recompute Confidence, Trade Readiness, or Trade Quality
 * - mutate Judgment or Opinion
 * - calculate position size or change paper-trading behavior
 * - emit Buy/Sell or dollar/% risk recommendations
 * - surface as a primary UI metric
 *
 * High Confidence never automatically becomes High Conviction.
 */

import type {
  ConvictionLevel,
  ConvictionSizingBias,
  DataQuality,
  HermesConviction,
  HermesEvidence,
  HermesJudgment,
  HermesJudgmentStance,
  HermesOpinion,
  MarketRegime,
} from "@/lib/intelligence-v2/types";
import type { ReasoningRiskQuality } from "@/lib/reasoning-types";

export type BuildHermesConvictionInput = {
  judgment: HermesJudgment;
  /** Preferred: full Opinion for risk/contradiction narrative context */
  opinion?: Pick<
    HermesOpinion,
    | "biggestRisk"
    | "contradictingEvidence"
    | "supportingEvidence"
    | "stance"
    | "confidenceFinalScore"
    | "readinessScore"
    | "whatWouldChangeOpinion"
    | "nextFocus"
  >;
  regime: MarketRegime;
  /** Existing Reasoning Confidence — read-only mirror */
  confidence?: number;
  /** Existing Trade Readiness — read-only mirror */
  readiness?: number;
  riskQuality?: ReasoningRiskQuality;
  /** Optional Phase 2 evidence for contradiction density */
  evidence?: HermesEvidence[];
  /** Explicit event-risk flag when not fully expressed on regime */
  eventRiskActive?: boolean;
  hasOpenPosition?: boolean;
  sourceTimestamp?: number;
};

type Resolved = {
  stance: HermesJudgmentStance;
  confidence: number | undefined;
  readiness: number | undefined;
  riskQuality: ReasoningRiskQuality | undefined;
  dataQuality: DataQuality;
  regime: MarketRegime;
  hostileRegime: boolean;
  cautionaryRegime: boolean;
  supportiveRegime: boolean;
  eventRisk: boolean;
  thinLiquidity: boolean;
  extremeVol: boolean;
  highVol: boolean;
  contradictionCount: number;
  substantialContradictions: boolean;
  criticalBlockers: boolean;
  hasOpenPosition: boolean;
  opinionBiggestRisk: string | undefined;
  judgmentPrimary: string;
  judgmentBlocking: string[];
  sourceTimestamp: number;
};

const CONFIDENCE_STRONG = 72;
const READINESS_HIGH = 85;
const READINESS_ACTIONABLE = 70;
const READINESS_LOW = 50;

/**
 * Build Hermes Conviction from Judgment + optional Opinion + existing context.
 * Pure and deterministic for identical inputs.
 */
export function buildHermesConviction(input: BuildHermesConvictionInput): HermesConviction {
  const signals = resolve(input);
  const level = decideLevel(signals);
  const sizingBias = mapSizingBias(level, signals);
  const supportingDrivers = buildSupportingDrivers(signals, level);
  const reducingDrivers = buildReducingDrivers(signals);
  const riskConstraints = buildRiskConstraints(signals, level);
  const primaryDriver = pickPrimaryDriver(signals, level, reducingDrivers, supportingDrivers);
  const conditionsForIncrease = buildIncreaseConditions(signals, level);
  const conditionsForDecrease = buildDecreaseConditions(signals, level);
  const summary = buildSummary(level, sizingBias, signals, primaryDriver);

  return {
    kind: "hermes-conviction-v1",
    level,
    sizingBias,
    summary,
    primaryDriver,
    supportingDrivers: unique(supportingDrivers).slice(0, 6),
    reducingDrivers: unique(reducingDrivers).slice(0, 6),
    riskConstraints: unique(riskConstraints).slice(0, 8),
    conditionsForIncrease: unique(conditionsForIncrease).slice(0, 8),
    conditionsForDecrease: unique(conditionsForDecrease).slice(0, 8),
    sourceTimestamp: signals.sourceTimestamp,
  };
}

function resolve(input: BuildHermesConvictionInput): Resolved {
  const confidence =
    input.confidence ??
    input.opinion?.confidenceFinalScore ??
    undefined;
  const readiness = input.readiness ?? input.opinion?.readinessScore ?? undefined;
  const eventRisk =
    Boolean(input.eventRiskActive) ||
    input.regime.eventRegime === "Event Driven" ||
    input.regime.eventRegime === "Elevated Event Risk";

  const regimeLevel = input.judgment.regimeEffect.level;
  const hostileRegime =
    regimeLevel === "Hostile" ||
    input.regime.eventRegime === "Event Driven" ||
    input.regime.liquidityRegime === "Dislocated" ||
    (input.regime.volatilityRegime === "Extreme" &&
      (input.regime.structureRegime === "Unclear" ||
        input.regime.structureRegime === "Transition"));

  const cautionaryRegime =
    !hostileRegime &&
    (regimeLevel === "Cautionary" ||
      input.regime.volatilityRegime === "High" ||
      input.regime.volatilityRegime === "Extreme" ||
      input.regime.liquidityRegime === "Thin" ||
      input.regime.structureRegime === "Transition" ||
      input.regime.structureRegime === "Unclear" ||
      eventRisk);

  const supportiveRegime =
    !hostileRegime &&
    !cautionaryRegime &&
    (regimeLevel === "Supportive" ||
      (input.regime.structureRegime === "Trending" &&
        input.regime.liquidityRegime === "Healthy" &&
        input.regime.eventRegime === "Normal" &&
        (input.regime.volatilityRegime === "Normal" ||
          input.regime.volatilityRegime === "Low")));

  const fromOpinion = input.opinion?.contradictingEvidence?.length ?? 0;
  const fromEvidence =
    input.evidence?.filter((e) => e.direction === "Contradictory").length ?? 0;
  const contradictionCount = Math.max(fromOpinion, fromEvidence);
  const substantialContradictions =
    contradictionCount >= 2 ||
    (input.opinion?.contradictingEvidence?.some(
      (c) => (c.weightHint ?? 0) >= 60,
    ) ??
      false) ||
    (input.evidence?.some(
      (e) => e.direction === "Contradictory" && e.strength >= 65,
    ) ??
      false);

  const criticalBlockers =
    input.judgment.blockingReasons.some(isCriticalBlockerText) ||
    input.judgment.stance === "Avoid" ||
    input.judgment.stance === "Insufficient Data" ||
    (input.riskQuality === "Unacceptable");

  return {
    stance: input.judgment.stance,
    confidence,
    readiness,
    riskQuality: input.riskQuality,
    dataQuality: input.regime.dataQuality,
    regime: input.regime,
    hostileRegime,
    cautionaryRegime,
    supportiveRegime,
    eventRisk,
    thinLiquidity: input.regime.liquidityRegime === "Thin",
    extremeVol: input.regime.volatilityRegime === "Extreme",
    highVol:
      input.regime.volatilityRegime === "High" ||
      input.regime.volatilityRegime === "Extreme",
    contradictionCount,
    substantialContradictions,
    criticalBlockers,
    hasOpenPosition: Boolean(input.hasOpenPosition) || input.judgment.stance === "Manage Existing Position",
    opinionBiggestRisk: input.opinion?.biggestRisk,
    judgmentPrimary: input.judgment.primaryReason,
    judgmentBlocking: input.judgment.blockingReasons,
    sourceTimestamp:
      input.sourceTimestamp ??
      input.judgment.sourceTimestamp ??
      input.regime.sourceTimestamp,
  };
}

function decideLevel(s: Resolved): ConvictionLevel {
  // Open-position management: never High new-entry aggression
  if (s.hasOpenPosition || s.stance === "Manage Existing Position") {
    if (s.hostileRegime || s.dataQuality === "Poor" || s.criticalBlockers) {
      return "None";
    }
    if (s.eventRisk || s.highVol || s.thinLiquidity || s.substantialContradictions) {
      return "Low";
    }
    // Management-oriented moderate process conviction at most
    return "Low";
  }

  // --- None ---
  if (s.stance === "Avoid" || s.stance === "Insufficient Data") return "None";
  if (s.dataQuality === "Poor") return "None";
  if (s.hostileRegime) return "None";
  if (s.riskQuality === "Unacceptable") return "None";
  if (s.criticalBlockers && s.stance !== "Take" && s.stance !== "Take With Caution") {
    return "None";
  }

  // --- High (rare, strict) ---
  const highEligible =
    s.stance === "Take" &&
    s.readiness !== undefined &&
    s.readiness >= READINESS_HIGH &&
    s.confidence !== undefined &&
    s.confidence >= CONFIDENCE_STRONG &&
    isDataQualityAcceptable(s.dataQuality) &&
    s.supportiveRegime &&
    !s.hostileRegime &&
    !s.cautionaryRegime &&
    !s.eventRisk &&
    !s.thinLiquidity &&
    !s.extremeVol &&
    !s.highVol &&
    !s.substantialContradictions &&
    s.contradictionCount <= 1 &&
    (s.riskQuality === "Good" || s.riskQuality === "Excellent") &&
    !s.criticalBlockers;

  if (highEligible) return "High";

  // --- Moderate ---
  // Take With Caution default path when not forced lower
  if (s.stance === "Take With Caution") {
    if (
      s.eventRisk ||
      s.thinLiquidity ||
      s.extremeVol ||
      (s.readiness !== undefined && s.readiness < READINESS_ACTIONABLE) ||
      s.substantialContradictions
    ) {
      return "Low";
    }
    return "Moderate";
  }

  // Take without full High gates → Moderate if actionable, else Low
  if (s.stance === "Take") {
    if (
      s.cautionaryRegime ||
      s.eventRisk ||
      s.thinLiquidity ||
      s.highVol ||
      s.substantialContradictions ||
      (s.readiness !== undefined && s.readiness < READINESS_HIGH) ||
      (s.confidence !== undefined && s.confidence < CONFIDENCE_STRONG) ||
      s.riskQuality === "Average" ||
      s.riskQuality === "Poor" ||
      !isDataQualityAcceptable(s.dataQuality)
    ) {
      // Still Take stance but not rare High path
      if (s.readiness !== undefined && s.readiness >= READINESS_ACTIONABLE && !s.hostileRegime) {
        return "Moderate";
      }
      return "Low";
    }
    // Missing risk quality or mild residual → Moderate rather than inventing High
    return "Moderate";
  }

  // --- Low (Wait and other incomplete action paths) ---
  if (s.stance === "Wait") return "Low";

  // Fallback
  if (s.readiness !== undefined && s.readiness < READINESS_LOW) return "Low";
  if (s.eventRisk || s.highVol || s.thinLiquidity || s.substantialContradictions) {
    return "Low";
  }

  return "Low";
}

function mapSizingBias(level: ConvictionLevel, s: Resolved): ConvictionSizingBias {
  if (s.hasOpenPosition || s.stance === "Manage Existing Position") {
    // Management: no new risk aggression
    if (level === "None") return "No New Risk";
    return "Reduced Risk";
  }

  switch (level) {
    case "None":
      return "No New Risk";
    case "Low":
      return "Reduced Risk";
    case "Moderate":
      return "Standard Risk";
    case "High":
      // Descriptive only — does not alter paper size calculations
      return "Eligible for Higher Risk";
  }
}

function buildSupportingDrivers(s: Resolved, level: ConvictionLevel): string[] {
  const out: string[] = [];
  out.push(`Judgment stance is ${s.stance}.`);
  if (s.confidence !== undefined && s.confidence >= CONFIDENCE_STRONG) {
    out.push(
      `Existing Confidence ${s.confidence} is strong (thesis strength only — not automatic High Conviction).`,
    );
  }
  if (s.readiness !== undefined && s.readiness >= READINESS_ACTIONABLE) {
    out.push(`Existing Trade Readiness ${s.readiness} supports actionability context.`);
  }
  if (s.supportiveRegime) {
    out.push(
      `Regime is supportive: ${s.regime.structureRegime} / ${s.regime.volatilityRegime} vol / ${s.regime.eventRegime}.`,
    );
  }
  if (s.riskQuality === "Good" || s.riskQuality === "Excellent") {
    out.push(`Risk quality is ${s.riskQuality}.`);
  }
  if (isDataQualityAcceptable(s.dataQuality)) {
    out.push(`Data quality is ${s.dataQuality}.`);
  }
  if (level === "High") {
    out.push("All rare High Conviction gates cleared (Take + high readiness + supportive regime + limited contradiction).");
  }
  if (s.hasOpenPosition) {
    out.push("Open-position context steers Conviction toward management, not new-entry aggression.");
  }
  return out;
}

function buildReducingDrivers(s: Resolved): string[] {
  const out: string[] = [];
  if (s.stance === "Avoid" || s.stance === "Insufficient Data") {
    out.push(`Judgment ${s.stance} suppresses Conviction.`);
  }
  if (s.stance === "Wait") {
    out.push("Judgment Wait keeps Conviction Low — good idea is not ready-now aggression.");
  }
  if (s.confidence !== undefined && s.readiness !== undefined && s.confidence >= CONFIDENCE_STRONG && s.readiness < READINESS_ACTIONABLE) {
    out.push(
      `High Confidence (${s.confidence}) with low Readiness (${s.readiness}) — Conviction stays suppressed.`,
    );
  }
  if (s.hostileRegime) {
    out.push(`Hostile regime: ${s.regime.summary}`);
  }
  if (s.cautionaryRegime) {
    out.push(
      `Cautionary regime factors: ${s.regime.structureRegime}, ${s.regime.volatilityRegime} vol, ${s.regime.liquidityRegime} liquidity, ${s.regime.eventRegime}.`,
    );
  }
  if (s.eventRisk) {
    out.push(`Event risk is unresolved (${s.regime.eventRegime}).`);
  }
  if (s.thinLiquidity) {
    out.push("Liquidity is Thin — fills and stops may be less reliable.");
  }
  if (s.extremeVol) {
    out.push("Volatility is Extreme — execution quality risk rises.");
  } else if (s.highVol) {
    out.push("Volatility is High — prefer reduced risk posture.");
  }
  if (s.substantialContradictions) {
    out.push(
      `Substantial contradictory evidence remains (${s.contradictionCount} contradiction signal(s)).`,
    );
  } else if (s.contradictionCount > 0) {
    out.push(`Some contradictory evidence remains (${s.contradictionCount}).`);
  }
  if (s.dataQuality === "Poor" || s.dataQuality === "Limited") {
    out.push(`Data quality is ${s.dataQuality}.`);
  }
  if (s.riskQuality === "Poor" || s.riskQuality === "Unacceptable" || s.riskQuality === "Average") {
    out.push(`Risk quality is ${s.riskQuality}.`);
  }
  for (const b of s.judgmentBlocking.slice(0, 3)) {
    out.push(`Judgment blocker: ${b}`);
  }
  if (s.opinionBiggestRisk) {
    out.push(`Opinion biggest risk: ${s.opinionBiggestRisk}`);
  }
  if (s.hasOpenPosition) {
    out.push("Existing position: Conviction is management-oriented, not new-entry High.");
  }
  return out;
}

function buildRiskConstraints(s: Resolved, level: ConvictionLevel): string[] {
  const out: string[] = [
    "Conviction does not calculate position size or change paper-trading behavior.",
    "Eligible for Higher Risk (if present) is descriptive only — not an order instruction.",
  ];

  if (level === "None") {
    out.push("No new risk should be considered under current Judgment/regime constraints.");
  }
  if (s.hostileRegime) {
    out.push("Hostile regime forbids elevating Conviction for new entries.");
  }
  if (s.eventRisk) {
    out.push("Unresolved event risk constrains Conviction below High.");
  }
  if (s.thinLiquidity || s.extremeVol) {
    out.push("Thin liquidity and/or extreme volatility constrain risk posture.");
  }
  if (s.substantialContradictions) {
    out.push("Unresolved contradictions limit Conviction until evidence resolves.");
  }
  if (s.dataQuality === "Poor") {
    out.push("Poor data quality forbids reliable Conviction above None.");
  }
  if (s.hasOpenPosition) {
    out.push("Open position: do not interpret Conviction as permission to add a fresh entry.");
  }
  if (s.confidence !== undefined && s.confidence >= CONFIDENCE_STRONG && level !== "High") {
    out.push("Strong Confidence alone does not unlock High Conviction.");
  }
  return out;
}

function buildIncreaseConditions(s: Resolved, level: ConvictionLevel): string[] {
  if (level === "High") {
    return [
      "High Conviction is already at the top internal band — improve process adherence, not aggression.",
      "Any new contradiction, event risk, or readiness drop should decrease Conviction immediately.",
    ];
  }

  const out: string[] = [];
  if (s.stance === "Avoid" || s.stance === "Insufficient Data") {
    out.push("Judgment must leave Avoid/Insufficient Data before Conviction can rise.");
  }
  if (s.stance === "Wait") {
    out.push("Judgment must move beyond Wait with higher Trade Readiness (not higher Confidence alone).");
  }
  if (s.readiness !== undefined && s.readiness < READINESS_HIGH) {
    out.push("Raise Trade Readiness into High-Quality Setup territory.");
  }
  if (s.confidence !== undefined && s.confidence < CONFIDENCE_STRONG) {
    out.push("Thesis Confidence would need to be strong — but still cannot create High Conviction alone.");
  }
  if (s.eventRisk) {
    out.push("Event risk must cool to Normal before Conviction can increase materially.");
  }
  if (s.hostileRegime || s.cautionaryRegime) {
    out.push("Regime must improve toward supportive (non-hostile, non-cautionary) conditions.");
  }
  if (s.thinLiquidity) {
    out.push("Liquidity should improve away from Thin/Dislocated.");
  }
  if (s.highVol) {
    out.push("Volatility should normalize away from High/Extreme.");
  }
  if (s.substantialContradictions || s.contradictionCount > 0) {
    out.push("Contradictory evidence must resolve or weaken.");
  }
  if (s.dataQuality === "Poor" || s.dataQuality === "Limited") {
    out.push("Data quality must be Adequate or Good.");
  }
  if (s.riskQuality !== "Good" && s.riskQuality !== "Excellent") {
    out.push("Risk quality should be Good or Excellent for higher Conviction bands.");
  }
  if (s.hasOpenPosition) {
    out.push("Close or fully stabilize the open position before applying new-entry Conviction framing.");
  }
  if (s.stance === "Take With Caution") {
    out.push("Clear residual caution factors and reach Judgment Take with high readiness for High Conviction.");
  }
  return out.length
    ? out
    : ["Resolve reducing drivers and maintain Judgment Take with supportive regime for any increase."];
}

function buildDecreaseConditions(s: Resolved, level: ConvictionLevel): string[] {
  const out: string[] = [
    "Conviction decreases if Judgment moves to Wait, Avoid, or Insufficient Data.",
    "Conviction decreases if Trade Readiness falls while Confidence stays high.",
    "Conviction decreases if regime turns cautionary or hostile.",
    "Conviction decreases if event risk elevates or contradictions grow.",
  ];
  if (level === "None") {
    out.push("Already at None — further deterioration keeps No New Risk posture.");
  }
  if (s.hasOpenPosition) {
    out.push("Conviction decreases further if open-position invalidation is approached or breached.");
  }
  return out;
}

function pickPrimaryDriver(
  s: Resolved,
  level: ConvictionLevel,
  reducing: string[],
  supporting: string[],
): string {
  if (level === "None") {
    if (s.stance === "Avoid" || s.stance === "Insufficient Data") {
      return `Primary driver: Judgment ${s.stance} — no personal acting strength.`;
    }
    if (s.hostileRegime) {
      return "Primary driver: hostile market regime suppresses Conviction to None.";
    }
    if (s.dataQuality === "Poor") {
      return "Primary driver: poor data quality — Conviction withheld.";
    }
    return reducing[0] ?? "Primary driver: critical constraints set Conviction to None.";
  }

  if (level === "High") {
    return "Primary driver: Judgment Take with high readiness, strong Confidence, supportive regime, and limited contradiction (rare High band).";
  }

  if (level === "Moderate") {
    if (s.stance === "Take With Caution") {
      return "Primary driver: Judgment Take With Caution — actionable but residual risk caps Conviction at Moderate.";
    }
    return "Primary driver: Judgment supports action with meaningful residual constraints — Moderate Conviction only.";
  }

  // Low
  if (
    s.confidence !== undefined &&
    s.readiness !== undefined &&
    s.confidence >= CONFIDENCE_STRONG &&
    s.readiness < READINESS_ACTIONABLE
  ) {
    return `Primary driver: strong Confidence (${s.confidence}) with incomplete readiness (${s.readiness}) — High Confidence ≠ High Conviction.`;
  }
  if (s.stance === "Wait") {
    return "Primary driver: Judgment Wait — process patience, Low Conviction.";
  }
  if (s.hasOpenPosition) {
    return "Primary driver: open-position management context — not new-entry aggression.";
  }
  if (s.eventRisk) {
    return "Primary driver: unresolved event risk keeps Conviction Low.";
  }
  return reducing[0] ?? supporting[0] ?? s.judgmentPrimary;
}

function buildSummary(
  level: ConvictionLevel,
  sizingBias: ConvictionSizingBias,
  s: Resolved,
  primaryDriver: string,
): string {
  const conf = s.confidence === undefined ? "n/a" : String(s.confidence);
  const ready = s.readiness === undefined ? "n/a" : String(s.readiness);
  return [
    `Conviction: ${level}.`,
    `Sizing bias (descriptive only): ${sizingBias}.`,
    `Judgment ${s.stance}.`,
    `Confidence ${conf} · Readiness ${ready} (unchanged inputs).`,
    primaryDriver,
  ].join(" ");
}

function isDataQualityAcceptable(q: DataQuality): boolean {
  return q === "Adequate" || q === "Good";
}

function isCriticalBlockerText(text: string): boolean {
  const b = text.toLowerCase();
  return (
    b.includes("hostile") ||
    b.includes("unacceptable") ||
    b.includes("entry is not defined") ||
    b.includes("stop loss is not defined") ||
    b.includes("below 1:1") ||
    b.includes("event driven") ||
    b.includes("insufficient")
  );
}

function unique(items: string[]): string[] {
  return [...new Set(items.map((s) => s.trim()).filter(Boolean))];
}

/** Test helper — Conviction text must not include Buy/Sell commands. */
export function convictionContainsTradeCommands(c: HermesConviction): boolean {
  const text = [
    c.summary,
    c.primaryDriver,
    ...c.supportingDrivers,
    ...c.reducingDrivers,
    ...c.riskConstraints,
    ...c.conditionsForIncrease,
    ...c.conditionsForDecrease,
  ].join(" ");
  return /\bbuy\b|\bsell\b/i.test(text);
}

/** Test helper — no numeric size / dollar / percent risk recommendations. */
export function convictionContainsSizeRecommendations(c: HermesConviction): boolean {
  const text = [
    c.summary,
    c.primaryDriver,
    ...c.supportingDrivers,
    ...c.reducingDrivers,
    ...c.riskConstraints,
    ...c.conditionsForIncrease,
    ...c.conditionsForDecrease,
  ].join(" ");
  return /\$\d|\d+\s*%\s*(of\s+)?(equity|portfolio|account|risk)|risk\s+\d+\s*%|position\s*size\s*=|size\s+to\s+\d+/i.test(
    text,
  );
}
