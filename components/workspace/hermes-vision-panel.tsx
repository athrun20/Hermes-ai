"use client";

/**
 * Legacy Hermes Vision panel.
 * Primary workspace presentation is Decision → Chart → Evidence
 * (`decision-header.tsx`, chart, `evidence-cards.tsx`).
 * Kept for optional deep vision dimension review when needed.
 */

import { useState } from "react";
import type { HermesVisionResult } from "@/lib/hermes-vision-types";
import { ProgressBar } from "@/components/ui";
import type { HermesScoreResult } from "@/lib/hermes-score-types";
import type { StrategyIntelligenceResult } from "@/lib/strategy-types";
import type { MultiTimeframeIntelligence } from "@/lib/multi-timeframe-types";
import type { InstitutionalFootprintResult } from "@/lib/footprint-types";
import type { ReasoningResult } from "@/lib/reasoning-types";
import type { TradeQualityResult } from "@/lib/trade-quality-types";
import { DecisionHeader } from "@/components/workspace/decision-header";
import { EvidenceStrip } from "@/components/workspace/evidence-cards";
import { HermesScoreBreakdown } from "@/components/hermes-score-breakdown";

export function HermesVisionPanel({
  vision,
  hermesScore,
  strategy,
  multiTimeframe,
  footprint,
  reasoning,
  tradeQuality,
}: {
  vision: HermesVisionResult;
  hermesScore: HermesScoreResult;
  strategy: StrategyIntelligenceResult;
  multiTimeframe: MultiTimeframeIntelligence;
  footprint: InstitutionalFootprintResult;
  reasoning?: ReasoningResult;
  tradeQuality?: TradeQualityResult;
}) {
  const [showDimensions, setShowDimensions] = useState(false);

  return (
    <section className="space-y-3">
      <DecisionHeader
        reasoning={reasoning}
        strategy={strategy}
        tradeQuality={tradeQuality}
        vision={vision}
      />
      <EvidenceStrip
        footprint={footprint}
        multiTimeframe={multiTimeframe}
        strategy={strategy}
      />
      <div className="rounded-lg border border-white/10 bg-surface-950/45 px-3 py-2">
        <button
          className="text-xs font-semibold text-slate-400 transition hover:text-white"
          onClick={() => setShowDimensions((current) => !current)}
          type="button"
        >
          {showDimensions ? "Hide vision dimensions" : "Vision dimensions (secondary)"}
        </button>
        {showDimensions ? (
          <div className="mt-3 space-y-3">
            <HermesScoreBreakdown score={hermesScore} />
            <div className="grid gap-2 lg:grid-cols-2 2xl:grid-cols-3">
              {vision.dimensions.map((dimension) => (
                <div
                  className="rounded-md border border-white/10 bg-white/[0.03] px-3 py-2"
                  key={dimension.dimension}
                >
                  <div className="flex items-center gap-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {dimension.dimension}
                    </p>
                    <div className="min-w-0 flex-1">
                      <ProgressBar
                        value={dimension.score}
                        tone={dimension.score >= 70 ? "mint" : dimension.score >= 50 ? "gold" : "danger"}
                      />
                    </div>
                    <span className="text-xs font-semibold tabular-nums text-slate-300">{dimension.score}</span>
                  </div>
                  <p className="mt-1.5 text-[11px] text-slate-500">{dimension.verdict}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
