import type { NewsKeywordAlert, NewsKeywordMatch, NewsKeywordTone } from "@/lib/news-types";

type KeywordDefinition = {
  keyword: string;
  tone: NewsKeywordTone;
  category: NewsKeywordMatch["category"];
  alert?: NewsKeywordAlert;
};

export const newsKeywordDefinitions: KeywordDefinition[] = [
  { keyword: "acquisition", tone: "positive", category: "catalyst", alert: "acquisition" },
  { keyword: "merger", tone: "positive", category: "catalyst" },
  { keyword: "FDA approval", tone: "positive", category: "catalyst", alert: "fda-approval" },
  { keyword: "earnings beat", tone: "positive", category: "catalyst", alert: "earnings" },
  { keyword: "revenue growth", tone: "positive", category: "catalyst" },
  { keyword: "guidance raised", tone: "positive", category: "catalyst" },
  { keyword: "partnership", tone: "positive", category: "catalyst" },
  { keyword: "contract", tone: "positive", category: "catalyst" },
  { keyword: "buyback", tone: "positive", category: "catalyst" },
  { keyword: "dividend", tone: "watch", category: "watch" },
  { keyword: "debt offering", tone: "watch", category: "watch", alert: "offering" },
  { keyword: "dilution", tone: "risk", category: "risk" },
  { keyword: "offering", tone: "risk", category: "risk", alert: "offering" },
  { keyword: "bankruptcy", tone: "risk", category: "risk" },
  { keyword: "investigation", tone: "risk", category: "risk" },
  { keyword: "lawsuit", tone: "risk", category: "risk", alert: "lawsuit" },
  { keyword: "SEC", tone: "watch", category: "watch" },
  { keyword: "insider buying", tone: "positive", category: "catalyst" },
  { keyword: "analyst upgrade", tone: "positive", category: "catalyst", alert: "upgrade" },
  { keyword: "analyst downgrade", tone: "risk", category: "risk", alert: "downgrade" },
];

export function scanNewsKeywords(text: string): NewsKeywordMatch[] {
  const normalized = text.toLowerCase();
  const matches = newsKeywordDefinitions
    .filter((definition) => normalized.includes(definition.keyword.toLowerCase()))
    .map(({ keyword, tone, category }) => ({ keyword, tone, category }));

  return dedupeKeywordMatches(matches);
}

export function keywordAlertMatches(alert: NewsKeywordAlert, matches: NewsKeywordMatch[]) {
  return matches.some((match) => alertAliases[alert].some((keyword) => match.keyword.toLowerCase().includes(keyword)));
}

function dedupeKeywordMatches(matches: NewsKeywordMatch[]) {
  const seen = new Set<string>();
  return matches.filter((match) => {
    const key = match.keyword.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const alertAliases: Record<NewsKeywordAlert, string[]> = {
  "fda-approval": ["fda approval"],
  acquisition: ["acquisition", "merger"],
  offering: ["offering", "debt offering", "dilution"],
  earnings: ["earnings beat", "guidance raised", "revenue growth"],
  upgrade: ["analyst upgrade"],
  downgrade: ["analyst downgrade"],
  lawsuit: ["lawsuit", "investigation"],
};
