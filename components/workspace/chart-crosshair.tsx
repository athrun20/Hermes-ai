import { formatCurrency } from "@/lib/market-data";

export type ChartCrosshairState = {
  visible: boolean;
  x: number;
  y: number;
  price: number;
  timeLabel: string;
};

export function ChartCrosshair({
  state,
}: {
  state: ChartCrosshairState;
}) {
  if (!state.visible) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-30">
      <div
        className="absolute bottom-0 top-0 border-l border-amberline/20"
        style={{ left: state.x }}
      />
      <div
        className="absolute left-0 right-0 border-t border-amberline/20"
        style={{ top: state.y }}
      />
      <span
        className="absolute right-2 -translate-y-1/2 rounded-md border border-amberline/20 bg-surface-950/90 px-2 py-1 text-[11px] font-semibold text-amber-100 shadow-lg shadow-black/30"
        style={{ top: state.y }}
      >
        {formatCurrency(state.price)}
      </span>
      <span
        className="absolute bottom-2 -translate-x-1/2 rounded-md border border-white/10 bg-surface-950/90 px-2 py-1 text-[11px] font-semibold text-slate-300 shadow-lg shadow-black/30"
        style={{ left: state.x }}
      >
        {state.timeLabel}
      </span>
    </div>
  );
}
