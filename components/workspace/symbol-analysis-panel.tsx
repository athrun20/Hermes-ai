import { formatCurrency } from "@/lib/market-data";
import type { SymbolAnalysis } from "@/lib/symbol-analysis-engine";
import { InsightCard, MetricCard, Panel, PanelHeader, StatusPill } from "@/components/ui";

export function SymbolAnalysisPanel({ analysis }: { analysis: SymbolAnalysis }) {
  return (
    <Panel>
      <PanelHeader
        eyebrow="Hermes AI Analyst"
        title={`${analysis.symbol} Intelligence`}
        action={<StatusPill tone={analysis.marketBias === "Bullish" ? "mint" : analysis.marketBias === "Bearish" ? "danger" : "gold"}>{analysis.marketBias}</StatusPill>}
      />
      <div className="space-y-4 p-5">
        <div>
          <p className="text-sm font-semibold text-white">{analysis.name}</p>
          <p className="mt-1 text-xs text-slate-500">{analysis.assetType}</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <MetricCard label="Confidence" value={`${analysis.confidence}%`} tone={analysis.confidence >= 75 ? "mint" : "gold"} />
          <MetricCard label="Risk Level" value={analysis.riskLevel} tone={analysis.riskLevel === "High" ? "danger" : analysis.riskLevel === "Medium" ? "gold" : "mint"} />
          <MetricCard label="Trend" value={analysis.trend} tone="muted" />
          <MetricCard label="Momentum" value={analysis.momentum} tone="muted" />
          <MetricCard label="Volume Read" value={analysis.volumeRead} tone="muted" />
          <MetricCard label="Beginner Fit" value={analysis.beginnerFit} tone={analysis.beginnerFit === "Yes" ? "mint" : analysis.beginnerFit === "No" ? "danger" : "gold"} />
          <MetricCard label="Support" value={formatCurrency(analysis.support)} tone="neutral" />
          <MetricCard label="Resistance" value={formatCurrency(analysis.resistance)} tone="neutral" />
        </div>
        <InsightCard title="Hermes Says" tone="gold">
          {analysis.hermesSays}
        </InsightCard>
        <InsightCard title="Suggested Next Action" tone="mint">
          {analysis.suggestedAction}
        </InsightCard>
      </div>
    </Panel>
  );
}
