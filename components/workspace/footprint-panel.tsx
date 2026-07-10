import { Landmark } from "lucide-react";
import type { InstitutionalFootprintResult } from "@/lib/footprint-types";
import { ProgressBar, StatusPill } from "@/components/ui";

export function FootprintPanel({ footprint }: { footprint: InstitutionalFootprintResult }) {
  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Landmark className="size-4 text-amberline" aria-hidden="true" />
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amberline/80">
              Institutional Footprint
            </p>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <p className="text-lg font-semibold tracking-tight text-white">{footprint.type}</p>
            <StatusPill tone={directionTone(footprint.direction)}>{footprint.direction}</StatusPill>
            <StatusPill tone={footprint.confidence >= 78 ? "mint" : footprint.confidence >= 56 ? "gold" : "muted"}>
              {footprint.strength}
            </StatusPill>
          </div>
        </div>
        <div className="min-w-[150px]">
          <div className="mb-1 flex items-center justify-between gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Confidence
            </span>
            <span className={scoreText(footprint.confidence)}>{footprint.confidence}</span>
          </div>
          <ProgressBar value={footprint.confidence} tone={footprint.confidence >= 78 ? "mint" : footprint.confidence >= 56 ? "gold" : "muted"} />
        </div>
      </div>

      <p className="mt-3 text-xs leading-5 text-slate-300">{footprint.explanation}</p>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <div className="rounded-md border border-white/10 bg-surface-950/45 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Confirmation Needed
          </p>
          <p className="mt-2 text-xs leading-5 text-slate-300">{footprint.confirmationNeeded}</p>
        </div>
        <div className="rounded-md border border-white/10 bg-surface-950/45 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Risk Note
          </p>
          <p className="mt-2 text-xs leading-5 text-slate-300">{footprint.riskNote}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {footprint.evidence.slice(0, 4).map((item) => (
          <span className="rounded-full border border-white/10 bg-white/[0.035] px-2.5 py-1 text-[11px] font-semibold text-slate-300" key={item}>
            {item}
          </span>
        ))}
      </div>
    </section>
  );
}

function directionTone(direction: InstitutionalFootprintResult["direction"]) {
  if (direction === "Bullish") return "mint";
  if (direction === "Bearish") return "danger";
  return "muted";
}

function scoreText(score: number) {
  if (score >= 78) return "font-mono text-sm font-semibold text-mint-300";
  if (score >= 56) return "font-mono text-sm font-semibold text-amberline";
  return "font-mono text-sm font-semibold text-slate-400";
}
