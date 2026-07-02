import type { CoinSymbol } from "@/lib/market-data";

export type AnalystBias = "Bullish" | "Bearish" | "Neutral";
export type TradeGrade = "A+" | "A" | "B+" | "B" | "C+" | "C" | "D" | "F";

export type AssetAiAnalysis = {
  symbol: CoinSymbol;
  name: string;
  bias: AnalystBias;
  confidence: number;
  grade: TradeGrade;
  entryZone: string;
  stopLoss: string;
  takeProfit: string;
  riskReward: string;
  reasoning: string[];
};

export const mockAssetAnalyses: AssetAiAnalysis[] = [
  {
    symbol: "BTC",
    name: "Bitcoin",
    bias: "Bullish",
    confidence: 84,
    grade: "A",
    entryZone: "$67,800 - $68,450",
    stopLoss: "$66,900",
    takeProfit: "$70,800",
    riskReward: "2.6R",
    reasoning: [
      "Price is holding above the prior breakout shelf with buyers defending dips.",
      "Momentum remains constructive while higher lows continue to form.",
      "Mock order-flow data suggests accumulation rather than aggressive distribution.",
      "Volatility is elevated but still inside a tradable range.",
      "Risk is cleaner on a pullback than on a breakout chase.",
      "Paper setup is valid only if support holds and volume expands.",
    ],
  },
  {
    symbol: "ETH",
    name: "Ethereum",
    bias: "Neutral",
    confidence: 68,
    grade: "B",
    entryZone: "$3,650 - $3,735",
    stopLoss: "$3,575",
    takeProfit: "$3,910",
    riskReward: "2.1R",
    reasoning: [
      "ETH is compressing near range resistance without clear continuation yet.",
      "Relative strength is improving, but confirmation volume is still mixed.",
      "The trend favors patience until price accepts above the current supply area.",
      "A pullback into the mid-range would improve reward-to-risk.",
      "Risk remains moderate because invalidation is nearby.",
      "Best paper action is to wait for either a clean retest or breakout hold.",
    ],
  },
  {
    symbol: "SOL",
    name: "Solana",
    bias: "Bearish",
    confidence: 73,
    grade: "C+",
    entryZone: "$156.00 - $160.50",
    stopLoss: "$164.20",
    takeProfit: "$148.00",
    riskReward: "1.9R",
    reasoning: [
      "SOL is showing choppy momentum and weaker response near resistance.",
      "Recent candles imply sellers are active into strength.",
      "Mock whale flow leans defensive, suggesting reduced conviction.",
      "The setup needs a reclaimed support level before long exposure improves.",
      "Downside risk is elevated if the current range low fails.",
      "Paper short bias is only valid with strict stop discipline.",
    ],
  },
  {
    symbol: "LINK",
    name: "Chainlink",
    bias: "Neutral",
    confidence: 61,
    grade: "B+",
    entryZone: "$17.20 - $17.85",
    stopLoss: "$16.70",
    takeProfit: "$19.10",
    riskReward: "2.3R",
    reasoning: [
      "LINK is base-building after a controlled pullback.",
      "Momentum is not yet strong enough for a high-conviction bullish read.",
      "The chart structure improves if price reclaims the upper range.",
      "Mock news flow is supportive but not urgent.",
      "Risk is acceptable because the stop can sit below the current base.",
      "Paper setup favors watching for a breakout retest rather than entering early.",
    ],
  },
];
