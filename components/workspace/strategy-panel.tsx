import { Target } from "lucide-react";
import type { StrategyIntelligenceResult } from "@/lib/strategy-types";
import { ProgressBar, StatusPill } from "@/components/ui";

export function StrategyPanel({ strategy }: { strategy: StrategyIntelligenceResult }) {
  const current = strategy.currentStrategy;

  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Target className="size-4 text-amberline" aria-hidden="true" />
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amberline/80">
              Current Strategy
            </p>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <p className="text-lg font-semibold tracking-tight text-white">{current.type}</p>
            <StatusPill tone={qualityTone(current.score)}>{current.quality}</StatusPill>
            <StatusPill tone={current.traderDnaFit === "Aligned" ? "mint" : current.traderDnaFit === "Poor Fit" ? "danger" : "muted"}>
              DNA {current.traderDnaFit}
            </StatusPill>
          </div>
        </div>
        <div className="min-w-[150px]">
          <div className="mb-1 flex items-center justify-between gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Strategy Score
            </span>
            <span className={current.score >= 70 ? "font-mono text-sm font-semibold text-mint-300" : current.score >= 52 ? "font-mono text-sm font-semibold text-amberline" : "font-mono text-sm font-semibold text-rose-300"}>
              {current.score}
            </span>
          </div>
          <ProgressBar value={current.score} tone={current.score >= 70 ? "mint" : current.score >= 52 ? "gold" : "danger"} />
        </div>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <div className="rounded-md border border-white/10 bg-surface-950/45 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Next Confirmation Needed
          </p>
          <p className="mt-2 text-xs leading-5 text-slate-300">{current.nextConfirmation}</p>
        </div>
        <div className="rounded-md border border-white/10 bg-surface-950/45 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Risk Notes
          </p>
          <p className="mt-2 text-xs leading-5 text-slate-300">{current.riskNotes[0]}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {current.whyItFits.slice(0, 4).map((reason) => (
          <span
            className="rounded-full border border-white/10 bg-white/[0.035] px-2.5 py-1 text-[11px] font-semibold text-slate-300"
            key={reason}
          >
            {reason}
          </span>
        ))}
      </div>
    </section>
  );
}

function qualityTone(score: number) {
  if (score >= 70) return "mint";
  if (score >= 52) return "gold";
  return "danger";
}
