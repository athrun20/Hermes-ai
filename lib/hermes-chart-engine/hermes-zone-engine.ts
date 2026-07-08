import type { ChartTradeLevels } from "@/lib/chart-types";
import type { Candle } from "@/lib/market-data";
import type { HermesVisionLabel } from "@/lib/hermes-vision-types";

export type HermesChartZone = {
  label: "Study Zone" | "Wait Zone" | "Risk Zone" | "Confirmation Zone";
  price: number;
  tone: "gold" | "mint" | "rose" | "blue";
};

export function buildHermesZones({
  candles,
  labels,
  tradeLevels,
}: {
  candles: Candle[];
  labels: HermesVisionLabel[];
  tradeLevels: ChartTradeLevels;
}): HermesChartZone[] {
  const current = candles.at(-1)?.close ?? tradeLevels.entry ?? 0;
  const zones: HermesChartZone[] = [];
  const labelText = labels.map((label) => label.text.toLowerCase()).join(" ");

  if (labelText.includes("support") || labelText.includes("study")) {
    zones.push({ label: "Study Zone", price: tradeLevels.entry ?? current, tone: "gold" });
  }
  if (labelText.includes("wait") || labelText.includes("confirmation")) {
    zones.push({ label: "Wait Zone", price: current, tone: "blue" });
  }
  if (labelText.includes("risk") || labelText.includes("extended") || labelText.includes("tight")) {
    zones.push({ label: "Risk Zone", price: tradeLevels.stop ?? current, tone: "rose" });
  }
  if (tradeLevels.entry && tradeLevels.stop && tradeLevels.target) {
    zones.push({ label: "Confirmation Zone", price: tradeLevels.entry, tone: "mint" });
  }

  return zones.slice(0, 2);
}
