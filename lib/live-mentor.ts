import type { LiveTimelineEvent } from "@/lib/timeline-events";

export function buildLiveMentorMessage(events: LiveTimelineEvent[]) {
  const lead = events[0];
  if (!lead) {
    return "The chart is quiet. Keep the plan clean and let confirmation do the work.";
  }

  if (lead.category === "Risk" && lead.confidenceChange < 0) {
    return "Risk is the loudest part of the chart right now; improve the plan before adding pressure.";
  }
  if (lead.category === "News") {
    return "News can move price, but Hermes still waits for structure and volume to confirm.";
  }
  if (lead.category === "Volume" && lead.confidenceChange > 0) {
    return "Participation is improving, but discipline still comes before conviction.";
  }
  if (lead.category === "Trend" && lead.confidenceChange > 0) {
    return "The trend is healthier, but the best paper trades still respect defined risk.";
  }
  if (lead.category === "Trade Plan") {
    return "A complete plan gives Hermes something real to review instead of a reaction to price.";
  }

  return "The setup is changing. Study what improved, then decide whether the risk is still deserved.";
}
