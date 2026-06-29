import type { CoinSymbol } from "@/lib/market-data";

export type PositionSide = "Long" | "Short";
export type OrderAction = "Buy" | "Sell";

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
    doneWell: string;
    improvement: string;
  };
};

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

export const STARTING_BALANCE = 10000;

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
  const qualityScore = Math.max(
    0,
    Math.min(
      100,
      Math.round(48 + (followedPlan ? 28 : 4) + (pnl > 0 ? 16 : -8) + Math.min(riskReward, 3) * 4),
    ),
  );

  return {
    followedPlan,
    qualityScore,
    coach: {
      doneWell: followedPlan
        ? "You defined risk and reward before entering the paper trade."
        : "You logged the trade and captured the outcome for review.",
      improvement:
        pnl >= 0
          ? "Keep sizing consistent so wins do not encourage oversized follow-up trades."
          : "Tighten the plan before entry by requiring a clear stop and target.",
    },
  };
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
  const points: EquityPoint[] = [
    {
      time: Math.floor((Date.now() - 6 * 60 * 60 * 1000) / 1000),
      value: STARTING_BALANCE,
    },
  ];

  history.forEach((trade) => {
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

  return points;
}
