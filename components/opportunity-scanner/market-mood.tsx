import type { MarketMood as MarketMoodData } from "@/lib/opportunity-scanner";
import { InsightCard, MetricCard, Panel } from "@/components/ui";

export function MarketMood({ mood }: { mood: MarketMoodData }) {
  return (
    <Panel>
      <div className="grid gap-4 p-5 xl:grid-cols-[1fr_1.2fr]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mint-300/75">
            Market Mood
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <MetricCard label="Today's Market" value={mood.todayMarket} tone={mood.todayMarket === "Bearish" ? "danger" : mood.todayMarket === "Bullish" ? "mint" : "gold"} />
            <MetricCard label="Market Breadth" value={mood.marketBreadth} tone={mood.marketBreadth === "Weak" ? "danger" : mood.marketBreadth === "Strong" ? "mint" : "gold"} />
            <MetricCard label="Volatility" value={mood.volatility} tone={mood.volatility === "High" ? "danger" : mood.volatility === "Low" ? "mint" : "gold"} />
            <MetricCard label="Sector Leadership" value={mood.sectorLeadership} tone="muted" />
          </div>
        </div>
        <InsightCard title="Hermes Interpretation" tone="gold" className="self-end">
          {mood.interpretation}
        </InsightCard>
      </div>
    </Panel>
  );
}
