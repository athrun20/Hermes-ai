import type { MorningBriefing } from "@/lib/morning-briefing";
import { Panel, PanelHeader, ProgressBar } from "@/components/ui";

export function WisdomProgressCard({
  progress,
}: {
  progress: MorningBriefing["wisdomProgress"];
}) {
  const percentage = (progress.current / progress.nextLevel) * 100;

  return (
    <Panel>
      <PanelHeader eyebrow="Wisdom Progress" title="Wisdom Level" />
      <div className="p-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-2xl font-semibold tracking-tight text-white">{progress.level}</p>
            <p className="mt-2 text-sm text-slate-400">
              {progress.current} / {progress.nextLevel} Wisdom
            </p>
          </div>
        </div>
        <div className="mt-5">
          <ProgressBar value={percentage} tone="gold" />
        </div>
      </div>
    </Panel>
  );
}
