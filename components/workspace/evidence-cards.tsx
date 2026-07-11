"use client";

import { useState, type ReactNode } from "react";
import { ProgressBar } from "@/components/ui";
import type { InstitutionalFootprintResult } from "@/lib/footprint-types";
import type { MultiTimeframeIntelligence } from "@/lib/multi-timeframe-types";
import type { StrategyIntelligenceResult } from "@/lib/strategy-types";
import { StrategyPanel } from "@/components/workspace/strategy-panel";
import { TimeframeAlignmentMatrix } from "@/components/workspace/timeframe-alignment-matrix";
import { FootprintPanel } from "@/components/workspace/footprint-panel";

export function EvidenceStrip({
  strategy,
  multiTimeframe,
  footprint,
}: {
  strategy: StrategyIntelligenceResult;
  multiTimeframe: MultiTimeframeIntelligence;
  footprint: InstitutionalFootprintResult;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const current = strategy.currentStrategy;
  const strategyTakeaway = current.whyItFits[0] ?? current.nextConfirmation;
  const mtfTakeaway = multiTimeframe.countertrendWarning
    ? multiTimeframe.countertrendWarning
    : multiTimeframe.mentorSummary;
  const footprintTakeaway = footprint.riskNote || footprint.explanation;

  return (
    <section aria-label="Hermes evidence" className="space-y-2">
      <div className="flex items-center justify-between gap-2 px-0.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Evidence
        </p>
        <p className="text-[10px] text-slate-600">State · strength · one takeaway</p>
      </div>

      <div className="grid gap-2 md:grid-cols-3">
        <EvidenceCard
          title="Strategy"
          state={current.type}
          indicatorLabel="Fit"
          indicatorValue={current.score}
          takeaway={strategyTakeaway}
          expanded={expandedId === "strategy"}
          onToggle={() => setExpandedId((id) => (id === "strategy" ? null : "strategy"))}
        >
          <StrategyPanel strategy={strategy} />
        </EvidenceCard>

        <EvidenceCard
          title="Multi-Timeframe"
          state={multiTimeframe.status}
          indicatorLabel="Align"
          indicatorValue={multiTimeframe.alignmentScore}
          takeaway={mtfTakeaway}
          expanded={expandedId === "mtf"}
          onToggle={() => setExpandedId((id) => (id === "mtf" ? null : "mtf"))}
        >
          <TimeframeAlignmentMatrix intelligence={multiTimeframe} />
        </EvidenceCard>

        <EvidenceCard
          title="Institutional"
          state={footprint.type}
          indicatorLabel="Conf."
          indicatorValue={footprint.confidence}
          takeaway={footprintTakeaway}
          expanded={expandedId === "footprint"}
          onToggle={() => setExpandedId((id) => (id === "footprint" ? null : "footprint"))}
        >
          <FootprintPanel footprint={footprint} />
        </EvidenceCard>
      </div>
    </section>
  );
}

function EvidenceCard({
  title,
  state,
  indicatorLabel,
  indicatorValue,
  takeaway,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  state: string;
  indicatorLabel: string;
  indicatorValue: number;
  takeaway: string;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <article className="rounded-lg border border-white/10 bg-surface-950/55 px-3 py-2.5 shadow-inner shadow-black/10">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{title}</p>
          <p className="mt-1 truncate text-sm font-semibold leading-5 text-white" title={state}>
            {state}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            {indicatorLabel}
          </p>
          <p className={`mt-0.5 font-mono text-sm font-semibold tabular-nums ${scoreText(indicatorValue)}`}>
            {indicatorValue}
          </p>
        </div>
      </div>

      <div className="mt-2">
        <ProgressBar
          value={indicatorValue}
          tone={indicatorValue >= 72 ? "mint" : indicatorValue >= 50 ? "gold" : "danger"}
        />
      </div>

      <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-400" title={takeaway}>
        {takeaway}
      </p>

      <button
        className="mt-2 text-[11px] font-semibold text-slate-500 transition hover:text-white"
        onClick={onToggle}
        type="button"
      >
        {expanded ? "Hide detail" : "Expand"}
      </button>

      {expanded ? (
        <div className="hermes-fade-in mt-2 border-t border-white/10 pt-2 [&_section]:border-0 [&_section]:bg-transparent [&_section]:p-0">
          {children}
        </div>
      ) : null}
    </article>
  );
}

function scoreText(score: number) {
  if (score >= 70) return "text-mint-300";
  if (score >= 50) return "text-amberline";
  return "text-rose-300";
}
