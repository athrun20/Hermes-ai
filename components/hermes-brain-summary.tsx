import { BrainCircuit, ClipboardCheck, UserRound } from "lucide-react";
import type {
  DailyScroll,
  HermesMemory,
  OpportunityScannerResult,
  TradingPersonality,
} from "@/lib/hermes-brain";
import { Panel, PanelHeader } from "./ui";

export function HermesBrainSummary({
  dailyScroll,
  memory,
  scanner,
  personality,
}: {
  dailyScroll: DailyScroll;
  memory: HermesMemory;
  scanner: OpportunityScannerResult;
  personality: TradingPersonality;
}) {
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
            {dailyScroll.marketPosture} posture
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-200">{dailyScroll.priority}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <BrainList title="Checklist" items={dailyScroll.checklist.slice(0, 3)} />
            <BrainList title="Avoid" items={dailyScroll.avoid} />
          </div>
          <p className="mt-4 rounded-md border border-amberline/20 bg-amberline/10 p-3 text-sm leading-6 text-amber-100">
            {dailyScroll.coachingNote}
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
              <MiniStat label="Win rate" value={`${memory.winRate}%`} />
              <MiniStat label="Common type" value={memory.commonTradeType} />
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-300">{memory.coachingInsight}</p>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
          <div className="mb-3 flex items-center gap-2">
            <UserRound className="size-4 text-mint-300" aria-hidden="true" />
            <p className="text-sm font-semibold text-white">Trading Personality</p>
          </div>
          <p className="text-2xl font-semibold text-white">{personality.archetype}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <MiniStat label="Confidence style" value={personality.confidenceStyle} />
            <MiniStat label="Risk style" value={personality.riskStyle} />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <BrainList title="Strengths" items={personality.strengths} />
            <BrainList title="Blind spots" items={personality.blindSpots} />
          </div>
          <p className="mt-4 rounded-md border border-mint-300/20 bg-mint-300/10 p-3 text-sm leading-6 text-slate-200">
            {personality.coachingPrompt}
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
