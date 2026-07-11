import { BrainCircuit, RadioTower } from "lucide-react";
import type { HermesIntelligence, MockMcpSignal } from "@/lib/hermes-intelligence";
import { Panel, PanelHeader } from "./ui";

export function HermesIntelligencePanel({
  intelligence,
}: {
  intelligence: HermesIntelligence;
}) {
  const tone =
    intelligence.bias === "Bullish"
      ? "text-mint-300"
      : intelligence.bias === "Bearish"
        ? "text-rose-300"
        : "text-amberline";
  const signals = [
    intelligence.socialSentiment,
    intelligence.newsImpact,
    intelligence.whaleActivity,
    intelligence.marketMomentum,
    intelligence.riskLevel,
  ];

  return (
    <Panel>
      <PanelHeader
        eyebrow="Hermes Intelligence"
        title={`${intelligence.symbol} MCP-Ready Read`}
        action={
          <span className="inline-flex items-center gap-2 rounded-md border border-mint-300/20 bg-mint-300/10 px-2.5 py-1 text-xs font-semibold text-mint-300">
            <RadioTower className="size-3.5" aria-hidden="true" />
            Mock MCP data
          </span>
        }
      />
      <div className="space-y-4 p-5">
        <div className="rounded-lg border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="grid size-11 place-items-center rounded-lg border border-white/10 bg-surface-950/60">
                <BrainCircuit className="size-5 text-mint-300" aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Hermes Intelligence Score</p>
                <p className={`mt-1 text-xl font-semibold tabular-nums tracking-tight ${tone}`}>
                  {intelligence.score}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500">Composite Bias</p>
              <p className={`mt-1 text-xl font-semibold ${tone}`}>{intelligence.bias}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {signals.map((signal) => (
            <SignalCard key={signal.label} signal={signal} />
          ))}
        </div>

        <div className="rounded-lg border border-amberline/20 bg-amberline/10 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-amberline">
            AI explanation
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-200">
            {intelligence.explanation}
          </p>
        </div>
      </div>
    </Panel>
  );
}

function SignalCard({ signal }: { signal: MockMcpSignal }) {
  const tone =
    signal.tone === "positive"
      ? "text-mint-300"
      : signal.tone === "negative"
        ? "text-rose-300"
        : "text-slate-200";

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-slate-500">{signal.label}</p>
          <p className={`mt-1 text-sm font-semibold ${tone}`}>{signal.value}</p>
        </div>
        <span className={`text-sm font-semibold ${tone}`}>{signal.score}</span>
      </div>
      <p className="mt-3 text-xs text-slate-500">{signal.source}</p>
    </div>
  );
}
