import type { AssetQuote, Bias, Candle } from "@/lib/market-data";
import type { MarketAsset } from "@/lib/market-universe";

export type SymbolAnalysis = {
  symbol: string;
  name: string;
  assetType: string;
  marketBias: Bias;
  confidence: number;
  trend: string;
  momentum: string;
  volumeRead: string;
  support: number;
  resistance: number;
  riskLevel: "Low" | "Medium" | "High";
  hermesSays: string;
  beginnerFit: "Yes" | "No" | "Caution";
  suggestedAction: "Study Setup" | "Wait for Pullback" | "Observe Only" | "Create Trade Plan";
};

export function analyzeWorkspaceSymbol({
  asset,
  candles,
}: {
  asset: MarketAsset;
  candles: Candle[];
}): SymbolAnalysis {
  const first = candles[0]?.open ?? asset.price;
  const last = candles[candles.length - 1]?.close ?? asset.price;
  const move = ((last - first) / first) * 100;
  const marketBias: Bias =
    asset.change24h > 1 && move > 0 ? "Bullish" : asset.change24h < -1 && move < 0 ? "Bearish" : "Neutral";
  const confidence = Math.min(94, Math.max(52, Math.round(62 + Math.abs(asset.change24h) * 5 + Math.abs(move) * 4)));
  const riskLevel = Math.abs(asset.change24h) > 3 ? "High" : Math.abs(asset.change24h) > 1.2 ? "Medium" : "Low";
  const support = Math.min(...candles.map((candle) => candle.low));
  const resistance = Math.max(...candles.map((candle) => candle.high));

  return {
    symbol: asset.symbol,
    name: asset.name,
    assetType: asset.assetType,
    marketBias,
    confidence,
    trend: move > 0.4 ? "Short-term uptrend" : move < -0.4 ? "Short-term downtrend" : "Sideways consolidation",
    momentum: asset.change24h > 1 ? "Improving" : asset.change24h < -1 ? "Fading" : "Balanced",
    volumeRead: confidence > 78 ? "Participation improving" : "Confirmation still developing",
    support,
    resistance,
    riskLevel,
    hermesSays:
      marketBias === "Bullish"
        ? "Momentum favors buyers, but this setup needs confirmation before it deserves risk."
        : marketBias === "Bearish"
          ? "Sellers have control for now. Patience matters more than prediction."
          : "The market is balanced. Study the range before creating a plan.",
    beginnerFit: riskLevel === "High" ? "No" : marketBias === "Neutral" ? "Caution" : "Yes",
    suggestedAction:
      riskLevel === "High"
        ? "Observe Only"
        : marketBias === "Bullish"
          ? "Create Trade Plan"
          : marketBias === "Neutral"
            ? "Study Setup"
            : "Wait for Pullback",
  };
}

export function quoteToOpportunityInputs(quote: AssetQuote) {
  const bias = quote.change24h > 1 ? "Bullish" : quote.change24h < -1 ? "Bearish" : "Neutral";
  const riskLevel = Math.abs(quote.change24h) > 3 ? "High" : Math.abs(quote.change24h) > 1.2 ? "Elevated" : "Moderate";
  return { bias, riskLevel } as const;
}
