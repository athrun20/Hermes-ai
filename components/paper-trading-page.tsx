"use client";

import { useEffect, useMemo, useState } from "react";
import { EquityCurve } from "@/components/equity-curve";
import { OpenPositions } from "@/components/open-positions";
import { PaperPortfolio } from "@/components/paper-portfolio";
import { PerformanceDashboard } from "@/components/performance-dashboard";
import { TopNav } from "@/components/top-nav";
import { TradeHistory } from "@/components/trade-history";
import { TradeJournal } from "@/components/trade-journal";
import { formatCurrency, type CoinSymbol } from "@/lib/market-data";
import { marketUniverse } from "@/lib/market-universe";
import { defaultJournalEntries, defaultPersistedState, loadHermesState, saveHermesState } from "@/lib/local-persistence";
import {
  DEFAULT_SETTINGS,
  buildEquityCurve,
  buildPerformanceStats,
  buildPortfolioSnapshot,
  closePosition,
  type ClosedTrade,
  type JournalEntry,
  type PaperPosition,
  type PaperSettings,
} from "@/lib/paper-trading";
import { Panel, PanelHeader } from "@/components/ui";

export function PaperTradingPage() {
  const [cash, setCash] = useState(defaultPersistedState.cash);
  const [positions, setPositions] = useState<PaperPosition[]>([]);
  const [history, setHistory] = useState<ClosedTrade[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>(defaultJournalEntries);
  const [settings, setSettings] = useState<PaperSettings>(DEFAULT_SETTINGS);
  const [selectedSymbol, setSelectedSymbol] = useState<CoinSymbol>("BTC");
  const [timeframe, setTimeframe] = useState(defaultPersistedState.timeframe);
  const [restored, setRestored] = useState(false);

  const priceMap = useMemo(
    () =>
      marketUniverse.reduce<Partial<Record<CoinSymbol, number>>>((prices, quote) => {
        prices[quote.symbol] = quote.price;
        return prices;
      }, {}),
    [],
  );
  const portfolio = useMemo(
    () => buildPortfolioSnapshot({ cash, positions, prices: priceMap, history }),
    [cash, history, positions, priceMap],
  );
  const performance = useMemo(() => buildPerformanceStats(history), [history]);
  const equityCurve = useMemo(
    () => buildEquityCurve(history, portfolio.equity),
    [history, portfolio.equity],
  );

  useEffect(() => {
    const saved = loadHermesState();
    if (saved) {
      setCash(saved.cash);
      setPositions(saved.positions);
      setHistory(saved.history);
      setJournalEntries(saved.journalEntries);
      setSettings(saved.settings);
      setSelectedSymbol(saved.selectedSymbol);
      setTimeframe(saved.timeframe);
    }
    setRestored(true);
  }, []);

  useEffect(() => {
    if (!restored) return;
    saveHermesState({
      version: defaultPersistedState.version,
      cash,
      buyingPower: portfolio.buyingPower,
      positions,
      history,
      journalEntries,
      settings,
      selectedSymbol,
      timeframe,
      savedAt: Date.now(),
    });
  }, [cash, history, journalEntries, portfolio.buyingPower, positions, restored, selectedSymbol, settings, timeframe]);

  const closePaperPosition = (positionId: string) => {
    const position = positions.find((item) => item.id === positionId);
    if (!position) return;
    const exitPrice = priceMap[position.symbol] ?? position.entryPrice;
    const closed = closePosition(position, exitPrice);
    setPositions((current) => current.filter((item) => item.id !== positionId));
    setCash((current) => current + position.notional + closed.pnl);
    setHistory((current) => [closed, ...current]);
  };

  return (
    <main>
      <TopNav />
      <div className="mx-auto max-w-[1440px] space-y-6 px-4 py-5 sm:px-6 lg:px-8 xl:px-10">
        <section className="rounded-lg border border-white/10 bg-white/[0.025] px-5 py-5 shadow-insetPanel">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-mint-300/80">
            Paper Trading
          </p>
          <div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                Account Summary
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                Portfolio, open positions, completed trades, and account growth for Hermes paper mode.
              </p>
            </div>
            <div className="rounded-lg border border-mint-300/20 bg-mint-300/10 px-4 py-3 text-sm font-semibold text-mint-200">
              Equity {formatCurrency(portfolio.equity)}
            </div>
          </div>
        </section>

        <PaperPortfolio snapshot={portfolio} />
        <OpenPositions positions={positions} prices={priceMap} onClose={closePaperPosition} />
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
          <TradeHistory history={history} />
          <PerformanceDashboard stats={performance} />
        </div>
        <Panel>
          <PanelHeader eyebrow="Equity Curve" title="Account Growth" />
          <div className="p-5">
            <EquityCurve points={equityCurve} />
          </div>
        </Panel>
        <TradeJournal entries={journalEntries} />
      </div>
    </main>
  );
}
