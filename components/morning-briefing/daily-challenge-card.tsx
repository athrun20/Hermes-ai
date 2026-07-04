import { Compass } from "lucide-react";
import type { MorningBriefing } from "@/lib/morning-briefing";
import { Panel, PanelHeader, StatusPill } from "@/components/ui";

export function DailyChallengeCard({
  challenge,
}: {
  challenge: MorningBriefing["challenge"];
}) {
  return (
    <Panel>
      <PanelHeader
        eyebrow="Today's Challenge"
        title="Practice With Intention"
        action={<Compass className="size-5 text-amberline" aria-hidden="true" />}
      />
      <div className="p-5">
        <p className="text-2xl font-semibold tracking-tight text-white">{challenge.text}</p>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          Complete this through disciplined paper trading behavior, not more activity.
        </p>
        <div className="mt-4">
          <StatusPill tone="gold">+{challenge.reward} Wisdom</StatusPill>
        </div>
      </div>
    </Panel>
  );
}
