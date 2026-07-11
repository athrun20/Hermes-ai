import type { LearningJourneyStep } from "@/lib/learning-journey";
import { StatusPill } from "@/components/ui";

export function LearningStepCard({ step }: { step: LearningJourneyStep }) {
  return (
    <article className="relative rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3.5 shadow-insetPanel">
      <div className="flex items-start justify-between gap-3">
        <div className="grid size-8 shrink-0 place-items-center rounded-md border border-amberline/25 bg-amberline/10 text-xs font-bold text-amberline">
          {step.order}
        </div>
        <StatusPill tone="gold">{step.purpose}</StatusPill>
      </div>
      <h3 className="mt-3 text-sm font-semibold tracking-tight text-white sm:text-base">
        {step.feature}
      </h3>
      <p className="mt-1.5 text-sm leading-6 text-slate-400">{step.explanation}</p>
    </article>
  );
}
