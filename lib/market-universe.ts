import { buildFallbackCandles, type AssetQuote, type Candle, type CoinSymbol } from "@/lib/market-data";

export type AssetType = "Crypto" | "Stock" | "ETF";
export type WorkspaceTimeframe = "1m" | "5m" | "15m" | "30m" | "1H" | "4H" | "1D" | "1W";

export type MarketAsset = AssetQuote & {
  assetType: AssetType;
  searchName: string;
};

export const marketUniverse: MarketAsset[] = [
  asset("BTC", "Bitcoin", "Crypto", 68420.3, 2.84),
  asset("ETH", "Ethereum", "Crypto", 3742.18, 1.36),
  asset("SOL", "Solana", "Crypto", 162.44, -0.72),
  asset("LINK", "Chainlink", "Crypto", 17.82, 0.48),
  asset("ADA", "Cardano", "Crypto", 0.44, 1.18),
  asset("AVAX", "Avalanche", "Crypto", 29.42, -1.04),
  asset("DOGE", "Dogecoin", "Crypto", 0.12, 0.62),
  asset("XRP", "XRP", "Crypto", 0.51, -0.35),
  asset("AAPL", "Apple Inc.", "Stock", 214.28, 0.82),
  asset("MSFT", "Microsoft", "Stock", 498.74, 0.44),
  asset("NVDA", "NVIDIA", "Stock", 146.91, 2.12),
  asset("TSLA", "Tesla", "Stock", 312.88, -1.45),
  asset("AMD", "Advanced Micro Devices", "Stock", 157.62, 1.04),
  asset("META", "Meta Platforms", "Stock", 719.34, 0.33),
  asset("GOOGL", "Alphabet", "Stock", 183.26, -0.24),
  asset("AMZN", "Amazon", "Stock", 227.11, 0.68),
  asset("SPY", "SPDR S&P 500 ETF", "ETF", 625.15, 0.28),
  asset("QQQ", "Invesco QQQ Trust", "ETF", 553.2, 0.52),
  asset("JPM", "JPMorgan Chase", "Stock", 289.64, -0.38),
  asset("COST", "Costco Wholesale", "Stock", 986.44, 0.18),
];

export const defaultWorkspaceWatchlist: CoinSymbol[] = ["BTC", "ETH", "NVDA", "MSFT", "SPY", "TSLA"];

export function getMarketAsset(symbol: CoinSymbol) {
  return marketUniverse.find((item) => item.symbol === symbol) ?? marketUniverse[0];
}

export function searchMarketAssets(query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return marketUniverse.slice(0, 8);

  return marketUniverse
    .filter((asset) =>
      [asset.symbol, asset.pair, asset.name, asset.assetType, asset.searchName]
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    )
    .slice(0, 8);
}

export function buildMockWorkspaceCandles(
  quote: AssetQuote,
  timeframe: WorkspaceTimeframe,
): Candle[] {
  if (timeframe === "1H" || timeframe === "4H" || timeframe === "1D") {
    return buildFallbackCandles(quote, timeframe);
  }

  const count = timeframe === "1W" ? 42 : 64;
  const stepSeconds = getStepSeconds(timeframe);
  const start = Math.floor(Date.now() / 1000) - count * stepSeconds;
  const direction = quote.change24h >= 0 ? 1 : -1;
  let previous = quote.price * (1 - quote.change24h / 100 / 2);

  return Array.from({ length: count }, (_, index) => {
    const wave = Math.sin(index * 0.55) * quote.price * 0.0016;
    const drift = direction * quote.price * 0.00042;
    const open = previous;
    const close = Math.max(0.01, open + wave + drift);
    previous = close;
    return {
      time: start + index * stepSeconds,
      open,
      high: Math.max(open, close) + quote.price * 0.001,
      low: Math.min(open, close) - quote.price * 0.001,
      close,
    };
  });
}

function asset(
  symbol: CoinSymbol,
  name: string,
  assetType: AssetType,
  price: number,
  change24h: number,
): MarketAsset {
  return {
    symbol,
    name,
    assetType,
    searchName: `${symbol} ${name} ${assetType}`,
    coingeckoId: "",
    pair: `${symbol}/USD`,
    price,
    change24h,
  };
}

function getStepSeconds(timeframe: WorkspaceTimeframe) {
  if (timeframe === "1m") return 60;
  if (timeframe === "5m") return 300;
  if (timeframe === "15m") return 900;
  if (timeframe === "30m") return 1800;
  if (timeframe === "1W") return 24 * 60 * 60;
  return 3600;
}
