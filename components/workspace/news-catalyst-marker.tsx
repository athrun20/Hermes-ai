import type { Candle } from "@/lib/market-data";
import type { HermesVisionLabel } from "@/lib/hermes-vision-types";
import type { NewsIntelligenceResult } from "@/lib/news-types";

export function buildNewsCatalystMarker({
  candles,
  news,
}: {
  candles: Candle[];
  news: NewsIntelligenceResult;
}): HermesVisionLabel | null {
  if (!news.chartMarker.active) return null;

  const latestPrice = candles.at(-1)?.close;
  return {
    id: `${news.symbol}-news-catalyst`,
    text: news.chartMarker.label,
    tone: news.chartMarker.tone === "danger" ? "danger" : news.chartMarker.tone === "mint" ? "mint" : "gold",
    price: latestPrice,
    priority: 82,
  };
}
