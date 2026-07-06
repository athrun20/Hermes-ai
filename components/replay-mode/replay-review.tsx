import { InsightCard, Panel, PanelHeader } from "@/components/ui";
import type { ReplaySession } from "@/lib/replay-engine";

export function ReplayReview({ session }: { session: ReplaySession }) {
  return (
    <Panel className="h-full">
      <PanelHeader eyebrow="Hermes Review" title="Post-Trade Analysis" />
      <div className="grid gap-3 p-5">
        <InsightCard title="What Went Well" tone="mint">
          <ReviewList items={session.review.wentWell} />
        </InsightCard>
        <InsightCard title="What Could Improve" tone="gold">
          <ReviewList items={session.review.couldImprove} />
        </InsightCard>
        <InsightCard title="Decision Quality" tone="neutral">
          {session.review.decisionQuality}
        </InsightCard>
        <InsightCard title="Risk Management" tone="neutral">
          {session.review.riskManagement}
        </InsightCard>
        <InsightCard title="Discipline" tone="neutral">
          {session.review.discipline}
        </InsightCard>
        <InsightCard title="Trader DNA Alignment" tone="neutral">
          {session.review.traderDnaAlignment}
        </InsightCard>
        <InsightCard title="Daily Goal Alignment" tone="neutral">
          {session.review.dailyGoalAlignment}
        </InsightCard>
        <InsightCard title="Morning Goal" tone="gold">
          {session.review.morningGoal}
        </InsightCard>
        <InsightCard title="Hermes Decision Review" tone="neutral">
          {session.review.decisionReviewReference}
        </InsightCard>
        <InsightCard title="Recommendation Follow-Through" tone="mint">
          {session.review.recommendationFollowThrough}
        </InsightCard>
      </div>
    </Panel>
  );
}

function ReviewList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li className="flex gap-2" key={item}>
          <span className="mt-2 size-1.5 shrink-0 rounded-full bg-current opacity-70" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
