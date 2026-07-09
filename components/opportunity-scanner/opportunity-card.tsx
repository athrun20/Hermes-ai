"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { BookOpenCheck, ChevronDown, ClipboardList, LineChart } from "lucide-react";
import type { OpportunityStudy } from "@/lib/opportunity-scanner";
import {
  ConfidenceBadge,
  InsightCard,
  Panel,
  StatusPill,
} from "@/components/ui";
import { HermesScoreBadge } from "@/components/hermes-score-badge";
import { HermesScoreBreakdown } from "@/components/hermes-score-breakdown";

export function OpportunityCard({ opportunity }: { opportunity: OpportunityStudy }) {
  const [isBreakdownOpen, setIsBreakdownOpen] = useState(false);

  return (
    <Panel className="overflow-hidden">
      <div className="border-b border-white/10 px-5 py-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-lg border border-white/10 bg-surface-950/60">
              <LineChart className="size-5 text-mint-300" aria-hidden="true" />
            </div>
            <div>
              <p className="text-2xl font-semibold tracking-tight text-white">
                {opportunity.ticker}
              </p>
              <p className="mt-1 text-sm text-slate-500">{opportunity.companyName}</p>
            </div>
          </div>
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <HermesScoreBadge score={opportunity.hermesScore} />
            <ConfidenceBadge confidence={opportunity.confidence} label={`${opportunity.confidence}% setup score`} />
            <StatusPill tone={verdictTone(opportunity.hermesVerdict)}>
              {opportunity.hermesVerdict}
            </StatusPill>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StudyMetric label="Current Trend" value={opportunity.trend} tone={trendTone(opportunity.trend)} />
          <StudyMetric label="Risk Level" value={opportunity.riskLevel} tone={riskTone(opportunity.riskLevel)} />
          <StudyMetric label="Potential Reward" value={`${opportunity.potentialRewardPct.toFixed(1)}%`} tone="gold" />
          <StudyMetric label="Setup Type" value={opportunity.setupType} tone="muted" />
        </div>

        <div className="rounded-lg border border-white/10 bg-white/[0.035]">
          <button
            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
            onClick={() => setIsBreakdownOpen((current) => !current)}
            type="button"
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Confidence Breakdown
              </p>
              <p className="mt-1 text-sm text-slate-300">
                See how Hermes calculated the study score.
              </p>
            </div>
            <ChevronDown
              className={`size-4 text-slate-400 transition ${isBreakdownOpen ? "rotate-180" : ""}`}
              aria-hidden="true"
            />
          </button>
          {isBreakdownOpen ? (
            <div className="space-y-4 border-t border-white/10 p-4">
              <HermesScoreBreakdown score={opportunity.hermesScore} />
              <div className="grid gap-3 sm:grid-cols-5">
                {opportunity.confidenceBreakdown.map((item) => (
                  <div className="rounded-md border border-white/10 bg-surface-950/45 p-3" key={item.label}>
                    <p className="text-xs text-slate-500">{item.label}</p>
                    <p className="mt-2 text-lg font-semibold text-white">{item.score}%</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <InsightCard title="Why Hermes Likes This" tone="neutral">
          <ul className="space-y-2">
            {opportunity.reasons.map((reason) => (
              <li className="flex gap-2" key={reason}>
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-mint-300/80" />
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </InsightCard>

        <InsightCard title="Why Hermes Is Cautious" tone="gold">
          <ul className="space-y-2">
            {opportunity.cautions.map((caution) => (
              <li className="flex gap-2" key={caution}>
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-amberline/80" />
                <span>{caution}</span>
              </li>
            ))}
          </ul>
        </InsightCard>

        <div className="grid gap-4 lg:grid-cols-2">
          <InsightCard title="Lesson" tone="gold">
            {opportunity.lesson}
          </InsightCard>
          <InsightCard title="Trader DNA Match" tone={matchTone(opportunity.traderDnaMatch)}>
            <div className="space-y-3">
              <StatusPill tone={matchTone(opportunity.traderDnaMatch)}>
                {opportunity.traderDnaMatch}
              </StatusPill>
              <p>{opportunity.dnaExplanation}</p>
            </div>
          </InsightCard>
        </div>

        <div className="flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row">
          <StudyButton icon={<BookOpenCheck className="size-4" aria-hidden="true" />}>
            Study Setup
          </StudyButton>
          <StudyButton icon={<ClipboardList className="size-4" aria-hidden="true" />}>
            Create Trade Plan
          </StudyButton>
        </div>
      </div>
    </Panel>
  );
}

function StudyMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "neutral" | "mint" | "gold" | "danger" | "muted";
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-2 text-sm font-semibold leading-5 ${metricTone(tone)}`}>{value}</p>
    </div>
  );
}

function StudyButton({
  children,
  icon,
}: {
  children: string;
  icon: ReactNode;
}) {
  return (
    <button
      className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-mint-300/30 hover:bg-mint-300/10 hover:text-white"
      type="button"
    >
      {icon}
      {children}
    </button>
  );
}

function trendTone(trend: OpportunityStudy["trend"]) {
  if (trend === "Bullish") return "mint";
  if (trend === "Bearish") return "danger";
  return "gold";
}

function riskTone(risk: OpportunityStudy["riskLevel"]) {
  if (risk === "Low") return "mint";
  if (risk === "High") return "danger";
  return "gold";
}

function matchTone(match: OpportunityStudy["traderDnaMatch"]) {
  if (match === "Excellent Match") return "mint";
  if (match === "Poor Match") return "danger";
  return "gold";
}

function verdictTone(verdict: OpportunityStudy["hermesVerdict"]) {
  if (verdict === "Excellent Practice Setup" || verdict === "Worth Studying") return "mint";
  if (verdict === "Not Beginner Friendly" || verdict === "Observe Only") return "danger";
  return "gold";
}

function metricTone(tone: "neutral" | "mint" | "gold" | "danger" | "muted") {
  if (tone === "mint") return "text-mint-300";
  if (tone === "gold") return "text-amberline";
  if (tone === "danger") return "text-rose-300";
  if (tone === "muted") return "text-slate-300";
  return "text-white";
}
