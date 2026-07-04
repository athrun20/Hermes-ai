import { Activity, Dna, TrendingUp } from "lucide-react";
import type { HermesMemorySnapshot } from "@/lib/hermes-memory";
import { Panel, PanelHeader } from "./ui";

type TraderDnaProfile = {
  style: "Scalper" | "Day Trader" | "Swing Trader" | "Position Trader";
  strengths: string[];
  improvements: string[];
  disciplineScore: number;
  growthTrend: "Emerging" | "Improving" | "Stable" | "Needs Focus";
  coachingSummary: string;
  confidence: "Insufficient Data" | "Early Read" | "Reliable";
  sampleSize: number;
  onboarding: {
    isVisible: boolean;
    title: string;
    description: string;
    nextSteps: string[];
  };
};

type TraderDnaAnalyzer = (memory: HermesMemorySnapshot) => TraderDnaProfile;

const traderDnaAnalyzer: TraderDnaAnalyzer = buildRuleBasedTraderDna;

export function TraderDna({ memory }: { memory: HermesMemorySnapshot }) {
  const profile = traderDnaAnalyzer(memory);

  return (
    <Panel>
      <PanelHeader
        eyebrow="Hermes Memory"
        title="Trader DNA"
        action={<Dna className="size-5 text-mint-300" aria-hidden="true" />}
      />
      <div className="space-y-4 p-5">
        {profile.onboarding.isVisible ? <TraderDnaOnboarding profile={profile} /> : null}
        <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <section className="rounded-xl border border-white/10 bg-white/[0.045] p-5 transition duration-300 hover:border-mint-300/25 hover:bg-white/[0.06]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Trading Style
              </p>
              <p className="mt-3 text-3xl font-semibold tracking-[-0.02em] text-white">
                {profile.style}
              </p>
            </div>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold text-slate-300">
              {profile.confidence}
            </span>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            {getStyleDescription(profile.style, memory)}
          </p>

          <div className="mt-5 rounded-lg border border-white/10 bg-surface-950/45 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Discipline Score
                </p>
                <p className="mt-2 text-[30px] font-semibold leading-none tracking-[-0.02em] text-white">
                  {profile.disciplineScore}
                </p>
              </div>
              <div className="relative size-16 rounded-full border border-white/10 bg-white/[0.04] p-1">
                <div
                  className={`h-full rounded-full ${getScoreRing(profile.disciplineScore)}`}
                  style={{
                    clipPath: `inset(${100 - profile.disciplineScore}% 0 0 0 round 999px)`,
                  }}
                />
                <div className="absolute inset-2 rounded-full bg-surface-950" />
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <DnaCard title="Strengths" items={profile.strengths} tone="mint" />
          <DnaCard title="Areas to Improve" items={profile.improvements} tone="amber" />
          <div className="rounded-xl border border-white/10 bg-white/[0.045] p-5 transition duration-300 hover:border-white/20 hover:bg-white/[0.06]">
            <div className="flex items-center gap-2">
              <TrendingUp className="size-4 text-mint-300" aria-hidden="true" />
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Growth Trend
              </p>
            </div>
            <p className={`mt-3 text-2xl font-semibold ${getGrowthColor(profile.growthTrend)}`}>
              {profile.growthTrend}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              {getGrowthDescription(profile.growthTrend)}
            </p>
          </div>
          <div className="rounded-xl border border-mint-300/15 bg-mint-300/[0.055] p-5 transition duration-300 hover:border-mint-300/30">
            <div className="flex items-center gap-2">
              <Activity className="size-4 text-mint-300" aria-hidden="true" />
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-mint-300/80">
                Hermes Coaching Summary
              </p>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-200">
              {profile.coachingSummary}
            </p>
          </div>
        </section>
        </div>
      </div>
    </Panel>
  );
}

function TraderDnaOnboarding({ profile }: { profile: TraderDnaProfile }) {
  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.035] p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-mint-300/80">
            Learning Phase
          </p>
          <h3 className="mt-2 text-xl font-semibold tracking-tight text-white">
            {profile.onboarding.title}
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            {profile.onboarding.description}
          </p>
        </div>
        <div className="rounded-lg border border-white/10 bg-surface-950/45 px-4 py-3">
          <p className="text-xs text-slate-500">Completed trades</p>
          <p className="mt-1 text-2xl font-semibold text-white">{profile.sampleSize}</p>
        </div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {profile.onboarding.nextSteps.map((step) => (
          <div className="rounded-lg border border-white/10 bg-surface-950/35 p-3" key={step}>
            <p className="text-sm leading-6 text-slate-300">{step}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function DnaCard({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "mint" | "amber";
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.045] p-5 transition duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.06]">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
        {title}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {items.map((item) => (
          <span
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${getPillTone(tone)}`}
            key={item}
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function buildRuleBasedTraderDna(memory: HermesMemorySnapshot): TraderDnaProfile {
  const style = detectTradingStyle(memory);
  const strengths = detectStrengthLabels(memory);
  const improvements = detectImprovementLabels(memory);
  const disciplineScore = memory.scores.discipline;
  const growthTrend = detectGrowthTrend(memory);
  const confidence = getAnalysisConfidence(memory.performance.totalTrades);

  return {
    style,
    strengths,
    improvements,
    disciplineScore,
    growthTrend,
    confidence,
    sampleSize: memory.performance.totalTrades,
    onboarding: buildOnboardingState(memory.performance.totalTrades),
    coachingSummary: buildCoachingSummary({
      memory,
      style,
      strengths,
      improvements,
      growthTrend,
    }),
  };
}

function detectTradingStyle(memory: HermesMemorySnapshot): TraderDnaProfile["style"] {
  if (memory.performance.totalTrades < 3) return "Day Trader";

  const averageHold = memory.performance.averageHoldMinutes;
  const dominantStyle = memory.strategyPreference.dominantStyle;

  if (dominantStyle === "scalper" || averageHold <= 15) return "Scalper";
  if (averageHold >= 1440) return "Position Trader";
  if (dominantStyle === "swing" || averageHold >= 240) return "Swing Trader";
  return "Day Trader";
}

function detectStrengthLabels(memory: HermesMemorySnapshot) {
  if (memory.performance.totalTrades < 3) {
    return ["Planning Readiness", "Paper Trading Practice", "Risk Awareness"];
  }

  const strengths: string[] = [];

  if (memory.strategyPreference.dominantStyle === "breakout") strengths.push("Trend Following");
  if (memory.scores.patience >= 70) strengths.push("Patience");
  if (memory.scores.riskManagement >= 70) strengths.push("Risk Management");
  if (!memory.behavior.holdingWinnersTooShort && memory.performance.totalTrades > 0) {
    strengths.push("Holding Winners");
  }
  if (memory.performance.winRate >= 55) strengths.push("Setup Selection");

  return fillLabels(strengths, ["Trend Following", "Risk Management", "Patience"], 4);
}

function detectImprovementLabels(memory: HermesMemorySnapshot) {
  if (memory.performance.totalTrades < 3) {
    return ["Build Sample Size", "Complete Trade Plans", "Review Every Close"];
  }

  const improvements: string[] = [];

  if (memory.behavior.earlyExitsFrequency >= 25) improvements.push("FOMO Entries");
  if (memory.behavior.overtradingDetected) improvements.push("Overtrading");
  if (memory.scores.riskManagement < 65) improvements.push("Moving Stop Loss");
  if (memory.behavior.holdingWinnersTooShort) improvements.push("Closing Winners Too Early");
  if (memory.scores.discipline < 65) improvements.push("Plan Discipline");

  return fillLabels(
    improvements,
    ["FOMO Entries", "Overtrading", "Moving Stop Loss", "Closing Winners Too Early"],
    4,
  );
}

function detectGrowthTrend(memory: HermesMemorySnapshot): TraderDnaProfile["growthTrend"] {
  if (memory.performance.totalTrades < 3) return "Emerging";
  if (memory.scores.discipline >= 75 && memory.scores.riskManagement >= 70) return "Improving";
  if (memory.behavior.overtradingDetected || memory.behavior.revengeTradingDetected) return "Needs Focus";
  return "Stable";
}

function getAnalysisConfidence(tradeCount: number): TraderDnaProfile["confidence"] {
  if (tradeCount < 3) return "Insufficient Data";
  if (tradeCount < 10) return "Early Read";
  return "Reliable";
}

function buildOnboardingState(tradeCount: number): TraderDnaProfile["onboarding"] {
  const isVisible = tradeCount < 3;

  return {
    isVisible,
    title: isVisible ? "Hermes is still learning your trading DNA." : "Trader DNA is active.",
    description: isVisible
      ? "Complete a few paper trades and Hermes will begin separating signal from noise: style, strengths, discipline, and recurring habits."
      : "Hermes has enough completed paper trades to generate a working behavioral profile.",
    nextSteps: [
      "Close at least three paper trades with entry, stop, and target defined.",
      "Use the journal to label setup type and emotional context.",
      "Review the coach feedback after each completed trade.",
    ],
  };
}

function buildCoachingSummary({
  memory,
  style,
  strengths,
  improvements,
  growthTrend,
}: {
  memory: HermesMemorySnapshot;
  style: TraderDnaProfile["style"];
  strengths: string[];
  improvements: string[];
  growthTrend: TraderDnaProfile["growthTrend"];
}) {
  if (memory.performance.totalTrades < 3) {
    return "Hermes needs a few completed paper trades before drawing strong conclusions. For now, the best signal is consistency: plan, execute, review.";
  }

  return `Hermes sees a ${style.toLowerCase()} profile with ${strengths[0].toLowerCase()} as a useful edge. Growth is ${growthTrend.toLowerCase()}; the next constraint to improve is ${improvements[0].toLowerCase()}.`;
}

function fillLabels(current: string[], fallback: string[], targetCount: number) {
  const labels = [...current];
  fallback.forEach((item) => {
    if (labels.length < targetCount && !labels.includes(item)) {
      labels.push(item);
    }
  });
  return labels.slice(0, targetCount);
}

function getStyleDescription(style: TraderDnaProfile["style"], memory: HermesMemorySnapshot) {
  if (memory.performance.totalTrades < 3) {
    return "This is a placeholder read. Hermes will classify your style once completed paper trades create enough behavioral evidence.";
  }

  if (style === "Scalper") return "Fast execution, short holds, and frequent decision points.";
  if (style === "Swing Trader") return "Longer holds with patience around broader price movement.";
  if (style === "Position Trader") return "Slow, thesis-led trades that depend on patience and conviction.";
  return "Intraday decision-making with room for structure and selectivity.";
}

function getScoreRing(score: number) {
  if (score >= 75) return "bg-mint-300";
  if (score >= 55) return "bg-amberline";
  return "bg-rose-300";
}

function getGrowthColor(growthTrend: TraderDnaProfile["growthTrend"]) {
  if (growthTrend === "Improving") return "text-mint-300";
  if (growthTrend === "Needs Focus") return "text-rose-300";
  if (growthTrend === "Emerging") return "text-amberline";
  return "text-slate-100";
}

function getGrowthDescription(growthTrend: TraderDnaProfile["growthTrend"]) {
  if (growthTrend === "Improving") return "Discipline and risk process are moving in the right direction.";
  if (growthTrend === "Needs Focus") return "Recent behavior shows patterns that deserve slower decisions.";
  if (growthTrend === "Emerging") return "More paper trades will make this profile sharper.";
  return "Your profile is consistent; refine one weakness at a time.";
}

function getPillTone(tone: "mint" | "amber") {
  if (tone === "mint") return "border-mint-300/20 bg-mint-300/10 text-mint-200";
  return "border-amberline/20 bg-amberline/10 text-amber-100";
}
