import type { HermesVisionLabel } from "@/lib/hermes-vision-types";

export function HermesVisionLabels({
  labels,
  priceRange,
  fallbackPrice,
}: {
  labels: HermesVisionLabel[];
  priceRange: { min: number; max: number };
  fallbackPrice: number;
}) {
  if (labels.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      {labels.slice(0, 3).map((label, index) => {
        const top = clampPercent(priceToY(label.price ?? fallbackPrice, priceRange) + index * 4.4);
        return (
          <span
            className={`absolute left-4 max-w-[38%] truncate rounded-md border px-2.5 py-1.5 text-[11px] font-semibold shadow-lg shadow-black/25 ${labelTone(label.tone)}`}
            key={label.id}
            style={{ top: `${top}%` }}
          >
            {label.text}
          </span>
        );
      })}
    </div>
  );
}

function priceToY(price: number, range: { min: number; max: number }) {
  return 100 - ((price - range.min) / (range.max - range.min)) * 100;
}

function clampPercent(value: number) {
  return Math.max(5, Math.min(92, value));
}

function labelTone(tone: HermesVisionLabel["tone"]) {
  if (tone === "mint") return "border-mint-300/25 bg-mint-300/12 text-mint-100";
  if (tone === "danger") return "border-rose-300/25 bg-rose-400/12 text-rose-100";
  if (tone === "muted") return "border-white/10 bg-surface-950/85 text-slate-300";
  return "border-amberline/25 bg-amberline/12 text-amber-100";
}
