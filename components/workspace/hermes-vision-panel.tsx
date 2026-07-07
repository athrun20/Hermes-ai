import type { HermesVisionResult } from "@/lib/hermes-vision-types";
import { ProgressBar, StatusPill } from "@/components/ui";

export function HermesVisionPanel({ vision }: { vision: HermesVisionResult }) {
  return (
    <section className="rounded-lg border border-white/10 bg-surface-950/55 p-4 shadow-inner shadow-black/10">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div className="max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amberline/80">
            Hermes Vision
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            {vision.primaryInsight}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <ImpactPill value={vision.confidenceAdjustment} />
          <StatusPill tone={getActionTone(vision.suggestedAction)}>
            {vision.suggestedAction}
          </StatusPill>
        </div>
      </div>

      <div className="mt-4 grid gap-2.5 lg:grid-cols-3">
        <ScoreRead label="Structure" score={vision.setupStructureScore} />
        <ScoreRead label="Risk" score={vision.riskScore} />
        <ScoreRead label="Confirmation" score={vision.confirmationScore} />
      </div>
    </section>
  );
}

function ScoreRead({ label, score }: { label: string; score: number }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          {label}
        </p>
        <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${scoreTone(score)}`}>
          {score}
        </span>
      </div>
      <ProgressBar value={score} tone={score >= 70 ? "mint" : score >= 50 ? "gold" : "danger"} />
    </div>
  );
}

function ImpactPill({ value }: { value: number }) {
  const positive = value > 0;
  const neutral = value === 0;
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold ${
        neutral
          ? "border-white/10 bg-white/[0.035] text-slate-300"
          : positive
            ? "border-mint-300/20 bg-mint-300/10 text-mint-200"
            : "border-rose-300/20 bg-rose-400/10 text-rose-200"
      }`}
    >
      Confidence Impact: {positive ? "+" : ""}
      {value}
    </span>
  );
}

function scoreTone(score: number) {
  if (score >= 70) return "bg-mint-300/12 text-mint-200";
  if (score >= 50) return "bg-amberline/12 text-amber-100";
  return "bg-rose-400/12 text-rose-200";
}

function getActionTone(action: HermesVisionResult["suggestedAction"]) {
  if (action === "Ready for Decision Review" || action === "Study Setup") return "mint";
  if (action === "Observe Only") return "muted";
  if (action === "Improve Risk/Reward" || action === "Move Stop Below Support") return "danger";
  return "gold";
}
