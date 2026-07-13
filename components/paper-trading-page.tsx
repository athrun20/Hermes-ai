"use client";

import { useEffect, useMemo, useState } from "react";
import { EquityCurve } from "@/components/equity-curve";
import { OpenPositions } from "@/components/open-positions";
import { PaperPortfolio } from "@/components/paper-portfolio";
import { PerformanceDashboard } from "@/components/performance-dashboard";
import { TopNav } from "@/components/top-nav";
import { TradeHistory } from "@/components/trade-history";
import { TradeJournal } from "@/components/trade-journal";
import {
  formatCurrency,
  loadHermesMarketQuotesSnapshot,
  qualityFromSnapshot,
  type CoinSymbol,
  type HermesMarketQuotesSnapshot,
} from "@/lib/market-data";
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
import { evaluatePaperMarketDataAuthority } from "@/lib/paper-trading-market-authority";
import { paperTradeToLearningEvent, recordLearningEvent } from "@/lib/learning-engine";
import { PageHeader, PageShell, Panel, PanelHeader, StatusPill } from "@/components/ui";

export function PaperTradingPage() {
  const [cash, setCash] = useState(defaultPersistedState.cash);
  const [positions, setPositions] = useState<PaperPosition[]>([]);
  const [history, setHistory] = useState<ClosedTrade[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>(defaultJournalEntries);
  const [settings, setSettings] = useState<PaperSettings>(DEFAULT_SETTINGS);
  const [selectedSymbol, setSelectedSymbol] = useState<CoinSymbol>("BTC");
  const [timeframe, setTimeframe] = useState(defaultPersistedState.timeframe);
  const [restored, setRestored] = useState(false);
  /** Step E: shared MarketDataService quotes (same authority as workspace). */
  const [marketSnapshot, setMarketSnapshot] =
    useState<HermesMarketQuotesSnapshot | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;
    void loadHermesMarketQuotesSnapshot().then((snapshot) => {
      if (!cancelled) setMarketSnapshot(snapshot);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const priceMap = useMemo(
    () => marketSnapshot?.priceMap ?? {},
    [marketSnapshot],
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
    const markPrice = priceMap[position.symbol] ?? position.entryPrice;
    const dataQuality = qualityFromSnapshot(
      marketSnapshot,
      position.symbol,
      timeframe,
    );
    const authority = evaluatePaperMarketDataAuthority({
      symbol: position.symbol,
      price: markPrice,
      dataQuality,
      purpose: "close",
    });
    if (!authority.allowed || authority.fillPrice == null) {
      setStatusMessage(authority.message);
      return;
    }
    const exitPrice = authority.fillPrice;
    const closed = closePosition(position, exitPrice);
    setPositions((current) => current.filter((item) => item.id !== positionId));
    setCash((current) => current + position.notional + closed.pnl);
    setHistory((current) => [closed, ...current]);
    setStatusMessage(undefined);
    // Learning Engine (silent): never blocks paper close on storage failure
    {
      const learningEvent = paperTradeToLearningEvent(closed, {
        timeframe,
        closeKind: "full",
      });
      if (learningEvent) recordLearningEvent(learningEvent);
    }
  };

  return (
    <main>
      <TopNav />
      <PageShell>
        <PageHeader
          eyebrow="Paper Trading"
          title="Account"
          description="Equity, open risk, history, and growth — paper mode only."
          action={
            <StatusPill tone="mint" className="px-3 py-1.5 text-sm">
              Equity {formatCurrency(portfolio.equity)}
            </StatusPill>
          }
        />

        {statusMessage ? (
          <p className="text-sm text-amberline">{statusMessage}</p>
        ) : null}

        <PaperPortfolio snapshot={portfolio} />
        <OpenPositions positions={positions} prices={priceMap} onClose={closePaperPosition} />

        <div className="grid gap-4 lg:grid-cols-1 xl:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
          <TradeHistory history={history} />
          <PerformanceDashboard stats={performance} />
        </div>

        <Panel>
          <PanelHeader eyebrow="Growth" title="Equity curve" />
          <div className="p-4 sm:p-5">
            <EquityCurve points={equityCurve} />
          </div>
        </Panel>

        <TradeJournal entries={journalEntries} />
      </PageShell>
    </main>
  );
}
