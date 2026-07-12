import {
  coachCategoryByMoment,
  coachTitlesByCategory,
} from "@/lib/hermes-coach-message-library";
import type { HermesCoachMessage, HermesCoachTrigger } from "@/lib/hermes-coach-types";

export function buildHermesCoachMessage({
  moment,
  context = {},
}: HermesCoachTrigger): HermesCoachMessage {
  const category = coachCategoryByMoment[moment];

  return {
    id: `${moment}-${Date.now()}`,
    moment,
    category,
    title: coachTitlesByCategory[category],
    message: buildMessage({ moment, context }),
    actionLabel: getActionLabel(moment),
  };
}

function buildMessage({ moment, context }: HermesCoachTrigger) {
  const disciplineScore = context?.disciplineScore ?? 50;
  const streak = context?.disciplineStreak ?? context?.intelligence?.disciplineStreak ?? 0;
  const morningGoal = context?.morningGoal ?? context?.intelligence?.morningContext.goal;
  const replayLesson = context?.replayLesson ?? context?.intelligence?.yesterdayLesson;

  if (moment === "morning-briefing-completed") {
    return `Briefing complete. Carry one rule into the session: ${morningGoal ?? "protect capital before seeking opportunity"}. Preparation is only useful if it changes the next click.`;
  }

  if (moment === "trade-plan-created") {
    return `The plan is forming. ${context?.tradeSymbol ?? "This setup"} still needs patience: entry, stop, target, and size should all agree before paper risk is spent.`;
  }

  if (moment === "decision-review-completed") {
    return `Hermes marked this decision as ${context?.decisionRecommendation ?? "reviewed"}. Confidence is ${context?.decisionConfidence ?? "not"} measured; discipline comes from accepting the risk before the outcome.`;
  }

  if (moment === "paper-trade-executed") {
    return `Paper trade recorded. Do not search for the next trade yet. Let this position prove or disprove the plan. Current discipline score: ${disciplineScore}.`;
  }

  if (moment === "replay-finished") {
    return `Replay finished. The lesson is simple: ${replayLesson ?? "review the decision, not only the result"}. Film room work compounds when it changes the next plan.`;
  }

  if (moment === "reflection-saved") {
    return `Reflection saved. ${context?.journalEmotion ? `You marked the emotional state as ${context.journalEmotion.toLowerCase()}. ` : ""}Hermes can now compare judgment, emotion, and outcome over time.`;
  }

  if (moment === "personalized-learning") {
    // Personalized body is built by Learning Engine adapter; this is fallback only.
    return "Hermes is building personalized process coaching from completed paper trades.";
  }

  return `Day reviewed. Discipline streak: ${streak}. End the session by protecting the lesson, not by forcing another trade.`;
}

function getActionLabel(moment: HermesCoachTrigger["moment"]) {
  if (moment === "replay-finished") return "Lesson captured";
  if (moment === "reflection-saved") return "Memory updated";
  if (moment === "paper-trade-executed") return "Paper mode";
  if (moment === "personalized-learning") return "Learning";
  return "Hermes noted";
}
