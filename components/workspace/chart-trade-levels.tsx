import type { ChartDrawing, ChartTradeLevels } from "@/lib/chart-types";
import { formatCurrency } from "@/lib/market-data";

export function ChartTradeLevelsOverlay({
  drawings,
  tradeLevels,
  priceRange,
}: {
  drawings: ChartDrawing[];
  tradeLevels: ChartTradeLevels;
  priceRange: { min: number; max: number };
}) {
  const levels = [
    ...drawings.map((drawing) => ({
      id: drawing.id,
      label: getDrawingLabel(drawing.type),
      price: drawing.price,
      tone: getDrawingTone(drawing.type),
      zone:
        drawing.type === "support-zone" ||
        drawing.type === "resistance-zone" ||
        drawing.type === "rectangle" ||
        drawing.type === "risk-reward",
    })),
    tradeLevels.entry
      ? { id: "entry", label: "Entry", price: tradeLevels.entry, tone: "mint", zone: false }
      : null,
    tradeLevels.stop
      ? { id: "stop", label: "Stop", price: tradeLevels.stop, tone: "rose", zone: false }
      : null,
    tradeLevels.target
      ? { id: "target", label: "Target", price: tradeLevels.target, tone: "gold", zone: false }
      : null,
  ].filter(Boolean) as Array<{
    id: string;
    label: string;
    price: number;
    tone: string;
    zone: boolean;
  }>;

  const positionedLevels = distributeLevelLabels(
    levels.map((level) => ({
      ...level,
      lineTop: priceToY(level.price, priceRange),
    })),
  );

  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      {positionedLevels.map((level) => {
        const lineTop = `${level.lineTop}%`;
        const labelTop = `${level.labelTop}%`;
        const color =
          level.tone === "mint"
            ? "border-mint-300 text-mint-200 bg-mint-300/10"
            : level.tone === "rose"
              ? "border-rose-300 text-rose-200 bg-rose-400/10"
              : "border-amberline text-amber-100 bg-amberline/10";

        return (
          <div className="absolute left-0 right-0" key={level.id} style={{ top: lineTop }}>
            {level.zone ? (
              <div className={`h-10 -translate-y-5 border-y ${color}`} />
            ) : (
              <div className={`border-t ${color}`} />
            )}
            <span
              className={`absolute right-3 max-w-[42%] -translate-y-1/2 truncate rounded-md border px-2 py-1 text-[11px] font-semibold shadow-lg shadow-black/20 ${color}`}
              style={{
                top: `calc(${labelTop} - ${lineTop})`,
              }}
            >
              {level.label} {formatCurrency(level.price)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function distributeLevelLabels(
  levels: Array<{
    id: string;
    label: string;
    price: number;
    tone: string;
    zone: boolean;
    lineTop: number;
  }>,
) {
  const sorted = [...levels].sort((a, b) => a.lineTop - b.lineTop);
  const minimumGap = 4.8;
  const topPadding = 3.2;
  const bottomPadding = 96.8;
  let previous = -Infinity;

  const placed = sorted.map((level) => {
    const labelTop = Math.max(topPadding, Math.min(bottomPadding, Math.max(level.lineTop, previous + minimumGap)));
    previous = labelTop;
    return {
      ...level,
      labelTop,
    };
  });

  for (let index = placed.length - 1; index >= 0; index -= 1) {
    const next = placed[index + 1];
    const maxTop = next ? next.labelTop - minimumGap : bottomPadding;
    placed[index].labelTop = Math.max(topPadding, Math.min(placed[index].labelTop, maxTop));
  }

  return levels.map((level) => placed.find((placedLevel) => placedLevel.id === level.id) ?? { ...level, labelTop: level.lineTop });
}

function priceToY(price: number, range: { min: number; max: number }) {
  return 100 - ((price - range.min) / (range.max - range.min)) * 100;
}

function getDrawingLabel(type: ChartDrawing["type"]) {
  if (type === "support-zone") return "Support";
  if (type === "resistance-zone") return "Resistance";
  if (type === "trend-line") return "Trend";
  if (type === "ray") return "Ray";
  if (type === "rectangle") return "Zone";
  if (type === "risk-reward") return "Risk / Reward";
  if (type === "text-note") return "Note";
  return "Line";
}

function getDrawingTone(type: ChartDrawing["type"]) {
  if (type === "resistance-zone") return "rose";
  if (type === "support-zone") return "mint";
  if (type === "risk-reward") return "mint";
  return "gold";
}
