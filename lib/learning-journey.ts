export type LearningJourneyStep = {
  order: number;
  feature: string;
  purpose: string;
  explanation: string;
};

export const learningJourneySteps: LearningJourneyStep[] = [
  {
    order: 1,
    feature: "Morning Briefing",
    purpose: "Prepare",
    explanation:
      "Hermes helps you begin the session with market context, a daily goal, and a calmer mind.",
  },
  {
    order: 2,
    feature: "Opportunity Scanner",
    purpose: "Discover",
    explanation:
      "Hermes surfaces setups worth studying, then teaches why each one may or may not deserve attention.",
  },
  {
    order: 3,
    feature: "Trade Plan",
    purpose: "Plan",
    explanation:
      "Hermes turns an idea into a measurable paper plan with entry, stop, target, and risk/reward.",
  },
  {
    order: 4,
    feature: "Decision Engine",
    purpose: "Decide",
    explanation:
      "Hermes reviews whether the trade deserves risk before execution.",
  },
  {
    order: 5,
    feature: "Paper Trading",
    purpose: "Practice",
    explanation:
      "Hermes keeps execution manual and paper-only, so skill can develop before capital is at risk.",
  },
  {
    order: 6,
    feature: "Replay Mode",
    purpose: "Reflect",
    explanation:
      "Hermes will help you revisit decisions, study outcomes, and separate process from luck.",
  },
  {
    order: 7,
    feature: "Trader DNA",
    purpose: "Improve",
    explanation:
      "Hermes learns from completed paper trades and turns patterns into personal coaching.",
  },
];
