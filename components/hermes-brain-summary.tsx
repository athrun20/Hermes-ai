"use client";

import { useState } from "react";
import { BrainCircuit, ClipboardCheck, X, UserRound } from "lucide-react";
import type {
  DailyScroll,
  HermesMemory,
  OpportunityScannerResult,
  TradingPersonality,
} from "@/lib/hermes-brain";
import type { HermesIntelligenceLayer } from "@/lib/hermes-intelligence-layer";
import type {
  HermesMemorySnapshot,
  PeriodInsight,
  TradingPersonalityProfile,
} from "@/lib/hermes-memory";
import { Panel, PanelHeader } from "./ui";

type LivingScroll = {
  title: string;
  quote: string;
  insight: string;
  challenge: string;
  wisdomPoints: number;
};

export function HermesBrainSummary({
  dailyScroll,
  memory,
  scanner,
  personality,
  hermesMemory,
  weeklyInsights,
  memoryPersonality,
  intelligence,
}: {
  dailyScroll: DailyScroll;
  memory: HermesMemory;
  scanner: OpportunityScannerResult;
  personality: TradingPersonality;
  hermesMemory?: HermesMemorySnapshot;
  weeklyInsights?: PeriodInsight;
  memoryPersonality?: TradingPersonalityProfile;
  intelligence?: HermesIntelligenceLayer;
}) {
  const [isScrollOpen, setIsScrollOpen] = useState(false);
  const hasMemoryHistory = Boolean(hermesMemory && hermesMemory.performance.totalTrades > 0);
  const personalityTitle = memoryPersonality?.archetype ?? personality.archetype;
  const strengths = memoryPersonality?.strengths ?? personality.strengths;
  const blindSpots = memoryPersonality?.blindSpots ?? personality.blindSpots;
  const livingScroll = buildLivingScroll({
    dailyScroll,
    hermesMemory,
    weeklyInsights,
    personalityTitle,
    intelligence,
  });

  return (
    <>
      <Panel>
        <PanelHeader
          eyebrow="Hermes Brain"
          title="Daily Scroll & Trading Personality"
          action={<BrainCircuit className="size-5 text-mint-300" aria-hidden="true" />}
        />
        <div className="grid gap-4 p-5 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="size-4 text-mint-300" aria-hidden="true" />
              <p className="text-sm font-semibold text-white">Daily Scroll Preview</p>
            </div>
            <button
              className="rounded-md border border-amberline/25 bg-amberline/10 px-3 py-1.5 text-xs font-semibold text-amber-100 transition hover:border-amberline/45 hover:bg-amberline/15"
              onClick={() => setIsScrollOpen(true)}
              type="button"
            >
              Open Scroll
            </button>
          </div>
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
            {hasMemoryHistory ? `${hermesMemory?.personality} posture` : `${dailyScroll.marketPosture} posture`}
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-200">
            {buildMemoryScrollPriority({ dailyScroll, hermesMemory, intelligence })}
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <BrainList
              title="Checklist"
              items={buildMemoryChecklist({ dailyScroll, hermesMemory, weeklyInsights })}
            />
            <BrainList title="Avoid" items={buildMemoryAvoid({ dailyScroll, hermesMemory, intelligence })} />
          </div>
          <p className="mt-4 rounded-md border border-amberline/20 bg-amberline/10 p-3 text-sm leading-6 text-amber-100">
            {buildMemoryCoachingNote({ dailyScroll, hermesMemory, weeklyInsights, intelligence })}
          </p>
        </section>

        <section className="space-y-4">
          <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-mint-300">
              Opportunity Scanner
            </p>
            <div className="mt-3 space-y-2">
              {scanner.items.map((item) => (
                <div
                  className="grid grid-cols-[52px_1fr_auto] items-center gap-3 rounded-md border border-white/10 bg-surface-950/45 px-3 py-2"
                  key={item.asset}
                >
                  <p className="font-semibold text-white">{item.asset}</p>
                  <div>
                    <p className="text-xs text-slate-500">
                      {item.bias} / {item.riskLevel} risk
                    </p>
                    <p className="mt-0.5 text-xs leading-4 text-slate-300">
                      {item.suggestedAction}
                    </p>
                  </div>
                  <p className={scoreTone(item.setupScore)}>{item.setupScore}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-mint-300">
              Hermes Memory
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <MiniStat label="Best asset" value={memory.bestPerformingAsset} />
              <MiniStat label="Weakest asset" value={memory.weakestAsset} />
              <MiniStat
                label="Win rate"
                value={`${hermesMemory?.performance.winRate ?? memory.winRate}%`}
              />
              <MiniStat
                label="Common type"
                value={hermesMemory?.strategyPreference.dominantStyle ?? memory.commonTradeType}
              />
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              {hermesMemory?.weaknesses[0] ?? memory.coachingInsight}
            </p>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
          <div className="mb-3 flex items-center gap-2">
            <UserRound className="size-4 text-mint-300" aria-hidden="true" />
            <p className="text-sm font-semibold text-white">Trading Personality</p>
          </div>
          <p className="text-2xl font-semibold text-white">{personalityTitle}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <MiniStat
              label="Confidence style"
              value={memoryPersonality?.confidenceStyle ?? personality.confidenceStyle}
            />
            <MiniStat
              label="Risk style"
              value={memoryPersonality?.riskStyle ?? personality.riskStyle}
            />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <BrainList title="Strengths" items={strengths} />
            <BrainList title="Blind spots" items={blindSpots} />
          </div>
          <p className="mt-4 rounded-md border border-mint-300/20 bg-mint-300/10 p-3 text-sm leading-6 text-slate-200">
            {memoryPersonality?.coachingPrompt ?? personality.coachingPrompt}
          </p>
          </div>
        </section>
        </div>
      </Panel>

      {isScrollOpen ? (
        <LivingScrollModal scroll={livingScroll} onClose={() => setIsScrollOpen(false)} />
      ) : null}
    </>
  );
}

function LivingScrollModal({
  scroll,
  onClose,
}: {
  scroll: LivingScroll;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-surface-950/80 px-4 py-8 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="living-scroll-title"
    >
      <button
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        type="button"
        aria-label="Close Living Scroll"
      />
      <section className="relative w-full max-w-2xl overflow-hidden rounded-xl border border-amberline/30 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.18),transparent_32%),linear-gradient(135deg,#f5f0e6,#d8c6a3_45%,#f8f3e8)] p-[1px] shadow-2xl shadow-black/50">
        <div className="relative rounded-xl bg-[linear-gradient(145deg,rgba(255,255,255,0.78),rgba(226,211,181,0.9)),radial-gradient(circle_at_15%_20%,rgba(255,255,255,0.75),transparent_18%),radial-gradient(circle_at_78%_12%,rgba(177,145,82,0.18),transparent_28%)] p-6 text-surface-950 sm:p-8">
          <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:linear-gradient(110deg,transparent_0%,rgba(120,98,54,0.11)_34%,transparent_60%)]" />
          <button
            className="absolute right-4 top-4 rounded-full border border-surface-950/10 bg-white/45 p-2 text-surface-800 transition hover:bg-white/70"
            onClick={onClose}
            type="button"
            aria-label="Close scroll"
          >
            <X className="size-4" aria-hidden="true" />
          </button>

          <div className="relative">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-800/75">
              Hermes Living Scroll
            </p>
            <h2
              className="mt-3 max-w-xl text-xl font-semibold leading-tight tracking-tight text-surface-950 sm:text-2xl"
              id="living-scroll-title"
            >
              {scroll.title}
            </h2>
            <p className="mt-5 border-l-2 border-amber-700/45 pl-4 text-lg font-medium leading-8 text-surface-800">
              {scroll.quote}
            </p>

            <div className="mt-7 grid gap-4 sm:grid-cols-[1fr_170px]">
              <div className="rounded-lg border border-amber-900/10 bg-white/35 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-900/65">
                  Personalized Insight
                </p>
                <p className="mt-3 text-sm leading-6 text-surface-800">{scroll.insight}</p>
              </div>
              <div className="rounded-lg border border-amber-900/10 bg-surface-950/90 p-4 text-white">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amberline">
                  Wisdom Points Earned
                </p>
                <p className="mt-2 text-2xl font-semibold leading-none tracking-tight tabular-nums">
                  {scroll.wisdomPoints}
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-lg border border-amber-900/10 bg-amber-100/45 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-900/65">
                Today's Challenge
              </p>
              <p className="mt-3 text-sm leading-6 text-surface-800">{scroll.challenge}</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-surface-950/45 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold leading-5 text-slate-100">{value}</p>
    </div>
  );
}

function buildMemoryScrollPriority({
  dailyScroll,
  hermesMemory,
  intelligence,
}: {
  dailyScroll: DailyScroll;
  hermesMemory?: HermesMemorySnapshot;
  intelligence?: HermesIntelligenceLayer;
}) {
  if (!hermesMemory || hermesMemory.performance.totalTrades === 0) {
    return "Beginner wisdom: protect capital first. Define entry, stop, target, and reason before every paper trade.";
  }

  if (hermesMemory.behavior.holdingWinnersTooShort) {
    return `Today's lesson: practice patient exits. ${intelligence?.mostCommonRecentMistake ?? "Your recent winners are closing quickly."}`;
  }

  if (hermesMemory.behavior.overtradingDetected) {
    return "Today's lesson: reduce frequency. Your recent trades are clustered close together, so wait for a higher-quality setup.";
  }

  if (hermesMemory.performance.bestPerformingAsset !== "N/A") {
    return `Today's lesson: lean into what is working. ${intelligence?.biggestImprovement ?? `Your ${hermesMemory.performance.bestPerformingAsset} trades are currently strongest.`}`;
  }

  return dailyScroll.priority;
}

function buildLivingScroll({
  dailyScroll,
  hermesMemory,
  weeklyInsights,
  personalityTitle,
  intelligence,
}: {
  dailyScroll: DailyScroll;
  hermesMemory?: HermesMemorySnapshot;
  weeklyInsights?: PeriodInsight;
  personalityTitle: string;
  intelligence?: HermesIntelligenceLayer;
}): LivingScroll {
  if (!hermesMemory || hermesMemory.performance.totalTrades === 0) {
    return {
      title: "Protect Capital First",
      quote: "The first edge is restraint. The second is repetition.",
      insight:
        "Hermes Memory is waiting for completed paper trades before it can study your habits. Until then, your advantage is a clean plan before every click.",
      challenge:
        "Before your next paper trade, write one sentence for entry, stop-loss, take-profit, and why the trade deserves risk.",
      wisdomPoints: 10,
    };
  }

  if (hermesMemory.behavior.overtradingDetected) {
    return {
      title: "Trade Less, See More",
      quote: "A quiet trader often hears the market more clearly.",
      insight:
        `Your recent trades are arriving close together. ${intelligence?.mostCommonRecentMistake ?? "That can blur the difference between opportunity and motion."}`,
      challenge:
        "Take only one paper setup today, and require the full Trade Plan to be complete before execution.",
      wisdomPoints: calculateWisdomPoints(hermesMemory),
    };
  }

  if (hermesMemory.behavior.holdingWinnersTooShort) {
    return {
      title: "Let Winners Prove Themselves",
      quote: "Patience is not passivity. It is discipline with a clock.",
      insight:
        `Hermes Memory sees winners closing quickly. Biggest improvement: ${intelligence?.biggestImprovement ?? "give good trades room to reach the plan."}`,
      challenge:
        "On the next winning paper trade, hold until target, invalidation, or a written reason changes the thesis.",
      wisdomPoints: calculateWisdomPoints(hermesMemory),
    };
  }

  if (hermesMemory.behavior.revengeTradingDetected) {
    return {
      title: "Reset After Losses",
      quote: "A loss is information. A rushed follow-up is noise.",
      insight:
        "Your recent history shows trade bursts after losses. Hermes reads that as a cue to slow the next decision down.",
      challenge:
        "After the next losing paper trade, wait five minutes and rewrite the setup before placing another trade.",
      wisdomPoints: calculateWisdomPoints(hermesMemory),
    };
  }

  const bestAsset = hermesMemory.performance.bestPerformingAsset;
  const weeklyAction = weeklyInsights?.nextActions[0];

  return {
    title: `${personalityTitle}: Refine the Edge`,
    quote: "The market rewards clarity before confidence.",
    insight:
      bestAsset !== "N/A"
        ? `Your ${bestAsset} trades are currently the strongest part of your paper history. Discipline streak: ${intelligence?.disciplineStreak ?? 0}. Let that strength guide selection, not impulse.`
        : dailyScroll.coachingNote,
    challenge:
      weeklyAction ??
      "Choose one clean setup today, define the invalidation level, and review the result before taking another.",
    wisdomPoints: calculateWisdomPoints(hermesMemory),
  };
}

function calculateWisdomPoints(hermesMemory: HermesMemorySnapshot) {
  return Math.max(
    10,
    Math.round(
      hermesMemory.performance.totalTrades * 4 +
        hermesMemory.scores.discipline * 0.25 +
        hermesMemory.scores.riskManagement * 0.25 +
        hermesMemory.scores.patience * 0.2,
    ),
  );
}

function buildMemoryChecklist({
  dailyScroll,
  hermesMemory,
  weeklyInsights,
}: {
  dailyScroll: DailyScroll;
  hermesMemory?: HermesMemorySnapshot;
  weeklyInsights?: PeriodInsight;
}) {
  if (!hermesMemory || hermesMemory.performance.totalTrades === 0) {
    return [
      "Write the trade thesis before entry.",
      "Set stop-loss and take-profit before execution.",
      "Keep position size small while building sample size.",
    ];
  }

  return [
    weeklyInsights?.nextActions[0] ?? dailyScroll.checklist[0],
    hermesMemory.behavior.holdingWinnersTooShort
      ? "Let winners work until target or invalidation."
      : "Review whether exits match the original plan.",
    hermesMemory.behavior.overtradingDetected
      ? "Wait for one cleaner setup instead of trading every move."
      : "Confirm setup quality before adding exposure.",
  ];
}

function buildMemoryAvoid({
  dailyScroll,
  hermesMemory,
  intelligence,
}: {
  dailyScroll: DailyScroll;
  hermesMemory?: HermesMemorySnapshot;
  intelligence?: HermesIntelligenceLayer;
}) {
  if (!hermesMemory || hermesMemory.performance.totalTrades === 0) {
    return [
      "Avoid trading without a written invalidation level.",
      "Avoid increasing size before you have enough history.",
      "Avoid chasing candles after the move has already stretched.",
    ];
  }

  return [
    hermesMemory.behavior.revengeTradingDetected
      ? "Avoid placing follow-up trades immediately after a loss."
      : dailyScroll.avoid[0],
    hermesMemory.behavior.overtradingDetected
      ? "Avoid stacking trades close together without fresh confirmation."
      : dailyScroll.avoid[1],
    hermesMemory.performance.worstPerformingAsset !== "N/A"
      ? `Avoid forcing ${hermesMemory.performance.worstPerformingAsset} setups until execution improves.`
      : `Avoid repeating: ${intelligence?.mostCommonRecentMistake ?? "low-quality setups without a clear edge."}`,
  ];
}

function buildMemoryCoachingNote({
  dailyScroll,
  hermesMemory,
  weeklyInsights,
  intelligence,
}: {
  dailyScroll: DailyScroll;
  hermesMemory?: HermesMemorySnapshot;
  weeklyInsights?: PeriodInsight;
  intelligence?: HermesIntelligenceLayer;
}) {
  if (!hermesMemory || hermesMemory.performance.totalTrades === 0) {
    return "Hermes Memory is ready. Close paper trades to unlock personalized coaching from your own behavior.";
  }

  const weeklyRisk = weeklyInsights?.risks.find((risk) => !risk.startsWith("No major"));
  if (weeklyRisk) {
    return weeklyRisk;
  }

  return intelligence
    ? `${intelligence.biggestImprovement} Current discipline streak: ${intelligence.disciplineStreak}.`
    : hermesMemory.strengths[0] ?? dailyScroll.coachingNote;
}

function BrainList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.14em] text-slate-500">{title}</p>
      <ul className="mt-2 space-y-2">
        {items.map((item) => (
          <li className="flex gap-2 text-sm leading-5 text-slate-300" key={item}>
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-mint-300/80" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function scoreTone(score: number) {
  if (score >= 74) return "text-lg font-semibold text-mint-300";
  if (score >= 58) return "text-lg font-semibold text-amberline";
  return "text-lg font-semibold text-rose-300";
}
