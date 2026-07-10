import type { HermesVisionLabel } from "@/lib/hermes-vision-types";
import type { InstitutionalFootprintResult } from "@/lib/footprint-types";
import type { HermesVisionContext } from "@/lib/hermes-vision-types";

export function buildFootprintChartLabels({
  footprint,
  context,
}: {
  footprint: Pick<InstitutionalFootprintResult, "type" | "direction" | "confidence">;
  context: HermesVisionContext;
}): HermesVisionLabel[] {
  if (footprint.type === "No clear institutional footprint" || footprint.confidence < 52) return [];
  const tone: HermesVisionLabel["tone"] =
    footprint.direction === "Bullish" ? "mint" : footprint.direction === "Bearish" ? "danger" : "gold";

  return [
    {
      id: `footprint-${footprint.type}`,
      text: labelText(footprint.type),
      tone,
      price: context.currentPrice,
      priority: 2,
    },
  ].slice(0, 1);
}

function labelText(type: InstitutionalFootprintResult["type"]) {
  if (type === "Buyer Absorption") return "Possible absorption";
  if (type === "Seller Absorption") return "Possible absorption";
  if (type === "Liquidity Sweep") return "Liquidity sweep";
  if (type === "Failed Breakout") return "Failed breakout";
  if (type === "Failed Breakdown") return "Failed breakdown";
  if (type === "Exhaustion") return "Exhaustion";
  if (type === "Supply Absorbed") return "Supply absorbed";
  if (type === "Demand Absorbed") return "Demand absorbed";
  return type;
}
