import { LearningStepCard } from "@/components/learning-journey/learning-step-card";
import { InsightCard, PageHeader, PageShell, Panel, PanelHeader } from "@/components/ui";
import { learningJourneySteps } from "@/lib/learning-journey";
import { TopNav } from "./top-nav";

export function LearningJourneyPage() {
  return (
    <main>
      <TopNav />
      <PageShell>
        <PageHeader
          eyebrow="Method"
          title="Learning Journey"
          description="Prepare → discover → plan → decide → practice → reflect. Slow is professional."
        />

        <Panel>
          <PanelHeader eyebrow="Loop" title="Trader development path" />
          <div className="p-4 sm:p-5">
            <div className="relative">
              <div
                className="absolute left-4 top-2 hidden h-[calc(100%-1rem)] w-px bg-gradient-to-b from-amberline/40 via-white/10 to-mint-300/30 lg:block"
                aria-hidden="true"
              />
              <div className="grid gap-3 lg:pl-10">
                {learningJourneySteps.map((step) => (
                  <LearningStepCard key={step.order} step={step} />
                ))}
              </div>
            </div>
          </div>
        </Panel>

        <section className="grid gap-3 md:grid-cols-2">
          <InsightCard title="Why this loop" tone="gold">
            Hermes slows execution so each paper trade teaches process — not dopamine.
          </InsightCard>
          <InsightCard title="Paper first" tone="mint">
            Practice, review, and discipline. No broker connection and no automation.
          </InsightCard>
        </section>
      </PageShell>
    </main>
  );
}
