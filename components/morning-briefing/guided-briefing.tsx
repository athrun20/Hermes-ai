"use client";

import { type ReactNode, useEffect, useState } from "react";
import { Button } from "@/components/ui";

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
      <div className="rounded-xl border border-white/10 bg-surface-950/50 px-5 py-8 text-center shadow-insetPanel">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-mint-300/75">
          Ritual
        </p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight text-white sm:text-2xl">
          Your briefing is ready
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">
          Move through each section slowly. Prepare first, trade second.
        </p>
        <Button className="mt-5" variant="primary" size="lg" onClick={() => setStarted(true)}>
          Begin briefing
        </Button>
      </div>
    );
  }

  const visibleSteps = steps.slice(0, visibleCount);
  return (
    <div className="space-y-3">
      {visibleSteps.map((step, index) => (
        <div
          className="hermes-fade-in"
          key={step.id}
          style={{ animationDelay: `${Math.min(index * 40, 160)}ms` }}
        >
          {step.content}
        </div>
      ))}

      {!isComplete ? (
        <div className="flex justify-center py-1">
          <Button
            variant="secondary"
            onClick={() => setVisibleCount((count) => Math.min(count + 1, steps.length))}
          >
            Continue
          </Button>
        </div>
      ) : (
        <div className="hermes-fade-in">{completion}</div>
      )}
    </div>
  );
}
