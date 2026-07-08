"use client";

import type { CandleExplanation } from "@/lib/hermes-chart-engine/candle-explanation-engine";

export function CandleExplanationPanel({
  explanation,
  onClose,
}: {
  explanation: CandleExplanation | null;
  onClose: () => void;
}) {
  if (!explanation) return null;

  return (
    <div className="absolute left-4 top-4 w-[min(340px,calc(100%-2rem))] rounded-lg border border-white/10 bg-[#090D14]/95 p-4 shadow-2xl shadow-black/45 backdrop-blur">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amberline/75">Hermes Candle Read</p>
          <h3 className="mt-1 text-base font-semibold tracking-tight text-white">{explanation.title}</h3>
        </div>
        <button
          aria-label="Close candle explanation"
          className="rounded-md border border-white/10 px-2 py-1 text-xs text-slate-400 transition hover:border-white/20 hover:text-white"
          onClick={onClose}
          type="button"
        >
          Close
        </button>
      </div>
      <div className="space-y-2.5 text-xs">
        <Readout label="Candle" value={`${explanation.direction}. ${explanation.bodyStrength} body.`} />
        <Readout label="Wick" value={explanation.wickBehavior} />
        <Readout label="Volume" value={explanation.volumeRead} />
        <Readout label="RSI" value={explanation.rsiContext} />
        <Readout label="MACD" value={explanation.macdContext} />
      </div>
      <div className="mt-3 rounded-lg border border-amberline/15 bg-amberline/[0.055] p-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-amberline/80">Hermes says</p>
        <p className="mt-1.5 text-xs leading-5 text-slate-200">{explanation.interpretation}</p>
      </div>
    </div>
  );
}

function Readout({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3 border-b border-white/[0.06] pb-2 last:border-b-0 last:pb-0">
      <p className="w-16 shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="leading-4 text-slate-200">{value}</p>
    </div>
  );
}
