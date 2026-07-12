/**
 * Legacy market-data surface (pre Live Market Data Foundation).
 * Preserved for compatibility. New code should use MarketQuote / MarketCandle
 * via adapters-compat and marketDataService.
 */

export type CoinSymbol =
  | "BTC"
  | "ETH"
  | "SOL"
  | "LINK"
  | "ADA"
  | "AVAX"
  | "DOGE"
  | "XRP"
  | "AAPL"
  | "MSFT"
  | "NVDA"
  | "TSLA"
  | "AMD"
  | "META"
  | "GOOGL"
  | "AMZN"
  | "SPY"
  | "QQQ"
  | "JPM"
  | "COST";
export type Timeframe = "1m" | "5m" | "15m" | "30m" | "1H" | "4H" | "1D" | "1W";
export type Bias = "Bullish" | "Bearish" | "Neutral";
export type SuggestedAction = "Watch" | "Wait" | "Paper Trade Setup";

export type AssetQuote = {
  symbol: CoinSymbol;
  name: string;
  coingeckoId: string;
  pair: `${CoinSymbol}/USD`;
  price: number;
  change24h: number;
  lastUpdated?: string;
};

export type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
};

export type HermesAnalysis = {
  bias: Bias;
  confidence: number;
  trend: string;
  volatility: string;
  riskLevel: string;
  reasons: string[];
  suggestedAction: SuggestedAction;
};

export const supportedAssets = [
  { symbol: "BTC", name: "Bitcoin", coingeckoId: "bitcoin", pair: "BTC/USD" },
  { symbol: "ETH", name: "Ethereum", coingeckoId: "ethereum", pair: "ETH/USD" },
  { symbol: "SOL", name: "Solana", coingeckoId: "solana", pair: "SOL/USD" },
  { symbol: "LINK", name: "Chainlink", coingeckoId: "chainlink", pair: "LINK/USD" },
] as const satisfies ReadonlyArray<
  Pick<AssetQuote, "symbol" | "name" | "coingeckoId" | "pair">
>;

export const fallbackQuotes: AssetQuote[] = [
  {
    symbol: "BTC",
    name: "Bitcoin",
    coingeckoId: "bitcoin",
    pair: "BTC/USD",
    price: 68420.3,
    change24h: 2.84,
  },
  {
    symbol: "ETH",
    name: "Ethereum",
    coingeckoId: "ethereum",
    pair: "ETH/USD",
    price: 3742.18,
    change24h: 1.36,
  },
  {
    symbol: "SOL",
    name: "Solana",
    coingeckoId: "solana",
    pair: "SOL/USD",
    price: 162.44,
    change24h: -0.72,
  },
  {
    symbol: "LINK",
    name: "Chainlink",
    coingeckoId: "chainlink",
    pair: "LINK/USD",
    price: 17.82,
    change24h: 0.48,
  },
];

export const journal = [
  {
    date: "Jun 27",
    pair: "BTC/USD",
    setup: "Trend pullback",
    risk: "1.0%",
    result: "+2.1R",
    status: "Closed",
  },
  {
    date: "Jun 26",
    pair: "ETH/USD",
    setup: "Breakout retest",
    risk: "0.8%",
    result: "+0.7R",
    status: "Closed",
  },
  {
    date: "Jun 25",
    pair: "SOL/USD",
    setup: "Range reclaim",
    risk: "0.6%",
    result: "-1.0R",
    status: "Closed",
  },
  {
    date: "Jun 24",
    pair: "LINK/USD",
    setup: "Momentum base",
    risk: "0.5%",
    result: "Open",
    status: "Active",
  },
];

const coinIds = supportedAssets.map((asset) => asset.coingeckoId).join(",");

/**
 * Legacy CoinGecko quote fetch (not used by dashboard Step A).
 * Prefer crypto-provider + marketDataService for new code.
 * @deprecated Use market-data crypto provider via service / route handlers.
 */
export async function fetchLiveQuotes(): Promise<AssetQuote[]> {
  const response = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${coinIds}&vs_currencies=usd&include_24hr_change=true&include_last_updated_at=true`,
    { cache: "no-store" },
  );

  if (!response.ok) {
    throw new Error("Unable to load public market prices.");
  }

  const data = (await response.json()) as Record<
    string,
    { usd?: number; usd_24h_change?: number; last_updated_at?: number }
  >;

  return supportedAssets.map((asset) => {
    const quote = data[asset.coingeckoId];
    const fallback = fallbackQuotes.find((item) => item.symbol === asset.symbol);

    return {
      ...asset,
      price: quote?.usd ?? fallback?.price ?? 0,
      change24h: quote?.usd_24h_change ?? fallback?.change24h ?? 0,
      lastUpdated: quote?.last_updated_at
        ? new Date(quote.last_updated_at * 1000).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })
        : undefined,
    };
  });
}

/**
 * Legacy CoinGecko candles (not used by dashboard Step A).
 * @deprecated Use crypto-provider via service / route handlers.
 */
export async function fetchMarketCandles(
  coinId: string,
  timeframe: Timeframe,
): Promise<Candle[]> {
  const days = timeframe === "1D" ? "1" : "1";
  const response = await fetch(
    `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`,
    { cache: "no-store" },
  );

  if (!response.ok) {
    throw new Error("Unable to load public chart data.");
  }

  const data = (await response.json()) as { prices?: [number, number][] };
  return pricesToCandles(data.prices ?? [], timeframe);
}

export function pricesToCandles(
  prices: [number, number][],
  timeframe: Timeframe,
): Candle[] {
  const bucketMs =
    timeframe === "1H" ? 5 * 60 * 1000 : timeframe === "4H" ? 15 * 60 * 1000 : 60 * 60 * 1000;
  const now = Date.now();
  const windowMs =
    timeframe === "1H"
      ? 60 * 60 * 1000
      : timeframe === "4H"
        ? 4 * 60 * 60 * 1000
        : 24 * 60 * 60 * 1000;

  const buckets = new Map<number, number[]>();

  prices
    .filter(([timestamp]) => timestamp >= now - windowMs)
    .forEach(([timestamp, price]) => {
      const bucket = Math.floor(timestamp / bucketMs) * bucketMs;
      const values = buckets.get(bucket) ?? [];
      values.push(price);
      buckets.set(bucket, values);
    });

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a - b)
    .map(([bucket, values]) => {
      const open = values[0];
      const close = values[values.length - 1];
      return {
        time: Math.floor(bucket / 1000),
        open,
        high: Math.max(...values),
        low: Math.min(...values),
        close,
      };
    })
    .filter((candle) => Number.isFinite(candle.open) && Number.isFinite(candle.close));
}

export function buildFallbackCandles(quote: AssetQuote, timeframe: Timeframe): Candle[] {
  const count = timeframe === "1H" ? 12 : timeframe === "4H" ? 16 : 24;
  const stepSeconds = timeframe === "1H" ? 300 : timeframe === "4H" ? 900 : 3600;
  const start = Math.floor(Date.now() / 1000) - count * stepSeconds;
  const direction = quote.change24h >= 0 ? 1 : -1;
  let last = quote.price * (1 - quote.change24h / 100 / 2);

  return Array.from({ length: count }, (_, index) => {
    const drift = direction * quote.price * 0.0008;
    const wave = Math.sin(index * 0.9) * quote.price * 0.0018;
    const open = last;
    const close = Math.max(0.01, open + drift + wave);
    const high = Math.max(open, close) + quote.price * 0.0015;
    const low = Math.min(open, close) - quote.price * 0.0015;
    last = close;

    return {
      time: start + index * stepSeconds,
      open,
      high,
      low,
      close,
    };
  });
}

export function analyzeMarket(quote: AssetQuote, candles: Candle[]): HermesAnalysis {
  const first = candles[0]?.open ?? quote.price;
  const last = candles[candles.length - 1]?.close ?? quote.price;
  const move = ((last - first) / first) * 100;
  const ranges = candles.map((candle) => ((candle.high - candle.low) / candle.close) * 100);
  const averageRange =
    ranges.length > 0
      ? ranges.reduce((sum, value) => sum + value, 0) / ranges.length
      : Math.abs(quote.change24h) / 2;

  const bias: Bias =
    quote.change24h > 1 && move > 0
      ? "Bullish"
      : quote.change24h < -1 && move < 0
        ? "Bearish"
        : "Neutral";
  const confidence = Math.min(
    92,
    Math.max(54, Math.round(58 + Math.abs(quote.change24h) * 6 + Math.abs(move) * 8)),
  );
  const volatility =
    averageRange > 1.8 || Math.abs(quote.change24h) > 4
      ? "High"
      : averageRange > 0.8 || Math.abs(quote.change24h) > 1.5
        ? "Medium"
        : "Low";
  const riskLevel =
    volatility === "High" ? "Elevated" : bias === "Neutral" ? "Moderate" : "Controlled";
  const trend =
    move > 0.35
      ? "Short-term uptrend"
      : move < -0.35
        ? "Short-term downtrend"
        : "Sideways consolidation";
  const suggestedAction: SuggestedAction =
    bias === "Bullish" && riskLevel !== "Elevated"
      ? "Paper Trade Setup"
      : bias === "Bearish" || volatility === "High"
        ? "Wait"
        : "Watch";

  return {
    bias,
    confidence,
    trend,
    volatility,
    riskLevel,
    suggestedAction,
    reasons: [
      `${quote.pair} is ${formatPercent(quote.change24h)} over 24h.`,
      `${trend} based on the visible chart window.`,
      `${volatility.toLowerCase()} candle range keeps risk ${riskLevel.toLowerCase()}.`,
    ],
  };
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value >= 1000 ? 0 : 2,
  }).format(value);
}

export function formatPercent(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}
