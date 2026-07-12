"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BriefingOpportunitiesCard } from "@/components/morning-briefing/briefing-opportunities-card";
import { DailyChallengeCard } from "@/components/morning-briefing/daily-challenge-card";
import { DailyGoalCard } from "@/components/morning-briefing/daily-goal-card";
import { DailyOathCard } from "@/components/morning-briefing/daily-oath-card";
import { GuidedBriefing, type GuidedBriefingStep } from "@/components/morning-briefing/guided-briefing";
import { MarketBriefingCard } from "@/components/morning-briefing/market-briefing-card";
import { MorningGreeting } from "@/components/morning-briefing/morning-greeting";
import { ScrollPreviewCard } from "@/components/morning-briefing/scroll-preview-card";
import { TraderDnaReminderCard } from "@/components/morning-briefing/trader-dna-reminder-card";
import { WisdomProgressCard } from "@/components/morning-briefing/wisdom-progress-card";
import { getHermesMemory, type HermesMemorySnapshot } from "@/lib/hermes-memory";
import { triggerHermesCoach } from "@/lib/hermes-coach-trigger-system";
import {
  getWeeklyLearningBriefLinesSafe,
  type WeeklyLearningBriefLines,
} from "@/lib/learning-engine/coach-integration";
import { loadHermesState } from "@/lib/local-persistence";
import { buildMorningBriefing } from "@/lib/morning-briefing";
import type { ClosedTrade } from "@/lib/paper-trading";
import { TopNav } from "./top-nav";
import { Button, InsightCard, PageHeader, PageShell, Panel, PanelHeader } from "./ui";

export function MorningBriefingPage() {
  const router = useRouter();
  const [memory, setMemory] = useState<HermesMemorySnapshot | undefined>();
  const [history, setHistory] = useState<ClosedTrade[]>([]);
  /** Compact Learning Engine weekly lines — existing interpretation grid only. */
  const [weeklyLearning, setWeeklyLearning] = useState<WeeklyLearningBriefLines | null>(null);

  useEffect(() => {
    setMemory(getHermesMemory());
    setHistory(loadHermesState()?.history ?? []);
    // Failure-isolated: never blocks briefing if learning memory fails.
    setWeeklyLearning(getWeeklyLearningBriefLinesSafe());
  }, []);

  const briefing = useMemo(
    () => buildMorningBriefing({ memory, history }),
    [history, memory],
  );
  const steps = useMemo<GuidedBriefingStep[]>(
    () => [
      {
        id: "greeting",
        content: <MorningGreeting greeting={briefing.greeting} />,
      },
      {
        id: "market",
        content: <MarketBriefingCard market={briefing.market} showInterpretation={false} />,
      },
      {
        id: "interpretation",
        content: (
          <Panel>
            <PanelHeader eyebrow="Hermes Interpretation" title="Read Before the Open" />
            <div className="p-5">
              <InsightCard title="Mentor Note" tone="mint">
                {briefing.market.interpretation}
              </InsightCard>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <InsightCard title="Yesterday's Lesson" tone="gold">
                  {weeklyLearning?.progressSummary ?? briefing.intelligence.yesterdayLesson}
                </InsightCard>
                <InsightCard title="Discipline Streak" tone="neutral">
                  {briefing.intelligence.disciplineStreak} planned closes
                  {weeklyLearning ? (
                    <span className="mt-1 block text-[11px] text-slate-500">
                      {weeklyLearning.dataSufficiencyLabel}
                      {weeklyLearning.strongestBehavior
                        ? ` · Strength: ${weeklyLearning.strongestBehavior}`
                        : ""}
                    </span>
                  ) : null}
                </InsightCard>
                <InsightCard title="Biggest Improvement" tone="mint">
                  {weeklyLearning?.mainImprovementFocus ?? briefing.intelligence.biggestImprovement}
                  {weeklyLearning?.recommendedPractice ? (
                    <span className="mt-1 block text-[11px] leading-4 text-slate-500">
                      Practice: {weeklyLearning.recommendedPractice}
                    </span>
                  ) : null}
                </InsightCard>
              </div>
            </div>
          </Panel>
        ),
      },
      {
        id: "scroll",
        content: <ScrollPreviewCard scroll={briefing.scroll} />,
      },
      {
        id: "trader-dna",
        content: <TraderDnaReminderCard dna={briefing.traderDna} />,
      },
      {
        id: "opportunities",
        content: <BriefingOpportunitiesCard opportunities={briefing.opportunities} />,
      },
      {
        id: "goal",
        content: <DailyGoalCard goal={briefing.dailyGoal} />,
      },
      {
        id: "challenge",
        content: (
          <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <DailyChallengeCard challenge={briefing.challenge} />
            <WisdomProgressCard progress={briefing.wisdomProgress} />
          </div>
        ),
      },
      {
        id: "oath",
        content: <DailyOathCard oath={briefing.oath} />,
      },
    ],
    [briefing, weeklyLearning],
  );

  return (
    <main>
      <TopNav />
      <PageShell>
        <PageHeader
          eyebrow="Morning"
          title="Briefing"
          description="Clarity first. Discipline second. Execution last."
        />

        <GuidedBriefing
          steps={steps}
          onCompleted={() =>
            triggerHermesCoach({
              moment: "morning-briefing-completed",
              preferPersonalizedLearning: true,
              context: {
                traderPersonality: briefing.traderDna.tradingStyle,
                morningGoal: briefing.dailyGoal.text,
                livingScrollTitle: briefing.scroll.title,
                disciplineScore: briefing.traderDna.disciplineScore,
                disciplineStreak: briefing.intelligence.disciplineStreak,
                intelligence: briefing.intelligence,
              },
            })
          }
          completion={
            <Panel className="px-5 py-8 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-mint-300/75">
                Complete
              </p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight text-white">
                Briefing finished
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">
                Carry the plan into the session. Patience is part of the edge.
              </p>
              <Button className="mt-5" variant="primary" size="lg" onClick={() => router.push("/")}>
                Open workspace
              </Button>
            </Panel>
          }
        />
      </PageShell>
    </main>
  );
}
