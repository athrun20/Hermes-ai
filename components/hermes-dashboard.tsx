"use client";

import { useCallback, useEffect, useMemo, useState, type MouseEvent as ReactMouseEvent } from "react";
import { HermesDecisionReview } from "@/components/hermes-decision-review";
import { NewsIntelligencePanel } from "@/components/news-intelligence-panel";
import { WorkspaceMarketsPanel } from "@/components/workspace/market-search";
import { buildNewsCatalystMarker } from "@/components/workspace/news-catalyst-marker";
import { FloatingAnalysis } from "@/components/workspace/floating-analysis";
import { FloatingTradePlan } from "@/components/workspace/floating-trade-plan";
import { ProfessionalChart, type IndicatorVisibility } from "@/components/workspace/professional-chart";
import { TopNav } from "@/components/top-nav";
import { type TradeTicket } from "@/components/trade-controls";
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
import { buildHermesVisionContext } from "@/lib/chart-context-builder";
import { analyzeHermesVision } from "@/lib/hermes-vision-engine";
import type { ChartDrawing, ChartDrawingTool, ChartTradeLevels } from "@/lib/chart-types";
import {
  hermesAlertConditionLabels,
  type HermesAlert,
  type HermesAlertCondition,
} from "@/lib/hermes-alerts";
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
import { buildNewsIntelligence } from "@/lib/news-intelligence-engine";
import { calculateHermesScore } from "@/lib/hermes-score-engine";
import { buildHermesLiveIntelligence } from "@/lib/hermes-live-engine";
import { analyzeStrategyIntelligence } from "@/lib/strategy-engine";
import { analyzeMultiTimeframeIntelligence } from "@/lib/multi-timeframe-engine";
import { analyzeInstitutionalFootprint } from "@/lib/institutional-footprint-engine";
import { evaluateTradeQuality } from "@/lib/trade-quality-engine";
import { buildTradeQualityContext } from "@/lib/trade-quality-context-builder";
import type { TradeQualityPlan } from "@/lib/trade-quality-types";
import { buildHermesReasoning } from "@/lib/reasoning-engine";
import { saveReasoningSnapshot } from "@/lib/reasoning-snapshots";
import { buildSmartChartIntelligence } from "@/lib/smart-chart-intelligence";
import type { HermesVisionContext } from "@/lib/hermes-vision-types";
import { triggerHermesCoach } from "@/lib/hermes-coach-trigger-system";
import {
  DEFAULT_SETTINGS,
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
    sma20: false,
    vwap: false,
  });
  const [selectedChartTool, setSelectedChartTool] = useState<ChartDrawingTool>("none");
  const [chartDrawings, setChartDrawings] = useState<ChartDrawing[]>([]);
  const [chartTradeLevelsBySymbol, setChartTradeLevelsBySymbol] = useState<
    Partial<Record<CoinSymbol, ChartTradeLevels>>
  >({});
  const [marketsCollapsed, setMarketsCollapsed] = useState(false);
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>("full");
  const [rightTab, setRightTab] = useState<RightSidebarTab>("hermes");
  const [panelWidths, setPanelWidths] = useState({
    left: 236,
    right: 360,
  });

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
  const newsIntelligence = useMemo(
    () => buildNewsIntelligence(selectedQuote.symbol),
    [selectedQuote.symbol],
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
  const hermesVisionContext = useMemo<HermesVisionContext>(
    () =>
      buildHermesVisionContext({
        quote: selectedQuote,
        candles,
        drawings: selectedChartDrawings,
        tradeLevels: selectedChartTradeLevels,
        analysis: workspaceAnalysis,
        traderDna: memoryTradingPersonality.archetype,
        dailyGoal: morningBriefing.dailyGoal.text,
      }),
    [
      candles,
      memoryTradingPersonality.archetype,
      morningBriefing.dailyGoal.text,
      selectedChartDrawings,
      selectedChartTradeLevels,
      selectedQuote,
      workspaceAnalysis,
    ],
  );
  const hermesVision = useMemo(
    () => analyzeHermesVision(hermesVisionContext),
    [hermesVisionContext],
  );
  const multiTimeframe = useMemo(
    () =>
      analyzeMultiTimeframeIntelligence({
        quote: selectedQuote,
        activeTimeframe: timeframe,
        drawings: selectedChartDrawings,
        tradeLevels: selectedChartTradeLevels,
        traderMemory: hermesMemorySnapshot,
        traderDna: memoryTradingPersonality.archetype,
        dailyGoal: morningBriefing.dailyGoal.text,
      }),
    [
      hermesMemorySnapshot,
      memoryTradingPersonality.archetype,
      morningBriefing.dailyGoal.text,
      selectedChartDrawings,
      selectedChartTradeLevels,
      selectedQuote,
      timeframe,
    ],
  );
  const preliminaryHermesScore = useMemo(
    () => calculateHermesScore({ context: hermesVisionContext, vision: hermesVision, multiTimeframe }),
    [hermesVision, hermesVisionContext, multiTimeframe],
  );
  const preliminaryStrategy = useMemo(
    () =>
      analyzeStrategyIntelligence({
        context: hermesVisionContext,
        vision: hermesVision,
        news: newsIntelligence,
        traderMemory: hermesMemorySnapshot,
        confidence: preliminaryHermesScore.score,
        timeframe,
        multiTimeframe,
      }),
    [
      hermesMemorySnapshot,
      hermesVision,
      hermesVisionContext,
      multiTimeframe,
      newsIntelligence,
      preliminaryHermesScore.score,
      timeframe,
    ],
  );
  const footprint = useMemo(
    () =>
      analyzeInstitutionalFootprint({
        candles,
        context: hermesVisionContext,
        multiTimeframe,
        strategy: preliminaryStrategy,
        news: newsIntelligence,
      }),
    [candles, hermesVisionContext, multiTimeframe, preliminaryStrategy, newsIntelligence],
  );
  const strategyIntelligence = useMemo(
    () =>
      analyzeStrategyIntelligence({
        context: hermesVisionContext,
        vision: hermesVision,
        news: newsIntelligence,
        traderMemory: hermesMemorySnapshot,
        confidence: preliminaryHermesScore.score,
        timeframe,
        multiTimeframe,
        footprint,
      }),
    [
      footprint,
      hermesMemorySnapshot,
      hermesVision,
      hermesVisionContext,
      multiTimeframe,
      newsIntelligence,
      preliminaryHermesScore.score,
      timeframe,
    ],
  );
  const baseReasoningPlan = useMemo<TradeQualityPlan>(
    () => ({
      side: "Long",
      notional: 500,
      entryPrice: selectedChartTradeLevels.entry,
      stopLoss: selectedChartTradeLevels.stop,
      takeProfit: selectedChartTradeLevels.target,
    }),
    [selectedChartTradeLevels.entry, selectedChartTradeLevels.stop, selectedChartTradeLevels.target],
  );
  const hermesReasoning = useMemo(
    () =>
      buildHermesReasoning({
        context: hermesVisionContext,
        vision: hermesVision,
        multiTimeframe,
        footprint,
        news: newsIntelligence,
        strategy: strategyIntelligence,
        hermesScore: preliminaryHermesScore,
        memory: hermesMemorySnapshot,
        portfolio,
        plan: baseReasoningPlan,
      }),
    [
      baseReasoningPlan,
      footprint,
      hermesMemorySnapshot,
      hermesVision,
      hermesVisionContext,
      multiTimeframe,
      newsIntelligence,
      portfolio,
      preliminaryHermesScore,
      strategyIntelligence,
    ],
  );
  const buildTradeQualityForPlan = useCallback(
    (plan: TradeQualityPlan) =>
      evaluateTradeQuality(
        buildTradeQualityContext({
          quote: selectedQuote,
          plan,
          portfolio,
          vision: hermesVision,
          visionContext: hermesVisionContext,
          multiTimeframe,
          footprint,
          strategy: strategyIntelligence,
          news: newsIntelligence,
          memory: hermesMemorySnapshot,
          dailyGoal: morningBriefing.dailyGoal.text,
          reasoning: hermesReasoning,
        }),
      ),
    [
      footprint,
      hermesMemorySnapshot,
      hermesReasoning,
      hermesVision,
      hermesVisionContext,
      morningBriefing.dailyGoal.text,
      multiTimeframe,
      newsIntelligence,
      portfolio,
      selectedQuote,
      strategyIntelligence,
    ],
  );
  const tradeQuality = useMemo(
    () =>
      buildTradeQualityForPlan({
        ...baseReasoningPlan,
      }),
    [baseReasoningPlan, buildTradeQualityForPlan],
  );
  const hermesScore = useMemo(
    () => calculateHermesScore({ context: hermesVisionContext, vision: hermesVision, multiTimeframe, footprint, tradeQuality }),
    [footprint, hermesVision, hermesVisionContext, multiTimeframe, tradeQuality],
  );
  const newsCatalystMarker = useMemo(
    () => buildNewsCatalystMarker({ candles, news: newsIntelligence }),
    [candles, newsIntelligence],
  );
  const smartChartIntelligence = useMemo(
    () =>
      buildSmartChartIntelligence({
        candles,
        context: hermesVisionContext,
        vision: hermesVision,
        reasoning: hermesReasoning,
        multiTimeframe,
        footprint,
        news: newsIntelligence,
      }),
    [
      candles,
      footprint,
      hermesReasoning,
      hermesVision,
      hermesVisionContext,
      multiTimeframe,
      newsIntelligence,
    ],
  );
  const liveIntelligence = useMemo(
    () =>
      buildHermesLiveIntelligence({
        context: hermesVisionContext,
        vision: hermesVision,
        hermesScore,
        news: newsIntelligence,
        memory: hermesMemorySnapshot,
        footprint,
        reasoning: hermesReasoning,
        chartConfidenceDelta: smartChartIntelligence.confidenceDelta,
      }),
    [
      footprint,
      hermesMemorySnapshot,
      hermesReasoning,
      hermesScore,
      hermesVision,
      hermesVisionContext,
      newsIntelligence,
      smartChartIntelligence.confidenceDelta,
    ],
  );

  useEffect(() => {
    if (!hasRestored) return;
    saveReasoningSnapshot(hermesReasoning);
  }, [hasRestored, hermesReasoning]);
  const chartNewsKeywords = useMemo(
    () => newsIntelligence.detectedKeywords.map((match) => match.keyword),
    [newsIntelligence.detectedKeywords],
  );
  const tradePlanCaution = useMemo(() => {
    if (newsIntelligence.riskCaution.active) return newsIntelligence.riskCaution;
    return hermesVision.caution;
  }, [hermesVision.caution, newsIntelligence.riskCaution]);
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
            hermesScore,
            intelligence: morningBriefing.intelligence,
            tradeQuality: pendingDecisionTicket
              ? buildTradeQualityForPlan({
                  side: pendingDecisionTicket.side,
                  notional: pendingDecisionTicket.notional,
                  entryPrice: pendingDecisionTicket.entryPrice,
                  stopLoss: pendingDecisionTicket.stopLoss,
                  takeProfit: pendingDecisionTicket.takeProfit,
                })
              : undefined,
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
      hermesScore,
      buildTradeQualityForPlan,
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
    if (typeof workspace.marketsCollapsed === "boolean") {
      setMarketsCollapsed(workspace.marketsCollapsed);
    }
    if (workspace.workspaceMode) setWorkspaceMode(workspace.workspaceMode);
    if (workspace.panelWidths) setPanelWidths(workspace.panelWidths);
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
      marketsCollapsed,
      workspaceMode,
      panelWidths,
    });
  }, [
    chartDrawings,
    chartTradeLevelsBySymbol,
    hasRestored,
    indicators,
    marketsCollapsed,
    panelWidths,
    selectedSymbol,
    timeframe,
    watchlistSymbols,
    workspaceMode,
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
      if (selectedChartTool === "none" || selectedChartTool === "crosshair") return;

      if (selectedChartTool === "erase") {
        setChartDrawings((current) => {
          const selectedDrawings = current.filter((drawing) => drawing.symbol === selectedSymbol);
          const drawingToRemove = selectedDrawings.reduce<ChartDrawing | null>((closest, drawing) => {
            if (!closest) return drawing;
            return Math.abs(drawing.price - price) < Math.abs(closest.price - price)
              ? drawing
              : closest;
          }, null);

          return drawingToRemove
            ? current.filter((drawing) => drawing.id !== drawingToRemove.id)
            : current;
        });
        return;
      }

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

      if (!isDrawableChartTool(selectedChartTool)) return;

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

  const startPanelResize = useCallback(
    (panel: "left" | "right", event: ReactMouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      const startX = event.clientX;
      const startWidth = panelWidths[panel];

      const handleMove = (moveEvent: MouseEvent) => {
        const delta =
          panel === "left" ? moveEvent.clientX - startX : startX - moveEvent.clientX;
        setPanelWidths((current) => ({
          ...current,
          [panel]: clampPanelWidth(startWidth + delta, panel),
        }));
      };
      const handleUp = () => {
        window.removeEventListener("mousemove", handleMove);
        window.removeEventListener("mouseup", handleUp);
      };

      window.addEventListener("mousemove", handleMove);
      window.addEventListener("mouseup", handleUp);
    },
    [panelWidths],
  );

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
        <div className="mx-auto max-w-[1920px] px-3 py-4 sm:px-5 lg:px-6 xl:px-8">
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
          hermesScore={hermesScore}
          notional={pendingDecisionTicket.notional}
          review={decisionReview}
          onConfirm={confirmPendingDecision}
          onRevise={revisePendingDecision}
        />
      ) : null}
      <div className="mx-auto max-w-[1920px] px-3 py-4 sm:px-5 lg:px-6 xl:px-8">
        <section className="mb-5 flex flex-col justify-between gap-4 rounded-lg border border-white/10 bg-white/[0.025] px-5 py-5 shadow-insetPanel lg:flex-row lg:items-end">
          <div className="max-w-4xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-mint-300/80">
              Hermes Workspace 2.0
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl xl:text-[34px]">
              Hermes - professional paper trading workstation.
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Chart-first planning, rule-based analysis, portfolio tracking,
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

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.025] px-4 py-3">
          <div className="flex flex-wrap gap-2">
            {(["chart-only", "chart-ai", "full"] as WorkspaceMode[]).map((mode) => (
              <button
                className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                  workspaceMode === mode
                    ? "border-mint-300/35 bg-mint-300/10 text-mint-200"
                    : "border-white/10 bg-white/[0.035] text-slate-400 hover:text-white"
                }`}
                key={mode}
                onClick={() => setWorkspaceMode(mode)}
                type="button"
              >
                {getWorkspaceModeLabel(mode)}
              </button>
            ))}
          </div>
          <button
            className="rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2 text-xs font-semibold text-slate-300 transition hover:text-white"
            onClick={() => setMarketsCollapsed((current) => !current)}
            type="button"
          >
            {marketsCollapsed ? "Expand Markets" : "Collapse Markets"}
          </button>
        </div>

        <section
          className="grid gap-3 overflow-x-hidden"
          style={{
            gridTemplateColumns: `${marketsCollapsed ? "56px" : `${panelWidths.left}px 8px`} minmax(0,1fr)${
              workspaceMode === "chart-only" ? "" : ` 8px minmax(300px, ${panelWidths.right}px)`
            }`,
          }}
        >
          <div className="space-y-4">
            {marketsCollapsed ? (
              <CollapsedMarketsRail
                selectedSymbol={selectedSymbol}
                symbols={watchlistSymbols}
                onSelect={selectWorkspaceSymbol}
              />
            ) : (
              <WorkspaceMarketsPanel
                  onAdd={addToWatchlist}
                  onRemove={removeFromWatchlist}
                  onSelect={selectWorkspaceSymbol}
                  selectedSymbol={selectedSymbol}
                  symbols={watchlistSymbols}
                />
            )}
          </div>

          {marketsCollapsed ? null : (
            <ResizeHandle onMouseDown={(event) => startPanelResize("left", event)} />
          )}

          <div className="min-w-0 space-y-6">
            <ProfessionalChart
              analysis={workspaceAnalysis}
              candles={candles}
              chartLabels={[
                ...smartChartIntelligence.annotations,
                ...(newsCatalystMarker ? [newsCatalystMarker] : []),
                ...footprint.chartLabels,
                ...hermesVision.labels,
              ].slice(0, 5)}
              drawings={selectedChartDrawings}
              footprint={footprint}
              hermesScore={hermesScore}
              indicators={indicators}
              multiTimeframe={multiTimeframe}
              newsKeywords={chartNewsKeywords}
              quote={selectedQuote}
              selectedTool={selectedChartTool}
              strategy={strategyIntelligence}
              timeframe={timeframe}
              tradeLevels={selectedChartTradeLevels}
              vision={hermesVision}
              onChartPriceSelect={handleChartPriceSelect}
              onClearDrawings={clearSelectedDrawings}
              onTimeframeChange={setTimeframe}
              onToolChange={setSelectedChartTool}
              onToggleIndicator={toggleIndicator}
            />
          </div>

          {workspaceMode !== "chart-only" ? (
            <>
              <ResizeHandle onMouseDown={(event) => startPanelResize("right", event)} />
              <div className="min-w-0 space-y-3">
                <RightSidebarTabs activeTab={rightTab} onTabChange={setRightTab} />
                {rightTab === "hermes" ? (
                  <FloatingAnalysis
                    analysis={workspaceAnalysis}
                    history={history}
                    hermesScore={hermesScore}
                    reasoning={hermesReasoning}
                    chartConfidenceDelta={smartChartIntelligence.confidenceDelta}
                    liveIntelligence={liveIntelligence}
                    memory={hermesMemorySnapshot}
                    newsIntelligence={newsIntelligence}
                    tradingPersonality={memoryTradingPersonality}
                    weeklyInsights={weeklyMemoryInsights}
                  />
                ) : null}
                {rightTab === "trade-plan" ? (
                  <FloatingTradePlan
                    buyingPower={portfolio.buyingPower}
                    footprint={footprint}
                    hermesScore={hermesScore}
                    tradeQuality={tradeQuality}
                    multiTimeframe={multiTimeframe}
                    opportunity={selectedOpportunity}
                    quote={selectedQuote}
                    chartLevels={selectedChartTradeLevels}
                    statusMessage={tradePlanMessage}
                    visionCaution={tradePlanCaution}
                    buildTradeQuality={buildTradeQualityForPlan}
                    onSubmit={handlePaperTicket}
                  />
                ) : null}
                {rightTab === "news" ? (
                  <NewsIntelligencePanel intelligence={newsIntelligence} />
                ) : null}
                {rightTab === "alerts" ? (
                  <SidebarAlertsPanel symbol={selectedSymbol} />
                ) : null}
              </div>
            </>
          ) : null}
        </section>
      </div>
    </main>
  );
}

function createBrowserSafeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

type RightSidebarTab = "hermes" | "trade-plan" | "news" | "alerts";

function RightSidebarTabs({
  activeTab,
  onTabChange,
}: {
  activeTab: RightSidebarTab;
  onTabChange: (tab: RightSidebarTab) => void;
}) {
  const tabs: Array<{ id: RightSidebarTab; label: string }> = [
    { id: "hermes", label: "Hermes" },
    { id: "trade-plan", label: "Trade Plan" },
    { id: "news", label: "News" },
    { id: "alerts", label: "Alerts" },
  ];

  return (
    <div className="grid grid-cols-2 gap-1 rounded-lg border border-white/10 bg-white/[0.03] p-1">
      {tabs.map((tab) => (
        <button
          className={`rounded-md px-3 py-2 text-xs font-semibold transition ${
            activeTab === tab.id
              ? "bg-white/10 text-white shadow-insetPanel"
              : "text-slate-500 hover:bg-white/[0.045] hover:text-slate-200"
          }`}
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          type="button"
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

const DASHBOARD_ALERTS_STORAGE_KEY = "hermes.chart.alerts.v1";

function SidebarAlertsPanel({ symbol }: { symbol: CoinSymbol }) {
  const [alerts, setAlerts] = useState<HermesAlert[]>([]);
  const [condition, setCondition] = useState<HermesAlertCondition>("price-above");
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(DASHBOARD_ALERTS_STORAGE_KEY);
      if (raw) setAlerts(JSON.parse(raw) as HermesAlert[]);
    } catch {
      setAlerts([]);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(DASHBOARD_ALERTS_STORAGE_KEY, JSON.stringify(alerts));
  }, [alerts]);

  const symbolAlerts = alerts.filter((alert) => alert.symbol === symbol);
  const activeAlerts = symbolAlerts.filter((alert) => !alert.triggeredAt);
  const triggeredAlerts = symbolAlerts.filter((alert) => alert.triggeredAt);
  const needsValue = condition === "price-above" || condition === "price-below" || condition === "rsi-above" || condition === "rsi-below";

  const saveAlert = () => {
    const parsedValue = Number(value);
    if (needsValue && (!Number.isFinite(parsedValue) || parsedValue <= 0)) return;
    setAlerts((current) => [
      {
        id: `${symbol}-${condition}-${Date.now()}`,
        symbol,
        condition,
        value: needsValue ? parsedValue : undefined,
        note: note.trim() || undefined,
        enabled: true,
        createdAt: Date.now(),
      },
      ...current,
    ]);
    setValue("");
    setNote("");
    setCreating(false);
  };

  return (
    <div className="rounded-lg border border-white/10 bg-surface-950/60 p-4 shadow-xl shadow-black/15">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amberline/80">
            Alerts
          </p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight text-white">{symbol} Watch</h2>
        </div>
        <button
          className="rounded-lg border border-mint-300/25 bg-mint-300/10 px-3 py-2 text-xs font-semibold text-mint-200 transition hover:bg-mint-300/15"
          onClick={() => setCreating((current) => !current)}
          type="button"
        >
          Create Alert
        </button>
      </div>

      {creating ? (
        <div className="mt-4 space-y-3 rounded-lg border border-white/10 bg-white/[0.03] p-3">
          <select
            className="h-10 w-full rounded-lg border border-white/10 bg-surface-950 px-3 text-sm text-white outline-none"
            onChange={(event) => setCondition(event.target.value as HermesAlertCondition)}
            value={condition}
          >
            {Object.entries(hermesAlertConditionLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
          {needsValue ? (
            <input
              className="h-10 w-full rounded-lg border border-white/10 bg-surface-950 px-3 text-sm text-white outline-none placeholder:text-slate-600"
              inputMode="decimal"
              onChange={(event) => setValue(event.target.value)}
              placeholder={condition.startsWith("rsi") ? "70" : "Price level"}
              type="number"
              value={value}
            />
          ) : null}
          <input
            className="h-10 w-full rounded-lg border border-white/10 bg-surface-950 px-3 text-sm text-white outline-none placeholder:text-slate-600"
            onChange={(event) => setNote(event.target.value)}
            placeholder="Optional mentor note"
            value={note}
          />
          <div className="flex justify-end gap-2">
            <button
              className="rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2 text-xs font-semibold text-slate-300"
              onClick={() => setCreating(false)}
              type="button"
            >
              Cancel
            </button>
            <button
              className="rounded-lg border border-mint-300/25 bg-mint-300/10 px-3 py-2 text-xs font-semibold text-mint-200"
              onClick={saveAlert}
              type="button"
            >
              Save Alert
            </button>
          </div>
        </div>
      ) : null}

      <AlertList
        alerts={activeAlerts}
        empty="No active alerts for this symbol."
        title="Active Alerts"
        onDelete={(id) => setAlerts((current) => current.filter((alert) => alert.id !== id))}
      />
      <AlertList
        alerts={triggeredAlerts}
        empty="No triggered alerts."
        title="Triggered Alerts"
        triggered
        onDelete={(id) => setAlerts((current) => current.filter((alert) => alert.id !== id))}
      />
    </div>
  );
}

function AlertList({
  title,
  alerts,
  empty,
  triggered = false,
  onDelete,
}: {
  title: string;
  alerts: HermesAlert[];
  empty: string;
  triggered?: boolean;
  onDelete: (id: string) => void;
}) {
  return (
    <section className="mt-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{title}</p>
      <div className="mt-2 space-y-2">
        {alerts.length === 0 ? (
          <div className="rounded-lg border border-white/10 bg-white/[0.025] px-3 py-3 text-xs text-slate-500">
            {empty}
          </div>
        ) : (
          alerts.map((alert) => (
            <div
              className={`rounded-lg border px-3 py-2.5 ${
                triggered ? "border-amberline/25 bg-amberline/[0.08]" : "border-white/10 bg-white/[0.03]"
              }`}
              key={alert.id}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-white">
                    {hermesAlertConditionLabels[alert.condition]}
                    {typeof alert.value === "number" ? ` ${alert.value}` : ""}
                  </p>
                  <p className="mt-1 text-[11px] leading-4 text-slate-500">
                    {alert.lastMessage ?? alert.note ?? "Hermes will watch this condition."}
                  </p>
                </div>
                <button
                  className="rounded-md border border-white/10 bg-white/[0.035] px-2 py-1 text-[11px] font-semibold text-slate-500 hover:text-white"
                  onClick={() => onDelete(alert.id)}
                  type="button"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
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
type WorkspaceMode = "chart-only" | "chart-ai" | "full";

type WorkspaceSettings = {
  selectedSymbol?: CoinSymbol;
  watchlistSymbols?: CoinSymbol[];
  indicators?: IndicatorVisibility;
  timeframe?: Timeframe;
  chartDrawings?: ChartDrawing[];
  tradeLevelsBySymbol?: Partial<Record<CoinSymbol, ChartTradeLevels>>;
  marketsCollapsed?: boolean;
  workspaceMode?: WorkspaceMode;
  panelWidths?: {
    left: number;
    right: number;
  };
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

function ResizeHandle({
  hidden = false,
  onMouseDown,
}: {
  hidden?: boolean;
  onMouseDown: (event: ReactMouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      className={`h-full min-h-24 cursor-col-resize rounded-full transition ${
        hidden ? "opacity-0" : "bg-white/[0.035] hover:bg-amberline/30"
      }`}
      onMouseDown={onMouseDown}
      type="button"
      aria-label="Resize workspace panel"
      tabIndex={hidden ? -1 : 0}
    />
  );
}

function CollapsedMarketsRail({
  symbols,
  selectedSymbol,
  onSelect,
}: {
  symbols: CoinSymbol[];
  selectedSymbol: CoinSymbol;
  onSelect: (symbol: CoinSymbol) => void;
}) {
  return (
    <aside className="rounded-lg border border-white/10 bg-white/[0.025] p-2 shadow-insetPanel">
      <div className="grid gap-2">
        {symbols.map((symbol) => {
          const asset = getMarketAsset(symbol);
          const selected = selectedSymbol === symbol;
          return (
            <button
              className={`grid size-12 place-items-center rounded-lg border text-xs font-bold transition ${
                selected
                  ? "border-mint-300/35 bg-mint-300/10 text-mint-200"
                  : "border-white/10 bg-white/[0.035] text-slate-400 hover:text-white"
              }`}
              key={symbol}
              onClick={() => onSelect(symbol)}
              title={asset.name}
              type="button"
            >
              {symbol.length > 4 ? symbol.slice(0, 4) : symbol}
            </button>
          );
        })}
      </div>
    </aside>
  );
}

function getWorkspaceModeLabel(mode: WorkspaceMode) {
  if (mode === "chart-only") return "Chart Only";
  if (mode === "chart-ai") return "Chart + AI";
  return "Full Workspace";
}

function clampPanelWidth(value: number, panel: "left" | "right") {
  const min = panel === "left" ? 200 : 320;
  const max = panel === "left" ? 340 : 520;
  return Math.max(min, Math.min(max, Math.round(value)));
}

function isDrawableChartTool(
  tool: ChartDrawingTool,
): tool is ChartDrawing["type"] {
  return (
    tool === "horizontal-line" ||
    tool === "trend-line" ||
    tool === "ray" ||
    tool === "rectangle" ||
    tool === "support-zone" ||
    tool === "resistance-zone" ||
    tool === "risk-reward" ||
    tool === "text-note"
  );
}
