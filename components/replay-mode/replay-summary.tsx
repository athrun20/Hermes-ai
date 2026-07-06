import { ReplayGrade } from "@/components/replay-mode/replay-grade";
import { InsightCard, Panel, PanelHeader, StatusPill } from "@/components/ui";
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
      <div className="grid gap-5 p-5 lg:grid-cols-[auto_1fr_auto] lg:items-center">
        <ReplayGrade grade={session.summary.grade} />
        <div className="grid gap-3 md:grid-cols-2">
          <InsightCard title="Wisdom Earned" tone="gold">
            <span className="text-2xl font-semibold tracking-tight text-amberline">
              +{session.summary.wisdomEarned}
            </span>
          </InsightCard>
          <InsightCard title="Lesson Learned" tone="mint">
            {session.summary.lessonLearned}
          </InsightCard>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
          <StatusPill tone={session.trade.pnl >= 0 ? "mint" : "danger"}>
            {session.trade.pnl >= 0 ? "Winning trade" : "Losing trade"}
          </StatusPill>
          <button
            className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-amberline/30 hover:bg-amberline/10 hover:text-white"
            onClick={onReplayAgain}
            type="button"
          >
            Replay Again
          </button>
          <button
            className="rounded-lg bg-mint-400 px-4 py-3 text-sm font-bold text-surface-950 transition hover:bg-mint-300"
            onClick={onReturn}
            type="button"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    </Panel>
  );
}
