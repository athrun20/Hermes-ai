"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { EquityCurve } from "@/components/equity-curve";
import { HermesBrainSummary } from "@/components/hermes-brain-summary";
import { HermesCoach } from "@/components/hermes-coach";
import { HermesDecisionReview } from "@/components/hermes-decision-review";
import { HermesIntelligencePanel } from "@/components/hermes-intelligence-panel";
import { MarketSearch } from "@/components/workspace/market-search";
import { OpenPositions } from "@/components/open-positions";
import { PaperPortfolio } from "@/components/paper-portfolio";
import { PerformanceDashboard } from "@/components/performance-dashboard";
import { ProfessionalChart, type IndicatorVisibility } from "@/components/workspace/professional-chart";
import { SettingsPanel } from "@/components/settings-panel";
import { SymbolAnalysisPanel } from "@/components/workspace/symbol-analysis-panel";
import { TopNav } from "@/components/top-nav";
import { TradeControls, type TradeTicket } from "@/components/trade-controls";
import { TradeHistory } from "@/components/trade-history";
import { TradeJournal } from "@/components/trade-journal";
import { TradePlan } from "@/components/trade-plan";
import { TraderDna } from "@/components/trader-dna";
import { WorkspaceWatchlistPanel } from "@/components/workspace/watchlist-panel";
import {
  analyzeMarket,
  type AssetQuote,
  type Candle,
  type CoinSymbol,
  type Timeframe,
} from "@/lib/market-data";
import {
  buildMockWorkspaceCandles,
  defaultWorkspaceWatchlist,
  getMarketAsset,
  marketUniverse,
} from "@/lib/market-universe";
import { analyzeWorkspaceSymbol, quoteToOpportunityInputs } from "@/lib/symbol-analysis-engine";
import type { ChartDrawing, ChartDrawingTool, ChartTradeLevels } from "@/lib/chart-types";
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
import { triggerHermesCoach } from "@/lib/hermes-coach-trigger-system";
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
  const [quotes] = useState<AssetQuote[]>(marketUniverse);
  const [selectedSymbol, setSelectedSymbol] = useState<CoinSymbol>("BTC");
  const [timeframe, setTimeframe] = useState<Timeframe>("1H");
  const [candles, setCandles] = useState<Candle[]>(() =>
    buildMockWorkspaceCandles(getMarketAsset("BTC"), "1H"),
  );
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
  const [watchlistSymbols, setWatchlistSymbols] = useState<CoinSymbol[]>(
    defaultWorkspaceWatchlist,
  );
  const [indicators, setIndicators] = useState<IndicatorVisibility>({
    volume: true,
    rsi: true,
    macd: false,
    ema20: true,
    ema50: false,
    vwap: false,
  });
  const [selectedChartTool, setSelectedChartTool] = useState<ChartDrawingTool>("none");
  const [chartDrawings, setChartDrawings] = useState<ChartDrawing[]>([]);
  const [chartTradeLevelsBySymbol, setChartTradeLevelsBySymbol] = useState<
    Partial<Record<CoinSymbol, ChartTradeLevels>>
  >({});

  const selectedQuote =
    quotes.find((quote) => quote.symbol === selectedSymbol) ?? marketUniverse[0];
  const selectedChartTradeLevels = chartTradeLevelsBySymbol[selectedSymbol] ?? {};
  const selectedChartDrawings = chartDrawings.filter(
    (drawing) => drawing.symbol === selectedSymbol,
  );

  useEffect(() => {
    setCandles(buildMockWorkspaceCandles(selectedQuote, timeframe));
  }, [selectedQuote, timeframe]);

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
      quotes.map((quote) => {
        const inputs = quoteToOpportunityInputs(quote);
        return calculateOpportunityScore({
          symbol: quote.symbol,
          bias: inputs.bias,
          confidence: Math.min(92, Math.max(52, 62 + Math.abs(quote.change24h) * 5)),
          riskLevel: inputs.riskLevel,
          journalAlignment: brainHabits.planAdherenceRate || 55,
          portfolioFit: brainPortfolio.healthScore,
        });
      }),
    [brainHabits.planAdherenceRate, brainPortfolio.healthScore, quotes],
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
  const workspaceAnalysis = useMemo(
    () => analyzeWorkspaceSymbol({ asset: getMarketAsset(selectedQuote.symbol), candles }),
    [candles, selectedQuote.symbol],
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
    () => buildMorningBriefing({ memory: hermesMemorySnapshot, history }),
    [hermesMemorySnapshot, history],
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
            intelligence: morningBriefing.intelligence,
          })
        : null,
    [
      hermesMemorySnapshot,
      morningBriefing.dailyGoal.text,
      morningBriefing.intelligence,
      morningBriefing.market.todayMarket,
      pendingDecisionTicket,
      portfolio,
      selectedOpportunity,
      selectedQuote,
    ],
  );

  useEffect(() => {
    const restored = loadHermesState();
    const workspace = loadWorkspaceSettings();
    if (restored) {
      setCash(restored.cash);
      setPositions(restored.positions);
      setHistory(restored.history);
      setJournalEntries(restored.journalEntries);
      setSettings(restored.settings);
      setSelectedSymbol(workspace.selectedSymbol ?? restored.selectedSymbol);
      setTimeframe(workspace.timeframe ?? restored.timeframe);
      setSaveStatus("Saved locally");
    } else {
      if (workspace.selectedSymbol) setSelectedSymbol(workspace.selectedSymbol);
      if (workspace.timeframe) setTimeframe(workspace.timeframe);
      setSaveStatus("Saved locally");
    }
    if (workspace.watchlistSymbols) setWatchlistSymbols(workspace.watchlistSymbols);
    if (workspace.indicators) setIndicators(workspace.indicators);
    if (workspace.chartDrawings) setChartDrawings(workspace.chartDrawings);
    if (workspace.tradeLevelsBySymbol) setChartTradeLevelsBySymbol(workspace.tradeLevelsBySymbol);
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

  useEffect(() => {
    if (!hasRestored) return;
    saveWorkspaceSettings({
      selectedSymbol,
      watchlistSymbols,
      indicators,
      timeframe,
      chartDrawings,
      tradeLevelsBySymbol: chartTradeLevelsBySymbol,
    });
  }, [
    chartDrawings,
    chartTradeLevelsBySymbol,
    hasRestored,
    indicators,
    selectedSymbol,
    timeframe,
    watchlistSymbols,
  ]);

  useEffect(() => {
    if (!hasRestored) return;

    const now = new Date();
    if (now.getHours() < 16) return;

    const key = `hermes-coach-end-of-day-${now.toDateString()}`;
    if (window.sessionStorage.getItem(key)) return;

    window.sessionStorage.setItem(key, "true");
    triggerHermesCoach({
      moment: "end-of-day",
      context: {
        morningGoal: morningBriefing.dailyGoal.text,
        disciplineScore: hermesMemorySnapshot.scores.discipline,
        disciplineStreak: morningBriefing.intelligence.disciplineStreak,
        intelligence: morningBriefing.intelligence,
      },
    });
  }, [hasRestored, hermesMemorySnapshot.scores.discipline, morningBriefing]);

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
    triggerHermesCoach({
      moment: "trade-plan-created",
      context: {
        tradeSymbol: selectedQuote.symbol,
        morningGoal: morningBriefing.dailyGoal.text,
        disciplineScore: hermesMemorySnapshot.scores.discipline,
        disciplineStreak: morningBriefing.intelligence.disciplineStreak,
        intelligence: morningBriefing.intelligence,
      },
    });
    return "Hermes is reviewing this paper decision.";
  }, [hermesMemorySnapshot.scores.discipline, morningBriefing, selectedQuote.symbol]);

  const confirmPendingDecision = useCallback(() => {
    if (!pendingDecisionTicket) {
      return;
    }

    const response = executePaperTicket(pendingDecisionTicket);
    triggerHermesCoach({
      moment: "decision-review-completed",
      context: {
        tradeSymbol: selectedQuote.symbol,
        morningGoal: morningBriefing.dailyGoal.text,
        decisionRecommendation: decisionReview?.recommendation,
        decisionConfidence: decisionReview?.confidence,
        disciplineScore: hermesMemorySnapshot.scores.discipline,
        disciplineStreak: morningBriefing.intelligence.disciplineStreak,
        intelligence: morningBriefing.intelligence,
      },
    });
    if (!response) {
      triggerHermesCoach({
        moment: "paper-trade-executed",
        context: {
          tradeSymbol: selectedQuote.symbol,
          morningGoal: morningBriefing.dailyGoal.text,
          decisionRecommendation: decisionReview?.recommendation,
          decisionConfidence: decisionReview?.confidence,
          disciplineScore: hermesMemorySnapshot.scores.discipline,
          disciplineStreak: morningBriefing.intelligence.disciplineStreak,
          intelligence: morningBriefing.intelligence,
        },
      });
    }
    setTradePlanMessage(response ?? getPaperTicketSuccessMessage(pendingDecisionTicket.action));
    setPendingDecisionTicket(null);
  }, [
    decisionReview,
    executePaperTicket,
    hermesMemorySnapshot.scores.discipline,
    morningBriefing,
    pendingDecisionTicket,
    selectedQuote.symbol,
  ]);

  const revisePendingDecision = useCallback(() => {
    setPendingDecisionTicket(null);
    setTradePlanMessage("Trade review closed. Revise the plan when ready.");
  }, []);

  const selectWorkspaceSymbol = useCallback((symbol: CoinSymbol) => {
    setSelectedSymbol(symbol);
    setWatchlistSymbols((current) =>
      current.includes(symbol) ? current : [symbol, ...current],
    );
  }, []);

  const addToWatchlist = useCallback((symbol: CoinSymbol) => {
    setWatchlistSymbols((current) =>
      current.includes(symbol) ? current : [symbol, ...current],
    );
  }, []);

  const removeFromWatchlist = useCallback((symbol: CoinSymbol) => {
    setWatchlistSymbols((current) =>
      current.length <= 1 ? current : current.filter((item) => item !== symbol),
    );
  }, []);

  const toggleIndicator = useCallback((indicator: keyof IndicatorVisibility) => {
    setIndicators((current) => ({
      ...current,
      [indicator]: !current[indicator],
    }));
  }, []);

  const handleChartPriceSelect = useCallback(
    (price: number) => {
      if (selectedChartTool === "none") return;

      if (
        selectedChartTool === "entry" ||
        selectedChartTool === "stop" ||
        selectedChartTool === "target"
      ) {
        setChartTradeLevelsBySymbol((current) => ({
          ...current,
          [selectedSymbol]: {
            ...(current[selectedSymbol] ?? {}),
            [selectedChartTool]: price,
          },
        }));
        return;
      }

      setChartDrawings((current) => [
        ...current,
        {
          id: `${selectedSymbol}-${selectedChartTool}-${Date.now()}`,
          symbol: selectedSymbol,
          type: selectedChartTool,
          price,
          createdAt: Date.now(),
        },
      ]);
    },
    [selectedChartTool, selectedSymbol],
  );

  const clearSelectedDrawings = useCallback(() => {
    setChartDrawings((current) =>
      current.filter((drawing) => drawing.symbol !== selectedSymbol),
    );
  }, [selectedSymbol]);

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
      triggerHermesCoach({
        moment: "paper-trade-executed",
        context: {
          tradeSymbol: position.symbol,
          tradeOutcome: closed.pnl > 0 ? "Win" : closed.pnl < 0 ? "Loss" : "Closed",
          morningGoal: morningBriefing.dailyGoal.text,
          disciplineScore: hermesMemorySnapshot.scores.discipline,
          disciplineStreak: morningBriefing.intelligence.disciplineStreak,
          intelligence: morningBriefing.intelligence,
        },
      });
    },
    [hermesMemorySnapshot.scores.discipline, morningBriefing, positions, priceMap],
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

        <section className="grid gap-4 xl:grid-cols-[280px_minmax(760px,1fr)_360px] xl:gap-5">
          <div className="space-y-4">
            <MarketSearch
              onAdd={addToWatchlist}
              onSelect={selectWorkspaceSymbol}
            />
            <WorkspaceWatchlistPanel
              selectedSymbol={selectedSymbol}
              symbols={watchlistSymbols}
              onRemove={removeFromWatchlist}
              onSelect={selectWorkspaceSymbol}
            />
          </div>

          <div className="space-y-4">
            <ProfessionalChart
              analysis={workspaceAnalysis}
              candles={candles}
              drawings={selectedChartDrawings}
              indicators={indicators}
              quote={selectedQuote}
              selectedTool={selectedChartTool}
              timeframe={timeframe}
              tradeLevels={selectedChartTradeLevels}
              onChartPriceSelect={handleChartPriceSelect}
              onClearDrawings={clearSelectedDrawings}
              onTimeframeChange={setTimeframe}
              onToolChange={setSelectedChartTool}
              onToggleIndicator={toggleIndicator}
            />
            <div className="grid gap-4 lg:grid-cols-2">
              <PaperPortfolio snapshot={portfolio} />
              <TradeHistory history={history.slice(0, 6)} />
            </div>
          </div>

          <div className="space-y-4">
            <SymbolAnalysisPanel analysis={workspaceAnalysis} />
            <TradeControls
              buyingPower={portfolio.buyingPower}
              opportunity={selectedOpportunity}
              quote={selectedQuote}
              chartLevels={selectedChartTradeLevels}
              statusMessage={tradePlanMessage}
              onSubmit={handlePaperTicket}
            />
          </div>
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

const WORKSPACE_STORAGE_KEY = "hermes.workspace.v1";

type WorkspaceSettings = {
  selectedSymbol?: CoinSymbol;
  watchlistSymbols?: CoinSymbol[];
  indicators?: IndicatorVisibility;
  timeframe?: Timeframe;
  chartDrawings?: ChartDrawing[];
  tradeLevelsBySymbol?: Partial<Record<CoinSymbol, ChartTradeLevels>>;
};

function loadWorkspaceSettings(): WorkspaceSettings {
  try {
    const raw = window.localStorage.getItem(WORKSPACE_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as WorkspaceSettings;
    return {
      ...parsed,
      watchlistSymbols: parsed.watchlistSymbols?.filter((symbol) =>
        marketUniverse.some((asset) => asset.symbol === symbol),
      ),
    };
  } catch {
    return {};
  }
}

function saveWorkspaceSettings(settings: Required<WorkspaceSettings>) {
  window.localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(settings));
}
