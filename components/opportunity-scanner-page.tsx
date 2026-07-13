"use client";

import { useEffect, useMemo, useState } from "react";
import { MarketMood } from "@/components/opportunity-scanner/market-mood";
import { OpportunityCard } from "@/components/opportunity-scanner/opportunity-card";
import { OpportunitySummaryCards } from "@/components/opportunity-scanner/summary-cards";
import { QualityPipeline } from "@/components/opportunity-scanner/quality-pipeline";
import {
  loadHermesMarketQuotesSnapshot,
  type HermesMarketQuotesSnapshot,
} from "@/lib/market-data";
import { buildOpportunityScanner } from "@/lib/opportunity-scanner";
import { getHermesMemory, type HermesMemorySnapshot } from "@/lib/hermes-memory";
import { TopNav } from "./top-nav";
import { PageHeader, PageShell } from "@/components/ui";

export function OpportunityScannerPage() {
  const [memory, setMemory] = useState<HermesMemorySnapshot | undefined>();
  const [marketSnapshot, setMarketSnapshot] =
    useState<HermesMarketQuotesSnapshot | null>(null);

  useEffect(() => {
    setMemory(getHermesMemory());
    let cancelled = false;
    void loadHermesMarketQuotesSnapshot().then((snapshot) => {
      if (!cancelled) setMarketSnapshot(snapshot);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const scanner = useMemo(
    () => buildOpportunityScanner({ memory, marketSnapshot }),
    [marketSnapshot, memory],
  );

  return (
    <main>
      <TopNav />
      <PageShell>
        <PageHeader
          eyebrow="Study"
          title="Opportunity Scanner"
          description="Ranked setups for study — not live signals. Focus on plan quality and fit."
        />

        <QualityPipeline pipeline={scanner.pipeline} />

        <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <MarketMood mood={scanner.marketMood} />
          <OpportunitySummaryCards summary={scanner.summary} />
        </section>

        <section className="grid gap-3 md:grid-cols-2">
          {scanner.opportunities.map((opportunity) => (
            <OpportunityCard key={opportunity.ticker} opportunity={opportunity} />
          ))}
        </section>
      </PageShell>
    </main>
  );
}
