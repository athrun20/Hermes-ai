"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Minimize2 } from "lucide-react";
import { formatCurrency } from "@/lib/market-data";
import type { SymbolAnalysis } from "@/lib/symbol-analysis-engine";
import { InsightCard, MetricCard, Panel, StatusPill } from "@/components/ui";

type DockMode = "compact" | "expanded" | "collapsed";

export function FloatingAnalysis({ analysis }: { analysis: SymbolAnalysis }) {
  const [mode, setMode] = useState<DockMode>("compact");

  if (mode === "collapsed") {
    return (
      <button
        className="w-full rounded-lg border border-white/10 bg-surface-950/55 px-3.5 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-mint-300 transition hover:border-mint-300/25 hover:bg-mint-300/10"
        onClick={() => setMode("compact")}
        type="button"
      >
        Hermes Analysis
      </button>
    );
  }

  return (
    <Panel className="overflow-hidden bg-surface-950/60 shadow-xl shadow-black/15">
      <div className="flex items-start justify-between gap-3 border-b border-white/10 px-4 py-3.5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-mint-300/75">
            Hermes Analysis
          </p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight text-white">
            {analysis.symbol} Mentor Read
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <StatusPill tone={getBiasTone(analysis.marketBias)}>{analysis.marketBias}</StatusPill>
          <button
            className="grid size-8 place-items-center rounded-md border border-white/10 bg-white/[0.035] text-slate-400 transition hover:text-white"
            onClick={() => setMode(mode === "expanded" ? "compact" : "expanded")}
            type="button"
            aria-label={mode === "expanded" ? "Compact analysis" : "Expand analysis"}
          >
            {mode === "expanded" ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </button>
          <button
            className="grid size-8 place-items-center rounded-md border border-white/10 bg-white/[0.035] text-slate-400 transition hover:text-white"
            onClick={() => setMode("collapsed")}
            type="button"
            aria-label="Collapse analysis dock"
          >
            <Minimize2 className="size-4" />
          </button>
        </div>
      </div>

      <div className="space-y-3 p-4">
        <div className="grid grid-cols-2 gap-2.5">
          <MetricCard label="Confidence" value={`${analysis.confidence}%`} tone={analysis.confidence >= 75 ? "mint" : "gold"} />
          <MetricCard label="Risk" value={analysis.riskLevel} tone={analysis.riskLevel === "High" ? "danger" : analysis.riskLevel === "Medium" ? "gold" : "mint"} />
        </div>
        <InsightCard title="Hermes Says" tone="gold">
          {analysis.hermesSays}
        </InsightCard>

        {mode === "expanded" ? (
          <>
            <div className="grid grid-cols-2 gap-2.5">
              <MetricCard label="Trend" value={analysis.trend} tone="muted" />
              <MetricCard label="Momentum" value={analysis.momentum} tone="muted" />
              <MetricCard label="Volume" value={analysis.volumeRead} tone="muted" />
              <MetricCard label="Support" value={formatCurrency(analysis.support)} tone="neutral" />
              <MetricCard label="Resistance" value={formatCurrency(analysis.resistance)} tone="neutral" />
              <MetricCard label="Beginner Fit" value={analysis.beginnerFit} tone={analysis.beginnerFit === "Yes" ? "mint" : analysis.beginnerFit === "No" ? "danger" : "gold"} />
            </div>
            <InsightCard title="Suggested Action" tone="mint">
              {analysis.suggestedAction}
            </InsightCard>
          </>
        ) : null}
      </div>
    </Panel>
  );
}

function getBiasTone(bias: SymbolAnalysis["marketBias"]) {
  if (bias === "Bullish") return "mint";
  if (bias === "Bearish") return "danger";
  return "gold";
}
