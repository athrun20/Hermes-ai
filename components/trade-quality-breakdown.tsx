"use client";

import { ProgressBar, StatusPill } from "@/components/ui";
import type {
  TradeQualityBreakdownItem,
  TradeQualityCap,
  TradeQualityResult,
} from "@/lib/trade-quality-types";

export function TradeQualityBreakdown({ quality }: { quality: TradeQualityResult }) {
  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amberline/80">
            Hermes Trade Quality
          </p>
          <p className="mt-1 text-sm leading-6 text-slate-300">{quality.summary}</p>
        </div>
        <StatusPill tone={quality.score >= 80 ? "mint" : quality.score >= 60 ? "gold" : "danger"}>
          {quality.grade}
        </StatusPill>
      </div>
      {quality.capsApplied.length > 0 ? <ScoreCapNotice caps={quality.capsApplied} /> : null}
      <div className="mt-4 space-y-2.5">
        {quality.breakdown.map((item) => (
          <QualityFactorRow item={item} key={item.category} />
        ))}
      </div>
      <WhyNotHigher reasons={quality.whyNotAPlus} />
      <ImproveTradeList improvements={quality.improvements} />
    </section>
  );
}

export function QualityFactorRow({ item }: { item: TradeQualityBreakdownItem }) {
  return (
    <div className="rounded-lg border border-white/10 bg-surface-950/45 px-3 py-2.5">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-white">{item.category}</p>
          <p className="mt-0.5 line-clamp-2 text-[11px] leading-4 text-slate-500">{item.reason}</p>
        </div>
        <span className={getScoreColor(item.percentage)}>{item.percentage}</span>
      </div>
      <ProgressBar value={item.percentage} tone={getTone(item.percentage)} />
    </div>
  );
}

export function ScoreCapNotice({ caps }: { caps: TradeQualityCap[] }) {
  return (
    <div className="mt-3 rounded-lg border border-amberline/25 bg-amberline/[0.07] px-3 py-2 text-xs leading-5 text-amber-100">
      <p className="font-semibold">Score capped</p>
      <p className="mt-1 text-amber-100/85">{caps[0].reason}</p>
    </div>
  );
}

export function WhyNotHigher({ reasons }: { reasons: string[] }) {
  if (reasons.length === 0) return null;
  return (
    <div className="mt-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        Why not higher?
      </p>
      <ul className="mt-2 space-y-1.5 text-xs leading-5 text-slate-400">
        {reasons.slice(0, 3).map((reason) => (
          <li className="flex gap-2" key={reason}>
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-amberline/80" />
            <span>{reason}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ImproveTradeList({ improvements }: { improvements: string[] }) {
  if (improvements.length === 0) return null;
  return (
    <div className="mt-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        Improve the trade
      </p>
      <ul className="mt-2 space-y-1.5 text-xs leading-5 text-slate-400">
        {improvements.slice(0, 3).map((item) => (
          <li className="flex gap-2" key={item}>
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-mint-300/80" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function getTone(score: number) {
  if (score >= 78) return "mint";
  if (score >= 55) return "gold";
  return "danger";
}

function getScoreColor(score: number) {
  if (score >= 78) return "font-mono text-xs font-semibold text-mint-300";
  if (score >= 55) return "font-mono text-xs font-semibold text-amberline";
  return "font-mono text-xs font-semibold text-rose-300";
}
