import { Brain, CheckCircle2, CircleAlert, Gauge, TrendingDown, TrendingUp } from "lucide-react";
import type { AssetQuote, HermesAnalysis } from "@/lib/market-data";
import { Panel, PanelHeader } from "./ui";

export function HermesAiAnalysis({
  analysis,
  quote,
}: {
  analysis: HermesAnalysis;
  quote: AssetQuote;
}) {
  const bullish = analysis.bias === "Bullish";
  const bearish = analysis.bias === "Bearish";
  const BiasIcon = bullish ? TrendingUp : bearish ? TrendingDown : Gauge;
  const biasTone = bullish
    ? "text-mint-300"
    : bearish
      ? "text-rose-300"
      : "text-amberline";

  return (
    <Panel>
      <PanelHeader
        eyebrow="Hermes AI Analysis"
        title={`${quote.symbol} Market Read`}
        action={
          <span className="rounded-md border border-mint-300/20 bg-mint-300/10 px-2.5 py-1 text-xs font-semibold text-mint-300">
            {analysis.confidence}% confidence
          </span>
        }
      />
      <div className="space-y-4 p-5">
        <div className="rounded-lg border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-4">
          <div className="mb-3 flex items-center gap-2">
            <Brain className="size-5 text-mint-300" aria-hidden="true" />
            <p className="text-sm font-semibold text-white">Rule-based paper signal</p>
          </div>
          <div className="flex items-center gap-3">
            <BiasIcon className={`size-6 ${biasTone}`} aria-hidden="true" />
            <div>
              <p className="text-xs text-slate-500">Market Bias</p>
              <p className={`text-xl font-semibold ${biasTone}`}>{analysis.bias}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 text-center">
          {[
            ["Trend", analysis.trend],
            ["Volatility", analysis.volatility],
            ["Risk", analysis.riskLevel],
          ].map(([label, value]) => (
            <div className="rounded-md border border-white/10 bg-white/[0.035] p-3" key={label}>
              <p className="text-xs text-slate-500">{label}</p>
              <p className="mt-1 text-xs font-semibold leading-4 text-slate-100">{value}</p>
            </div>
          ))}
        </div>

        <div className="space-y-3 text-sm">
          {analysis.reasons.map((reason, index) => {
            const Icon = index === 2 ? CircleAlert : CheckCircle2;
            return (
              <div className="flex items-start gap-3 rounded-md bg-white/[0.025] px-3 py-2.5" key={reason}>
                <Icon
                  className={`mt-0.5 size-4 shrink-0 ${index === 2 ? "text-amberline" : "text-mint-300"}`}
                  aria-hidden="true"
                />
                <p className="leading-5 text-slate-300">{reason}</p>
              </div>
            );
          })}
        </div>

        <div className="rounded-lg border border-amberline/20 bg-amberline/10 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-amberline">Suggested action</p>
          <p className="mt-1 text-base font-semibold text-white">
            {analysis.suggestedAction}
          </p>
        </div>
      </div>
    </Panel>
  );
}
