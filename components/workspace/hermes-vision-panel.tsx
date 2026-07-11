"use client";

import { useState } from "react";
import type { HermesVisionResult } from "@/lib/hermes-vision-types";
import { ProgressBar, StatusPill } from "@/components/ui";
import { HermesScoreBreakdown } from "@/components/hermes-score-breakdown";
import type { HermesScoreResult } from "@/lib/hermes-score-types";
import type { StrategyIntelligenceResult } from "@/lib/strategy-types";
import { StrategyPanel } from "@/components/workspace/strategy-panel";
import type { MultiTimeframeIntelligence } from "@/lib/multi-timeframe-types";
import { TimeframeAlignmentMatrix } from "@/components/workspace/timeframe-alignment-matrix";
import type { InstitutionalFootprintResult } from "@/lib/footprint-types";
import { FootprintPanel } from "@/components/workspace/footprint-panel";
import type { ReasoningResult } from "@/lib/reasoning-types";
import type { TradeQualityResult } from "@/lib/trade-quality-types";
import { buildDecisionHeaderView, type DecisionHeaderState } from "@/lib/decision-header-adapter";

export function HermesVisionPanel({
  vision,
  hermesScore,
  strategy,
  multiTimeframe,
  footprint,
  reasoning,
  tradeQuality,
}: {
  vision: HermesVisionResult;
  hermesScore: HermesScoreResult;
  strategy: StrategyIntelligenceResult;
  multiTimeframe: MultiTimeframeIntelligence;
  footprint: InstitutionalFootprintResult;
  reasoning?: ReasoningResult;
  tradeQuality?: TradeQualityResult;
}) {
  const [expanded, setExpanded] = useState(false);
  const header = buildDecisionHeaderView({ reasoning, vision, strategy, tradeQuality });

  return (
    <section className="space-y-3">
      <div className="rounded-lg border border-white/10 bg-surface-950/60 p-4 shadow-inner shadow-black/10">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-center">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill tone={getDecisionTone(header.decisionState)}>{header.decisionState}</StatusPill>
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                {header.marketState}
              </span>
              <span className={getBiasText(header.bias)}>{header.bias}</span>
            </div>
            <p className="mt-3 text-sm font-semibold leading-6 text-white md:text-[15px]">
              {header.opinion}
            </p>
            <div className="mt-3 grid gap-2 text-xs leading-5 text-slate-400 lg:grid-cols-2">
              <p>
                <span className="font-semibold text-slate-300">Primary blocker: </span>
                {header.primaryBlocker}
              </p>
              <p>
                <span className="font-semibold text-slate-300">Next action: </span>
                {header.nextAction}
              </p>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-1">
            <DecisionMetric label="Confidence" value={header.confidence} />
            <DecisionMetric label="Readiness" value={header.readiness} />
            <DecisionMetric label="Trade Quality" value={header.tradeQuality} />
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-white/10 bg-surface-950/45 p-3">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amberline/80">
              Supporting Read
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Secondary evidence stays below the primary decision.
            </p>
          </div>
          <button
            className="rounded-md border border-white/10 bg-white/[0.035] px-2.5 py-1 text-xs font-semibold text-slate-300 transition hover:text-white"
            onClick={() => setExpanded((current) => !current)}
            type="button"
          >
            {expanded ? "Hide detailed evidence" : "Why Hermes thinks this"}
          </button>
        </div>

        <div className="mt-3 grid gap-3 2xl:grid-cols-3">
          <StrategyPanel strategy={strategy} />
          <TimeframeAlignmentMatrix intelligence={multiTimeframe} />
          <FootprintPanel footprint={footprint} />
        </div>

        {expanded ? (
          <div className="mt-3 space-y-3">
            <HermesScoreBreakdown score={hermesScore} />
            <div className="grid gap-2 lg:grid-cols-2 2xl:grid-cols-3">
              {vision.dimensions.map((dimension) => (
                <ScoreRead
                  key={dimension.dimension}
                  label={dimension.dimension}
                  score={dimension.score}
                  verdict={dimension.verdict}
                  reason={dimension.reasons[0]}
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function DecisionMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
        <span className={`font-mono text-base font-semibold ${scoreText(value)}`}>{value}</span>
      </div>
      <div className="mt-2">
        <ProgressBar value={value} tone={value >= 72 ? "mint" : value >= 50 ? "gold" : "danger"} />
      </div>
    </div>
  );
}

function ScoreRead({
  label,
  score,
  verdict,
  reason,
}: {
  label: string;
  score: number;
  verdict: string;
  reason?: string;
}) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.03] px-3 py-2">
      <div className="flex items-center gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          {label}
        </p>
        <div className="min-w-0 flex-1">
          <ProgressBar value={score} tone={score >= 70 ? "mint" : score >= 50 ? "gold" : "danger"} />
        </div>
        <span className={`rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums ${scoreTone(score)}`}>
          {score}
        </span>
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-2">
        <p className={`text-[11px] font-semibold ${scoreText(score)}`}>{verdict}</p>
        {reason ? (
          <p className="max-w-[70%] truncate text-right text-[11px] text-slate-500" title={reason}>
            {reason}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function scoreTone(score: number) {
  if (score >= 70) return "bg-mint-300/12 text-mint-200";
  if (score >= 50) return "bg-amberline/12 text-amber-100";
  return "bg-rose-400/12 text-rose-200";
}

function scoreText(score: number) {
  if (score >= 70) return "text-mint-300";
  if (score >= 50) return "text-amberline";
  return "text-rose-300";
}

function getDecisionTone(state: DecisionHeaderState) {
  if (state === "High-Quality Setup" || state === "Prepare") return "mint";
  if (state === "Ready With Caution" || state === "Wait for Confirmation") return "gold";
  if (state === "Avoid") return "danger";
  return "muted";
}

function getBiasText(bias: "Bullish" | "Bearish" | "Neutral") {
  if (bias === "Bullish") return "text-xs font-semibold text-mint-300";
  if (bias === "Bearish") return "text-xs font-semibold text-rose-300";
  return "text-xs font-semibold text-slate-300";
}
