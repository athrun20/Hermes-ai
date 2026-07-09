export type LiveTimelineCategory =
  | "Trend"
  | "Momentum"
  | "Volume"
  | "Risk"
  | "News"
  | "Structure"
  | "Trader Behavior"
  | "Trade Plan";

export type LiveTimelineTone = "mint" | "gold" | "danger" | "muted";

export type LiveTimelineEvent = {
  id: string;
  signature: string;
  time: string;
  category: LiveTimelineCategory;
  title: string;
  explanation: string;
  confidenceBefore: number;
  confidenceAfter: number;
  confidenceChange: number;
  tone: LiveTimelineTone;
};

export const LIVE_TIMELINE_MIN_INTERVAL_MS = 24_000;
