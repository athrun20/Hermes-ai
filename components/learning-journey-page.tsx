import { LearningStepCard } from "@/components/learning-journey/learning-step-card";
import { InsightCard, Panel, PanelHeader } from "@/components/ui";
import { learningJourneySteps } from "@/lib/learning-journey";
import { TopNav } from "./top-nav";

export function LearningJourneyPage() {
  return (
    <main>
      <TopNav />
      <div className="mx-auto max-w-[1440px] px-4 py-5 sm:px-6 lg:px-8 xl:px-10">
        <section className="mb-5 rounded-lg border border-white/10 bg-white/[0.025] px-5 py-7 shadow-insetPanel">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-mint-300/80">
            Hermes Method
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Learning Journey
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
            Hermes develops traders through a calm loop: prepare, discover,
            plan, decide, practice, reflect, and improve.
          </p>
        </section>

        <Panel>
          <PanelHeader
            eyebrow="Trader Development Loop"
            title="From preparation to reflection"
          />
          <div className="p-5">
            <div className="relative">
              <div
                className="absolute left-5 top-0 hidden h-full w-px bg-gradient-to-b from-amberline/50 via-white/10 to-mint-300/35 lg:block"
                aria-hidden="true"
              />
              <div className="grid gap-4 lg:pl-12">
                {learningJourneySteps.map((step) => (
                  <LearningStepCard key={step.order} step={step} />
                ))}
              </div>
            </div>
          </div>
        </Panel>

        <section className="mt-5 grid gap-4 xl:grid-cols-[1fr_0.85fr]">
          <InsightCard title="Why this loop matters" tone="gold">
            Hermes is designed to slow the trader down before execution and
            make every paper trade teach something. Replay Mode will extend
            this loop by helping you study decisions after the outcome is known.
          </InsightCard>
          <InsightCard title="Paper mode remains first" tone="mint">
            The journey is built around practice, review, and discipline. No
            broker connection, no automatic trading, and no AI API is required
            for this learning layer.
          </InsightCard>
        </section>
      </div>
    </main>
  );
}
