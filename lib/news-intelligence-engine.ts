import type { CoinSymbol } from "@/lib/market-data";
import { getMockNewsForSymbol } from "@/lib/mock-news-feed";
import { scanNewsKeywords } from "@/lib/news-keyword-engine";
import type {
  NewsIntelligenceItem,
  NewsIntelligenceResult,
  NewsKeywordMatch,
  NewsSentiment,
  NewsUrgency,
} from "@/lib/news-types";

export function buildNewsIntelligence(symbol: CoinSymbol): NewsIntelligenceResult {
  const analyzed = getMockNewsForSymbol(symbol).map(analyzeNewsItem);
  const detectedKeywords = dedupeKeywordMatches(analyzed.flatMap((item) => item.matches));
  const sentiment = aggregateSentiment(detectedKeywords);
  const urgency = aggregateUrgency(analyzed);
  const possibleMarketImpact = buildMarketImpact(sentiment, urgency, detectedKeywords);

  return {
    symbol,
    pressReleases: analyzed.filter((item) => item.sourceType === "press-release").slice(0, 3),
    news: analyzed.filter((item) => item.sourceType !== "press-release").slice(0, 3),
    detectedKeywords,
    sentiment,
    urgency,
    possibleMarketImpact,
    hermesInterpretation: buildHermesInterpretation(sentiment, urgency, detectedKeywords),
    riskCaution: {
      active: urgency === "High" || detectedKeywords.some((match) => match.tone === "risk"),
      message: "News-driven volatility may increase risk. Reduce size or wait for confirmation.",
    },
    chartMarker: {
      active: urgency === "High",
      label: "News catalyst",
      tone: sentiment === "Negative" ? "danger" : sentiment === "Positive" ? "mint" : "gold",
    },
  };
}

function analyzeNewsItem(item: ReturnType<typeof getMockNewsForSymbol>[number]): NewsIntelligenceItem {
  const matches = scanNewsKeywords(`${item.headline} ${item.summary}`);
  const sentiment = aggregateSentiment(matches);
  const urgency = itemUrgency(matches);

  return {
    ...item,
    matches,
    sentiment,
    urgency,
    possibleMarketImpact: buildMarketImpact(sentiment, urgency, matches),
  };
}

function aggregateSentiment(matches: NewsKeywordMatch[]): NewsSentiment {
  const positive = matches.filter((match) => match.tone === "positive").length;
  const risk = matches.filter((match) => match.tone === "risk").length;
  if (risk > positive) return "Negative";
  if (positive > risk) return "Positive";
  return "Neutral";
}

function aggregateUrgency(items: NewsIntelligenceItem[]): NewsUrgency {
  if (items.some((item) => item.urgency === "High")) return "High";
  if (items.some((item) => item.urgency === "Medium")) return "Medium";
  return "Low";
}

function itemUrgency(matches: NewsKeywordMatch[]): NewsUrgency {
  const highImpact = matches.some((match) =>
    ["acquisition", "merger", "FDA approval", "earnings beat", "guidance raised", "offering", "bankruptcy", "investigation", "lawsuit", "analyst downgrade"].includes(match.keyword),
  );
  if (highImpact) return "High";
  if (matches.length > 0) return "Medium";
  return "Low";
}

function buildMarketImpact(sentiment: NewsSentiment, urgency: NewsUrgency, matches: NewsKeywordMatch[]) {
  if (urgency === "High" && sentiment === "Positive") {
    return "Potential catalyst. Watch whether volume confirms before planning risk.";
  }
  if (urgency === "High" && sentiment === "Negative") {
    return "Potential volatility risk. Price may move quickly before structure becomes clear.";
  }
  if (matches.length > 0) {
    return "Headline may matter, but confirmation still needs price and volume.";
  }
  return "No clear market-moving catalyst detected in the mock feed.";
}

function buildHermesInterpretation(
  sentiment: NewsSentiment,
  urgency: NewsUrgency,
  matches: NewsKeywordMatch[],
) {
  if (urgency === "High" && sentiment === "Positive") {
    return "Positive catalyst detected, but price has not confirmed yet. Watch volume before creating a trade plan.";
  }
  if (urgency === "High" && sentiment === "Negative") {
    return "Risk catalyst detected. Let the first reaction settle before deciding whether the trade still deserves risk.";
  }
  if (matches.some((match) => match.tone === "watch")) {
    return "A watch-list keyword appeared. Hermes treats this as context, not a reason to chase.";
  }
  return "News is quiet. Let the chart and your plan carry more weight than headlines.";
}

function dedupeKeywordMatches(matches: NewsKeywordMatch[]) {
  const seen = new Set<string>();
  return matches.filter((match) => {
    const key = `${match.keyword}-${match.tone}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
