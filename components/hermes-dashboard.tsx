"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChartPanel } from "@/components/chart-panel";
import { EquityCurve } from "@/components/equity-curve";
import { HermesAiAnalyst } from "@/components/hermes-ai-analyst";
import { HermesAiAnalysis } from "@/components/hermes-ai-analysis";
import { HermesBrainSummary } from "@/components/hermes-brain-summary";
import { HermesCoach } from "@/components/hermes-coach";
import { HermesDecisionReview } from "@/components/hermes-decision-review";
import { HermesIntelligencePanel } from "@/components/hermes-intelligence-panel";
import { OpenPositions } from "@/components/open-positions";
import { PaperPortfolio } from "@/components/paper-portfolio";
import { PerformanceDashboard } from "@/components/performance-dashboard";
import { PriceCard } from "@/components/price-card";
import { SettingsPanel } from "@/components/settings-panel";
import { TopNav } from "@/components/top-nav";
import { TradeControls, type TradeTicket } from "@/components/trade-controls";
import { TradeHistory } from "@/components/trade-history";
import { TradeJournal } from "@/components/trade-journal";
import { TradePlan } from "@/components/trade-plan";
import { TraderDna } from "@/components/trader-dna";
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
import { buildHermesIntelligence } from "@/lib/hermes-intelligence";
import { reviewPaperTradeDecision } from "@/lib/decision-engine";
import type { DecisionReviewTicket } from "@/lib/decision-types";
import {
  analyzePortfolio,
  calculateOpportunityScore,
  detectTradingHabits,
  generateDailyScroll,
  generateHermesMemory,
  generateRiskAssessment,
  generateTradingPersonality,
  scanOpportunities,
} from "@/lib/hermes-brain";
import {
  clearHermesState,
  defaultJournalEntries,
  defaultPersistedState,
  loadHermesState,
  saveHermesState,
} from "@/lib/local-persistence";
import {
  generateTradingPersonality as generateMemoryTradingPersonality,
  generateWeeklyInsights,
  toHermesMemorySnapshot,
  updateHermesMemory,
  updateMemory,
} from "@/lib/hermes-memory";
import { buildMorningBriefing } from "@/lib/morning-briefing";
import {
  DEFAULT_SETTINGS,
  buildEquityCurve,
  buildPerformanceStats,
  buildPortfolioSnapshot,
  closePosition,
  STARTING_BALANCE,
  type ClosedTrade,
  type JournalEntry,
  type PaperPosition,
  type PaperSettings,
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
  const [journalEntries, setJournalEntries] =
    useState<JournalEntry[]>(defaultJournalEntries);
  const [settings, setSettings] = useState<PaperSettings>(DEFAULT_SETTINGS);
  const [saveStatus, setSaveStatus] = useState("Restoring local data");
  const [hasRestored, setHasRestored] = useState(false);
  const [pendingDecisionTicket, setPendingDecisionTicket] =
    useState<DecisionReviewTicket | null>(null);
  const [tradePlanMessage, setTradePlanMessage] = useState<string | undefined>();

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
  const intelligence = useMemo(
    () =>
      buildHermesIntelligence({
        quote: selectedQuote,
        journalEntries,
      }),
    [journalEntries, selectedQuote],
  );
  const brainPortfolio = useMemo(
    () =>
      analyzePortfolio({
        snapshot: portfolio,
        positions,
        prices: priceMap,
      }),
    [portfolio, positions, priceMap],
  );
  const brainHabits = useMemo(
    () =>
      detectTradingHabits({
        history,
        journalEntries,
      }),
    [history, journalEntries],
  );
  const memory = useMemo(
    () =>
      generateHermesMemory({
        history,
        journalEntries,
      }),
    [history, journalEntries],
  );
  const hermesMemoryState = useMemo(
    () =>
      updateMemory({
        completedTrades: history,
        journalEntries,
      }),
    [history, journalEntries],
  );
  const hermesMemorySnapshot = useMemo(
    () => toHermesMemorySnapshot(hermesMemoryState),
    [hermesMemoryState],
  );
  const weeklyMemoryInsights = useMemo(
    () => generateWeeklyInsights({ memory: hermesMemoryState }),
    [hermesMemoryState],
  );
  const memoryTradingPersonality = useMemo(
    () => generateMemoryTradingPersonality(hermesMemoryState),
    [hermesMemoryState],
  );
  const brainRisk = useMemo(
    () =>
      generateRiskAssessment({
        snapshot: portfolio,
        positions,
      }),
    [portfolio, positions],
  );
  const opportunityScores = useMemo(
    () =>
      quotes.map((quote) =>
        calculateOpportunityScore({
          symbol: quote.symbol,
          bias:
            quote.change24h > 1
              ? "Bullish"
              : quote.change24h < -1
                ? "Bearish"
                : "Neutral",
          confidence: Math.min(92, Math.max(52, 62 + Math.abs(quote.change24h) * 5)),
          riskLevel: brainRisk.riskLevel,
          journalAlignment: brainHabits.planAdherenceRate || 55,
          portfolioFit: brainPortfolio.healthScore,
        }),
      ),
    [brainHabits.planAdherenceRate, brainPortfolio.healthScore, brainRisk.riskLevel, quotes],
  );
  const topOpportunity = useMemo(
    () =>
      opportunityScores.reduce((best, item) =>
        item.score > best.score ? item : best,
      ),
    [opportunityScores],
  );
  const selectedOpportunity = useMemo(
    () =>
      opportunityScores.find((item) => item.symbol === selectedQuote.symbol) ??
      calculateOpportunityScore({ symbol: selectedQuote.symbol }),
    [opportunityScores, selectedQuote.symbol],
  );
  const dailyScroll = useMemo(
    () =>
      generateDailyScroll({
        portfolio: brainPortfolio,
        habits: brainHabits,
        topOpportunity,
        memory,
      }),
    [brainHabits, brainPortfolio, memory, topOpportunity],
  );
  const opportunityScanner = useMemo(
    () =>
      scanOpportunities({
        opportunities: opportunityScores,
        memory,
        risk: brainRisk,
      }),
    [brainRisk, memory, opportunityScores],
  );
  const tradingPersonality = useMemo(
    () =>
      generateTradingPersonality({
        habits: brainHabits,
        risk: brainRisk,
      }),
    [brainHabits, brainRisk],
  );
  const morningBriefing = useMemo(
    () => buildMorningBriefing({ memory: hermesMemorySnapshot }),
    [hermesMemorySnapshot],
  );
  const decisionReview = useMemo(
    () =>
      pendingDecisionTicket
        ? reviewPaperTradeDecision({
            ticket: pendingDecisionTicket,
            quote: selectedQuote,
            portfolio,
            opportunity: selectedOpportunity,
            memory: hermesMemorySnapshot,
            marketMood: normalizeDecisionMood(morningBriefing.market.todayMarket),
            dailyGoal: morningBriefing.dailyGoal.text,
          })
        : null,
    [
      hermesMemorySnapshot,
      morningBriefing.dailyGoal.text,
      morningBriefing.market.todayMarket,
      pendingDecisionTicket,
      portfolio,
      selectedOpportunity,
      selectedQuote,
    ],
  );

  useEffect(() => {
    const restored = loadHermesState();
    if (restored) {
      setCash(restored.cash);
      setPositions(restored.positions);
      setHistory(restored.history);
      setJournalEntries(restored.journalEntries);
      setSettings(restored.settings);
      setSelectedSymbol(restored.selectedSymbol);
      setTimeframe(restored.timeframe);
      setSaveStatus("Saved locally");
    } else {
      setSaveStatus("Saved locally");
    }
    setHasRestored(true);
  }, []);

  useEffect(() => {
    if (!hasRestored) {
      return;
    }

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
    setSaveStatus("Saved locally");
  }, [
    cash,
    hasRestored,
    history,
    journalEntries,
    portfolio.buyingPower,
    positions,
    selectedSymbol,
    settings,
    timeframe,
  ]);

  const executePaperTicket = useCallback(
    (ticket: TradeTicket) => {
      if (!Number.isFinite(ticket.notional) || ticket.notional <= 0) {
        return "Enter a valid paper position size.";
      }

      if (ticket.action === "Sell" || ticket.action === "Cover") {
        const sideToClose = ticket.action === "Sell" ? "Long" : "Short";
        const matchingPositions = positions.filter(
          (position) =>
            position.symbol === selectedQuote.symbol && position.side === sideToClose,
        );

        if (matchingPositions.length === 0) {
          return ticket.action === "Sell"
            ? "No open long position to sell."
            : "No open short position to cover.";
        }

        const exitPrice = priceMap[selectedQuote.symbol] ?? selectedQuote.price;
        let remainingNotional = ticket.notional;
        let cashReturned = 0;
        const closedTrades: ClosedTrade[] = [];
        const nextPositions: PaperPosition[] = [];

        positions.forEach((position) => {
          const shouldReduce =
            remainingNotional > 0 &&
            position.symbol === selectedQuote.symbol &&
            position.side === sideToClose;

          if (!shouldReduce) {
            nextPositions.push(position);
            return;
          }

          const closedNotional = Math.min(remainingNotional, position.notional);
          const closeRatio = closedNotional / position.notional;
          const closedPosition: PaperPosition = {
            ...position,
            id:
              closeRatio >= 1
                ? position.id
                : `${position.id}-partial-${Date.now()}`,
            quantity: position.quantity * closeRatio,
            notional: closedNotional,
          };
          const closed = closePosition(closedPosition, exitPrice);

          closedTrades.push(closed);
          cashReturned += closedNotional + closed.pnl;
          remainingNotional -= closedNotional;

          if (closeRatio < 1) {
            nextPositions.push({
              ...position,
              quantity: position.quantity - closedPosition.quantity,
              notional: position.notional - closedNotional,
            });
          }
        });

        setPositions(nextPositions);
        setCash((current) => current + cashReturned);
        closedTrades.forEach((trade) => updateHermesMemory(trade));
        setHistory((current) => [...closedTrades.reverse(), ...current]);
        return undefined;
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
        id: createBrowserSafeId(),
        symbol: selectedQuote.symbol,
        side: ticket.action === "Short" ? "Short" : "Long",
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
    [portfolio.buyingPower, positions, priceMap, selectedQuote],
  );

  const handlePaperTicket = useCallback((ticket: TradeTicket) => {
    setPendingDecisionTicket(ticket);
    setTradePlanMessage("Hermes is reviewing this paper decision.");
    return "Hermes is reviewing this paper decision.";
  }, []);

  const confirmPendingDecision = useCallback(() => {
    if (!pendingDecisionTicket) {
      return;
    }

    const response = executePaperTicket(pendingDecisionTicket);
    setTradePlanMessage(response ?? getPaperTicketSuccessMessage(pendingDecisionTicket.action));
    setPendingDecisionTicket(null);
  }, [executePaperTicket, pendingDecisionTicket]);

  const revisePendingDecision = useCallback(() => {
    setPendingDecisionTicket(null);
    setTradePlanMessage("Trade review closed. Revise the plan when ready.");
  }, []);

  const closePaperTrade = useCallback(
    (positionId: string) => {
      const position = positions.find((item) => item.id === positionId);
      if (!position) {
        return;
      }

      const exitPrice = priceMap[position.symbol] ?? position.entryPrice;
      const closed = closePosition(position, exitPrice);
      updateHermesMemory(closed);
      setPositions((current) => current.filter((item) => item.id !== positionId));
      setCash((current) => current + position.notional + closed.pnl);
      setHistory((current) => [closed, ...current]);
    },
    [positions, priceMap],
  );

  const resetPaperAccount = useCallback(() => {
    const confirmed = window.confirm(
      "Reset the Hermes paper account? This clears portfolio, open positions, history, journal entries, and settings saved in this browser.",
    );

    if (!confirmed) {
      return;
    }

    clearHermesState();
    setCash(STARTING_BALANCE);
    setPositions([]);
    setHistory([]);
    setJournalEntries(defaultJournalEntries);
    setSettings(DEFAULT_SETTINGS);
    setSelectedSymbol("BTC");
    setTimeframe("1H");
    setSaveStatus("Saved locally");
  }, []);

  if (!hasRestored) {
    return (
      <main>
        <TopNav />
        <div className="mx-auto max-w-[1440px] px-4 py-5 sm:px-6 lg:px-8 xl:px-10">
          <section className="rounded-lg border border-white/10 bg-white/[0.025] px-5 py-8 shadow-insetPanel">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-mint-300/80">
              Hermes v1.3 paper trading engine
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              Restoring saved paper account...
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Loading local portfolio, positions, trade history, journal, and settings.
            </p>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main>
      <TopNav />
      {decisionReview && pendingDecisionTicket ? (
        <HermesDecisionReview
          notional={pendingDecisionTicket.notional}
          review={decisionReview}
          onConfirm={confirmPendingDecision}
          onRevise={revisePendingDecision}
        />
      ) : null}
      <div className="mx-auto max-w-[1440px] px-4 py-5 sm:px-6 lg:px-8 xl:px-10">
        <section className="mb-5 flex flex-col justify-between gap-4 rounded-lg border border-white/10 bg-white/[0.025] px-5 py-5 shadow-insetPanel lg:flex-row lg:items-end">
          <div className="max-w-4xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-mint-300/80">
              Hermes v1.3 local paper trading engine
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
              <p className="text-xs text-slate-500">Storage</p>
              <p
                className={
                  saveStatus === "Saved locally"
                    ? "mt-1 font-semibold text-mint-300"
                    : "mt-1 font-semibold text-amberline"
                }
              >
                {saveStatus}
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

        <section className="mt-4">
          <HermesAiAnalyst opportunities={opportunityScores} />
        </section>

        <section className="mt-4">
          <HermesBrainSummary
            dailyScroll={dailyScroll}
            hermesMemory={hermesMemorySnapshot}
            memory={memory}
            memoryPersonality={memoryTradingPersonality}
            scanner={opportunityScanner}
            personality={tradingPersonality}
            weeklyInsights={weeklyMemoryInsights}
          />
        </section>

        <section className="mt-4">
          <TraderDna memory={hermesMemorySnapshot} />
        </section>

        <section className="mt-4 grid gap-4 xl:grid-cols-[1fr_390px] xl:gap-5">
          <PaperPortfolio snapshot={portfolio} />
          <TradeControls
            buyingPower={portfolio.buyingPower}
            opportunity={selectedOpportunity}
            quote={selectedQuote}
            statusMessage={tradePlanMessage}
            onSubmit={handlePaperTicket}
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

        <section className="mt-4">
          <HermesIntelligencePanel intelligence={intelligence} />
        </section>

        <section className="mt-4 grid gap-4 xl:grid-cols-[360px_1fr_330px] xl:gap-5">
          <TradePlan analysis={analysis} quote={selectedQuote} />
          <OpenPositions
            positions={positions}
            prices={priceMap}
            onClose={closePaperTrade}
          />
          <HermesCoach
            trade={history[0]}
            memory={memory}
            hermesMemory={hermesMemorySnapshot}
          />
        </section>

        <section className="mt-4 grid gap-4 xl:grid-cols-[1fr_390px] xl:gap-5">
          <TradeHistory history={history} />
          <EquityCurve points={equityCurve} />
        </section>

        <section className="mt-4 grid gap-4 xl:grid-cols-[1fr_390px] xl:gap-5">
          <PerformanceDashboard stats={performance} />
          <SettingsPanel
            settings={settings}
            onSettingsChange={setSettings}
            onReset={resetPaperAccount}
          />
        </section>

        <section className="mt-4">
          <TradeJournal entries={journalEntries} />
        </section>
      </div>
    </main>
  );
}

function createBrowserSafeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function normalizeDecisionMood(value: string) {
  if (value === "Bullish" || value === "Bearish") return value;
  return "Neutral";
}

function getPaperTicketSuccessMessage(action: TradeTicket["action"]) {
  if (action === "Buy") return "Long paper position opened.";
  if (action === "Sell") return "Long paper position sold.";
  if (action === "Short") return "Short paper position opened.";
  return "Short paper position covered.";
}
