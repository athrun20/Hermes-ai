import { Target } from "lucide-react";
import type { MorningBriefing } from "@/lib/morning-briefing";
import { Panel, PanelHeader, StatusPill } from "@/components/ui";

export function DailyGoalCard({ goal }: { goal: MorningBriefing["dailyGoal"] }) {
  return (
    <Panel>
      <PanelHeader
        eyebrow="Daily Goal"
        title="One Rule for Today"
        action={<Target className="size-5 text-amberline" aria-hidden="true" />}
      />
      <div className="p-5">
        <p className="text-2xl font-semibold tracking-tight text-white">{goal.text}</p>
        <div className="mt-4">
          <StatusPill tone="gold">+{goal.wisdomAvailable} Wisdom available</StatusPill>
        </div>
      </div>
    </Panel>
  );
}
