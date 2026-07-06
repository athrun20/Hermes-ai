import { MetricCard, Panel, PanelHeader } from "@/components/ui";
import type { ReplaySession } from "@/lib/replay-engine";

export function ReplayTimeline({ session }: { session: ReplaySession }) {
  return (
    <Panel className="h-full">
      <PanelHeader
        eyebrow="Trade Timeline"
        title={`${session.trade.symbol}/USD ${session.trade.side}`}
      />
      <div className="grid gap-3 p-5">
        {session.timeline.map((item) => (
          <MetricCard
            key={item.label}
            label={item.label}
            value={item.value}
            tone={item.tone}
          />
        ))}
      </div>
    </Panel>
  );
}
