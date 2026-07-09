import type { HermesScoreResult } from "@/lib/hermes-score-types";
import { ProgressBar, StatusPill } from "@/components/ui";

export function HermesScoreBreakdown({ score }: { score: HermesScoreResult }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amberline/80">
            Hermes Score
          </p>
          <p className="mt-1 text-2xl font-semibold leading-none tracking-tight text-white">
            {score.score}
          </p>
        </div>
        <StatusPill tone={score.score >= 80 ? "mint" : score.score >= 60 ? "gold" : "danger"}>
          {score.label}
        </StatusPill>
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-400">{score.explanation}</p>
      <div className="mt-3 space-y-2">
        {score.breakdown.map((item) => (
          <div className="rounded-md border border-white/10 bg-surface-950/45 p-2.5" key={item.category}>
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-xs font-semibold text-slate-300">{item.category}</p>
              <span className="font-mono text-xs font-semibold tabular-nums text-white">{item.score}</span>
            </div>
            <ProgressBar value={item.score} tone={item.score >= 75 ? "mint" : item.score >= 55 ? "gold" : "danger"} />
            <div className="mt-2 flex items-start justify-between gap-3">
              <p className={item.score >= 75 ? "text-xs font-semibold text-mint-300" : item.score >= 55 ? "text-xs font-semibold text-amberline" : "text-xs font-semibold text-rose-300"}>
                {item.status}
              </p>
              <p className="max-w-[72%] text-right text-[11px] leading-4 text-slate-500">{item.reason}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
