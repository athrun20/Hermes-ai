import { InsightCard, MetricCard, Panel, PanelHeader } from "@/components/ui";
import type { DecisionJournalSummary } from "@/lib/decision-journal-types";

export function DecisionJournalSummaryPanel({
  summary,
}: {
  summary: DecisionJournalSummary;
}) {
  return (
    <Panel>
      <PanelHeader eyebrow="Decision Journal" title="Judgment Summary" />
      <div className="space-y-4 p-5">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <MetricCard label="Total Decisions" value={summary.totalDecisions} tone="neutral" />
          <MetricCard
            label="Avg Confidence"
            value={`${summary.averageHermesConfidence}%`}
            tone={summary.averageHermesConfidence >= 75 ? "mint" : "gold"}
          />
          <MetricCard
            label="Avg Discipline"
            value={`${summary.averageDisciplineImpact >= 0 ? "+" : ""}${summary.averageDisciplineImpact}`}
            tone={summary.averageDisciplineImpact >= 0 ? "mint" : "danger"}
          />
          <MetricCard label="Wisdom Earned" value={`+${summary.totalWisdomEarned}`} tone="gold" />
          <MetricCard label="Common Emotion" value={summary.mostCommonEmotion} tone="muted" />
          <MetricCard label="Common Mistake" value={summary.mostCommonMistake} tone="muted" />
        </div>
        <InsightCard title="Hermes Insight" tone="gold">
          {summary.hermesInsight}
        </InsightCard>
      </div>
    </Panel>
  );
}
