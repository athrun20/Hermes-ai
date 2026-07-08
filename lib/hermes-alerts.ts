import type { CoinSymbol } from "@/lib/market-data";

export type HermesAlertCondition =
  | "price-above"
  | "price-below"
  | "rsi-above"
  | "rsi-below"
  | "macd-bullish-cross"
  | "macd-bearish-cross"
  | "volume-spike";

export type HermesAlert = {
  id: string;
  symbol: CoinSymbol;
  condition: HermesAlertCondition;
  value?: number;
  note?: string;
  enabled: boolean;
  createdAt: number;
  triggeredAt?: number;
  lastMessage?: string;
};

export type HermesAlertSnapshot = {
  price: number;
  rsi: number;
  previousMacd: {
    line: number;
    signal: number;
  };
  macd: {
    line: number;
    signal: number;
  };
  volume: {
    current: number;
    average: number;
  };
};

export const hermesAlertConditionLabels: Record<HermesAlertCondition, string> = {
  "price-above": "Price crosses above",
  "price-below": "Price crosses below",
  "rsi-above": "RSI above",
  "rsi-below": "RSI below",
  "macd-bullish-cross": "MACD bullish cross",
  "macd-bearish-cross": "MACD bearish cross",
  "volume-spike": "Volume spike",
};

export function evaluateHermesAlert(alert: HermesAlert, snapshot: HermesAlertSnapshot) {
  if (!alert.enabled) return null;

  const value = alert.value;
  const triggered =
    alert.condition === "price-above"
      ? Number.isFinite(value) && snapshot.price >= value!
      : alert.condition === "price-below"
        ? Number.isFinite(value) && snapshot.price <= value!
        : alert.condition === "rsi-above"
          ? Number.isFinite(value) && snapshot.rsi >= value!
          : alert.condition === "rsi-below"
            ? Number.isFinite(value) && snapshot.rsi <= value!
            : alert.condition === "macd-bullish-cross"
              ? snapshot.previousMacd.line <= snapshot.previousMacd.signal &&
                snapshot.macd.line > snapshot.macd.signal
              : alert.condition === "macd-bearish-cross"
                ? snapshot.previousMacd.line >= snapshot.previousMacd.signal &&
                  snapshot.macd.line < snapshot.macd.signal
                : snapshot.volume.current >= snapshot.volume.average * 1.18;

  if (!triggered) return null;
  return buildAlertMessage(alert, snapshot);
}

function buildAlertMessage(alert: HermesAlert, snapshot: HermesAlertSnapshot) {
  if (alert.note?.trim()) return alert.note.trim();

  if (alert.condition === "price-above") {
    return `${alert.symbol} crossed above your planned level. Study whether resistance has changed.`;
  }

  if (alert.condition === "price-below") {
    return `${alert.symbol} crossed below your planned level. Recheck structure before reacting.`;
  }

  if (alert.condition === "rsi-above") {
    return `RSI moved above ${alert.value ?? 70}. Momentum may be stretched.`;
  }

  if (alert.condition === "rsi-below") {
    return `RSI moved below ${alert.value ?? 30}. Let structure confirm before acting.`;
  }

  if (alert.condition === "macd-bullish-cross") {
    return "MACD crossed upward. Momentum may be developing, but price structure still matters.";
  }

  if (alert.condition === "macd-bearish-cross") {
    return "MACD crossed downward. Momentum is cooling; let structure guide the next decision.";
  }

  return "Volume expanded. Confirmation may be developing.";
}
