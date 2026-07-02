import type { CoinSymbol } from "@/lib/market-data";

export type PositionSide = "Long" | "Short";
export type OrderAction = "Buy" | "Sell" | "Short" | "Cover";

export type PaperPosition = {
  id: string;
  symbol: CoinSymbol;
  side: PositionSide;
  entryPrice: number;
  quantity: number;
  notional: number;
  stopLoss?: number;
  takeProfit?: number;
  openedAt: number;
};

export type ClosedTrade = PaperPosition & {
  exitPrice: number;
  closedAt: number;
  pnl: number;
  returnPct: number;
  followedPlan: boolean;
  qualityScore: number;
  coach: {
    grade: TradeGrade;
    doneWell: string;
    wentWrong: string;
    riskManagement: string;
    entryFeedback: string;
    exitFeedback: string;
    improvement: string;
  };
};

export type TradeGrade = "A+" | "A" | "B+" | "B" | "C+" | "C" | "D" | "F";

export type EquityPoint = {
  time: number;
  value: number;
};

export type PortfolioSnapshot = {
  startingBalance: number;
  cash: number;
  buyingPower: number;
  equity: number;
  unrealizedPnl: number;
  realizedPnl: number;
  dailyPnl: number;
};

export type PerformanceStats = {
  winRate: number;
  totalTrades: number;
  averageWin: number;
  averageLoss: number;
  largestWin: number;
  largestLoss: number;
  averageRiskReward: number;
};

export type JournalEntry = {
  id: string;
  date: string;
  pair: string;
  setup: string;
  risk: string;
  result: string;
  status: string;
};

export type PaperSettings = {
  riskPerTrade: number;
  maxDailyRisk: number;
};

export const STARTING_BALANCE = 10000;
export const DEFAULT_SETTINGS: PaperSettings = {
  riskPerTrade: 1,
  maxDailyRisk: 3,
};

export function getPositionPnl(position: PaperPosition, currentPrice: number): number {
  const move =
    position.side === "Long"
      ? currentPrice - position.entryPrice
      : position.entryPrice - currentPrice;

  return move * position.quantity;
}

export function getPositionReturn(position: PaperPosition, pnl: number): number {
  return position.notional > 0 ? (pnl / position.notional) * 100 : 0;
}

export function getDurationLabel(openedAt: number, closedAt = Date.now()): string {
  const totalMinutes = Math.max(1, Math.floor((closedAt - openedAt) / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours < 1) {
    return `${minutes}m`;
  }

  return `${hours}h ${minutes}m`;
}

export function buildPortfolioSnapshot({
  cash,
  positions,
  prices,
  history,
}: {
  cash: number;
  positions: PaperPosition[];
  prices: Partial<Record<CoinSymbol, number>>;
  history: ClosedTrade[];
}): PortfolioSnapshot {
  const reserved = positions.reduce((sum, position) => sum + position.notional, 0);
  const unrealizedPnl = positions.reduce(
    (sum, position) => sum + getPositionPnl(position, prices[position.symbol] ?? position.entryPrice),
    0,
  );
  const realizedPnl = history.reduce((sum, trade) => sum + trade.pnl, 0);
  const today = new Date().toDateString();
  const dailyPnl =
    history
      .filter((trade) => new Date(trade.closedAt).toDateString() === today)
      .reduce((sum, trade) => sum + trade.pnl, 0) + unrealizedPnl;

  return {
    startingBalance: STARTING_BALANCE,
    cash,
    buyingPower: cash,
    equity: cash + reserved + unrealizedPnl,
    unrealizedPnl,
    realizedPnl,
    dailyPnl,
  };
}

export function buildPerformanceStats(history: ClosedTrade[]): PerformanceStats {
  const wins = history.filter((trade) => trade.pnl > 0);
  const losses = history.filter((trade) => trade.pnl < 0);
  const average = (values: number[]) =>
    values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  const riskRewards = history
    .map((trade) => {
      if (!trade.stopLoss || !trade.takeProfit) {
        return 0;
      }

      const risk = Math.abs(trade.entryPrice - trade.stopLoss);
      const reward = Math.abs(trade.takeProfit - trade.entryPrice);
      return risk > 0 ? reward / risk : 0;
    })
    .filter((value) => value > 0);

  return {
    winRate: history.length > 0 ? (wins.length / history.length) * 100 : 0,
    totalTrades: history.length,
    averageWin: average(wins.map((trade) => trade.pnl)),
    averageLoss: average(losses.map((trade) => trade.pnl)),
    largestWin: wins.length > 0 ? Math.max(...wins.map((trade) => trade.pnl)) : 0,
    largestLoss: losses.length > 0 ? Math.min(...losses.map((trade) => trade.pnl)) : 0,
    averageRiskReward: average(riskRewards),
  };
}

export function scoreTrade({
  position,
  pnl,
}: {
  position: PaperPosition;
  pnl: number;
}): Pick<ClosedTrade, "followedPlan" | "qualityScore" | "coach"> {
  const hasPlan = Boolean(position.stopLoss && position.takeProfit);
  const risk =
    position.stopLoss && Math.abs(position.entryPrice - position.stopLoss) > 0
      ? Math.abs(position.entryPrice - position.stopLoss)
      : 0;
  const reward = position.takeProfit ? Math.abs(position.takeProfit - position.entryPrice) : 0;
  const riskReward = risk > 0 ? reward / risk : 0;
  const followedPlan = hasPlan && riskReward >= 1.2;
  const durationMinutes = Math.max(1, Math.floor((Date.now() - position.openedAt) / 60000));
  const heldLongEnough = durationMinutes >= 5;
  const qualityScore = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        44 +
          (followedPlan ? 24 : 3) +
          (pnl > 0 ? 16 : -10) +
          (heldLongEnough ? 5 : -3) +
          Math.min(riskReward, 3) * 5,
      ),
    ),
  );
  const grade = getTradeGrade(qualityScore);
  const sideLabel = position.side.toLowerCase();

  return {
    followedPlan,
    qualityScore,
    coach: {
      grade,
      doneWell: followedPlan
        ? `You entered the ${sideLabel} paper trade with both stop-loss and target defined.`
        : "You logged the trade and captured the outcome for review instead of ignoring feedback.",
      wentWrong:
        pnl >= 0
          ? "The main weakness is process risk: profitable trades still need consistent review before scaling size."
          : hasPlan
            ? "The setup did not pay enough relative to the risk taken, so execution quality needs another filter."
            : "The trade lacked a complete predefined stop and target plan, which made the review weaker.",
      riskManagement:
        riskReward >= 2
          ? `Risk/reward was strong at ${riskReward.toFixed(2)}R, which supports repeatable paper trading.`
          : riskReward > 0
            ? `Risk/reward was only ${riskReward.toFixed(2)}R; aim for cleaner setups above 2R.`
            : "Risk/reward could not be measured because a stop-loss and take-profit were not both set.",
      entryFeedback:
        position.stopLoss
          ? `Entry had a defined invalidation level at ${position.stopLoss.toFixed(2)}, which helps control downside.`
          : "Entry needs a clear invalidation level before opening the next paper trade.",
      exitFeedback:
        pnl > 0
          ? "Exit produced a realized gain; review whether it followed the original target or closed early."
          : "Exit realized a loss; review whether the stop was respected or if the position was closed emotionally.",
      improvement:
        pnl >= 0
          ? "Keep sizing consistent so wins do not encourage oversized follow-up trades."
          : "Tighten the plan before entry by requiring a clear stop and target.",
    },
  };
}

export function getTradeGrade(score: number): TradeGrade {
  if (score >= 97) return "A+";
  if (score >= 90) return "A";
  if (score >= 84) return "B+";
  if (score >= 76) return "B";
  if (score >= 68) return "C+";
  if (score >= 60) return "C";
  if (score >= 45) return "D";
  return "F";
}

export function closePosition(
  position: PaperPosition,
  exitPrice: number,
  closedAt = Date.now(),
): ClosedTrade {
  const pnl = getPositionPnl(position, exitPrice);
  const scored = scoreTrade({ position, pnl });

  return {
    ...position,
    exitPrice,
    closedAt,
    pnl,
    returnPct: getPositionReturn(position, pnl),
    ...scored,
  };
}

export function buildEquityCurve(history: ClosedTrade[], currentEquity: number): EquityPoint[] {
  let equity = STARTING_BALANCE;
  const sortedHistory = [...history].sort((a, b) => a.closedAt - b.closedAt);
  const points: EquityPoint[] = [
    {
      time: Math.floor((Date.now() - 6 * 60 * 60 * 1000) / 1000),
      value: STARTING_BALANCE,
    },
  ];

  sortedHistory.forEach((trade) => {
    equity += trade.pnl;
    points.push({
      time: Math.floor(trade.closedAt / 1000),
      value: equity,
    });
  });

  points.push({
    time: Math.floor(Date.now() / 1000),
    value: currentEquity,
  });

  return normalizeEquityCurvePoints(points);
}

function normalizeEquityCurvePoints(points: EquityPoint[]): EquityPoint[] {
  const latestValueByTime = new Map<number, number>();

  [...points]
    .sort((a, b) => a.time - b.time)
    .forEach((point) => {
      latestValueByTime.set(Math.floor(point.time), point.value);
    });

  let previousTime = 0;
  return Array.from(latestValueByTime.entries())
    .map(([time, value]) => ({ time, value }))
    .sort((a, b) => a.time - b.time)
    .map((point) => {
      const nextTime = point.time <= previousTime ? previousTime + 1 : point.time;
      previousTime = nextTime;
      return {
        time: nextTime,
        value: point.value,
      };
    });
}
