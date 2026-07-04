"use client";

import { useEffect, useMemo, useState } from "react";
import { MarketMood } from "@/components/opportunity-scanner/market-mood";
import { OpportunityCard } from "@/components/opportunity-scanner/opportunity-card";
import { OpportunitySummaryCards } from "@/components/opportunity-scanner/summary-cards";
import { QualityPipeline } from "@/components/opportunity-scanner/quality-pipeline";
import { buildOpportunityScanner } from "@/lib/opportunity-scanner";
import { getHermesMemory, type HermesMemorySnapshot } from "@/lib/hermes-memory";
import { TopNav } from "./top-nav";

export function OpportunityScannerPage() {
  const [memory, setMemory] = useState<HermesMemorySnapshot | undefined>();

  useEffect(() => {
    setMemory(getHermesMemory());
  }, []);

  const scanner = useMemo(() => buildOpportunityScanner({ memory }), [memory]);

  return (
    <main>
      <TopNav />
      <div className="mx-auto max-w-[1440px] px-4 py-5 sm:px-6 lg:px-8 xl:px-10">
        <section className="mb-5 rounded-lg border border-white/10 bg-white/[0.025] px-5 py-6 shadow-insetPanel">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-mint-300/80">
            Study Dashboard
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Opportunity Scanner
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
            Hermes has analyzed today's market and identified the strongest
            opportunities worth studying.
          </p>
        </section>

        <QualityPipeline pipeline={scanner.pipeline} />

        <section className="mt-5 grid gap-4 xl:grid-cols-[1fr_0.75fr]">
          <MarketMood mood={scanner.marketMood} />
          <OpportunitySummaryCards summary={scanner.summary} />
        </section>

        <section className="mt-5 grid gap-4 xl:grid-cols-2">
          {scanner.opportunities.map((opportunity) => (
            <OpportunityCard key={opportunity.ticker} opportunity={opportunity} />
          ))}
        </section>
      </div>
    </main>
  );
}
