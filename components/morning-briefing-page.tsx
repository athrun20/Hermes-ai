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
import { loadHermesState } from "@/lib/local-persistence";
import { buildMorningBriefing } from "@/lib/morning-briefing";
import type { ClosedTrade } from "@/lib/paper-trading";
import { TopNav } from "./top-nav";
import { InsightCard, Panel, PanelHeader } from "./ui";

export function MorningBriefingPage() {
  const router = useRouter();
  const [memory, setMemory] = useState<HermesMemorySnapshot | undefined>();
  const [history, setHistory] = useState<ClosedTrade[]>([]);

  useEffect(() => {
    setMemory(getHermesMemory());
    setHistory(loadHermesState()?.history ?? []);
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
                  {briefing.intelligence.yesterdayLesson}
                </InsightCard>
                <InsightCard title="Discipline Streak" tone="neutral">
                  {briefing.intelligence.disciplineStreak} planned closes
                </InsightCard>
                <InsightCard title="Biggest Improvement" tone="mint">
                  {briefing.intelligence.biggestImprovement}
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
    [briefing],
  );

  return (
    <main>
      <TopNav />
      <div className="mx-auto max-w-[1440px] px-4 py-5 sm:px-6 lg:px-8 xl:px-10">
        <section className="mb-5 rounded-lg border border-white/10 bg-white/[0.025] px-5 py-7 shadow-insetPanel">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-mint-300/80">
            Morning Briefing
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Hermes Morning Briefing
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
            Hermes has prepared your market briefing.
          </p>
          <p className="mt-4 text-lg font-semibold tracking-tight text-amberline">
            Begin with clarity. Trade with discipline.
          </p>
        </section>

        <GuidedBriefing
          steps={steps}
          completion={
            <Panel className="p-6 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-mint-300/80">
                Briefing Complete
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">
                Today's briefing complete.
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-400">
                Carry the plan into the session. Let patience do its work.
              </p>
              <button
                className="mt-6 rounded-lg bg-mint-400 px-5 py-3 text-sm font-bold text-surface-950 transition hover:bg-mint-300"
                onClick={() => router.push("/")}
                type="button"
              >
                Begin Trading
              </button>
            </Panel>
          }
        />
      </div>
    </main>
  );
}
