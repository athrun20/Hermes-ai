"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Minimize2 } from "lucide-react";
import type { SymbolAnalysis } from "@/lib/symbol-analysis-engine";
import { InsightCard, Panel, ProgressBar, StatusPill } from "@/components/ui";
import type { HermesScoreResult } from "@/lib/hermes-score-types";
import type { NewsIntelligenceResult } from "@/lib/news-types";
import type { HermesMemorySnapshot, PeriodInsight, TradingPersonalityProfile } from "@/lib/hermes-memory";
import type { ClosedTrade } from "@/lib/paper-trading";
import { HermesLiveTimelinePanel } from "@/components/workspace/timeline-panel";
import type { HermesLiveIntelligence } from "@/lib/hermes-live-engine";
import { HermesReasoningPanel } from "@/components/workspace/hermes-reasoning-panel";
import type { ReasoningResult } from "@/lib/reasoning-types";
import {
  buildRiskMeter,
  buildSessionReport,
  buildSmartMarketEvents,
  buildTraderDnaEvolution,
  buildWeeklyMentorReview,
  buildWeightedConfidenceEngine,
  type MentorReport,
  type RiskMeterResult,
  type SmartMarketEvent,
  type TraderDnaEvolution,
  type WeightedConfidenceEngineResult,
} from "@/lib/hermes-mentor-intelligence";
import { HermesScoreBreakdown } from "@/components/hermes-score-breakdown";
import type { StrategyIntelligenceResult } from "@/lib/strategy-types";
import type { MultiTimeframeIntelligence } from "@/lib/multi-timeframe-types";
import type { InstitutionalFootprintResult } from "@/lib/footprint-types";
import { StrategyPanel } from "@/components/workspace/strategy-panel";
import { TimeframeAlignmentMatrix } from "@/components/workspace/timeframe-alignment-matrix";
import { FootprintPanel } from "@/components/workspace/footprint-panel";

type DockMode = "compact" | "expanded" | "collapsed";

export function FloatingAnalysis({
  analysis,
  hermesScore,
  reasoning,
  chartConfidenceDelta = 0,
  newsIntelligence,
  liveIntelligence,
  memory,
  weeklyInsights,
  tradingPersonality,
  history,
  strategy,
  multiTimeframe,
  footprint,
}: {
  analysis: SymbolAnalysis;
  hermesScore: HermesScoreResult;
  reasoning: ReasoningResult;
  chartConfidenceDelta?: number;
  newsIntelligence: NewsIntelligenceResult;
  liveIntelligence: HermesLiveIntelligence;
  memory: HermesMemorySnapshot;
  weeklyInsights: PeriodInsight;
  tradingPersonality: TradingPersonalityProfile;
  history: ClosedTrade[];
  strategy?: StrategyIntelligenceResult;
  multiTimeframe?: MultiTimeframeIntelligence;
  footprint?: InstitutionalFootprintResult;
}) {
  const [mode, setMode] = useState<DockMode>("compact");
  const [showReasoning, setShowReasoning] = useState(false);
  const [showMoreContext, setShowMoreContext] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  const confidence = buildWeightedConfidenceEngine({
    hermesScore,
    news: newsIntelligence,
    reasoning,
    chartConfidenceDelta,
  });
  const riskMeter = buildRiskMeter({ confidence, news: newsIntelligence, memory });
  const smartEvents = buildSmartMarketEvents(newsIntelligence);
  const traderDna = buildTraderDnaEvolution({ memory, personality: tradingPersonality });
  const sessionReport = buildSessionReport({ history, memory });
  const weeklyReview = buildWeeklyMentorReview({ weekly: weeklyInsights, memory });

  const coachingLine =
    reasoning.coachingMessage ||
    reasoning.reasoningSummary ||
    "Hermes is watching structure and risk before recommending action.";

  if (mode === "collapsed") {
    return (
      <button
        className="w-full rounded-lg border border-white/10 bg-surface-950/55 px-3.5 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-mint-300 transition hover:border-mint-300/25 hover:bg-mint-300/10"
        onClick={() => setMode("compact")}
        type="button"
      >
        Hermes Analysis
      </button>
    );
  }

  return (
    <Panel className="overflow-hidden bg-surface-950/60 shadow-xl shadow-black/15">
      <div className="flex items-start justify-between gap-3 border-b border-white/10 px-3.5 py-2.5">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-mint-300/75">
            Coach
          </p>
          <h2 className="mt-0.5 text-sm font-semibold tracking-tight text-white">
            {analysis.symbol}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <StatusPill tone={getBiasTone(analysis.marketBias)}>{analysis.marketBias}</StatusPill>
          <button
            className="grid size-8 place-items-center rounded-md border border-white/10 bg-white/[0.035] text-slate-400 transition hover:text-white"
            onClick={() => setMode(mode === "expanded" ? "compact" : "expanded")}
            type="button"
            aria-label={mode === "expanded" ? "Compact analysis" : "Expand analysis"}
          >
            {mode === "expanded" ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </button>
          <button
            className="grid size-8 place-items-center rounded-md border border-white/10 bg-white/[0.035] text-slate-400 transition hover:text-white"
            onClick={() => setMode("collapsed")}
            type="button"
            aria-label="Collapse analysis dock"
          >
            <Minimize2 className="size-4" />
          </button>
        </div>
      </div>

      <div className="hermes-scroll max-h-[min(70vh,880px)] space-y-2.5 overflow-y-auto p-3">
        <InsightCard title="Hermes says" tone="gold" className="hermes-fade-in">
          <p className="line-clamp-3 text-sm leading-5">{coachingLine}</p>
        </InsightCard>

        <RiskMeterPanel meter={riskMeter} compact />

        <HermesLiveTimelinePanel intelligence={liveIntelligence} />

        <div className="rounded-lg border border-white/10 bg-white/[0.025]">
          <button
            className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-xs font-semibold text-slate-300 transition hover:text-white"
            onClick={() => setShowReasoning((current) => !current)}
            type="button"
          >
            Reasoning detail
            <span className="text-slate-500">{showReasoning ? "Hide" : "Show"}</span>
          </button>
          {showReasoning ? (
            <div className="border-t border-white/10 p-2">
              <HermesReasoningPanel reasoning={reasoning} />
            </div>
          ) : null}
        </div>

        {strategy && multiTimeframe && footprint ? (
          <div className="rounded-lg border border-white/10 bg-white/[0.025]">
            <button
              className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-xs font-semibold text-slate-300 transition hover:text-white"
              onClick={() => setShowMoreContext((current) => !current)}
              type="button"
            >
              More context
              <span className="text-slate-500">{showMoreContext ? "Hide" : "Show"}</span>
            </button>
            {showMoreContext ? (
              <div className="space-y-2 border-t border-white/10 p-2">
                <p className="px-1 text-[10px] leading-4 text-slate-600">
                  Full Strategy, Multi-Timeframe, and Footprint panels. Compact cards under the chart
                  remain the default evidence surface.
                </p>
                <StrategyPanel strategy={strategy} />
                <TimeframeAlignmentMatrix intelligence={multiTimeframe} />
                <FootprintPanel footprint={footprint} />
              </div>
            ) : null}
          </div>
        ) : null}

        {mode === "expanded" || showDiagnostics ? (
          <div className="space-y-3">
            <button
              className="text-[11px] font-semibold text-slate-500 transition hover:text-white"
              onClick={() => setShowDiagnostics((current) => !current)}
              type="button"
            >
              {showDiagnostics || mode === "expanded" ? "Deeper diagnostics" : "Show diagnostics"}
            </button>
            {(showDiagnostics || mode === "expanded") && (
              <>
                <HermesConfidenceEnginePanel confidence={confidence} />
                <SmartMarketEventsPanel events={smartEvents} />
                <TraderDnaEvolutionPanel profile={traderDna} />
                <MentorReportsPanel sessionReport={sessionReport} weeklyReview={weeklyReview} />
                <div className="rounded-lg border border-white/10 bg-white/[0.025] p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Hermes Score (secondary)
                  </p>
                  <HermesScoreBreakdown score={hermesScore} />
                </div>
              </>
            )}
          </div>
        ) : (
          <button
            className="w-full rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-semibold text-slate-400 transition hover:text-white"
            onClick={() => setShowDiagnostics(true)}
            type="button"
          >
            Optional deeper diagnostics
          </button>
        )}
      </div>
    </Panel>
  );
}

function getBiasTone(bias: SymbolAnalysis["marketBias"]) {
  if (bias === "Bullish") return "mint";
  if (bias === "Bearish") return "danger";
  return "gold";
}

function HermesConfidenceEnginePanel({
  confidence,
}: {
  confidence: WeightedConfidenceEngineResult;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.025] p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amberline/80">
            Confidence components
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-500">Secondary diagnostic breakdown.</p>
        </div>
        <StatusPill tone={confidence.score >= 80 ? "mint" : confidence.score >= 60 ? "gold" : "danger"}>
          {confidence.score}
        </StatusPill>
      </div>
      <div className="mt-3 space-y-2.5">
        {confidence.components.map((item) => (
          <button
            className="w-full rounded-lg border border-white/10 bg-surface-950/45 px-3 py-2.5 text-left transition hover:border-white/20"
            key={item.name}
            onClick={() => setExpanded((current) => (current === item.name ? null : item.name))}
            type="button"
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-xs font-semibold text-white">{item.name}</p>
              <span className="font-mono text-xs text-slate-400">
                {item.score} · {Math.round(item.weight * 100)}%
              </span>
            </div>
            <ProgressBar value={item.score} tone={item.score >= 75 ? "mint" : item.score >= 55 ? "gold" : "danger"} />
            {expanded === item.name ? (
              <div className="mt-2 space-y-1 border-t border-white/10 pt-2">
                {item.details.map((detail) => (
                  <p className="text-[11px] leading-4 text-slate-400" key={detail}>
                    {detail}
                  </p>
                ))}
              </div>
            ) : null}
          </button>
        ))}
      </div>
    </div>
  );
}

function RiskMeterPanel({ meter, compact = false }: { meter: RiskMeterResult; compact?: boolean }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.025] p-3.5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-200/80">Risk</p>
          <p className="mt-1 text-sm font-semibold text-white">{meter.label} risk posture</p>
        </div>
        <div className="grid size-12 place-items-center rounded-full border border-white/10 bg-surface-950/60">
          <span
            className={
              meter.overall >= 70
                ? "font-mono text-sm font-semibold text-mint-300"
                : meter.overall >= 50
                  ? "font-mono text-sm font-semibold text-amberline"
                  : "font-mono text-sm font-semibold text-rose-300"
            }
          >
            {meter.overall}
          </span>
        </div>
      </div>
      {!compact ? (
        <div className="mt-3 space-y-2.5">
          {meter.components.map((item) => (
            <div key={item.label}>
              <div className="mb-1 flex items-center justify-between gap-3">
                <p className="text-xs font-semibold text-slate-300">{item.label}</p>
                <p className="font-mono text-xs text-slate-400">{item.score}</p>
              </div>
              <ProgressBar value={item.score} tone={item.score >= 70 ? "mint" : item.score >= 50 ? "gold" : "danger"} />
              <p className="mt-1 text-[11px] leading-4 text-slate-500">{item.reason}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">
          {meter.components[0]?.reason ?? "Risk posture reflects confidence, news, and memory context."}
        </p>
      )}
    </div>
  );
}

function SmartMarketEventsPanel({ events }: { events: SmartMarketEvent[] }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.025] p-3.5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amberline/80">
        Smart Market Events
      </p>
      <div className="mt-3 space-y-2.5">
        {events.slice(0, 3).map((event) => (
          <div className="rounded-lg border border-white/10 bg-surface-950/45 p-3" key={event.id}>
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill tone={event.urgency === "High" ? "danger" : event.urgency === "Medium" ? "gold" : "muted"}>
                {event.eventType}
              </StatusPill>
              <StatusPill tone={event.sentiment === "Positive" ? "mint" : event.sentiment === "Negative" ? "danger" : "muted"}>
                {event.sentiment}
              </StatusPill>
            </div>
            <p className="mt-2 text-xs font-semibold text-white">{event.headline}</p>
            <p className="mt-1 text-[11px] leading-4 text-slate-500">{event.impact}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function TraderDnaEvolutionPanel({ profile }: { profile: TraderDnaEvolution }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.025] p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-mint-300/80">
            Trader DNA
          </p>
          <p className="mt-1 text-sm font-semibold text-white">{profile.style}</p>
        </div>
        <StatusPill tone={profile.confidence === "Reliable" ? "mint" : profile.confidence === "Developing" ? "gold" : "muted"}>
          {profile.confidence}
        </StatusPill>
      </div>
      <p className="mt-2 text-xs leading-5 text-slate-400">{profile.improvementSignal}</p>
    </div>
  );
}

function MentorReportsPanel({
  sessionReport,
  weeklyReview,
}: {
  sessionReport: MentorReport;
  weeklyReview: MentorReport;
}) {
  return (
    <div className="grid gap-2">
      <div className="rounded-xl border border-white/10 bg-white/[0.025] p-3.5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            {sessionReport.title}
          </p>
          <span className="font-semibold text-white">{sessionReport.grade}</span>
        </div>
        <p className="mt-2 text-xs leading-5 text-slate-300">{sessionReport.summary}</p>
      </div>
      <div className="rounded-xl border border-white/10 bg-white/[0.025] p-3.5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            {weeklyReview.title}
          </p>
          <span className="font-semibold text-white">{weeklyReview.grade}</span>
        </div>
        <p className="mt-2 text-xs leading-5 text-slate-300">{weeklyReview.summary}</p>
      </div>
    </div>
  );
}
