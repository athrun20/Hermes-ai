/**
 * Data-quality → mentor caveats (Phase 0).
 * Does not gate paper trading — that remains paper-trading-market-authority.
 */

import type {
  IntelligenceV3Input,
  RuleContribution,
} from "@/lib/intelligence-v3/types";

export function contributeDataQuality(
  input: IntelligenceV3Input,
): RuleContribution {
  const empty: RuleContribution = {
    caveats: [],
    missingConfirmations: [],
    contextNotes: [],
    uncertaintyDrivers: [],
    reduceUncertainty: [],
    warnings: [],
  };

  const dq = input.dataQuality;
  if (!dq) {
    return {
      ...empty,
      warnings: [
        "WorkspaceDataQuality missing — data-honesty caveats degraded.",
      ],
    };
  }

  const out: RuleContribution = {
    caveats: [],
    missingConfirmations: [],
    contextNotes: [],
    uncertaintyDrivers: [],
    reduceUncertainty: [],
    warnings: [],
  };

  if (dq.timeframeUnsupported || dq.statusLabel === "Unsupported") {
    out.caveats.push({
      id: "dq-unsupported-tf",
      category: "timeframe",
      severity: "block-process",
      title: "Timeframe needs additional confirmation",
      detail:
        "This timeframe requires additional confirmation before relying on the analysis.",
      processGuidance:
        "Switch to a supported series timeframe or treat the current read as incomplete process context—not as a live-validated mark.",
    });
    out.missingConfirmations.push({
      id: "mc-supported-series",
      label: "Supported market series for this timeframe",
      whyItMatters:
        "Without a supported series, structure and readiness reads rest on incomplete tape context.",
      relatedMetric: "data",
    });
    out.contextNotes.push({
      id: "cn-unsupported-tf",
      kind: "unsupported-tf",
      text: `Timeframe ${input.timeframe} is marked unsupported for live fine series in Phase 1 policy.`,
    });
    out.uncertaintyDrivers.push("Unsupported timeframe for live series");
    out.reduceUncertainty.push(
      "Use 1H, 4H, 1D, or 1W when live crypto is enabled, or stay in fixture practice mode",
    );
    return out;
  }

  if (dq.isUnavailable || dq.quality === "Unavailable") {
    out.caveats.push({
      id: "dq-unavailable",
      category: "data-quality",
      severity: "block-process",
      title: "Market data unavailable",
      detail:
        "No valid market series is available for this selection — treat analytical scores as incomplete context.",
      processGuidance:
        "Restore fixture or delayed/live marks before relying on thesis, readiness, or plan quality as actionable process signals.",
    });
    out.missingConfirmations.push({
      id: "mc-valid-mark",
      label: "Valid mark price and candle series",
      whyItMatters:
        "Confidence and readiness describe interpretation of a series that is currently unavailable.",
      relatedMetric: "data",
    });
    out.contextNotes.push({
      id: "cn-unavailable",
      kind: "unavailable",
      text: dq.summary || "Market data quality is Unavailable.",
    });
    out.uncertaintyDrivers.push("Unavailable market data");
    out.reduceUncertainty.push(
      "Wait for a fixture catalog load or a valid delayed/live quote and series",
    );
    return out;
  }

  if (dq.isFixture || dq.quality === "Fixture") {
    out.caveats.push({
      id: "dq-fixture",
      category: "data-quality",
      severity: "info",
      title: "Practice fixtures",
      detail:
        "Practice fixtures — treat levels as teaching context, not live market marks.",
      processGuidance:
        "Use scores to practice process (thesis vs readiness vs plan quality). Do not treat fixture marks as exchange reality.",
    });
    out.contextNotes.push({
      id: "cn-fixture",
      kind: "fixture",
      text: "Source is deterministic teaching fixtures — never labeled Live.",
    });
    out.uncertaintyDrivers.push("Fixture (non-live) market data");
    out.reduceUncertainty.push(
      "Enable live market data only when ready to interpret delayed public feeds with extra caution",
    );
    return out;
  }

  if (dq.isDelayed || dq.quality === "Delayed") {
    out.caveats.push({
      id: "dq-delayed",
      category: "data-quality",
      severity: "caution",
      title: "Delayed public data",
      detail:
        "Delayed public data — interpretation should account for feed limitations.",
      processGuidance:
        "Keep thesis strength separate from timing. Delayed marks are not exchange real-time microstructure.",
    });
    out.contextNotes.push({
      id: "cn-delayed",
      kind: "delayed",
      text: `${dq.sourceLabel || "Public feed"} reports delayed-capable data — not exchange-grade live.`,
    });
    out.uncertaintyDrivers.push("Delayed public market aggregator");
    out.reduceUncertainty.push(
      "Allow for delay when judging freshness of breaks, levels, and readiness",
    );
    return out;
  }

  if (dq.isLive || dq.quality === "Live") {
    out.contextNotes.push({
      id: "cn-live",
      kind: "live",
      text: "Feed meets live-quality labeling for this series (still not a guarantee of outcome).",
    });
    return out;
  }

  if (dq.isStale || dq.quality === "Stale") {
    out.caveats.push({
      id: "dq-stale",
      category: "data-quality",
      severity: "caution",
      title: "Stale market data",
      detail:
        "Cached or aged market data — treat freshness of the thesis and readiness with extra caution.",
      processGuidance:
        "Re-check the series before treating readiness as actionable process.",
    });
    out.contextNotes.push({
      id: "cn-stale",
      kind: "stale",
      text: dq.summary || "Data quality is Stale.",
    });
    out.uncertaintyDrivers.push("Stale market data");
    out.reduceUncertainty.push("Refresh quotes/candles until quality is Delayed or better");
    return out;
  }

  if (dq.isPartial || dq.quality === "Partial") {
    out.caveats.push({
      id: "dq-partial",
      category: "data-quality",
      severity: "caution",
      title: "Partial market data",
      detail: "Some market fields are incomplete — analysis context is partial.",
      processGuidance:
        "Avoid over-reading volume or fine structure when fields are missing.",
    });
    out.contextNotes.push({
      id: "cn-partial",
      kind: "partial",
      text: dq.summary || "Data quality is Partial.",
    });
    out.uncertaintyDrivers.push("Partial market fields");
    out.reduceUncertainty.push("Prefer series with complete OHLCV when available");
  }

  return out;
}
