import type { CoinSymbol } from "@/lib/market-data";

export type NewsSourceType = "press-release" | "market-news" | "filing" | "rss";
export type NewsKeywordTone = "positive" | "watch" | "risk";
export type NewsSentiment = "Positive" | "Neutral" | "Negative";
export type NewsUrgency = "Low" | "Medium" | "High";

export type NewsItem = {
  id: string;
  symbol: CoinSymbol;
  sourceType: NewsSourceType;
  source: string;
  headline: string;
  summary: string;
  publishedAt: string;
};

export type NewsKeywordMatch = {
  keyword: string;
  tone: NewsKeywordTone;
  category: "catalyst" | "risk" | "watch";
};

export type NewsIntelligenceItem = NewsItem & {
  matches: NewsKeywordMatch[];
  sentiment: NewsSentiment;
  urgency: NewsUrgency;
  possibleMarketImpact: string;
};

export type NewsIntelligenceResult = {
  symbol: CoinSymbol;
  pressReleases: NewsIntelligenceItem[];
  news: NewsIntelligenceItem[];
  detectedKeywords: NewsKeywordMatch[];
  sentiment: NewsSentiment;
  urgency: NewsUrgency;
  possibleMarketImpact: string;
  hermesInterpretation: string;
  riskCaution: {
    active: boolean;
    message: string;
  };
  chartMarker: {
    active: boolean;
    label: string;
    tone: "gold" | "danger" | "mint";
  };
};

export type NewsKeywordAlert = "fda-approval" | "acquisition" | "offering" | "earnings" | "upgrade" | "downgrade" | "lawsuit";
