import type { MorningBriefing } from "@/lib/morning-briefing";
import { InsightCard, MetricCard, Panel, PanelHeader } from "@/components/ui";

export function MarketBriefingCard({
  market,
  showInterpretation = true,
}: {
  market: MorningBriefing["market"];
  showInterpretation?: boolean;
}) {
  return (
    <Panel>
      <PanelHeader eyebrow="Today's Market" title="Market Conditions" />
      <div className={`grid gap-4 p-5 ${showInterpretation ? "xl:grid-cols-[1fr_1.2fr]" : ""}`}>
        <div className="grid gap-3 sm:grid-cols-2">
          <MetricCard label="Today's Market" value={market.todayMarket} tone={market.todayMarket === "Bearish" ? "danger" : market.todayMarket === "Bullish" ? "mint" : "gold"} />
          <MetricCard label="Market Breadth" value={market.marketBreadth} tone={market.marketBreadth === "Weak" ? "danger" : market.marketBreadth === "Strong" ? "mint" : "gold"} />
          <MetricCard label="Volatility" value={market.volatility} tone={market.volatility === "High" ? "danger" : market.volatility === "Low" ? "mint" : "gold"} />
          <MetricCard label="Sector Leadership" value={market.sectorLeadership} tone="muted" />
        </div>
        {showInterpretation ? (
          <div className="grid gap-4">
            <InsightCard title="Biggest Risk" tone="gold">
              {market.biggestRisk}
            </InsightCard>
            <InsightCard title="Hermes Interpretation" tone="mint">
              {market.interpretation}
            </InsightCard>
          </div>
        ) : (
          <InsightCard title="Biggest Risk" tone="gold">
            {market.biggestRisk}
          </InsightCard>
        )}
      </div>
    </Panel>
  );
}
