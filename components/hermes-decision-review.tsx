"use client";

import { useState } from "react";
import { ShieldCheck, X } from "lucide-react";
import { DecisionChecklist } from "@/components/decision-checklist";
import { ConfidenceBadge, MetricCard, Panel, PanelHeader, StatusPill } from "@/components/ui";
import type { DecisionReview } from "@/lib/decision-types";
import { formatCurrency } from "@/lib/market-data";
import { HermesScoreBadge } from "@/components/hermes-score-badge";
import type { HermesScoreResult } from "@/lib/hermes-score-types";
import { TradeQualityBadge } from "@/components/trade-quality-badge";
import { ImproveTradeList, ScoreCapNotice, WhyNotHigher } from "@/components/trade-quality-breakdown";

export function HermesDecisionReview({
  review,
  hermesScore,
  notional,
  onConfirm,
  onRevise,
}: {
  review: DecisionReview;
  hermesScore: HermesScoreResult;
  notional: number;
  onConfirm: () => void;
  onRevise: () => void;
}) {
  const [acceptedRisk, setAcceptedRisk] = useState(false);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-surface-950/80 px-4 py-6 backdrop-blur-sm">
      <div className="w-full max-w-4xl animate-[briefingReveal_420ms_ease-out_both]">
        <Panel className="max-h-[92vh] overflow-hidden">
          <PanelHeader
            eyebrow="Hermes Decision Review"
            title={`${review.symbol}/USD ${review.action}`}
            action={
              <button
                className="rounded-md border border-white/10 bg-white/[0.04] p-2 text-slate-400 transition hover:text-white"
                onClick={onRevise}
                type="button"
                aria-label="Close decision review"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            }
          />
          <div className="max-h-[calc(92vh-74px)] overflow-y-auto p-5">
            <section className="rounded-lg border border-amberline/20 bg-amberline/[0.055] p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="size-5 text-amberline" aria-hidden="true" />
                    <StatusPill tone="gold">{review.recommendation}</StatusPill>
                  </div>
                  <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-amberline/80">
                    Hermes Review
                  </p>
                  <p className="mt-4 max-w-2xl text-xl font-semibold tracking-tight text-white">
                    {review.mentorNote}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    This is a paper-trading review only. Hermes coaches the decision; you remain in control.
                  </p>
                  {review.confidence < 100 ? (
                    <div className="mt-4 rounded-lg border border-white/10 bg-surface-950/45 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Why not 100?
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-300">{review.whyNotPerfect}</p>
                    </div>
                  ) : null}
                </div>
                <div className="flex flex-col items-start gap-2 lg:items-end">
                  <HermesScoreBadge score={hermesScore} />
                  {review.tradeQualityResult ? <TradeQualityBadge quality={review.tradeQualityResult} /> : null}
                  <ConfidenceBadge confidence={review.confidence} label={`${review.confidence}% confidence`} />
                </div>
              </div>
            </section>

            {review.tradeQualityResult ? (
              <section className="mt-4 rounded-lg border border-white/10 bg-white/[0.03] p-5">
                {review.tradeQualityResult.capsApplied.length > 0 ? (
                  <ScoreCapNotice caps={review.tradeQualityResult.capsApplied} />
                ) : null}
                <WhyNotHigher reasons={review.tradeQualityResult.whyNotAPlus} />
                <ImproveTradeList improvements={review.tradeQualityResult.improvements} />
              </section>
            ) : null}

            <section className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
              <MetricCard
                label="Hermes Score"
                value={`${hermesScore.score}`}
                detail={hermesScore.label}
                tone={hermesScore.score >= 80 ? "mint" : hermesScore.score >= 60 ? "gold" : "danger"}
              />
              <MetricCard
                label="Hermes Confidence"
                value={`${review.confidence}%`}
                tone={review.confidence >= 75 ? "mint" : review.confidence >= 55 ? "gold" : "danger"}
              />
              <MetricCard label="Trade Quality" value={review.tradeQuality} tone={getQualityTone(review.tradeQuality)} />
              <MetricCard
                label="Discipline Impact"
                value={`${review.disciplineScoreImpact >= 0 ? "+" : ""}${review.disciplineScoreImpact}`}
                tone={review.disciplineScoreImpact >= 0 ? "mint" : "danger"}
              />
              <MetricCard
                label="Paper Size"
                value={formatCurrency(notional)}
                detail={review.riskReward ? `${review.riskReward.toFixed(2)} : 1 risk/reward` : "Risk/reward incomplete"}
                tone="muted"
              />
              <MetricCard
                label="Wisdom Earned"
                value={`+${review.wisdomEarned}`}
                detail="Based on decision quality"
                tone={review.wisdomEarned >= 10 ? "gold" : review.wisdomEarned > 0 ? "mint" : "muted"}
              />
            </section>

            <section className="mt-4">
              <DecisionChecklist items={review.checklist} />
            </section>

            <section className="mt-4 rounded-lg border border-white/10 bg-white/[0.035] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amberline/80">
                Hermes&apos; Final Thought
              </p>
              <p className="mt-3 text-sm leading-6 text-slate-300">{review.finalThought}</p>
            </section>

            <section className="mt-4 rounded-lg border border-mint-300/20 bg-mint-300/[0.055] p-5">
              <p className="text-sm font-semibold text-white">
                Are you emotionally prepared to accept this loss if your stop is hit?
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <button
                  className={`rounded-lg border px-4 py-3 text-sm font-semibold transition ${
                    acceptedRisk
                      ? "border-mint-300/40 bg-mint-300/15 text-mint-200"
                      : "border-white/10 bg-white/[0.04] text-slate-300 hover:text-white"
                  }`}
                  onClick={() => setAcceptedRisk(true)}
                  type="button"
                >
                  Yes, I accept the risk
                </button>
                <button
                  className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-slate-300 transition hover:border-amberline/30 hover:bg-amberline/10 hover:text-white"
                  onClick={onRevise}
                  type="button"
                >
                  I need to rethink
                </button>
              </div>
            </section>

            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                className="rounded-lg border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-amberline/30 hover:bg-amberline/10 hover:text-white"
                onClick={onRevise}
                type="button"
              >
                Revise Trade
              </button>
              <button
                className="rounded-lg bg-mint-400 px-5 py-3 text-sm font-bold text-surface-950 transition hover:bg-mint-300 disabled:cursor-not-allowed disabled:opacity-45"
                disabled={!acceptedRisk}
                onClick={onConfirm}
                type="button"
              >
                Execute Paper Trade Anyway
              </button>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function getQualityTone(quality: DecisionReview["tradeQuality"]) {
  if (quality === "Excellent" || quality === "Good") return "mint";
  if (quality === "Developing") return "gold";
  return "danger";
}
