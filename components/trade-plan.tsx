import { BadgeCheck, Target } from "lucide-react";
import {
  formatCurrency,
  type AssetQuote,
  type HermesAnalysis,
} from "@/lib/market-data";
import { Panel, PanelHeader } from "./ui";

export function TradePlan({
  analysis,
  quote,
}: {
  analysis: HermesAnalysis;
  quote: AssetQuote;
}) {
  const longBias = analysis.bias !== "Bearish";
  const entry = quote.price;
  const stop = longBias ? quote.price * 0.985 : quote.price * 1.015;
  const target = longBias ? quote.price * 1.035 : quote.price * 0.965;
  const levels = [
    { label: "Entry", value: formatCurrency(entry), tone: "text-slate-100" },
    { label: "Stop-loss", value: formatCurrency(stop), tone: "text-rose-300" },
    { label: "Target", value: formatCurrency(target), tone: "text-mint-300" },
  ];

  return (
    <Panel>
      <PanelHeader
        eyebrow="Trade Plan"
        title={`${quote.symbol} Paper Setup`}
        action={<Target className="size-5 text-amberline" aria-hidden="true" />}
      />
      <div className="space-y-3 p-5">
        {levels.map((level) => (
          <div
            className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.035] p-4 shadow-insetPanel"
            key={level.label}
          >
            <p className="text-sm text-slate-400">{level.label}</p>
            <p className={`text-lg font-semibold ${level.tone}`}>{level.value}</p>
          </div>
        ))}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-md border border-white/10 bg-surface-950/45 p-3">
            <p className="text-slate-500">Reward/risk</p>
            <p className="mt-1 font-semibold text-mint-300">2.3R</p>
          </div>
          <div className="rounded-md border border-white/10 bg-surface-950/45 p-3">
            <p className="text-slate-500">Position bias</p>
            <p className="mt-1 font-semibold text-slate-100">
              {longBias ? "Long" : "Short watch"}
            </p>
          </div>
        </div>
        <div className="rounded-lg border border-amberline/20 bg-amberline/10 p-4 text-sm leading-6 text-amber-100">
          <div className="mb-2 flex items-center gap-2 font-semibold text-amberline">
            <BadgeCheck className="size-4" aria-hidden="true" />
            Confirmation rule
          </div>
          Suggested action: {analysis.suggestedAction}. This is a paper-only plan
          and Hermes never places live orders.
        </div>
      </div>
    </Panel>
  );
}
