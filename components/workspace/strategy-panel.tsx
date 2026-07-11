import type { StrategyIntelligenceResult } from "@/lib/strategy-types";
import { StatusPill } from "@/components/ui";

export function StrategyPanel({ strategy }: { strategy: StrategyIntelligenceResult }) {
  const current = strategy.currentStrategy;

  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amberline/80">
            Current Strategy
          </p>
          <p className="mt-2 text-base font-semibold tracking-tight text-white">{current.type}</p>
        </div>
        <StatusPill tone={qualityTone(current.score)}>Fit: {current.quality}</StatusPill>
      </div>

      <div className="mt-3 space-y-2 text-xs leading-5 text-slate-400">
        <p>
          <span className="font-semibold text-slate-300">Why: </span>
          {current.whyItFits[0] ?? "Hermes is still collecting strategy evidence."}
        </p>
        <p>
          <span className="font-semibold text-slate-300">Confirmation: </span>
          {current.nextConfirmation}
        </p>
        <p>
          <span className="font-semibold text-slate-300">Risk: </span>
          {current.riskNotes[0] ?? "Risk remains dependent on confirmation."}
        </p>
      </div>
    </section>
  );
}

function qualityTone(score: number) {
  if (score >= 70) return "mint";
  if (score >= 52) return "gold";
  return "danger";
}
