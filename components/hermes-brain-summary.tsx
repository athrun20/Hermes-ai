import { BrainCircuit, ClipboardCheck, UserRound } from "lucide-react";
import type {
  DailyScroll,
  HermesMemory,
  OpportunityScannerResult,
  TradingPersonality,
} from "@/lib/hermes-brain";
import type {
  HermesMemorySnapshot,
  PeriodInsight,
  TradingPersonalityProfile,
} from "@/lib/hermes-memory";
import { Panel, PanelHeader } from "./ui";

export function HermesBrainSummary({
  dailyScroll,
  memory,
  scanner,
  personality,
  hermesMemory,
  weeklyInsights,
  memoryPersonality,
}: {
  dailyScroll: DailyScroll;
  memory: HermesMemory;
  scanner: OpportunityScannerResult;
  personality: TradingPersonality;
  hermesMemory?: HermesMemorySnapshot;
  weeklyInsights?: PeriodInsight;
  memoryPersonality?: TradingPersonalityProfile;
}) {
  const hasMemoryHistory = Boolean(hermesMemory && hermesMemory.performance.totalTrades > 0);
  const personalityTitle = memoryPersonality?.archetype ?? personality.archetype;
  const strengths = memoryPersonality?.strengths ?? personality.strengths;
  const blindSpots = memoryPersonality?.blindSpots ?? personality.blindSpots;

  return (
    <Panel>
      <PanelHeader
        eyebrow="Hermes Brain"
        title="Daily Scroll & Trading Personality"
        action={<BrainCircuit className="size-5 text-mint-300" aria-hidden="true" />}
      />
      <div className="grid gap-4 p-5 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
          <div className="mb-3 flex items-center gap-2">
            <ClipboardCheck className="size-4 text-mint-300" aria-hidden="true" />
            <p className="text-sm font-semibold text-white">Daily Scroll Preview</p>
          </div>
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
            {hasMemoryHistory ? `${hermesMemory?.personality} posture` : `${dailyScroll.marketPosture} posture`}
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-200">
            {buildMemoryScrollPriority({ dailyScroll, hermesMemory })}
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <BrainList
              title="Checklist"
              items={buildMemoryChecklist({ dailyScroll, hermesMemory, weeklyInsights })}
            />
            <BrainList title="Avoid" items={buildMemoryAvoid({ dailyScroll, hermesMemory })} />
          </div>
          <p className="mt-4 rounded-md border border-amberline/20 bg-amberline/10 p-3 text-sm leading-6 text-amber-100">
            {buildMemoryCoachingNote({ dailyScroll, hermesMemory, weeklyInsights })}
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
}: {
  dailyScroll: DailyScroll;
  hermesMemory?: HermesMemorySnapshot;
}) {
  if (!hermesMemory || hermesMemory.performance.totalTrades === 0) {
    return "Beginner wisdom: protect capital first. Define entry, stop, target, and reason before every paper trade.";
  }

  if (hermesMemory.behavior.holdingWinnersTooShort) {
    return "Today's lesson: practice patient exits. Your recent winners are closing quickly, so let the next clean setup reach target or invalidation.";
  }

  if (hermesMemory.behavior.overtradingDetected) {
    return "Today's lesson: reduce frequency. Your recent trades are clustered close together, so wait for a higher-quality setup.";
  }

  if (hermesMemory.performance.bestPerformingAsset !== "N/A") {
    return `Today's lesson: lean into what is working. Your ${hermesMemory.performance.bestPerformingAsset} trades are currently the strongest part of your paper history.`;
  }

  return dailyScroll.priority;
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
}: {
  dailyScroll: DailyScroll;
  hermesMemory?: HermesMemorySnapshot;
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
      : "Avoid low-quality setups without a clear edge.",
  ];
}

function buildMemoryCoachingNote({
  dailyScroll,
  hermesMemory,
  weeklyInsights,
}: {
  dailyScroll: DailyScroll;
  hermesMemory?: HermesMemorySnapshot;
  weeklyInsights?: PeriodInsight;
}) {
  if (!hermesMemory || hermesMemory.performance.totalTrades === 0) {
    return "Hermes Memory is ready. Close paper trades to unlock personalized coaching from your own behavior.";
  }

  const weeklyRisk = weeklyInsights?.risks.find((risk) => !risk.startsWith("No major"));
  if (weeklyRisk) {
    return weeklyRisk;
  }

  return hermesMemory.strengths[0] ?? dailyScroll.coachingNote;
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
