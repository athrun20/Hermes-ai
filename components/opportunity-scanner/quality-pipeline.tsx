import type { QualityPipeline } from "@/lib/opportunity-scanner";
import { Panel } from "@/components/ui";

export function QualityPipeline({ pipeline }: { pipeline: QualityPipeline }) {
  const steps = [
    ["Hermes analyzed", `${pipeline.stocksAnalyzed} stocks`],
    ["Passed technical filters", String(pipeline.passedTechnicalFilters)],
    ["Showed institutional strength", String(pipeline.showedInstitutionalStrength)],
    ["Matched today's market", String(pipeline.matchedTodayMarket)],
    ["Match your Trader DNA", String(pipeline.matchedTraderDna)],
  ];

  return (
    <Panel>
      <div className="p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mint-300/75">
          Quality Pipeline
        </p>
        <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr_auto_1fr] lg:items-center">
          {steps.map(([label, value], index) => (
            <div className="contents" key={label}>
              <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
                <p className="text-xs text-slate-500">{label}</p>
                <p className="mt-2 text-xl font-semibold tracking-tight text-white">{value}</p>
              </div>
              {index < steps.length - 1 ? (
                <div className="hidden text-center text-lg font-semibold text-amberline/70 lg:block">
                  ↓
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}
