"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Minimize2 } from "lucide-react";
import { formatCurrency } from "@/lib/market-data";
import type { SymbolAnalysis } from "@/lib/symbol-analysis-engine";
import { InsightCard, MetricCard, Panel, ProgressBar, StatusPill } from "@/components/ui";
import { HermesScoreBreakdown } from "@/components/hermes-score-breakdown";
import { HermesScoreBadge } from "@/components/hermes-score-badge";
import type { HermesScoreResult } from "@/lib/hermes-score-types";
import type { NewsIntelligenceResult } from "@/lib/news-types";
import type { HermesMemorySnapshot, PeriodInsight, TradingPersonalityProfile } from "@/lib/hermes-memory";
import type { ClosedTrade } from "@/lib/paper-trading";
import type { HermesVisionResult } from "@/lib/hermes-vision-types";
import {
  buildHermesTimeline,
  buildRiskMeter,
  buildSessionReport,
  buildSmartMarketEvents,
  buildTraderDnaEvolution,
  buildWeeklyMentorReview,
  buildWeightedConfidenceEngine,
  type HermesTimelineItem,
  type MentorReport,
  type RiskMeterResult,
  type SmartMarketEvent,
  type TraderDnaEvolution,
  type WeightedConfidenceEngineResult,
} from "@/lib/hermes-mentor-intelligence";

type DockMode = "compact" | "expanded" | "collapsed";

export function FloatingAnalysis({
  analysis,
  hermesScore,
  newsIntelligence,
  vision,
  memory,
  weeklyInsights,
  tradingPersonality,
  history,
}: {
  analysis: SymbolAnalysis;
  hermesScore: HermesScoreResult;
  newsIntelligence: NewsIntelligenceResult;
  vision: HermesVisionResult;
  memory: HermesMemorySnapshot;
  weeklyInsights: PeriodInsight;
  tradingPersonality: TradingPersonalityProfile;
  history: ClosedTrade[];
}) {
  const [mode, setMode] = useState<DockMode>("compact");
  const confidence = buildWeightedConfidenceEngine({ hermesScore, news: newsIntelligence });
  const riskMeter = buildRiskMeter({ confidence, news: newsIntelligence, memory });
  const timeline = buildHermesTimeline({ confidence, vision, news: newsIntelligence, memory });
  const smartEvents = buildSmartMarketEvents(newsIntelligence);
  const traderDna = buildTraderDnaEvolution({ memory, personality: tradingPersonality });
  const sessionReport = buildSessionReport({ history, memory });
  const weeklyReview = buildWeeklyMentorReview({ weekly: weeklyInsights, memory });

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
      <div className="flex items-start justify-between gap-3 border-b border-white/10 px-4 py-3.5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-mint-300/75">
            Hermes Analysis
          </p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight text-white">
            {analysis.symbol} Mentor Read
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <StatusPill tone={getBiasTone(analysis.marketBias)}>{analysis.marketBias}</StatusPill>
          <HermesScoreBadge score={hermesScore} />
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

      <div className="space-y-3 p-4">
        <div className="grid grid-cols-2 gap-2.5">
          <MetricCard label="Confidence" value={`${analysis.confidence}%`} tone={analysis.confidence >= 75 ? "mint" : "gold"} />
          <MetricCard label="Risk" value={analysis.riskLevel} tone={analysis.riskLevel === "High" ? "danger" : analysis.riskLevel === "Medium" ? "gold" : "mint"} />
        </div>
        <InsightCard title="Hermes Says" tone="gold">
          {confidence.explanation}
        </InsightCard>
        <HermesConfidenceEnginePanel confidence={confidence} />
        <RiskMeterPanel meter={riskMeter} />
        <HermesTimelinePanel items={timeline} />

        {mode === "expanded" ? (
          <>
            <div className="grid grid-cols-2 gap-2.5">
              <MetricCard label="Trend" value={analysis.trend} tone="muted" />
              <MetricCard label="Momentum" value={analysis.momentum} tone="muted" />
              <MetricCard label="Volume" value={analysis.volumeRead} tone="muted" />
              <MetricCard label="Support" value={formatCurrency(analysis.support)} tone="neutral" />
              <MetricCard label="Resistance" value={formatCurrency(analysis.resistance)} tone="neutral" />
              <MetricCard label="Beginner Fit" value={analysis.beginnerFit} tone={analysis.beginnerFit === "Yes" ? "mint" : analysis.beginnerFit === "No" ? "danger" : "gold"} />
            </div>
            <InsightCard title="Suggested Action" tone="mint">
              {analysis.suggestedAction}
            </InsightCard>
            <SmartMarketEventsPanel events={smartEvents} />
            <TraderDnaEvolutionPanel profile={traderDna} />
            <MentorReportsPanel sessionReport={sessionReport} weeklyReview={weeklyReview} />
            <HermesScoreBreakdown score={hermesScore} />
          </>
        ) : null}
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
    <div className="rounded-xl border border-white/10 bg-white/[0.025] p-3.5 transition duration-300 hover:border-amberline/20">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amberline/80">
            Hermes Confidence Engine
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Confidence changes as market quality, risk, and catalysts improve or weaken.
          </p>
        </div>
        <StatusPill tone={confidence.score >= 80 ? "mint" : confidence.score >= 60 ? "gold" : "danger"}>
          {confidence.score}
        </StatusPill>
      </div>
      <div className="mt-3 space-y-2.5">
        {confidence.components.map((item) => (
          <button
            className="w-full rounded-lg border border-white/10 bg-surface-950/45 px-3 py-2.5 text-left transition duration-200 hover:border-white/20 hover:bg-white/[0.045]"
            key={item.name}
            onClick={() => setExpanded((current) => (current === item.name ? null : item.name))}
            type="button"
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-white">{item.name}</p>
                <p className="mt-0.5 text-[11px] text-slate-500">{item.reason}</p>
              </div>
              <span className={item.score >= 75 ? "font-mono text-xs font-semibold text-mint-300" : item.score >= 55 ? "font-mono text-xs font-semibold text-amberline" : "font-mono text-xs font-semibold text-rose-300"}>
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
                <p className="text-[11px] font-semibold text-slate-500">
                  Weighted contribution: {item.contribution} points.
                </p>
              </div>
            ) : null}
          </button>
        ))}
      </div>
    </div>
  );
}

function RiskMeterPanel({ meter }: { meter: RiskMeterResult }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.025] p-3.5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-200/80">
            Visual Risk Meter
          </p>
          <p className="mt-1 text-sm font-semibold text-white">{meter.label} risk posture</p>
        </div>
        <div className="grid size-14 place-items-center rounded-full border border-white/10 bg-surface-950/60">
          <span className={meter.overall >= 70 ? "font-mono text-sm font-semibold text-mint-300" : meter.overall >= 50 ? "font-mono text-sm font-semibold text-amberline" : "font-mono text-sm font-semibold text-rose-300"}>
            {meter.overall}
          </span>
        </div>
      </div>
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
    </div>
  );
}

function HermesTimelinePanel({ items }: { items: HermesTimelineItem[] }) {
  const [feed, setFeed] = useState<HermesTimelineItem[]>(items);

  useEffect(() => {
    setFeed((current) => {
      const incoming = items.filter((item) => !current.some((existing) => existing.id === item.id));
      if (incoming.length === 0) return current;
      return [...incoming, ...current].slice(0, 8);
    });
  }, [items]);

  return (
    <div className="rounded-xl border border-white/10 bg-surface-950/40 p-3.5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-mint-300/80">
        Live Hermes Timeline
      </p>
      <div className="mt-3 space-y-2.5">
        {feed.map((item) => (
          <div className="rounded-lg border border-white/10 bg-white/[0.025] p-3 transition duration-300 hover:-translate-y-0.5 hover:border-white/20" key={item.id}>
            <div className="flex items-center justify-between gap-3">
              <StatusPill tone={item.tone}>{item.category}</StatusPill>
              <span className="font-mono text-[10px] text-slate-600">{item.time}</span>
            </div>
            <p className="mt-2 text-xs font-semibold text-white">{item.title}</p>
            <p className="mt-1 text-xs leading-5 text-slate-400">{item.message}</p>
          </div>
        ))}
      </div>
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
            <p className="mt-2 text-xs font-semibold leading-5 text-white">{event.headline}</p>
            <p className="mt-1 text-xs leading-5 text-slate-400">{event.summary}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {event.keywords.slice(0, 5).map((keyword) => (
                <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold ${keyword.tone === "positive" ? "border-mint-300/20 bg-mint-300/10 text-mint-200" : keyword.tone === "risk" ? "border-rose-300/20 bg-rose-400/10 text-rose-200" : "border-amberline/20 bg-amberline/10 text-amber-100"}`} key={`${event.id}-${keyword.keyword}`}>
                  {keyword.keyword}
                </span>
              ))}
            </div>
            <p className="mt-2 text-[11px] leading-4 text-slate-500">{event.impact}</p>
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
            Trader DNA Evolution
          </p>
          <p className="mt-1 text-sm font-semibold text-white">{profile.style}</p>
        </div>
        <StatusPill tone={profile.confidence === "Reliable" ? "mint" : profile.confidence === "Developing" ? "gold" : "muted"}>
          {profile.confidence}
        </StatusPill>
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-400">{profile.improvementSignal}</p>
      <DnaMiniList title="Strengths" items={profile.strengths} tone="mint" />
      <DnaMiniList title="Weaknesses" items={profile.weaknesses} tone="danger" />
      <DnaMiniList title="Recommended setups" items={profile.recommendedSetups} tone="gold" />
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
    <div className="grid gap-3">
      <ReportCard report={sessionReport} />
      <ReportCard report={weeklyReview} />
    </div>
  );
}

function ReportCard({ report }: { report: MentorReport }) {
  return (
    <div className="rounded-xl border border-white/10 bg-surface-950/45 p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amberline/80">
            {report.title}
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-400">{report.summary}</p>
        </div>
        <div className="grid size-10 place-items-center rounded-lg border border-white/10 bg-white/[0.035] text-lg font-semibold text-white">
          {report.grade}
        </div>
      </div>
      <div className="mt-3 grid gap-2 text-[11px] leading-4 text-slate-400">
        <p><span className="font-semibold text-slate-300">Recurring:</span> {report.recurringMistakes[0]}</p>
        <p><span className="font-semibold text-slate-300">Improving:</span> {report.improvements[0]}</p>
        <p><span className="font-semibold text-slate-300">Goal:</span> {report.personalizedGoals[0]}</p>
      </div>
    </div>
  );
}

function DnaMiniList({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "mint" | "gold" | "danger";
}) {
  return (
    <div className="mt-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">{title}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {items.map((item) => (
          <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold ${tone === "mint" ? "border-mint-300/20 bg-mint-300/10 text-mint-200" : tone === "danger" ? "border-rose-300/20 bg-rose-400/10 text-rose-200" : "border-amberline/20 bg-amberline/10 text-amber-100"}`} key={item}>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
