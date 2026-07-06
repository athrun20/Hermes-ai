import type { AssetQuote, CoinSymbol } from "@/lib/market-data";
import type { JournalEntry } from "@/lib/paper-trading";

export type IntelligenceBias = "Bullish" | "Bearish" | "Neutral";

export type MockMcpSignal = {
  label: string;
  value: string;
  score: number;
  tone: "positive" | "negative" | "neutral";
  source: string;
};

export type HermesIntelligence = {
  symbol: CoinSymbol;
  bias: IntelligenceBias;
  score: number;
  socialSentiment: MockMcpSignal;
  newsImpact: MockMcpSignal;
  whaleActivity: MockMcpSignal;
  marketMomentum: MockMcpSignal;
  riskLevel: MockMcpSignal;
  explanation: string;
};

const mockSignalProfiles: Partial<Record<CoinSymbol, Omit<HermesIntelligence, "symbol" | "score" | "bias" | "explanation">>> = {
  BTC: {
    socialSentiment: {
      label: "Social Sentiment",
      value: "Constructive",
      score: 74,
      tone: "positive",
      source: "Mock X/Grok sentiment",
    },
    newsImpact: {
      label: "News Impact",
      value: "ETF inflow narrative",
      score: 68,
      tone: "positive",
      source: "Mock crypto news",
    },
    whaleActivity: {
      label: "Whale Activity",
      value: "Moderate accumulation",
      score: 71,
      tone: "positive",
      source: "Mock Coinbase flow",
    },
    marketMomentum: {
      label: "Market Momentum",
      value: "Higher lows",
      score: 70,
      tone: "positive",
      source: "Mock market data",
    },
    riskLevel: {
      label: "Risk Level",
      value: "Controlled",
      score: 64,
      tone: "neutral",
      source: "Mock economic events",
    },
  },
  ETH: {
    socialSentiment: {
      label: "Social Sentiment",
      value: "Mixed but improving",
      score: 61,
      tone: "neutral",
      source: "Mock X/Grok sentiment",
    },
    newsImpact: {
      label: "News Impact",
      value: "Protocol optimism",
      score: 65,
      tone: "positive",
      source: "Mock crypto news",
    },
    whaleActivity: {
      label: "Whale Activity",
      value: "Quiet accumulation",
      score: 58,
      tone: "neutral",
      source: "Mock Coinbase flow",
    },
    marketMomentum: {
      label: "Market Momentum",
      value: "Range expansion",
      score: 63,
      tone: "positive",
      source: "Mock market data",
    },
    riskLevel: {
      label: "Risk Level",
      value: "Moderate",
      score: 54,
      tone: "neutral",
      source: "Mock economic events",
    },
  },
  SOL: {
    socialSentiment: {
      label: "Social Sentiment",
      value: "Speculative",
      score: 55,
      tone: "neutral",
      source: "Mock X/Grok sentiment",
    },
    newsImpact: {
      label: "News Impact",
      value: "Headline risk",
      score: 46,
      tone: "negative",
      source: "Mock crypto news",
    },
    whaleActivity: {
      label: "Whale Activity",
      value: "Distribution watch",
      score: 42,
      tone: "negative",
      source: "Mock Coinbase flow",
    },
    marketMomentum: {
      label: "Market Momentum",
      value: "Choppy",
      score: 49,
      tone: "neutral",
      source: "Mock market data",
    },
    riskLevel: {
      label: "Risk Level",
      value: "Elevated",
      score: 38,
      tone: "negative",
      source: "Mock economic events",
    },
  },
  LINK: {
    socialSentiment: {
      label: "Social Sentiment",
      value: "Steady",
      score: 59,
      tone: "neutral",
      source: "Mock X/Grok sentiment",
    },
    newsImpact: {
      label: "News Impact",
      value: "Partnership watch",
      score: 62,
      tone: "positive",
      source: "Mock crypto news",
    },
    whaleActivity: {
      label: "Whale Activity",
      value: "Neutral flows",
      score: 53,
      tone: "neutral",
      source: "Mock Coinbase flow",
    },
    marketMomentum: {
      label: "Market Momentum",
      value: "Base building",
      score: 57,
      tone: "neutral",
      source: "Mock market data",
    },
    riskLevel: {
      label: "Risk Level",
      value: "Moderate",
      score: 55,
      tone: "neutral",
      source: "Mock economic events",
    },
  },
};

export function buildHermesIntelligence({
  quote,
  journalEntries,
}: {
  quote: AssetQuote;
  journalEntries: JournalEntry[];
}): HermesIntelligence {
  const profile = mockSignalProfiles[quote.symbol] ?? mockSignalProfiles.BTC;
  if (!profile) {
    throw new Error("Hermes intelligence fallback profile is missing.");
  }
  const journalAdjustment = getJournalAdjustment(quote.symbol, journalEntries);
  const momentumAdjustment = Math.max(-8, Math.min(8, quote.change24h * 1.5));
  const baseScore =
    profile.socialSentiment.score * 0.22 +
    profile.newsImpact.score * 0.2 +
    profile.whaleActivity.score * 0.2 +
    profile.marketMomentum.score * 0.23 +
    profile.riskLevel.score * 0.15;
  const score = Math.round(Math.max(0, Math.min(100, baseScore + journalAdjustment + momentumAdjustment)));
  const bias: IntelligenceBias = score >= 66 ? "Bullish" : score <= 44 ? "Bearish" : "Neutral";

  return {
    ...profile,
    symbol: quote.symbol,
    score,
    bias,
    explanation: buildExplanation({
      quote,
      bias,
      score,
      journalAdjustment,
      social: profile.socialSentiment.value,
      news: profile.newsImpact.value,
      whales: profile.whaleActivity.value,
      risk: profile.riskLevel.value,
    }),
  };
}

function getJournalAdjustment(symbol: CoinSymbol, journalEntries: JournalEntry[]) {
  const symbolEntries = journalEntries.filter((entry) => entry.pair.startsWith(symbol));
  const winners = symbolEntries.filter((entry) => entry.result.startsWith("+")).length;
  const losers = symbolEntries.filter((entry) => entry.result.startsWith("-")).length;
  return Math.max(-5, Math.min(5, (winners - losers) * 2));
}

function buildExplanation({
  quote,
  bias,
  score,
  journalAdjustment,
  social,
  news,
  whales,
  risk,
}: {
  quote: AssetQuote;
  bias: IntelligenceBias;
  score: number;
  journalAdjustment: number;
  social: string;
  news: string;
  whales: string;
  risk: string;
}) {
  const journalPhrase =
    journalAdjustment > 0
      ? "recent journal history adds a small positive adjustment"
      : journalAdjustment < 0
        ? "recent journal history adds a caution adjustment"
        : "journal history is neutral";

  return `${quote.symbol} reads ${bias.toLowerCase()} with a Hermes Intelligence Score of ${score}. Mock MCP inputs show ${social.toLowerCase()} social tone, ${news.toLowerCase()} news context, ${whales.toLowerCase()} whale activity, and ${risk.toLowerCase()} macro risk; ${journalPhrase}. This is intelligence for paper trading only, not an automated trade signal.`;
}
