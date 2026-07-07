import type { ChartIntelligenceResult } from "@/lib/chart-intelligence-types";
import { StatusPill } from "@/components/ui";

export function ChartIntelligencePanel({
  intelligence,
}: {
  intelligence: ChartIntelligenceResult;
}) {
  return (
    <section className="rounded-lg border border-white/10 bg-surface-950/55 p-4 shadow-inner shadow-black/10">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amberline/80">
            Hermes Chart Intelligence
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            {intelligence.currentInsight}
          </p>
        </div>
        <StatusPill tone={getActionTone(intelligence.suggestedAction)}>
          {intelligence.suggestedAction}
        </StatusPill>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <MiniRead
          label="Structure"
          value={intelligence.structureQuality}
          tone={qualityTone(intelligence.structureQuality)}
        />
        <MiniRead
          label="Risk"
          value={intelligence.riskQuality}
          tone={riskTone(intelligence.riskQuality)}
        />
        <MiniRead
          label="Confirmation"
          value={intelligence.confirmationStatus}
          tone={confirmationTone(intelligence.confirmationStatus)}
        />
      </div>
    </section>
  );
}

function MiniRead({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </p>
      <p className={`mt-1 text-sm font-semibold ${tone}`}>{value}</p>
    </div>
  );
}

function getActionTone(action: ChartIntelligenceResult["suggestedAction"]) {
  if (action === "Ready for Decision Review" || action === "Study Setup") return "mint";
  if (action === "Observe Only") return "muted";
  if (action === "Move Stop Below Support" || action === "Improve Risk/Reward") return "danger";
  return "gold";
}

function qualityTone(value: ChartIntelligenceResult["structureQuality"]) {
  if (value === "Strong") return "text-mint-300";
  if (value === "Developing") return "text-amberline";
  return "text-rose-300";
}

function riskTone(value: ChartIntelligenceResult["riskQuality"]) {
  if (value === "Strong" || value === "Acceptable") return "text-mint-300";
  if (value === "Undefined") return "text-slate-400";
  return "text-rose-300";
}

function confirmationTone(value: ChartIntelligenceResult["confirmationStatus"]) {
  if (value === "Confirmed") return "text-mint-300";
  if (value === "Developing") return "text-amberline";
  return "text-rose-300";
}
