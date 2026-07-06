import type { LearningJourneyStep } from "@/lib/learning-journey";
import { StatusPill } from "@/components/ui";

export function LearningStepCard({ step }: { step: LearningJourneyStep }) {
  return (
    <article className="relative rounded-lg border border-white/10 bg-white/[0.035] p-5 shadow-insetPanel">
      <div className="flex items-start justify-between gap-4">
        <div className="grid size-10 shrink-0 place-items-center rounded-lg border border-amberline/25 bg-amberline/10 text-sm font-bold text-amberline">
          {step.order}
        </div>
        <StatusPill tone="gold">{step.purpose}</StatusPill>
      </div>
      <h3 className="mt-5 text-xl font-semibold tracking-tight text-white">
        {step.feature}
      </h3>
      <p className="mt-3 text-sm leading-6 text-slate-400">{step.explanation}</p>
    </article>
  );
}
