import type { MultiTimeframeIntelligence, TimeframeAnalysis } from "@/lib/multi-timeframe-types";
import { ProgressBar, StatusPill } from "@/components/ui";

export function TimeframeAlignmentMatrix({
  intelligence,
}: {
  intelligence: MultiTimeframeIntelligence;
}) {
  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-mint-300/80">
            Multi-Timeframe Intelligence
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-400">{intelligence.mentorSummary}</p>
        </div>
        <div className="min-w-[170px]">
          <div className="mb-1 flex items-center justify-between gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Alignment
            </span>
            <span className={scoreText(intelligence.alignmentScore)}>
              {intelligence.alignmentScore}/100
            </span>
          </div>
          <ProgressBar value={intelligence.alignmentScore} tone={intelligence.alignmentScore >= 72 ? "mint" : intelligence.alignmentScore >= 50 ? "gold" : "danger"} />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <StatusPill tone={statusTone(intelligence.alignmentScore)}>{intelligence.status}</StatusPill>
        <StatusPill tone={intelligence.alignmentImpact >= 0 ? "mint" : "danger"}>
          Alignment Impact: {intelligence.alignmentImpact >= 0 ? "+" : ""}
          {intelligence.alignmentImpact}
        </StatusPill>
        <StatusPill tone="muted">HTF {intelligence.higherTimeframeDirection}</StatusPill>
      </div>

      <div className="mt-3 grid gap-1.5">
        {intelligence.rows.map((row) => (
          <TimeframeRow
            active={row.timeframe === intelligence.activeTimeframe}
            key={row.timeframe}
            row={row}
          />
        ))}
      </div>
    </section>
  );
}

function TimeframeRow({
  row,
  active,
}: {
  row: TimeframeAnalysis;
  active: boolean;
}) {
  return (
    <div
      className={`grid grid-cols-[42px_minmax(0,1fr)_42px] items-center gap-2 rounded-md border px-2.5 py-2 text-xs ${
        active ? "border-amberline/30 bg-amberline/[0.08]" : "border-white/10 bg-surface-950/35"
      }`}
    >
      <span className={active ? "font-semibold text-amberline" : "font-semibold text-slate-400"}>
        {row.timeframe}
      </span>
      <div className="min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className={directionText(row.direction)}>{row.direction}</span>
          <span className="truncate text-[10px] text-slate-500">{row.supportResistanceContext}</span>
        </div>
        <div className="mt-1">
          <ProgressBar value={row.score} tone={row.score >= 72 ? "mint" : row.score >= 50 ? "gold" : "danger"} />
        </div>
      </div>
      <span className={`text-right font-mono font-semibold ${scoreText(row.score)}`}>{row.score}</span>
    </div>
  );
}

function scoreText(score: number) {
  if (score >= 72) return "text-mint-300";
  if (score >= 50) return "text-amberline";
  return "text-rose-300";
}

function directionText(direction: TimeframeAnalysis["direction"]) {
  if (direction.includes("Bullish")) return "font-semibold text-mint-300";
  if (direction.includes("Bearish")) return "font-semibold text-rose-300";
  return "font-semibold text-slate-300";
}

function statusTone(score: number) {
  if (score >= 72) return "mint";
  if (score >= 50) return "gold";
  return "danger";
}
