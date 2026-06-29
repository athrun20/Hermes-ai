"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChartPanel } from "@/components/chart-panel";
import { EquityCurve } from "@/components/equity-curve";
import { HermesAiAnalysis } from "@/components/hermes-ai-analysis";
import { HermesCoach } from "@/components/hermes-coach";
import { OpenPositions } from "@/components/open-positions";
import { PaperPortfolio } from "@/components/paper-portfolio";
import { PerformanceDashboard } from "@/components/performance-dashboard";
import { PriceCard } from "@/components/price-card";
import { TopNav } from "@/components/top-nav";
import { TradeControls, type TradeTicket } from "@/components/trade-controls";
import { TradeHistory } from "@/components/trade-history";
import { TradePlan } from "@/components/trade-plan";
import { Watchlist } from "@/components/watchlist";
import {
  analyzeMarket,
  buildFallbackCandles,
  fallbackQuotes,
  fetchLiveQuotes,
  fetchMarketCandles,
  type AssetQuote,
  type Candle,
  type CoinSymbol,
  type Timeframe,
} from "@/lib/market-data";
import {
  buildEquityCurve,
  buildPerformanceStats,
  buildPortfolioSnapshot,
  closePosition,
  STARTING_BALANCE,
  type ClosedTrade,
  type PaperPosition,
} from "@/lib/paper-trading";

export function HermesDashboard() {
  const [quotes, setQuotes] = useState<AssetQuote[]>(fallbackQuotes);
  const [selectedSymbol, setSelectedSymbol] = useState<CoinSymbol>("BTC");
  const [timeframe, setTimeframe] = useState<Timeframe>("1H");
  const [candles, setCandles] = useState<Candle[]>(() =>
    buildFallbackCandles(fallbackQuotes[0], "1H"),
  );
  const [status, setStatus] = useState<"live" | "loading" | "fallback">("loading");
  const [cash, setCash] = useState(STARTING_BALANCE);
  const [positions, setPositions] = useState<PaperPosition[]>([]);
  const [history, setHistory] = useState<ClosedTrade[]>([]);

  const selectedQuote =
    quotes.find((quote) => quote.symbol === selectedSymbol) ?? fallbackQuotes[0];

  const loadQuotes = useCallback(async () => {
    try {
      const nextQuotes = await fetchLiveQuotes();
      setQuotes(nextQuotes);
      setStatus("live");
    } catch {
      setStatus((current) => (current === "live" ? "live" : "fallback"));
    }
  }, []);

  const loadCandles = useCallback(async (quote: AssetQuote, frame: Timeframe) => {
    try {
      const nextCandles = await fetchMarketCandles(quote.coingeckoId, frame);
      setCandles(
        nextCandles.length > 2 ? nextCandles : buildFallbackCandles(quote, frame),
      );
    } catch {
      setCandles(buildFallbackCandles(quote, frame));
    }
  }, []);

  useEffect(() => {
    void loadQuotes();
    const interval = window.setInterval(() => {
      void loadQuotes();
    }, 8000);

    return () => window.clearInterval(interval);
  }, [loadQuotes]);

  useEffect(() => {
    void loadCandles(selectedQuote, timeframe);
    const interval = window.setInterval(() => {
      void loadCandles(selectedQuote, timeframe);
    }, 10000);

    return () => window.clearInterval(interval);
  }, [loadCandles, selectedQuote, timeframe]);

  const analysis = useMemo(
    () => analyzeMarket(selectedQuote, candles),
    [candles, selectedQuote],
  );
  const priceMap = useMemo(
    () =>
      quotes.reduce<Partial<Record<CoinSymbol, number>>>((prices, quote) => {
        prices[quote.symbol] = quote.price;
        return prices;
      }, {}),
    [quotes],
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

  const openPaperTrade = useCallback(
    (ticket: TradeTicket) => {
      if (!Number.isFinite(ticket.notional) || ticket.notional <= 0) {
        return "Enter a valid paper position size.";
      }

      if (ticket.notional > portfolio.buyingPower) {
        return "Position size is above available buying power.";
      }

      if (ticket.stopLoss && ticket.stopLoss <= 0) {
        return "Stop-loss must be above zero.";
      }

      if (ticket.takeProfit && ticket.takeProfit <= 0) {
        return "Take-profit must be above zero.";
      }

      const position: PaperPosition = {
        id: crypto.randomUUID(),
        symbol: selectedQuote.symbol,
        side: ticket.side,
        entryPrice: selectedQuote.price,
        quantity: ticket.notional / selectedQuote.price,
        notional: ticket.notional,
        stopLoss: ticket.stopLoss,
        takeProfit: ticket.takeProfit,
        openedAt: Date.now(),
      };

      setPositions((current) => [position, ...current]);
      setCash((current) => current - ticket.notional);
      return undefined;
    },
    [portfolio.buyingPower, selectedQuote],
  );

  const closePaperTrade = useCallback(
    (positionId: string) => {
      const position = positions.find((item) => item.id === positionId);
      if (!position) {
        return;
      }

      const exitPrice = priceMap[position.symbol] ?? position.entryPrice;
      const closed = closePosition(position, exitPrice);
      setPositions((current) => current.filter((item) => item.id !== positionId));
      setCash((current) => current + position.notional + closed.pnl);
      setHistory((current) => [closed, ...current]);
    },
    [positions, priceMap],
  );

  return (
    <main>
      <TopNav />
      <div className="mx-auto max-w-[1440px] px-4 py-5 sm:px-6 lg:px-8 xl:px-10">
        <section className="mb-5 flex flex-col justify-between gap-4 rounded-lg border border-white/10 bg-white/[0.025] px-5 py-5 shadow-insetPanel lg:flex-row lg:items-end">
          <div className="max-w-4xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-mint-300/80">
              Hermes v1.2 paper trading engine
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl xl:text-[34px]">
              Hermes - AI-assisted market intelligence for paper trading.
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Live public market data, rule-based analysis, portfolio tracking,
              and manual paper execution without broker connections or automation.
            </p>
          </div>
          <div className="grid min-w-72 grid-cols-3 gap-2 rounded-lg border border-white/10 bg-surface-950/70 p-2 text-sm">
            <div className="rounded-md bg-white/[0.04] px-3 py-2">
              <p className="text-xs text-slate-500">Mode</p>
              <p className="mt-1 font-semibold text-mint-300">Paper</p>
            </div>
            <div className="rounded-md bg-white/[0.04] px-3 py-2">
              <p className="text-xs text-slate-500">Trading</p>
              <p className="mt-1 font-semibold text-amberline">Manual</p>
            </div>
            <div className="rounded-md bg-white/[0.04] px-3 py-2">
              <p className="text-xs text-slate-500">Feed</p>
              <p
                className={
                  status === "live"
                    ? "mt-1 font-semibold text-mint-300"
                    : "mt-1 font-semibold text-amberline"
                }
              >
                {status === "live" ? "Live" : "Safe"}
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 xl:gap-5">
          {quotes.map((quote) => (
            <PriceCard
              isSelected={quote.symbol === selectedSymbol}
              key={quote.symbol}
              quote={quote}
              onSelect={() => setSelectedSymbol(quote.symbol)}
            />
          ))}
        </section>

        <section className="mt-4 grid gap-4 xl:grid-cols-[1fr_390px] xl:gap-5">
          <PaperPortfolio snapshot={portfolio} />
          <TradeControls
            buyingPower={portfolio.buyingPower}
            quote={selectedQuote}
            onSubmit={openPaperTrade}
          />
        </section>

        <section className="mt-4 grid gap-4 xl:grid-cols-[1fr_390px] xl:gap-5">
          <ChartPanel
            candles={candles}
            quote={selectedQuote}
            timeframe={timeframe}
            onTimeframeChange={setTimeframe}
          />
          <div className="grid gap-4">
            <Watchlist
              quotes={quotes}
              selectedSymbol={selectedSymbol}
              onSelect={setSelectedSymbol}
            />
            <HermesAiAnalysis analysis={analysis} quote={selectedQuote} />
          </div>
        </section>

        <section className="mt-4 grid gap-4 xl:grid-cols-[360px_1fr_330px] xl:gap-5">
          <TradePlan analysis={analysis} quote={selectedQuote} />
          <OpenPositions
            positions={positions}
            prices={priceMap}
            onClose={closePaperTrade}
          />
          <HermesCoach trade={history[0]} />
        </section>

        <section className="mt-4 grid gap-4 xl:grid-cols-[1fr_390px] xl:gap-5">
          <TradeHistory history={history} />
          <EquityCurve points={equityCurve} />
        </section>

        <section className="mt-4">
          <PerformanceDashboard stats={performance} />
        </section>
      </div>
    </main>
  );
}
