import type { TraderDnaBrief } from "@/lib/morning-briefing";
import { MetricCard, Panel, PanelHeader, ScoreRing } from "@/components/ui";

export function TraderDnaReminderCard({ dna }: { dna: TraderDnaBrief }) {
  return (
    <Panel>
      <PanelHeader eyebrow="Trader DNA" title="Behavior Reminder" />
      <div className="grid gap-4 p-5 sm:grid-cols-[1fr_auto]">
        <div className="grid gap-3 sm:grid-cols-2">
          <MetricCard label="Trading Style" value={dna.tradingStyle} />
          <MetricCard label="Primary Strength" value={dna.primaryStrength} tone="mint" />
          <MetricCard label="Area to Improve" value={dna.areaToImprove} tone="gold" />
          <MetricCard label="Discipline Score" value={dna.disciplineScore} tone="muted" />
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
          <ScoreRing score={dna.disciplineScore} label="Discipline" />
        </div>
      </div>
    </Panel>
  );
}
