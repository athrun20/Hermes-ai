import { GraduationCap } from "lucide-react";
import { analyzeTrade, type HermesMemory } from "@/lib/hermes-brain";
import type { HermesMemorySnapshot } from "@/lib/hermes-memory";
import { getDurationLabel, getTradeGrade, type ClosedTrade } from "@/lib/paper-trading";
import { Panel, PanelHeader } from "./ui";

export function HermesCoach({
  trade,
  memory,
  hermesMemory,
}: {
  trade?: ClosedTrade;
  memory?: HermesMemory;
  hermesMemory?: HermesMemorySnapshot;
}) {
  const review = trade ? buildReview(trade) : undefined;
  const brainReview = trade ? analyzeTrade(trade) : undefined;

  return (
    <Panel>
      <PanelHeader
        eyebrow="Hermes Coach"
        title="Post-Trade Review"
        action={<GraduationCap className="size-5 text-mint-300" aria-hidden="true" />}
      />
      <div className="space-y-4 p-5">
        {trade ? (
          <>
            <div className="rounded-lg border border-mint-300/20 bg-mint-300/10 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-mint-300">
                    Trade Score
                  </p>
                  <p className="mt-1.5 text-2xl font-semibold tabular-nums tracking-tight text-white">
                    {brainReview?.score}
                  </p>
                  <p className="mt-1 text-sm text-slate-400">out of 100</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-surface-950/50 px-4 py-3 text-right">
                  <p className="text-xs text-slate-500">Grade</p>
                  <p className={gradeTone(brainReview?.grade ?? "F")}>
                    {brainReview?.grade}
                  </p>
                </div>
              </div>
            </div>
            <CoachRow label="Brain verdict" value={brainReview?.verdict ?? ""} />
            {hermesMemory ? (
              <CoachRow label="Habit-based advice" value={buildMemoryAdvice(hermesMemory)} />
            ) : memory ? (
              <CoachRow label="Habit-based advice" value={buildHabitAdvice(memory)} />
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <CoachRow label="Followed plan" value={trade.followedPlan ? "Yes" : "Needs work"} />
              <CoachRow label="What went well" value={review?.doneWell ?? ""} />
              <CoachRow label="What went wrong" value={review?.wentWrong ?? ""} />
              <CoachRow label="Risk management" value={review?.riskManagement ?? ""} />
              <CoachRow label="Entry feedback" value={review?.entryFeedback ?? ""} />
              <CoachRow label="Exit feedback" value={review?.exitFeedback ?? ""} />
              <CoachRow label="One improvement tip" value={review?.improvement ?? ""} />
              <CoachRow label="Next best action" value={brainReview?.nextBestAction ?? ""} />
            </div>
          </>
        ) : (
          <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4 text-sm leading-6 text-slate-400">
            Close a paper trade to receive a Hermes Coach review with a quality
            score and one practical improvement.
          </div>
        )}
      </div>
    </Panel>
  );
}

function buildMemoryAdvice(memory: HermesMemorySnapshot) {
  const bestAsset = memory.performance.bestPerformingAsset;
  const worstAsset = memory.performance.worstPerformingAsset;

  if (bestAsset !== "N/A" && worstAsset !== "N/A" && bestAsset !== worstAsset) {
    return `Your recent ${bestAsset} trades are stronger than your ${worstAsset} trades. Favor cleaner ${bestAsset} setups and be more selective elsewhere.`;
  }

  if (memory.behavior.holdingWinnersTooShort || memory.behavior.earlyExitsFrequency >= 30) {
    return "You are exiting winners early. Let the next planned winner work until target or invalidation unless the thesis changes.";
  }

  if (memory.behavior.overtradingDetected) {
    return "You have taken several trades close together. Watch for overtrading and require a complete setup before the next entry.";
  }

  if (memory.behavior.revengeTradingDetected) {
    return "Recent post-loss trade bursts suggest revenge trading risk. Pause after losses and rebuild the plan from scratch.";
  }

  if (memory.weaknesses[0] && !memory.weaknesses[0].startsWith("No major")) {
    return memory.weaknesses[0];
  }

  return memory.strengths[0] ?? "Hermes Memory is building your personal coaching profile from completed paper trades.";
}

function buildHabitAdvice(memory: HermesMemory) {
  const mistake = memory.repeatedMistakes[0];

  if (mistake && !mistake.startsWith("No dominant")) {
    return `${memory.coachingInsight} Main pattern to work on: ${mistake}`;
  }

  if (
    memory.bestPerformingAsset !== "N/A" &&
    memory.weakestAsset !== "N/A" &&
    memory.bestPerformingAsset !== memory.weakestAsset
  ) {
    return `Your ${memory.bestPerformingAsset} trades are performing better than your ${memory.weakestAsset} trades. Be more selective on weaker assets.`;
  }

  return memory.coachingInsight;
}

function buildReview(trade: ClosedTrade) {
  const coach = trade.coach ?? {};
  const grade = coach.grade ?? getTradeGrade(trade.qualityScore);
  const riskReward =
    trade.stopLoss && trade.takeProfit
      ? Math.abs(trade.takeProfit - trade.entryPrice) /
        Math.max(0.01, Math.abs(trade.entryPrice - trade.stopLoss))
      : 0;

  return {
    grade,
    doneWell:
      coach.doneWell ??
      (trade.followedPlan
        ? "You defined the trade plan before execution."
        : "You recorded the trade for review."),
    wentWrong:
      coach.wentWrong ??
      (trade.pnl >= 0
        ? "Even winning trades need review for process consistency."
        : "The trade did not convert, so review setup quality and timing."),
    riskManagement:
      coach.riskManagement ??
      (riskReward > 0
        ? `Estimated risk/reward was ${riskReward.toFixed(2)}R.`
        : "Risk/reward could not be measured because the stop and target were incomplete."),
    entryFeedback:
      coach.entryFeedback ??
      (trade.stopLoss
        ? "Entry had an invalidation level defined."
        : "Entry needs a predefined stop-loss next time."),
    exitFeedback:
      coach.exitFeedback ??
      `${trade.side} trade closed after ${getDurationLabel(trade.openedAt, trade.closedAt)} with ${trade.pnl >= 0 ? "a gain" : "a loss"}.`,
    improvement:
      coach.improvement ??
      "Focus on one repeatable setup and keep position sizing consistent.",
  };
}

function gradeTone(grade: string) {
  const color =
    grade.startsWith("A") || grade.startsWith("B")
      ? "text-mint-300"
      : grade.startsWith("C")
        ? "text-amberline"
        : "text-rose-300";

  return `mt-1 text-xl font-semibold tabular-nums tracking-tight ${color}`;
}

function CoachRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-2 text-sm leading-6 text-slate-200">{value}</p>
    </div>
  );
}
