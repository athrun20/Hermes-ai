/**
 * Hermes Intelligence v3 builder (Phase 0).
 *
 * Pure interpretation package. Never recalculates product scores.
 * Never calls market providers, paper trading, or Learning Engine.
 */

import { buildDeterministicKey } from "@/lib/intelligence-v3/determinism";
import {
  assertNoForbiddenLanguage,
} from "@/lib/intelligence-v3/language/forbidden-phrases";
import {
  compareCaveatSeverity,
  DEFAULT_HEADLINE_NONE,
  severityFromCaveats,
} from "@/lib/intelligence-v3/language/hermes-tone";
import { contributeDataQuality } from "@/lib/intelligence-v3/rules/data-quality";
import { contributeMtfContext } from "@/lib/intelligence-v3/rules/mtf-context";
import { contributeReadiness } from "@/lib/intelligence-v3/rules/readiness";
import { contributeRegimeContext } from "@/lib/intelligence-v3/rules/regime-context";
import { contributeTradeQualityContext } from "@/lib/intelligence-v3/rules/trade-quality-context";
import type {
  ContextNote,
  IntelligenceV3Input,
  IntelligenceV3Package,
  IntelligenceV3Severity,
  MentorCaveat,
  MissingConfirmation,
  RuleContribution,
} from "@/lib/intelligence-v3/types";

const MAX_CAVEATS = 5;
const MAX_MISSING = 8;
const MAX_NOTES = 8;

/**
 * Build Intelligence v3 interpretation package from product + market-data context.
 * Soft-fails on missing optionals; never throws for incomplete optional modules.
 */
export function buildIntelligenceV3(
  input: IntelligenceV3Input,
): IntelligenceV3Package {
  const warnings: string[] = [];

  // Required score mirrors — clamp only NaN to 0 for package integrity; still "mirror" finite values exactly.
  const confidenceScore = finiteOrZero(input.confidence.score);
  const tradeReadinessScore = finiteOrZero(input.tradeReadiness.score);
  const tradeQualityScore =
    input.tradeQuality != null
      ? finiteOrZero(input.tradeQuality.score)
      : undefined;

  if (!Number.isFinite(input.confidence.score)) {
    warnings.push("Confidence score was non-finite; mirrored as 0 for package integrity.");
  }
  if (!Number.isFinite(input.tradeReadiness.score)) {
    warnings.push(
      "Trade Readiness score was non-finite; mirrored as 0 for package integrity.",
    );
  }

  const contributions: RuleContribution[] = [
    contributeDataQuality(input),
    contributeReadiness(input),
    contributeTradeQualityContext(input),
    contributeMtfContext(input),
    contributeRegimeContext(input),
  ];

  const caveats = mergeCaveats(contributions);
  const missingConfirmations = mergeMissing(contributions);
  const contextNotes = mergeNotes(contributions);
  const uncertaintyDrivers = unique(
    contributions.flatMap((c) => c.uncertaintyDrivers),
  );
  const reduceUncertainty = unique(
    contributions.flatMap((c) => c.reduceUncertainty),
  );
  warnings.push(...contributions.flatMap((c) => c.warnings));

  const severity = resolveSeverity(caveats);
  const headlineCaveat = resolveHeadline(caveats, severity, input);

  const flags = {
    isFixturePractice: Boolean(
      input.dataQuality?.isFixture || input.dataQuality?.quality === "Fixture",
    ),
    isDelayedFeed: Boolean(
      input.dataQuality?.isDelayed || input.dataQuality?.quality === "Delayed",
    ),
    isLiveFeed: Boolean(
      input.dataQuality?.isLive || input.dataQuality?.quality === "Live",
    ),
    isDataUnavailable: Boolean(
      input.dataQuality?.isUnavailable ||
        input.dataQuality?.quality === "Unavailable",
    ),
    isTimeframeUnsupported: Boolean(
      input.dataQuality?.timeframeUnsupported ||
        input.dataQuality?.statusLabel === "Unsupported",
    ),
    hasMtfConflict: missingConfirmations.some((m) => m.id === "mc-mtf-alignment") ||
      caveats.some((c) => c.id === "mtf-conflict"),
    hasReadinessBlockers: Boolean(
      (input.tradeReadiness.blockers &&
        input.tradeReadiness.blockers.length > 0) ||
        caveats.some((c) => c.id === "rd-blockers-present"),
    ),
  };

  // Honesty: fixture must never be labeled live.
  if (flags.isFixturePractice && flags.isLiveFeed) {
    flags.isLiveFeed = false;
    warnings.push(
      "Fixture practice cannot be labeled live — isLiveFeed forced false.",
    );
  }

  const uncertainty = {
    summary: buildUncertaintySummary(severity, uncertaintyDrivers, input),
    drivers: uncertaintyDrivers,
    whatWouldReduceUncertainty: reduceUncertainty,
  };

  const pkg: IntelligenceV3Package = {
    kind: "hermes-intelligence-v3",
    mirrored: {
      confidenceScore,
      tradeReadinessScore,
      ...(tradeQualityScore !== undefined
        ? { tradeQualityScore }
        : {}),
    },
    headlineCaveat,
    severity,
    caveats: caveats.slice(0, MAX_CAVEATS),
    uncertainty,
    missingConfirmations: missingConfirmations.slice(0, MAX_MISSING),
    contextNotes: contextNotes.slice(0, MAX_NOTES),
    flags,
    deterministicKey: buildDeterministicKey(input),
    warnings: unique(warnings),
  };

  // Guardrail: strip accidental forbidden language (should not appear by construction).
  sanitizePackageLanguage(pkg);

  return pkg;
}

function finiteOrZero(n: number): number {
  return Number.isFinite(n) ? n : 0;
}

function mergeCaveats(parts: RuleContribution[]): MentorCaveat[] {
  const map = new Map<string, MentorCaveat>();
  for (const part of parts) {
    for (const c of part.caveats) {
      if (!map.has(c.id)) map.set(c.id, c);
    }
  }
  return [...map.values()].sort(compareCaveatSeverity);
}

function mergeMissing(parts: RuleContribution[]): MissingConfirmation[] {
  const map = new Map<string, MissingConfirmation>();
  for (const part of parts) {
    for (const m of part.missingConfirmations) {
      if (!map.has(m.id)) map.set(m.id, m);
    }
  }
  return [...map.values()].sort((a, b) => a.id.localeCompare(b.id));
}

function mergeNotes(parts: RuleContribution[]): ContextNote[] {
  const map = new Map<string, ContextNote>();
  for (const part of parts) {
    for (const n of part.contextNotes) {
      if (!map.has(n.id)) map.set(n.id, n);
    }
  }
  return [...map.values()].sort((a, b) => a.id.localeCompare(b.id));
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function resolveSeverity(caveats: MentorCaveat[]): IntelligenceV3Severity {
  if (caveats.length === 0) return "none";
  return severityFromCaveats(caveats.map((c) => c.severity));
}

function resolveHeadline(
  caveats: MentorCaveat[],
  severity: IntelligenceV3Severity,
  input: IntelligenceV3Input,
): string {
  if (caveats.length > 0) {
    // Prefer detail for data-quality cases (matches approved example wording).
    const top = caveats[0];
    if (
      top.id === "dq-fixture" ||
      top.id === "dq-delayed" ||
      top.id === "dq-unsupported-tf"
    ) {
      return top.detail;
    }
    if (top.id === "rd-high-conf-low-ready") {
      return top.detail;
    }
    return top.detail || top.title;
  }

  if (input.confidence.thesisSummary) {
    return `Thesis context: ${input.confidence.thesisSummary}`;
  }

  if (severity === "none") return DEFAULT_HEADLINE_NONE;
  return DEFAULT_HEADLINE_NONE;
}

function buildUncertaintySummary(
  severity: IntelligenceV3Severity,
  drivers: string[],
  input: IntelligenceV3Input,
): string {
  if (drivers.length === 0) {
    return "No major uncertainty drivers from data quality, readiness, or alignment context.";
  }
  const head =
    severity === "block-process"
      ? "Process caution: analysis context is incomplete or data-limited."
      : severity === "caution"
        ? "Interpret scores with caution given current context."
        : "Minor context notes affect how much trust to place in timing.";
  const conf = input.confidence.score;
  const ready = input.tradeReadiness.score;
  return `${head} Mirrored Confidence ${conf} and Trade Readiness ${ready} are unchanged. Drivers: ${drivers.slice(0, 4).join("; ")}.`;
}

function sanitizePackageLanguage(pkg: IntelligenceV3Package): void {
  const corpus = [
    pkg.headlineCaveat,
    pkg.uncertainty.summary,
    ...pkg.uncertainty.drivers,
    ...pkg.uncertainty.whatWouldReduceUncertainty,
    ...pkg.caveats.flatMap((c) => [c.title, c.detail, c.processGuidance]),
    ...pkg.missingConfirmations.flatMap((m) => [m.label, m.whyItMatters]),
    ...pkg.contextNotes.map((n) => n.text),
    ...pkg.warnings,
  ];
  const hits = assertNoForbiddenLanguage(corpus);
  if (hits.length > 0) {
    pkg.warnings.push(
      `Forbidden language scrubbed from construction path: ${hits.join(", ")}`,
    );
    // Soften headline if somehow contaminated (should not happen with fixed copy).
    if (findAny(pkg.headlineCaveat, hits)) {
      pkg.headlineCaveat = DEFAULT_HEADLINE_NONE;
    }
  }
}

function findAny(text: string, phrases: string[]): boolean {
  const lower = text.toLowerCase();
  return phrases.some((p) => lower.includes(p));
}
