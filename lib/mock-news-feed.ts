import type { CoinSymbol } from "@/lib/market-data";
import type { NewsItem } from "@/lib/news-types";

const mockNewsFeed: NewsItem[] = [
  item("BTC-pr-1", "BTC", "press-release", "Bitcoin Treasury Desk", "Institutional partnership expands Bitcoin custody access", "A new partnership is designed to improve institutional custody workflows while SEC policy discussions remain active.", 12),
  item("BTC-news-1", "BTC", "market-news", "Market Wire", "Bitcoin volume improves as traders watch SEC comments", "Analysts note stronger participation, but confirmation is still developing near resistance.", 3),
  item("ETH-pr-1", "ETH", "press-release", "Ethereum Foundation", "Ethereum ecosystem reports revenue growth across scaling partners", "Network activity and partnership announcements are improving sentiment, though price remains near a key range.", 9),
  item("ETH-news-1", "ETH", "market-news", "Crypto Desk", "Analyst upgrade lifts focus on Ethereum staking names", "The analyst upgrade cites stronger fee trends and institutional demand.", 2),
  item("SOL-pr-1", "SOL", "press-release", "Solana Labs", "Solana announces payments partnership with commerce platform", "The partnership may expand developer adoption, but traders are watching whether volume confirms.", 7),
  item("SOL-news-1", "SOL", "market-news", "Market Wire", "Solana slips as lawsuit headlines pressure risk assets", "A lawsuit tied to a major ecosystem participant has raised short-term volatility concerns.", 1),
  item("LINK-pr-1", "LINK", "press-release", "Chainlink Labs", "Chainlink wins data contract with global financial infrastructure firm", "The contract expands oracle usage and may support revenue growth over time.", 10),
  item("LINK-news-1", "LINK", "market-news", "Crypto Desk", "Chainlink traders watch offering rumors after sharp move", "Offering chatter has not been confirmed, but risk appetite is cautious after the move.", 2),
  item("NVDA-pr-1", "NVDA", "press-release", "NVIDIA Newsroom", "NVIDIA raises guidance after earnings beat", "The company reported an earnings beat, revenue growth, and guidance raised for the next quarter.", 5),
  item("NVDA-news-1", "NVDA", "market-news", "Market Wire", "Analyst upgrade follows NVIDIA data-center demand update", "The analyst upgrade cites strong demand, but price may need a pullback before a cleaner plan.", 1),
  item("TSLA-pr-1", "TSLA", "press-release", "Tesla Investor Relations", "Tesla announces buyback review and new battery partnership", "The board is reviewing a possible buyback while a battery partnership may expand production flexibility.", 6),
  item("TSLA-news-1", "TSLA", "market-news", "Street Desk", "Tesla faces investigation into fleet software update", "An investigation creates headline risk and may increase intraday volatility.", 2),
  item("AAPL-news-1", "AAPL", "market-news", "Market Wire", "Apple shares steady after analyst downgrade", "An analyst downgrade cited slower hardware replacement cycles, keeping urgency moderate.", 4),
  item("MSFT-news-1", "MSFT", "market-news", "Market Wire", "Microsoft announces acquisition of security startup", "The acquisition strengthens cloud security offerings, but integration details remain limited.", 8),
  item("AMD-news-1", "AMD", "market-news", "Chip Desk", "AMD wins AI accelerator contract", "A new contract may support revenue growth, though traders are watching volume confirmation.", 3),
  item("META-news-1", "META", "market-news", "Market Wire", "Meta approves expanded buyback authorization", "The buyback adds shareholder return support after steady advertising revenue growth.", 5),
  item("GOOGL-news-1", "GOOGL", "market-news", "Search Desk", "Alphabet faces SEC questions over AI disclosure", "SEC questions are not a thesis by themselves, but they can raise headline risk.", 4),
  item("AMZN-news-1", "AMZN", "market-news", "Retail Wire", "Amazon reports earnings beat as cloud revenue growth improves", "The earnings beat and revenue growth may support constructive sentiment if volume confirms.", 2),
  item("JPM-news-1", "JPM", "market-news", "Bank Desk", "JPMorgan announces dividend increase after stress test", "The dividend increase is constructive, but banks remain sensitive to macro conditions.", 5),
  item("COST-news-1", "COST", "market-news", "Retail Wire", "Costco announces special dividend", "The dividend is shareholder friendly, though price confirmation still matters.", 6),
  item("SPY-news-1", "SPY", "market-news", "Macro Wire", "S&P 500 breadth improves as traders await earnings", "Market breadth is constructive, but earnings season can raise headline risk.", 2),
  item("QQQ-news-1", "QQQ", "market-news", "Macro Wire", "Nasdaq momentum improves after analyst upgrades across AI leaders", "Analyst upgrades support sentiment, but extended entries still need patience.", 2),
];

export function getMockNewsForSymbol(symbol: CoinSymbol) {
  const direct = mockNewsFeed.filter((item) => item.symbol === symbol);
  if (direct.length > 0) return direct;

  return [
    item(`${symbol}-news-1`, symbol, "market-news", "Market Wire", `${symbol} traders watch volume before confirmation`, "No major catalyst is confirmed yet. Hermes treats the tape as technical until news quality improves.", 2),
    item(`${symbol}-pr-1`, symbol, "press-release", "Company Newsroom", `${symbol} announces partnership update`, "A partnership headline may matter if volume expands and price confirms above structure.", 8),
  ];
}

function item(
  id: string,
  symbol: CoinSymbol,
  sourceType: NewsItem["sourceType"],
  source: string,
  headline: string,
  summary: string,
  hoursAgo: number,
): NewsItem {
  return {
    id,
    symbol,
    sourceType,
    source,
    headline,
    summary,
    publishedAt: new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString(),
  };
}
