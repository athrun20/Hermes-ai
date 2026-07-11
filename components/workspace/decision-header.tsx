"use client";

import { ProgressBar, StatusPill } from "@/components/ui";
import {
  buildDecisionHeaderView,
  type DecisionHeaderState,
  type DecisionHeaderViewModel,
} from "@/lib/decision-header-adapter";
import type { HermesVisionResult } from "@/lib/hermes-vision-types";
import type { ReasoningResult } from "@/lib/reasoning-types";
import type { StrategyIntelligenceResult } from "@/lib/strategy-types";
import type { TradeQualityResult } from "@/lib/trade-quality-types";

export function DecisionHeader({
  vision,
  strategy,
  reasoning,
  tradeQuality,
}: {
  vision: HermesVisionResult;
  strategy: StrategyIntelligenceResult;
  reasoning?: ReasoningResult;
  tradeQuality?: TradeQualityResult;
}) {
  const header = buildDecisionHeaderView({ reasoning, vision, strategy, tradeQuality });
  return <DecisionHeaderView header={header} />;
}

export function DecisionHeaderView({ header }: { header: DecisionHeaderViewModel }) {
  const microLine =
    header.readiness < 66
      ? `Blocker: ${header.primaryBlocker}`
      : `Next: ${header.nextAction}`;

  return (
    <section
      aria-label="Hermes decision"
      className="rounded-xl border border-white/10 bg-surface-950/65 px-3 py-2.5 shadow-inner shadow-black/15 sm:px-3.5 sm:py-3"
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <StatusPill tone={getDecisionTone(header.decisionState)}>{header.decisionState}</StatusPill>
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          {header.marketState}
        </span>
        <span className={getBiasText(header.bias)}>{header.bias}</span>
      </div>

      <p className="mt-1.5 line-clamp-2 text-sm font-semibold leading-5 text-white">
        {header.opinion}
      </p>

      <p className="mt-1 line-clamp-1 text-xs leading-5 text-slate-500" title={microLine}>
        {microLine}
      </p>

      <div className="mt-2.5 grid grid-cols-3 gap-1.5 sm:gap-2">
        <PrimaryMetric label="Confidence" value={header.confidence} />
        <PrimaryMetric label="Readiness" value={header.readiness} />
        <PrimaryMetric label="Trade Quality" value={header.tradeQuality} />
      </div>
    </section>
  );
}

function PrimaryMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1.5 sm:px-2.5 sm:py-2">
      <div className="flex items-center justify-between gap-1">
        <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-slate-500 sm:text-[10px]">
          {label}
        </p>
        <span className={`font-mono text-xs font-semibold tabular-nums sm:text-sm ${scoreText(value)}`}>
          {value}
        </span>
      </div>
      <div className="mt-1">
        <ProgressBar value={value} tone={value >= 72 ? "mint" : value >= 50 ? "gold" : "danger"} />
      </div>
    </div>
  );
}

function getDecisionTone(state: DecisionHeaderState) {
  if (state === "High-Quality Setup" || state === "Prepare") return "mint";
  if (state === "Ready With Caution" || state === "Wait for Confirmation") return "gold";
  if (state === "Avoid") return "danger";
  return "muted";
}

function getBiasText(bias: DecisionHeaderViewModel["bias"]) {
  if (bias === "Bullish") return "text-xs font-semibold text-mint-300";
  if (bias === "Bearish") return "text-xs font-semibold text-rose-300";
  return "text-xs font-semibold text-slate-400";
}

function scoreText(score: number) {
  if (score >= 70) return "text-mint-300";
  if (score >= 50) return "text-amberline";
  return "text-rose-300";
}
