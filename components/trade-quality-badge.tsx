"use client";

import type { TradeQualityResult } from "@/lib/trade-quality-types";

export function TradeQualityBadge({ quality }: { quality: TradeQualityResult }) {
  return (
    <div className={`rounded-lg border px-3 py-2 ${getSurface(quality.score)}`}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
        Trade Quality
      </p>
      <div className="mt-1 flex items-end justify-between gap-3">
        <p className="text-2xl font-semibold leading-none tracking-[-0.02em] text-white">
          {quality.grade}
        </p>
        <p className={getScoreColor(quality.score)}>{quality.score}</p>
      </div>
      <p className="mt-1 text-[11px] leading-4 text-slate-400">{quality.label}</p>
    </div>
  );
}

function getSurface(score: number) {
  if (score >= 80) return "border-mint-300/25 bg-mint-300/[0.07]";
  if (score >= 60) return "border-amberline/25 bg-amberline/[0.07]";
  return "border-rose-400/25 bg-rose-400/[0.07]";
}

function getScoreColor(score: number) {
  if (score >= 80) return "font-mono text-sm font-semibold text-mint-300";
  if (score >= 60) return "font-mono text-sm font-semibold text-amberline";
  return "font-mono text-sm font-semibold text-rose-300";
}
