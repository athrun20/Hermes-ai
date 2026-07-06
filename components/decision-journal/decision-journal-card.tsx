"use client";

import { useRouter } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { DecisionReflectionForm } from "@/components/decision-journal/decision-reflection-form";
import { InsightCard, MetricCard, Panel, PanelHeader, StatusPill } from "@/components/ui";
import type {
  DecisionJournalEntry,
  DecisionReflection,
} from "@/lib/decision-journal-types";
import { formatCurrency } from "@/lib/market-data";

export function DecisionJournalCard({
  entry,
  onSaveReflection,
}: {
  entry: DecisionJournalEntry;
  onSaveReflection: (reflection: DecisionReflection) => void;
}) {
  const router = useRouter();

  return (
    <Panel>
      <PanelHeader
        eyebrow={`${entry.symbol}/USD Decision`}
        title={entry.direction}
        action={
          <button
            className="inline-flex items-center gap-2 rounded-lg border border-amberline/25 bg-amberline/10 px-3 py-2 text-xs font-semibold text-amber-100 transition hover:border-amberline/45 hover:bg-amberline/15"
            onClick={() => router.push(`/replay-mode?trade=${entry.tradeId}`)}
            type="button"
          >
            <ExternalLink className="size-3.5" aria-hidden="true" />
            View Replay
          </button>
        }
      />
      <div className="space-y-4 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill tone={entry.outcome === "Win" ? "mint" : entry.outcome === "Loss" ? "danger" : "muted"}>
            {entry.outcome}
          </StatusPill>
          <StatusPill tone={entry.followedPlan ? "mint" : "gold"}>
            {entry.followedPlan ? "Followed Plan" : "Needs Review"}
          </StatusPill>
          <StatusPill tone="muted">
            {new Date(entry.dateTime).toLocaleString()}
          </StatusPill>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Entry" value={formatCurrency(entry.entry)} tone="mint" />
          <MetricCard label="Exit" value={formatCurrency(entry.exit)} tone="muted" />
          <MetricCard
            label="PnL"
            value={formatCurrency(entry.pnl)}
            tone={entry.pnl >= 0 ? "mint" : "danger"}
          />
          <MetricCard
            label="Risk / Reward"
            value={entry.riskReward ? `${entry.riskReward.toFixed(2)} : 1` : "Not defined"}
            tone={entry.riskReward && entry.riskReward >= 2 ? "mint" : "gold"}
          />
          <MetricCard label="Hermes Confidence" value={`${entry.hermesConfidence}%`} tone="gold" />
          <MetricCard label="Recommendation" value={entry.hermesRecommendation} tone="muted" />
          <MetricCard label="Trade Quality" value={entry.tradeQuality} tone={entry.tradeQuality === "Excellent" || entry.tradeQuality === "Good" ? "mint" : "gold"} />
          <MetricCard
            label="Discipline Impact"
            value={`${entry.disciplineImpact >= 0 ? "+" : ""}${entry.disciplineImpact}`}
            tone={entry.disciplineImpact >= 0 ? "mint" : "danger"}
          />
          <MetricCard label="Wisdom Earned" value={`+${entry.wisdomEarned}`} tone="gold" />
          <MetricCard label="Trader DNA Match" value={entry.traderDnaMatch} tone="muted" />
          <MetricCard label="Daily Goal Match" value={entry.dailyGoalMatch} tone={entry.dailyGoalMatch === "Aligned" ? "mint" : "gold"} />
          <MetricCard label="Position Size" value={formatCurrency(entry.positionSize)} tone="neutral" />
        </div>

        {entry.reflection?.lesson ? (
          <InsightCard title="Saved Lesson" tone="mint">
            {entry.reflection.lesson}
          </InsightCard>
        ) : null}

        <DecisionReflectionForm
          reflection={entry.reflection}
          tradeId={entry.tradeId}
          onSave={onSaveReflection}
        />
      </div>
    </Panel>
  );
}
