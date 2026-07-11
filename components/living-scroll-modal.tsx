"use client";

import { X } from "lucide-react";

export type LivingScroll = {
  title: string;
  quote: string;
  insight: string;
  challenge: string;
  wisdomPoints: number;
};

export function LivingScrollModal({
  scroll,
  onClose,
}: {
  scroll: LivingScroll;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-surface-950/80 px-4 py-8 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="living-scroll-title"
    >
      <button
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        type="button"
        aria-label="Close Living Scroll"
      />
      <section className="relative w-full max-w-2xl overflow-hidden rounded-xl border border-amberline/30 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.18),transparent_32%),linear-gradient(135deg,#f5f0e6,#d8c6a3_45%,#f8f3e8)] p-[1px] shadow-2xl shadow-black/50">
        <div className="relative rounded-xl bg-[linear-gradient(145deg,rgba(255,255,255,0.78),rgba(226,211,181,0.9)),radial-gradient(circle_at_15%_20%,rgba(255,255,255,0.75),transparent_18%),radial-gradient(circle_at_78%_12%,rgba(177,145,82,0.18),transparent_28%)] p-6 text-surface-950 sm:p-8">
          <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:linear-gradient(110deg,transparent_0%,rgba(120,98,54,0.11)_34%,transparent_60%)]" />
          <button
            className="absolute right-4 top-4 rounded-full border border-surface-950/10 bg-white/45 p-2 text-surface-800 transition hover:bg-white/70"
            onClick={onClose}
            type="button"
            aria-label="Close scroll"
          >
            <X className="size-4" aria-hidden="true" />
          </button>

          <div className="relative">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-800/75">
              Hermes Living Scroll
            </p>
            <h2
              className="mt-3 max-w-xl text-xl font-semibold leading-tight tracking-tight text-surface-950 sm:text-2xl"
              id="living-scroll-title"
            >
              {scroll.title}
            </h2>
            <p className="mt-5 border-l-2 border-amber-700/45 pl-4 text-lg font-medium leading-8 text-surface-800">
              {scroll.quote}
            </p>

            <div className="mt-7 grid gap-4 sm:grid-cols-[1fr_170px]">
              <div className="rounded-lg border border-amber-900/10 bg-white/35 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-900/65">
                  Personalized Insight
                </p>
                <p className="mt-3 text-sm leading-6 text-surface-800">{scroll.insight}</p>
              </div>
              <div className="rounded-lg border border-amber-900/10 bg-surface-950/90 p-4 text-white">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amberline">
                  Wisdom Points Earned
                </p>
                <p className="mt-2 text-2xl font-semibold leading-none tracking-tight tabular-nums">
                  {scroll.wisdomPoints}
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-lg border border-amber-900/10 bg-amber-100/45 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-900/65">
                Today's Challenge
              </p>
              <p className="mt-3 text-sm leading-6 text-surface-800">{scroll.challenge}</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
