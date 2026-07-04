import type { OpportunityScannerSummary } from "@/lib/opportunity-scanner";
import { MetricCard } from "@/components/ui";

export function OpportunitySummaryCards({
  summary,
}: {
  summary: OpportunityScannerSummary;
}) {
  return (
    <section className="grid gap-4 md:grid-cols-2">
      <MetricCard
        label="Stocks Analyzed"
        value={summary.stocksAnalyzed}
        detail="Mock universe"
      />
      <MetricCard
        label="Opportunities Found"
        value={summary.opportunitiesFound}
        tone="mint"
        detail="Worth studying"
      />
      <MetricCard
        label="Average Hermes Confidence"
        value={`${summary.averageHermesConfidence}%`}
        tone="gold"
        detail="Rule-based mock score"
      />
      <MetricCard
        label="Today's Market Mood"
        value={summary.marketMood}
        tone={summary.marketMood === "Defensive" ? "danger" : "mint"}
        detail="Educational posture"
      />
    </section>
  );
}
