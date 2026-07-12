/**
 * Session story — chronological meaningful events, max 10, deduped.
 */

import type { Candle } from "@/lib/market-data";
import type {
  SessionIntelligenceInput,
  SessionPhase,
  SessionStoryEvent,
} from "@/lib/session-intelligence/types";
import { SESSION_STORY_MAX } from "@/lib/session-intelligence/types";

export function buildSessionStory(args: {
  input: SessionIntelligenceInput;
  phase: SessionPhase;
  now: number;
}): SessionStoryEvent[] {
  const { input, phase, now } = args;
  const raw: SessionStoryEvent[] = [];

  // Opening marker
  if (input.candles.length > 0) {
    const first = input.candles[0];
    raw.push(
      event({
        id: "session-open",
        timestamp: first.time,
        title: "Session open",
        detail: openingDetail(input, phase),
        tone: "gold",
        source: "Session Intelligence",
      }),
    );
  }

  // From smart chart story (preferred teaching events)
  if (input.smartChart?.marketStory?.length) {
    for (const item of input.smartChart.marketStory) {
      raw.push(
        event({
          id: `chart-${item.id}`,
          timestamp: item.timestamp,
          title: item.title,
          detail: item.whatHappened,
          tone: item.tone,
          source: item.sourceModules[0] ?? "Smart Chart Intelligence",
        }),
      );
    }
  }

  // Candle-derived milestones
  raw.push(...detectCandleMilestones(input.candles));

  // Volume / momentum / news / phase
  raw.push(...detectStateEvents(input, phase, now));

  const merged = mergeDuplicateEvents(raw);
  const sorted = merged
    .sort((a, b) => a.timestamp - b.timestamp || a.id.localeCompare(b.id))
    .slice(0, SESSION_STORY_MAX);

  return sorted.map((item, index) => ({
    ...item,
    sequence: index + 1,
  }));
}

export function mergeDuplicateEvents(events: SessionStoryEvent[]): SessionStoryEvent[] {
  const seen = new Map<string, SessionStoryEvent>();
  for (const event of events) {
    const key = normalizeKey(event.title, event.detail);
    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, event);
      continue;
    }
    // Keep earlier timestamp; prefer longer detail
    if (
      event.timestamp < existing.timestamp ||
      (event.timestamp === existing.timestamp && event.detail.length > existing.detail.length)
    ) {
      seen.set(key, { ...event, id: existing.id });
    }
  }
  return [...seen.values()];
}

function detectCandleMilestones(candles: Candle[]): SessionStoryEvent[] {
  const out: SessionStoryEvent[] = [];
  if (candles.length < 6) return out;

  // First significant range expansion
  const early = candles.slice(0, Math.min(6, candles.length));
  const earlyRange =
    Math.max(...early.map((c) => c.high)) - Math.min(...early.map((c) => c.low));
  const midPrice = early[0].close;
  if (midPrice > 0 && earlyRange / midPrice > 0.008) {
    out.push(
      event({
        id: "opening-volatility",
        timestamp: early[Math.min(2, early.length - 1)].time,
        title: "Opening volatility",
        detail: "Early session range expanded as the open found liquidity.",
        tone: "gold",
        source: "Session Intelligence",
      }),
    );
  }

  // Higher low / lower high confirmation near end of series
  const recent = candles.slice(-8);
  if (recent.length >= 5) {
    const lows = recent.map((c) => c.low);
    const highs = recent.map((c) => c.high);
    const lastLow = lows[lows.length - 1];
    const priorLow = Math.min(...lows.slice(0, -2));
    const lastHigh = highs[highs.length - 1];
    const priorHigh = Math.max(...highs.slice(0, -2));
    if (lastLow > priorLow) {
      out.push(
        event({
          id: "higher-low",
          timestamp: recent[recent.length - 1].time,
          title: "Higher low",
          detail: "Buyers defended a higher low, keeping short-term structure constructive.",
          tone: "mint",
          source: "Session Intelligence",
        }),
      );
    }
    if (lastHigh < priorHigh) {
      out.push(
        event({
          id: "lower-high",
          timestamp: recent[recent.length - 1].time,
          title: "Lower high",
          detail: "Sellers capped the advance with a lower high.",
          tone: "danger",
          source: "Session Intelligence",
        }),
      );
    }
  }

  return out;
}

function detectStateEvents(
  input: SessionIntelligenceInput,
  phase: SessionPhase,
  now: number,
): SessionStoryEvent[] {
  const out: SessionStoryEvent[] = [];
  const ts = input.candles[input.candles.length - 1]?.time ?? now;

  if (input.context.vwap) {
    const above = input.context.currentPrice >= input.context.vwap;
    const distance =
      Math.abs(input.context.currentPrice - input.context.vwap) / input.context.currentPrice;
    if (distance < 0.012) {
      out.push(
        event({
          id: above ? "vwap-reclaim" : "vwap-loss",
          timestamp: ts,
          title: above ? "VWAP reclaimed" : "VWAP lost",
          detail: above
            ? "Price is holding above VWAP — constructive intraday control."
            : "Price is losing VWAP — defensive posture until reclaimed.",
          tone: above ? "mint" : "danger",
          source: "Native Chart Engine",
        }),
      );
    }
  }

  if (input.context.volume.status === "Rising") {
    out.push(
      event({
        id: "participation-up",
        timestamp: ts - 1,
        title: "Participation improving",
        detail: "Volume is expanding relative to the recent average.",
        tone: "mint",
        source: "Volume Intelligence",
      }),
    );
  } else if (input.context.volume.status === "Fading") {
    out.push(
      event({
        id: "participation-down",
        timestamp: ts - 1,
        title: "Participation fading",
        detail: "Volume is thinning — moves deserve more confirmation.",
        tone: "gold",
        source: "Volume Intelligence",
      }),
    );
  }

  if (input.context.macd) {
    const accel =
      input.context.macd.histogram > 0 &&
      input.context.macd.line > input.context.macd.signal;
    out.push(
      event({
        id: accel ? "momentum-up" : "momentum-fade",
        timestamp: ts - 2,
        title: accel ? "Momentum improving" : "Momentum fading",
        detail: accel
          ? "Short-term momentum is accelerating with structure."
          : "Momentum is cooling — patience on continuation ideas.",
        tone: accel ? "mint" : "gold",
        source: "Momentum Intelligence",
      }),
    );
  }

  if (input.news.chartMarker?.active || input.news.urgency === "High") {
    out.push(
      event({
        id: "news-session",
        timestamp: ts - 3,
        title: "News-driven pressure",
        detail: input.news.hermesInterpretation || "Event risk is shaping session behavior.",
        tone: "danger",
        source: "News Intelligence",
      }),
    );
  }

  if (phase === "Trend Continuation" || phase === "Trend Expansion") {
    out.push(
      event({
        id: "phase-trend",
        timestamp: ts + 1,
        title: phase,
        detail: `Session phase classified as ${phase.toLowerCase()}.`,
        tone: "mint",
        source: "Session Intelligence",
      }),
    );
  }

  return out;
}

function openingDetail(input: SessionIntelligenceInput, phase: SessionPhase): string {
  if (phase === "Opening Drive") {
    return "Opening volatility with directional drive — participation is elevated.";
  }
  if (input.news.urgency === "High") {
    return "Session opened under elevated event risk.";
  }
  return "Session opened; Hermes is mapping structure and participation.";
}

function event(args: {
  id: string;
  timestamp: number;
  title: string;
  detail: string;
  tone: SessionStoryEvent["tone"];
  source: string;
}): SessionStoryEvent {
  return {
    id: args.id,
    timestamp: args.timestamp,
    sequence: 0,
    clockLabel: formatClock(args.timestamp),
    title: args.title,
    detail: args.detail,
    tone: args.tone,
    source: args.source,
  };
}

function formatClock(timestamp: number): string {
  if (!Number.isFinite(timestamp) || timestamp <= 0) return "--:--";
  // Deterministic UTC clock label (no invented local timezone).
  const d = new Date(timestamp);
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function normalizeKey(title: string, detail: string): string {
  const t = title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const d = detail.toLowerCase().slice(0, 48).replace(/[^a-z0-9]+/g, " ").trim();
  return `${t}|${d}`;
}
