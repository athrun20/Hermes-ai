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
import { HermesScoreBreakdown } from "@/components/hermes-score-breakdown";

export function OpportunityCard({ opportunity }: { opportunity: OpportunityStudy }) {
  const [isBreakdownOpen, setIsBreakdownOpen] = useState(false);
  const [showMore, setShowMore] = useState(false);

  return (
    <Panel className="overflow-hidden">
      <div className="border-b border-white/10 px-4 py-3.5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-lg border border-white/10 bg-surface-950/60">
              <LineChart className="size-4 text-mint-300" aria-hidden="true" />
            </div>
            <div>
              <p className="text-lg font-semibold tracking-tight text-white">{opportunity.ticker}</p>
              <p className="mt-0.5 text-xs text-slate-500">{opportunity.companyName}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
            <StatusPill tone={verdictTone(opportunity.hermesVerdict)}>
              {opportunity.hermesVerdict}
            </StatusPill>
            <ConfidenceBadge
              confidence={opportunity.confidence}
              label={`${opportunity.confidence}% setup`}
            />
          </div>
        </div>
      </div>

      <div className="space-y-3 p-4">
        <div className="grid gap-2 grid-cols-2 sm:grid-cols-4">
          <StudyMetric label="Trend" value={opportunity.trend} tone={trendTone(opportunity.trend)} />
          <StudyMetric label="Risk" value={opportunity.riskLevel} tone={riskTone(opportunity.riskLevel)} />
          <StudyMetric
            label="Reward"
            value={`${opportunity.potentialRewardPct.toFixed(1)}%`}
            tone="gold"
          />
          <StudyMetric label="Setup" value={opportunity.setupType} tone="muted" />
        </div>

        {opportunity.countertrendWarning ? (
          <div className="rounded-lg border border-amberline/20 bg-amberline/[0.07] px-3 py-2 text-xs leading-5 text-amber-100">
            {opportunity.countertrendWarning}
          </div>
        ) : null}

        <InsightCard title="Why study this" tone="mint">
          <p className="line-clamp-3 text-sm leading-5">
            {opportunity.reasons[0] ?? opportunity.lesson}
          </p>
        </InsightCard>

        <button
          className="text-xs font-semibold text-slate-500 transition hover:text-white"
          onClick={() => setShowMore((open) => !open)}
          type="button"
        >
          {showMore ? "Hide study details" : "More study details"}
        </button>

        {showMore ? (
          <div className="hermes-fade-in space-y-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <StudyMetric
                label="Strategy"
                value={`${opportunity.strategyType} · ${opportunity.strategyScore}`}
                tone={
                  opportunity.strategyScore >= 70
                    ? "mint"
                    : opportunity.strategyScore >= 52
                      ? "gold"
                      : "danger"
                }
              />
              <StudyMetric
                label="Study quality"
                value={`${opportunity.studyQualityGrade} · ${opportunity.studyQualityScore}`}
                tone={
                  opportunity.studyQualityScore >= 80
                    ? "mint"
                    : opportunity.studyQualityScore >= 60
                      ? "gold"
                      : "danger"
                }
              />
              <StudyMetric
                label="Alignment"
                value={`${opportunity.alignmentScore}`}
                tone={
                  opportunity.alignmentScore >= 72
                    ? "mint"
                    : opportunity.alignmentScore >= 50
                      ? "gold"
                      : "danger"
                }
              />
              <StudyMetric
                label="HTF"
                value={opportunity.higherTimeframeDirection}
                tone={
                  opportunity.higherTimeframeDirection === "Bullish"
                    ? "mint"
                    : opportunity.higherTimeframeDirection === "Bearish"
                      ? "danger"
                      : "gold"
                }
              />
            </div>

            <div className="rounded-lg border border-white/10 bg-white/[0.03]">
              <button
                className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left"
                onClick={() => setIsBreakdownOpen((current) => !current)}
                type="button"
              >
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Score breakdown
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">Secondary study diagnostics</p>
                </div>
                <ChevronDown
                  className={`size-4 text-slate-400 transition ${isBreakdownOpen ? "rotate-180" : ""}`}
                  aria-hidden="true"
                />
              </button>
              {isBreakdownOpen ? (
                <div className="border-t border-white/10 p-3">
                  <HermesScoreBreakdown score={opportunity.hermesScore} />
                </div>
              ) : null}
            </div>

            <div className="grid gap-2 text-xs leading-5 text-slate-400">
              <p className="flex gap-2">
                <BookOpenCheck className="mt-0.5 size-3.5 shrink-0 text-mint-300" />
                {opportunity.lesson}
              </p>
              <p className="flex gap-2">
                <ClipboardList className="mt-0.5 size-3.5 shrink-0 text-amberline" />
                {opportunity.topQualityWeakness || opportunity.dnaExplanation}
              </p>
            </div>
          </div>
        ) : null}
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
  value: ReactNode;
  tone: "mint" | "gold" | "danger" | "muted" | "neutral";
}) {
  const valueClass =
    tone === "mint"
      ? "text-mint-300"
      : tone === "gold"
        ? "text-amberline"
        : tone === "danger"
          ? "text-rose-300"
          : "text-white";

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className={`mt-1 text-xs font-semibold leading-4 ${valueClass}`}>{value}</p>
    </div>
  );
}

function verdictTone(verdict: OpportunityStudy["hermesVerdict"]) {
  if (verdict === "Excellent Practice Setup" || verdict === "Worth Studying") return "mint";
  if (verdict === "Not Beginner Friendly" || verdict === "Observe Only") return "danger";
  return "gold";
}

function trendTone(trend: string) {
  const value = trend.toLowerCase();
  if (value.includes("bull") || value.includes("up")) return "mint";
  if (value.includes("bear") || value.includes("down")) return "danger";
  return "gold";
}

function riskTone(risk: string) {
  const value = risk.toLowerCase();
  if (value.includes("low") || value.includes("controlled")) return "mint";
  if (value.includes("high") || value.includes("elevated")) return "danger";
  return "gold";
}
