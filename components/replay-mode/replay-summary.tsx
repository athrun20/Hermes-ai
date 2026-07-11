import { ReplayGrade } from "@/components/replay-mode/replay-grade";
import { Button, InsightCard, Panel, PanelHeader, StatusPill } from "@/components/ui";
import type { ReplaySession } from "@/lib/replay-engine";

export function ReplaySummary({
  session,
  onReplayAgain,
  onReturn,
}: {
  session: ReplaySession;
  onReplayAgain: () => void;
  onReturn: () => void;
}) {
  return (
    <Panel>
      <PanelHeader eyebrow="Replay Summary" title="Lesson Captured" />
      <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[auto_1fr_auto] lg:items-center">
        <ReplayGrade grade={session.summary.grade} />
        <div className="grid gap-3 md:grid-cols-2">
          <InsightCard title="Wisdom earned" tone="gold">
            <span className="text-xl font-semibold tracking-tight text-amberline tabular-nums">
              +{session.summary.wisdomEarned}
            </span>
          </InsightCard>
          <InsightCard title="Lesson learned" tone="mint">
            {session.summary.lessonLearned}
          </InsightCard>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
          <StatusPill tone={session.trade.pnl >= 0 ? "mint" : "danger"}>
            {session.trade.pnl >= 0 ? "Winning trade" : "Losing trade"}
          </StatusPill>
          <Button variant="secondary" onClick={onReplayAgain}>
            Replay again
          </Button>
          <Button variant="primary" onClick={onReturn}>
            Open workspace
          </Button>
        </div>
      </div>
    </Panel>
  );
}
