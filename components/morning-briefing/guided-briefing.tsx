"use client";

import { type ReactNode, useEffect, useState } from "react";

export type GuidedBriefingStep = {
  id: string;
  content: ReactNode;
};

export function GuidedBriefing({
  steps,
  completion,
  onCompleted,
}: {
  steps: GuidedBriefingStep[];
  completion: ReactNode;
  onCompleted?: () => void;
}) {
  const [started, setStarted] = useState(false);
  const [visibleCount, setVisibleCount] = useState(1);
  const [hasAnnouncedCompletion, setHasAnnouncedCompletion] = useState(false);
  const isComplete = started && visibleCount >= steps.length;

  useEffect(() => {
    if (!isComplete || hasAnnouncedCompletion) return;
    setHasAnnouncedCompletion(true);
    onCompleted?.();
  }, [hasAnnouncedCompletion, isComplete, onCompleted]);

  if (!started) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/[0.025] p-8 text-center shadow-insetPanel">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-mint-300/80">
          Hermes Ritual
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">
          Your briefing is ready.
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-400">
          Move through each section slowly. Prepare first, trade second.
        </p>
        <button
          className="mt-6 rounded-lg bg-mint-400 px-5 py-3 text-sm font-bold text-surface-950 transition hover:bg-mint-300"
          onClick={() => setStarted(true)}
          type="button"
        >
          Begin Morning Briefing
        </button>
      </div>
    );
  }

  const visibleSteps = steps.slice(0, visibleCount);
  return (
    <div className="space-y-4">
      {visibleSteps.map((step, index) => (
        <div
          className="animate-[briefingReveal_520ms_ease-out_both]"
          key={step.id}
          style={{ animationDelay: `${Math.min(index * 70, 280)}ms` }}
        >
          {step.content}
        </div>
      ))}

      {!isComplete ? (
        <div className="flex justify-center py-2">
          <button
            className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-amberline/30 hover:bg-amberline/10 hover:text-white"
            onClick={() => setVisibleCount((count) => Math.min(count + 1, steps.length))}
            type="button"
          >
            Continue Briefing
          </button>
        </div>
      ) : (
        <div className="animate-[briefingReveal_520ms_ease-out_both]">{completion}</div>
      )}
    </div>
  );
}
